console.log("Formify content script loaded");

function addCustomSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "my-custom-sidebar";
  sidebar.style.width = "500px";
  sidebar.style.height = "100%";
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "0";
  sidebar.style.backgroundColor = "white";
  sidebar.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";
  sidebar.style.zIndex = "9999";

  const header = document.createElement("h1");
  header.style.textAlign = "center";
  header.style.fontSize = "24px";
  header.style.fontWeight = "bold";
  header.style.padding = "10px";
  header.textContent = "Data Viewer";
  sidebar.appendChild(header);

  // Create tab controls
  const tabContainer = document.createElement("div");
  tabContainer.style.display = "flex";
  tabContainer.style.justifyContent = "space-around";
  tabContainer.style.marginBottom = "10px";

  const tab1 = document.createElement("button");
  tab1.textContent = "Previous Data";
  tab1.style.flex = "1";
  tab1.style.cursor = "pointer";
  tab1.style.padding = "10px";
  tab1.style.borderBottom = "3px solid transparent";

  const tab2 = document.createElement("button");
  tab2.textContent = "All Data";
  tab2.style.flex = "1";
  tab2.style.cursor = "pointer";
  tab2.style.padding = "10px";
  tab2.style.borderBottom = "3px solid transparent";

  tabContainer.appendChild(tab1);
  tabContainer.appendChild(tab2);
  sidebar.appendChild(tabContainer);

  // Create content containers for each tab
  const contentPrevious = document.createElement("div");
  contentPrevious.id = "contentPrevious";
  contentPrevious.style.display = "none"; // Initially hidden
  contentPrevious.style.overflowY = "auto";
  contentPrevious.style.height = "calc(100% - 140px)";
  contentPrevious.style.padding = "10px";

  const contentAll = document.createElement("div");
  contentAll.id = "contentAll";
  contentAll.style.display = "none"; // Initially hidden
  contentAll.style.overflowY = "auto";
  contentAll.style.height = "calc(100% - 140px)";
  contentAll.style.padding = "10px";

  sidebar.appendChild(contentPrevious);
  sidebar.appendChild(contentAll);

  document.body.appendChild(sidebar);

  // Tab functionality
  function switchTab(tab) {
    if (tab === "previous") {
      contentPrevious.style.display = "block";
      contentAll.style.display = "none";
      tab1.style.borderBottom = "3px solid blue";
      tab2.style.borderBottom = "3px solid transparent";
    } else {
      contentPrevious.style.display = "none";
      contentAll.style.display = "block";
      tab1.style.borderBottom = "3px solid transparent";
      tab2.style.borderBottom = "3px solid blue";
      fetchDataFromDB("all");
    }
  }

  // Event listeners for tabs
  tab1.onclick = () => switchTab("previous");
  tab2.onclick = () => switchTab("all");

  // Default to show "Previous Data"
  switchTab("previous");

  // Create a resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.style.width = "10px";
  resizeHandle.style.height = "100%";
  resizeHandle.style.position = "absolute";
  resizeHandle.style.left = "0";
  resizeHandle.style.top = "0";
  resizeHandle.style.cursor = "ew-resize";
  sidebar.appendChild(resizeHandle);

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
      const newWidth = parseInt(window.getComputedStyle(sidebar).width, 10) - diff;
      sidebar.style.width = `${newWidth}px`;
      lastPageX = e.pageX;
    }
  });

  document.addEventListener("mouseup", function (e) {
    isResizing = false;
  });

  document.addEventListener("mouseup", handleTextSelection);
}

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 2) {
    fetchDataFromDB(selectedText);
  }
}

function fetchDataFromDB(keyword) {
  let message;
  let containerId = "contentPrevious";

  if (keyword == "all") {
    message = { action: "fetchData" };
    containerId = "contentAll";
  } else {
    message = { action: "searchData", keyword: keyword };
    containerId = "contentPrevious";
  }

  chrome.runtime.sendMessage(message, (response) => {
    console.log("Search results", response);
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear previous data

    response.entries?.forEach((entry) => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "8px";
      div.style.padding = "10px 10px";
      div.style.marginBottom = "10px";
      div.style.marginLeft = "10px";
      div.style.marginRight = "10px";
      div.style.backgroundColor = "#f9f9f9";
      div.style.position = "relative"; // Ensure position context for absolute positioning of delete button

      const id = document.createElement("p");
      id.style.textAlign = "center";
      id.innerHTML = `<strong>${entry.id}</strong>`;
      div.appendChild(id);

      const value = document.createElement("p");
      value.style.overflowWrap = "break-word";
      value.innerHTML = `<strong>Value:</strong> "${entry.data.value}"`;
      div.appendChild(value);

      const pageHeader = document.createElement("p");
      pageHeader.innerHTML = `<strong>Source:</strong> ${entry.data.pageHeader}`;
      div.appendChild(pageHeader);

      const createdAt = document.createElement("p");
      createdAt.innerHTML = `<i>${timeSince(entry.data.createdAt)}</i>`;
      div.appendChild(createdAt);

      const copyButton = document.createElement("button");
      copyButton.textContent = "Copy Value";
      copyButton.style.marginTop = "10px";
      copyButton.onclick = () => {
        navigator.clipboard.writeText(entry.data.value).then(() => {
          copyButton.textContent = "✔️";
          setTimeout(() => {
            copyButton.textContent = "Copy Value";
          }, 5000);
        });
      };
      div.appendChild(copyButton);

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.style.position = "absolute";
      deleteButton.style.top = "10px";
      deleteButton.style.right = "10px";
      deleteButton.onclick = () => {
        div.remove(); // Remove the entry div from the DOM
        chrome.runtime.sendMessage({ action: "deleteKey", id: entry.id });
      };
      div.appendChild(deleteButton);

      container.appendChild(div);
    });
  });
}

function init() {
  console.log("Formify content script initialized with DOM");
  const url = window.location.href;
  const pageHeader = document.title;
  const createdAt = new Date().toISOString();

  document.querySelectorAll("input, textarea").forEach((input) => {
    // Attach blur listener to each input/textarea
    input.addEventListener("blur", () => {
      console.log("Input blurred", input);
      let key = findLabel(input);

      // Prepare data object
      const value = input.value;
      const data = { value, url, pageHeader, createdAt };

      // Log the entry using found label as key
      console.log("Input blurred", { [key]: data });

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
  return label ? label.innerText.trim() : "Unknown";
}

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      console.log("Mutation", mutation);
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // ensure that the added node is not my custom sidebar
        let relatedToSidebar =
          Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE && node.closest("#my-custom-sidebar")) ||
          Array.from(mutation.removedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE && node.closest("#my-custom-sidebar"));

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

document.addEventListener("keydown", function (event) {
  console.log("Keydown", event);
  // Check if 'Option' (or 'Alt') and 'O' are pressed together
  if (event.ctrlKey && event.key === "o") {
    // Check if the sidebar does not already exist
    if (!document.getElementById("my-custom-sidebar")) {
      addCustomSidebar();
    }
  }
});

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
