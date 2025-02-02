// Messaging Background worker

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();

  if (selectedText.length > 2) {
    try {
      chrome.runtime.sendMessage({ action: "textSelected", selectedText: selectedText });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}

function saveData(entries) {
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({ action: "saveData", entries }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error saving data:", chrome.runtime.lastError.message);
      } else {
        console.log(response.message);
      }
    });
  } else {
    console.error("Extension context invalidated. Please refresh the page.");
  }
}

function toggleSideBar() {
  chrome.runtime.sendMessage({ action: "toggleSidebar" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error toggling sidebar:", chrome.runtime.lastError);
    } else {
      console.log(response.message);
    }
  });
}

// Function to listen to input/textarea blur events

function inputListeningInit() {
  const url = window.location.href;
  const domain = new URL(url).hostname;
  const pageHeader = document.title;

  document.querySelectorAll("input, textarea").forEach((input) => {
    // Attach blur listener to each input/textarea
    input.addEventListener("blur", () => {
      let key = findLabel(input);
      console.log(key);
      // Prepare data object with additional information
      const value = input.value;
      const data = {
        value,
        url,
        domain,
        pageHeader,
        createdAt: new Date().toISOString(),
        inputType: input.tagName.toLowerCase(),
        inputName: input.name || null,
        inputId: input.id || null,
      };

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
    // Check for preceding siblings
    let sibling = input.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === "LABEL" || sibling.tagName === "P") {
        label = sibling;
        break;
      }
      sibling = sibling.previousElementSibling;
    }

    // If still no label, check parent's preceding siblings
    if (!label && input.parentElement) {
      sibling = input.parentElement.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === "LABEL" || sibling.tagName === "P") {
          label = sibling;
          break;
        }
        sibling = sibling.previousElementSibling;
      }
    }
  }

  // If still no label, check for any nearby text content
  if (!label) {
    const nearbyText = getNearbyText(input);
    if (nearbyText) {
      return nearbyText;
    }
  }

  return label ? label.innerText.trim() : null;
}

function getNearbyText(element, maxDistance = 3) {
  let current = element;
  let distance = 0;

  while (current && distance < maxDistance) {
    // Check previous siblings
    let sibling = current.previousElementSibling;
    while (sibling) {
      const text = sibling.textContent.trim();
      if (text) return text;
      sibling = sibling.previousElementSibling;
    }

    // Move up to parent
    current = current.parentElement;
    distance++;
  }

  return null;
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
    if (event.ctrlKey && event.key.toLowerCase() === "o") {
      event.preventDefault(); // Prevent the default browser action
      toggleSideBar();
    }
  });
}

document.addEventListener("mouseup", handleTextSelection);

// Helper functions

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const hasInputOrTextarea = Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeName === "INPUT" ||
            node.nodeName === "TEXTAREA" ||
            (node.nodeType === Node.ELEMENT_NODE && node.querySelectorAll("input, textarea").length > 0)
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

let isSidepanelOpen = false;

// Function to set up listeners when sidepanel is opened
function setupSidepanelListeners() {
  document.addEventListener("keydown", handleSidepanelKeypress);
}

// Function to remove listeners when sidepanel is closed
function removeSidepanelListeners() {
  document.removeEventListener("keydown", handleSidepanelKeypress);
}

// Handle keypress events for sidepanel
function handleSidepanelKeypress(event) {
  if (!isSidepanelOpen) return;

  if (event.ctrlKey) {
    switch (event.key.toLowerCase()) {
      case "s":
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "toggleSettings" } });
        break;
      case "c":
        event.preventDefault();
        chrome.runtime.sendMessage({
          action: "relayMessageToSidebar",
          message: { action: "copyFocusedEntry" },
        });
        chrome.runtime.sendMessage({ action: "focusSidebar" });
        break;
      case "d":
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "deleteFocusedEntry" } });
        break;
      // case "f":
      //   event.preventDefault();
      //   chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "focusSearchBar" } });
      //   break;
      case "k":
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "moveFocus", direction: 1 } });
        break;
      case "j":
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "moveFocus", direction: -1 } });
        break;
      case "Escape":
        event.preventDefault();
        chrome.runtime.sendMessage({ action: "relayMessageToSidebar", message: { action: "handleEscape" } });
        break;
    }
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sidepanelOpened") {
    isSidepanelOpen = true;
    setupSidepanelListeners();
  } else if (message.action === "sidepanelClosed") {
    isSidepanelOpen = false;
    removeSidepanelListeners();
  }
});
