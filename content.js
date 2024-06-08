// Messaging Background worker

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 2) {
    try {
      chrome.runtime.sendMessage({ action: "searchData", keyword: selectedText });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}

function saveData(entries) {
  try {
    chrome.runtime.sendMessage({ action: "saveData", entries });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

function toggleSideBar() {
  try {
    chrome.runtime.sendMessage({ action: "toggleSidebar" });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// Function to listen to input/textarea blur events

function inputListeningInit() {
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

// Add listeners to document

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    inputListeningInit();
    setupObserver();
    setupHotkeyListener();
  });
} else {
  inputListeningInit();
  setupObserver();
  setupHotkeyListener();
}

function setupHotkeyListener() {
  document.addEventListener("keydown", function (event) {
    chrome.storage.local.get(["hotKey1", "hotKey2"], function (items) {
      if (items.hotKey1 && items.hotKey2) {
        if (checkHotkeys(event, items.hotKey1, items.hotKey2)) {
          toggleSideBar();
        }
      }
    });
  });
}

document.addEventListener("mouseup", handleTextSelection);

// Helper functions

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const hasInputOrTextarea = Array.from(mutation.addedNodes).some(
          (node) => node.nodeName === "INPUT" || node.nodeName === "TEXTAREA" || node.querySelectorAll("input, textarea").length > 0
        );
        if (hasInputOrTextarea) {
          inputListeningInit();
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

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
