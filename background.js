import { initDB, storeFormData, readAllData, searchData, deleteKey, deleteAllData } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openSidePanel",
    title: "Open side panel",
    contexts: ["all"],
  });
  console.log("Extension installed");
  initDB();
});

let isSidebarOpen = false;

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSidePanel") {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
    isSidebarOpen = true;
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    readAllData().then((entries) => {
      chrome.runtime.sendMessage({ action: "displayData", entries: entries });
      sendResponse({ message: "Data fetched successfully" });
    });
    return true;
  }

  if (request.action === "toggleSidebar") {
    if (isSidebarOpen) {
      chrome.runtime.sendMessage({ action: "closeSidebar" });
      isSidebarOpen = false;
      sendResponse({ message: "Sidebar closed" });
    } else {
      chrome.sidePanel.open({ tabId: sender.tab.id });
      isSidebarOpen = true;
      sendResponse({ message: "Sidebar opened" });
    }
    return true;
  }

  if (request.action === "saveData") {
    storeFormData(request.entries).then(() => {
      chrome.runtime.sendMessage({ action: "refreshData" });
      sendResponse({ message: "Data saved successfully" });
    });
    return true; // To indicate asynchronous response
  }

  if (request.action === "searchData") {
    const keyword = request.keyword;
    searchData(keyword).then((filteredData) => {
      chrome.runtime.sendMessage({ action: "displayData", entries: filteredData, keyword });
      sendResponse({ message: "Data searched successfully" });
    });
    return true;
  }

  if (request.action === "deleteKey") {
    const key = request.id;
    deleteKey(key);
    sendResponse({ message: "Data deleted successfully" });
    return true;
  }

  if (request.action === "updateHotkeys") {
    chrome.storage.local.set({ hotKey1: request.hotKey1, hotKey2: request.hotKey2 }, function () {
      sendResponse({ message: "Hotkeys updated successfully" });
    });
    return true;
  }

  if (request.action === "deleteAllData") {
    deleteAllData();
    sendResponse({ message: "All data deleted successfully" });
    return true;
  }
  return false;
});
