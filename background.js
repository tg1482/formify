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
  if (info.menuItemId === "closeSidePanel") {
    chrome.sidePanel.close();
    isSidebarOpen = false;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    readAllData().then((entries) => {
      chrome.runtime.sendMessage({ action: "displayData", entries: entries });
    });
    return true; // To indicate asynchronous response
  }

  if (request.action === "toggleSidebar") {
    if (isSidebarOpen) {
      chrome.sidePanel.close();
    } else {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    return true;
  }

  if (request.action === "saveData") {
    storeFormData(request.entries);
    sendResponse({ status: "Data stored" });
    return true; // To indicate asynchronous response
  }

  if (request.action === "searchData") {
    const keyword = request.keyword;
    searchData(keyword).then((filteredData) => {
      chrome.runtime.sendMessage({ action: "displayData", entries: filteredData, keyword });
    });
    return true;
  }

  if (request.action === "deleteKey") {
    const key = request.id;
    deleteKey(key);
    sendResponse({ status: "Data deleted" });
    return true;
  }

  if (request.action === "updateHotkeys") {
    chrome.storage.local.set({ hotKey1: request.hotKey1, hotKey2: request.hotKey2 }, function () {
      console.log("Hotkeys updated successfully!");
    });
    return true;
  }

  if (request.action === "deleteAllData") {
    deleteAllData();
    sendResponse({ status: "All data deleted" });
    return true;
  }
});
