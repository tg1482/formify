function addCustomSidebar() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  (document.head || document.documentElement).appendChild(link);

  const sidebar = document.createElement("div");
  sidebar.id = "formie-sidebar";

  const closeButton = document.createElement("button");
  closeButton.textContent = "❌";
  closeButton.className = "close-button";
  closeButton.onclick = () => {
    sidebar.remove(); // Remove the entry div from the DOM
  };
  sidebar.appendChild(closeButton);

  const header = document.createElement("h1");
  header.textContent = "Formie Data";
  sidebar.appendChild(header);

  const contentPrevious = document.createElement("div");
  contentPrevious.id = "contentPrevious";

  const searchBarContainer = document.createElement("div");
  searchBarContainer.className = "search-bar-container";

  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.placeholder = "Search...";
  searchBar.addEventListener("input", (e) => {
    fetchDataFromDB(e.target.value || "all");
  });
  searchBarContainer.appendChild(searchBar);
  contentPrevious.appendChild(searchBarContainer);

  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  contentPrevious.appendChild(dataContainer);

  sidebar.appendChild(contentPrevious);
  fetchDataFromDB("all");

  const deleteAllButton = document.createElement("button");
  deleteAllButton.textContent = "Delete All ☠️";
  deleteAllButton.className = "delete-all-button";
  deleteAllButton.onclick = () => {
    const container = document.getElementById("dataContainer");
    container.innerHTML = ""; // Clear previous data
    chrome.runtime.sendMessage({ action: "deleteAll" });
  };
  sidebar.appendChild(deleteAllButton);

  document.body.appendChild(sidebar);

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  sidebar.appendChild(resizeHandle);

  setupResizeHandle(resizeHandle);
  document.addEventListener("mouseup", handleTextSelection);
}

// Extracted resize handle setup to a function
function setupResizeHandle(resizeHandle) {
  let isResizing = false;
  let lastPageX;

  resizeHandle.addEventListener("mousedown", function (e) {
    isResizing = true;
    lastPageX = e.pageX;
    e.preventDefault();
  });

  document.addEventListener("mousemove", function (e) {
    if (isResizing) {
      const diff = e.pageX - lastPageX;
      const newWidth = parseInt(window.getComputedStyle(resizeHandle.parentNode).width, 10) - diff;
      resizeHandle.parentNode.style.width = `${newWidth}px`;
      lastPageX = e.pageX;
    }
  });

  document.addEventListener("mouseup", function (e) {
    isResizing = false;
  });
}

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();
  const selectionNode = window.getSelection().anchorNode;

  // Ensure the selectionNode is an element or use its parent if it's a text node
  const element = selectionNode.nodeType === Node.ELEMENT_NODE ? selectionNode : selectionNode.parentNode;

  // Check if the selection is inside the sidebar using closest
  if (element && element.closest("#formie-sidebar")) {
    return; // Ignore selections inside the sidebar
  }

  if (selectedText.length > 2) {
    const searchBar = document.querySelector("#formie-sidebar input");
    searchBar.value = selectedText;
    searchBar.dispatchEvent(new Event("input"));
  }
}

function fetchDataFromDB(keyword) {
  let message;
  let containerId = "dataContainer";

  if (keyword == "all") {
    message = { action: "fetchData" };
  } else {
    message = { action: "searchData", keyword: keyword };
  }

  chrome.runtime.sendMessage(message, (response) => {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear previous data

    // Sort the entries by createdAt date
    response.entries.sort((a, b) => {
      return new Date(b.data.createdAt) - new Date(a.data.createdAt);
    });

    response.entries?.forEach((entry) => {
      dataEntryTemplate(entry, container);
    });
  });
}

function dataEntryTemplate(entry, container) {
  const div = document.createElement("div");
  div.className = "data-entry";

  const id = document.createElement("h3");
  id.innerHTML = `<strong>${entry.id}</strong>`;
  div.appendChild(id);

  const valueContainer = document.createElement("div");
  valueContainer.style.display = "flex";
  valueContainer.style.alignItems = "center";

  const copyButton = document.createElement("button");
  copyButton.textContent = "📋";
  copyButton.className = "copy-button";
  copyButton.onclick = () => {
    navigator.clipboard.writeText(entry.data.value).then(() => {
      copyButton.textContent = "✅";
      setTimeout(() => {
        copyButton.textContent = "📋";
      }, 2000);
    });
  };
  valueContainer.appendChild(copyButton);

  const value = document.createElement("p");
  value.innerHTML = `"${entry.data.value}"`;
  value.style.marginLeft = "10px"; // Add space between button and value
  valueContainer.appendChild(value);

  div.appendChild(valueContainer);

  const pageHeader = document.createElement("p");
  pageHeader.style.fontSize = "12px";
  pageHeader.innerHTML = `<strong>Source:</strong> ${entry.data.pageHeader}`;
  div.appendChild(pageHeader);

  const createdAt = document.createElement("p");
  createdAt.style.fontSize = "12px";
  createdAt.innerHTML = `<strong>Updated:</strong> <i>${timeSince(entry.data.createdAt)}</i>`;
  div.appendChild(createdAt);

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "🗑️";
  deleteButton.className = "delete-button";
  deleteButton.onclick = () => {
    div.remove(); // Remove the entry div from the DOM
    chrome.runtime.sendMessage({ action: "deleteKey", id: entry.id });
  };
  div.appendChild(deleteButton);

  container.appendChild(div);
}

function init() {
  const url = window.location.href;
  const pageHeader = document.title;
  const createdAt = new Date().toISOString();

  document.querySelectorAll("input, textarea").forEach((input) => {
    // Attach blur listener to each input/textarea
    input.addEventListener("blur", () => {
      let key = findLabel(input);

      // Prepare data object
      const value = input.value;
      const data = { value, url, pageHeader, createdAt };

      // Optionally, send the data somewhere, like to saveData function
      if (key && value) {
        saveData({ [key]: data });
      }
    });
  });
}

// Function to find the correct label or paragraph tag for an input
function findLabel(input) {
  const id = input.id;
  let label = document.querySelector(`label[for="${id}"]`);
  if (!label) {
    // If no label with 'for', find the closest preceding sibling that is a label or p tag
    let sibling = input.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === "LABEL" || sibling.tagName === "P") {
        label = sibling;
        break;
      }
      sibling = sibling.previousElementSibling;
    }
  }
  return label ? label.innerText.trim() : null;
}

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // ensure that the added node is not my custom sidebar
        let relatedToSidebar =
          Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE && node.closest("#formie-sidebar")) ||
          Array.from(mutation.removedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE && node.closest("#formie-sidebar"));

        if (!relatedToSidebar) {
          init();
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      init();
      setupObserver();
    }, 5000);
  });
} else {
  setTimeout(() => {
    init();
    setupObserver();
  }, 5000);
}

function saveData(entries) {
  chrome.runtime.sendMessage({ action: "saveData", entries });
}

function toggleSideBar() {
  const sidebar = document.getElementById("formie-sidebar");
  if (sidebar) {
    sidebar.remove();
  } else {
    addCustomSidebar();
  }
}

document.addEventListener("keydown", function (event) {
  // Fetch hotkeys from storage only once or when needed, not on every keydown
  chrome.storage.local.get(["hotKey1", "hotKey2"], function (items) {
    if (chrome.runtime.lastError) {
      return;
    }

    if (items.hotKey1 && items.hotKey2) {
      // Check if the fetched hotkeys are pressed
      if (checkHotkeys(event, items.hotKey1, items.hotKey2)) {
        toggleSideBar();
      }
    }
  });
});

function checkHotkeys(event, hotKey1, hotKey2) {
  const key1 = hotKey1.toLowerCase();
  const key2 = hotKey2.toLowerCase();

  if (key1 === "ctrl" && !event.ctrlKey) return false;
  if (key1 === "shift" && !event.shiftKey) return false;
  if (key1 === "alt" && !event.altKey) return false;

  // Check if the correct combination of keys is pressed
  if (event.key.toLowerCase() === key2) {
    return true;
  }
  return false;
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}
