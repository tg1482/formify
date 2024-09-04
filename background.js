import { initDB, storeFormData, readAllData, searchData, deleteKey, deleteAllData } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openSidePanel",
    title: "Open side panel",
    contexts: ["all"],
  });
  console.log("Extension installed");
  initDB()
    .then(() => {
      console.log("Database initialized successfully");
      initHotKeys();
    })
    .catch((error) => {
      console.error("Failed to initialize database:", error);
    });
});

let sidePanelOpen = false;
let sidebarPort = null;

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSidePanel") {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
    isSidebarOpen = true;
  }
  return true;
});

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "mySidepanel") {
    sidePanelOpen = true;
    sidebarPort = port;

    port.onDisconnect.addListener(() => {
      sidePanelOpen = false;
      sidebarPort = null;
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    readAllData().then((entries) => {
      sendResponse({ entries: entries });
    });
    return true;
  }

  if (request.action === "toggleSidebar") {
    if (sidePanelOpen) {
      chrome.sidePanel.close();
    } else {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ message: sidePanelOpen ? "Sidebar closed" : "Sidebar opened" });
    return true;
  }

  if (request.action === "saveData") {
    storeFormData(request.entries).then(() => {
      if (sidebarPort) {
        sidebarPort.postMessage({ action: "refreshData" });
      }
      sendResponse({ message: "Data saved successfully" });
    });
    return true; // To indicate asynchronous response
  }

  if (request.action === "searchData") {
    const keyword = request.keyword;
    searchData(keyword).then((filteredData) => {
      sendResponse({ entries: filteredData });
    });
    return true; // Indicates an asynchronous response
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
    deleteAllData()
      .then(() => {
        sendResponse({ message: "All data deleted successfully" });
      })
      .catch((error) => {
        console.error("Error deleting all data:", error);
        sendResponse({ message: "Error deleting all data" });
      });
    return true;
  }
  return false;
});

function initHotKeys() {
  chrome.storage.local.get(["hotKey1", "hotKey2"], function (result) {
    if (result.hotKey1 === undefined || result.hotKey2 === undefined) {
      chrome.storage.local.set({ hotKey1: "Ctrl", hotKey2: "O" }, function () {
        if (chrome.runtime.lastError) {
          console.error("Error setting hotkeys:", chrome.runtime.lastError);
        } else {
          console.log("Default hotkeys set successfully");
        }
      });
    }
  });
}
