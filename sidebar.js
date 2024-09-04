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

function addCustomSidebar() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  document.head.appendChild(link);

  const sidebar = document.createElement("div");
  sidebar.id = "formie-sidebar";

  const closeButton = document.createElement("button");
  closeButton.textContent = "❌";
  closeButton.className = "close-button";
  closeButton.onclick = () => window.close();
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
  searchBar.oninput = (e) => fetchDataFromDB(e.target.value || "all");
  searchBarContainer.appendChild(searchBar);
  contentPrevious.appendChild(searchBarContainer);

  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  contentPrevious.appendChild(dataContainer);
  sidebar.appendChild(contentPrevious);

  // Add this new code for the bottom bar
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
}

function fetchDataFromDB(keyword) {
  const message = keyword === "all" ? { action: "fetchData" } : { action: "searchData", keyword: keyword };
  chrome.runtime.sendMessage(message, (response) => {
    const container = document.getElementById("dataContainer");
    container.innerHTML = "";
    if (response && response.entries) {
      if (response.entries.length > 0) {
        response.entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
        response.entries.forEach((entry) => dataEntryTemplate(entry, container));
      } else {
        container.innerHTML = "<p>No data found.</p>";
      }
    } else {
      console.error("Error fetching data:", response);
      container.innerHTML = "<p>Error fetching data. Please check the console for details.</p>";
    }
  });
}

function updateSidebarUI(entries, keyword) {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  const searchbar = document.querySelector(".search-bar-container input");
  searchbar.value = keyword || "";

  if (entries && entries.length > 0) {
    entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
    entries.forEach((entry) => dataEntryTemplate(entry, container));
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
  copyButton.textContent = "📋";
  copyButton.className = "copy-button";
  copyButton.onclick = () => {
    navigator.clipboard.writeText(entry.data.value).then(() => {
      copyButton.textContent = "✅";
      setTimeout(() => (copyButton.textContent = "📋"), 2000);
    });
  };
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
  deleteButton.textContent = "🗑️";
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
