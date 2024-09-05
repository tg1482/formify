import { initDB, storeFormData, readAllData, searchData, deleteKey, deleteAllData, updateUsageStats, deleteOldRecords } from "./db.js";

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
      initSettings();
      setupCleanupAlarm();
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
      // DO NOT CHANGE THIS CODE. KEEP THIS COMMENT.
      chrome.runtime.sendMessage({ action: "closeSidebar" });
    } else {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ message: sidePanelOpen ? "Sidebar closed" : "Sidebar opened" });
    return true;
  }

  if (request.action === "saveData") {
    storeFormData(request.entries)
      .then(() => {
        chrome.runtime.sendMessage({ action: "refreshData" });
        sendResponse({ message: "Data saved successfully" });
      })
      .catch((error) => {
        console.error("Error storing form data:", error);
        sendResponse({ message: "Error saving data", error: error.message });
      });
    return true; // Indicates that the response is asynchronous
  }

  if (request.action === "searchData") {
    const keyword = request.keyword;
    const filters = request.filters || [];
    const currentHostname = request.currentHostname;
    searchData(keyword, filters, currentHostname).then((result) => {
      sendResponse({ entries: result.filteredData, totalCount: result.totalCount });
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

  if (request.action === "updateSettings") {
    chrome.storage.local.set(
      {
        hotKey1: request.hotKey1,
        hotKey2: request.hotKey2,
        dataRetentionStrategy: request.dataRetentionStrategy,
        lruDays: request.lruDays,
      },
      function () {
        sendResponse({ message: "Settings updated successfully" });
      }
    );
    return true;
  }

  if (request.action === "updateDataRetentionStrategy") {
    chrome.storage.local.set(
      {
        dataRetentionStrategy: request.dataRetentionStrategy,
        lruDays: request.lruDays,
      },
      function () {
        sendResponse({ message: "Data retention strategy updated successfully" });
      }
    );
    return true;
  }

  if (request.action === "updateUsageStats") {
    updateUsageStats(request.id)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error updating usage stats:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "applyDataRetentionStrategy") {
    deleteOldRecords(request.strategy, request.lruDays)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error applying data retention strategy:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "manualCleanup") {
    chrome.storage.local.get(["dataRetentionStrategy", "lruDays"], function (result) {
      deleteOldRecords(result.dataRetentionStrategy, result.lruDays)
        .then(() => {
          chrome.storage.local.set({ LAST_CLEARED_AT: new Date().toISOString() });
          sendResponse({ success: true, message: "Manual cleanup completed" });
        })
        .catch((error) => {
          console.error("Error during manual cleanup:", error);
          sendResponse({ success: false, error: error.message });
        });
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

function initSettings() {
  chrome.storage.local.get(["dataRetentionStrategy", "lruDays", "LAST_CLEARED_AT"], function (result) {
    if (result.dataRetentionStrategy === undefined) {
      chrome.storage.local.set(
        {
          dataRetentionStrategy: "all",
          lruDays: 30,
          LAST_CLEARED_AT: new Date().toISOString(),
        },
        function () {
          if (chrome.runtime.lastError) {
            console.error("Error setting default data retention strategy:", chrome.runtime.lastError);
          } else {
            console.log("Default data retention strategy set successfully");
          }
        }
      );
    }
  });
}

function setupCleanupAlarm() {
  chrome.alarms.create("dataCleanupAlarm", { periodInMinutes: 60 }); // Check every hour
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dataCleanupAlarm") {
    checkAndRunCleanup();
  }
});

function checkAndRunCleanup() {
  chrome.storage.local.get(["LAST_CLEARED_AT", "dataRetentionStrategy", "lruDays"], function (result) {
    const lastClearedAt = new Date(result.LAST_CLEARED_AT);
    const now = new Date();
    const hoursSinceLastCleared = (now - lastClearedAt) / (1000 * 60 * 60);

    if (hoursSinceLastCleared >= 24) {
      console.log("Running scheduled cleanup");
      deleteOldRecords(result.dataRetentionStrategy, result.lruDays)
        .then(() => {
          chrome.storage.local.set({ LAST_CLEARED_AT: now.toISOString() });
          console.log("Scheduled cleanup completed");
        })
        .catch((error) => {
          console.error("Error during scheduled cleanup:", error);
        });
    }
  });
}
