chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "displayData") {
    updateSidebarUI(message.entries, message.keyword);
    return true;
  }
  if (message.action === "closeSidebar") {
    window.close();
    return true;
  }
  if (message.action === "refreshData") {
    const searchbar = document.querySelector(".search-bar-container input");
    if (searchbar.value === "") {
      fetchDataFromDB("all");
    } else {
      fetchDataFromDB(searchbar.value);
    }
    return true;
  }
  return false;
});

let focusedIndex = -1;

function addCustomSidebar() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  document.head.appendChild(link);

  const sidebar = document.createElement("div");
  sidebar.id = "formie-sidebar";

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

  let searchTimeout;
  searchBar.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchDataFromDB(e.target.value || "all");
    }, 300); // 300ms delay
  });

  searchBarContainer.appendChild(searchBar);
  contentPrevious.appendChild(searchBarContainer);

  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  contentPrevious.appendChild(dataContainer);
  sidebar.appendChild(contentPrevious);

  const bottomBar = document.createElement("div");
  bottomBar.id = "bottomBar";

  const deleteAllButton = document.createElement("button");
  deleteAllButton.textContent = "Delete All";
  deleteAllButton.id = "deleteAllButton";
  deleteAllButton.onclick = () => {
    if (confirm("Are you sure you want to delete all data?")) {
      chrome.runtime.sendMessage({ action: "deleteAllData" }, () => {
        fetchDataFromDB("all");
      });
    }
  };

  bottomBar.appendChild(deleteAllButton);
  sidebar.appendChild(bottomBar);

  document.body.appendChild(sidebar);

  // Add event listener for keydown events
  document.addEventListener("keydown", handleKeyPress);

  // Focus on the first element when the sidebar is opened
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sidebarOpened") {
      focusFirstElement();
    }
  });
}

function focusFirstElement() {
  const entries = document.querySelectorAll(".data-entry");
  if (entries.length > 0) {
    focusedIndex = 0;
    entries[0].classList.add("focused");
    entries[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function handleKeyPress(event) {
  const entries = document.querySelectorAll(".data-entry");
  if (entries.length === 0) return;

  switch (event.key.toLowerCase()) {
    case "arrowdown":
      event.preventDefault();
      moveFocus(1, entries);
      break;
    case "arrowup":
      event.preventDefault();
      moveFocus(-1, entries);
      break;
    case "c":
      if (event.ctrlKey) {
        event.preventDefault();
        copyFocusedEntry(entries);
      }
      break;
    case "d":
      if (event.ctrlKey) {
        event.preventDefault();
        deleteFocusedEntry(entries);
      }
      break;
  }
}

function moveFocus(direction, entries) {
  if (focusedIndex !== -1) {
    entries[focusedIndex].classList.remove("focused");
  }
  focusedIndex = (focusedIndex + direction + entries.length) % entries.length;
  entries[focusedIndex].classList.add("focused");
  entries[focusedIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function copyFocusedEntry(entries) {
  const focusedEntry = entries[focusedIndex];
  const value = focusedEntry.querySelector("p").textContent.replace(/^"|"$/g, "");
  navigator.clipboard.writeText(value).then(() => {
    // Visual feedback for copy
    focusedEntry.classList.add("copied");
    setTimeout(() => focusedEntry.classList.remove("copied"), 500);
  });
}

function deleteFocusedEntry(entries) {
  const focusedEntry = entries[focusedIndex];
  const id = focusedEntry.querySelector("h3 strong").textContent;
  chrome.runtime.sendMessage({ action: "deleteKey", id: id }, () => {
    focusedEntry.remove();
    // Adjust focus after deletion
    if (entries.length > 1) {
      focusedIndex = Math.min(focusedIndex, entries.length - 2);
      moveFocus(0, document.querySelectorAll(".data-entry"));
    } else {
      focusedIndex = -1;
    }
  });
}

function fetchDataFromDB(keyword) {
  const message = keyword === "all" ? { action: "fetchData" } : { action: "searchData", keyword: keyword };

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error fetching data:", chrome.runtime.lastError);
      return;
    }
    updateSidebarUI(response.entries, keyword);
  });
}

function updateSidebarUI(entries, keyword) {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  const searchbar = document.querySelector(".search-bar-container input");
  searchbar.value = keyword === "all" ? "" : keyword;

  if (entries && entries.length > 0) {
    entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
    entries.forEach((entry) => dataEntryTemplate(entry, container));
    focusFirstElement();
  } else {
    container.innerHTML = "<p>No data found.</p>";
  }
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
  copyButton.className = "copy-button";
  valueContainer.appendChild(copyButton);

  const value = document.createElement("p");
  value.innerHTML = `"${entry.data.value}"`;
  value.style.marginLeft = "10px";
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
  deleteButton.className = "delete-button";
  deleteButton.onclick = () => {
    div.remove();
    chrome.runtime.sendMessage({ action: "deleteKey", id: entry.id });
  };
  div.appendChild(deleteButton);
  container.appendChild(div);
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

addCustomSidebar();

fetchDataFromDB("all");

document.addEventListener("DOMContentLoaded", () => fetchDataFromDB("all"));

// Add this line at the end of the file
chrome.runtime.connect({ name: "mySidepanel" });
