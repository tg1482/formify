document.addEventListener("mouseup", handleTextSelection);

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 2) {
    chrome.runtime.sendMessage({ action: "searchData", keyword: selectedText });
  }
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
  chrome.runtime.sendMessage({ action: "toggleSidebar" });
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
