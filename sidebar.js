import { showChat } from "./chat.js";

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

  // Create tabs container
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "tabs-container";

  const tabChat = document.createElement("button");
  tabChat.textContent = "Chat";
  tabChat.className = "tab";
  tabChat.onclick = () => {
    setActiveTab(tabChat);
    showChat();
  };
  tabsContainer.appendChild(tabChat);

  const tabHistory = document.createElement("button");
  tabHistory.textContent = "Data History";
  tabHistory.className = "tab";
  tabHistory.onclick = () => {
    setActiveTab(tabHistory);
    showHistory();
  };
  tabsContainer.appendChild(tabHistory);

  sidebar.appendChild(tabsContainer);

  const contentContainer = document.createElement("div");
  contentContainer.id = "contentContainer";
  sidebar.appendChild(contentContainer);

  document.body.appendChild(sidebar);

  // Initially load history view
  setActiveTab(tabHistory);
  showHistory();
}

function setActiveTab(activeTab) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.classList.remove("active");
  });
  activeTab.classList.add("active");
}

function showHistory() {
  console.log("showHistory");
  const container = document.getElementById("contentContainer");
  container.innerHTML = "";
  const searchBarContainer = document.createElement("div");
  searchBarContainer.className = "search-bar-container";
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.placeholder = "Search...";
  searchBar.oninput = (e) => fetchDataFromDB(e.target.value || "all");
  searchBarContainer.appendChild(searchBar);
  container.appendChild(searchBarContainer);

  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  container.appendChild(dataContainer);
  fetchDataFromDB("all");

  const deleteAllButton = document.createElement("button");
  deleteAllButton.textContent = "Delete All ☠️";
  deleteAllButton.className = "delete-all-button";
  deleteAllButton.onclick = () => {
    document.getElementById("dataContainer").innerHTML = "";
    chrome.runtime.sendMessage({ action: "deleteAll" });
  };
  container.appendChild(deleteAllButton);
}

function fetchDataFromDB(keyword) {
  const message = keyword === "all" ? { action: "fetchData" } : { action: "searchData", keyword: keyword };
  chrome.runtime.sendMessage(message, (response) => {
    const container = document.getElementById("dataContainer");
    container.innerHTML = "";
    response?.entries?.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
    response?.entries?.forEach((entry) => dataEntryTemplate(entry, container));
  });
}

function updateSidebarUI(entries, keyword) {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  if (keyword !== "all" && keyword !== "" && keyword !== undefined) {
    const searchbar = document.querySelector(".search-bar-container input");
    searchbar.value = keyword;
  }

  entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
  entries.forEach((entry) => dataEntryTemplate(entry, container));
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

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded");
  addCustomSidebar();
});
