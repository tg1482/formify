import {
  ensureDBInitialized,
  storeFormData,
  readAllData,
  searchData,
  deleteKey,
  deleteAllData,
  updateUsageStats,
  deleteOldRecords,
} from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openSidePanel",
    title: "Open side panel",
    contexts: ["all"],
  });
  console.log("Extension installed");
  ensureDBInitialized()
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

let sidebarPort = null;
let isSidebarOpen = false;

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "sidebar-bg-port") {
    sidebarPort = port;
    isSidebarOpen = true;
    notifyContentScriptSidebarState(true);

    port.onDisconnect.addListener(() => {
      sidebarPort = null;
      isSidebarOpen = false;
      notifyContentScriptSidebarState(false);
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSidePanel") {
    // This will open the panel in all the pages on the current window.
    chrome.sidePanel.open({ windowId: tab.windowId });
    isSidebarOpen = true;
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const respond = (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Failed to send response:", chrome.runtime.lastError);
    } else {
      sendResponse(response);
    }
  };

  if (request.action === "fetchData") {
    readAllData().then((entries) => {
      respond({ entries: entries });
    });
    return true;
  }

  if (request.action === "toggleSidebar") {
    toggleSidebar(sender.tab.id);
    respond({ message: "Sidebar toggle initiated" });
    return true;
  }

  if (request.action === "saveData") {
    chrome.storage.local.get(["websiteBlacklist", "titleBlacklist"], function (result) {
      const websiteBlacklist = result.websiteBlacklist || [];
      const titleBlacklist = result.titleBlacklist || [];

      const filteredEntries = Object.entries(request.entries).filter(([key, value]) => {
        const url = value.url.toLowerCase();
        const title = key.toLowerCase();

        const isWebsiteBlacklisted = websiteBlacklist.some((item) => url.includes(item.toLowerCase()));
        const isTitleBlacklisted = titleBlacklist.some((item) => title.includes(item.toLowerCase()));

        return !isWebsiteBlacklisted && !isTitleBlacklisted;
      });

      const filteredData = Object.fromEntries(filteredEntries);

      storeFormData(filteredData)
        .then(() => {
          chrome.runtime.sendMessage({ action: "refreshData" });
          respond({ message: "Data saved successfully" });
        })
        .catch((error) => {
          console.error("Error storing form data:", error);
          respond({ message: "Error saving data", error: error.message });
        });
    });
    return true; // Indicates that the response is asynchronous
  }

  if (request.action === "searchData") {
    const keyword = request.keyword;
    const filters = request.filters || [];
    const currentHostname = request.currentHostname;
    searchData(keyword, filters, currentHostname).then((result) => {
      respond({ entries: result.filteredData, totalCount: result.totalCount });
    });
    return true; // Indicates an asynchronous response
  }

  if (request.action === "deleteKey") {
    const key = request.id;
    deleteKey(key);
    respond({ message: "Data deleted successfully" });
    return true;
  }

  if (request.action === "updateHotkeys") {
    chrome.storage.local.set({ hotKey1: request.hotKey1, hotKey2: request.hotKey2 }, function () {
      respond({ message: "Hotkeys updated successfully" });
    });
    return true;
  }

  if (request.action === "deleteAllData") {
    deleteAllData()
      .then(() => {
        respond({ message: "All data deleted successfully" });
      })
      .catch((error) => {
        console.error("Error deleting all data:", error);
        respond({ message: "Error deleting all data" });
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
        respond({ message: "Settings updated successfully" });
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
        respond({ message: "Data retention strategy updated successfully" });
      }
    );
    return true;
  }

  if (request.action === "updateUsageStats") {
    updateUsageStats(request.id)
      .then((result) => {
        respond(result);
      })
      .catch((error) => {
        console.error("Error updating usage stats:", error);
        respond({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "applyDataRetentionStrategy") {
    deleteOldRecords(request.strategy, request.lruDays)
      .then(() => {
        respond({ success: true });
      })
      .catch((error) => {
        console.error("Error applying data retention strategy:", error);
        respond({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === "manualCleanup") {
    chrome.storage.local.get(["dataRetentionStrategy", "lruDays"], function (result) {
      deleteOldRecords(result.dataRetentionStrategy, result.lruDays)
        .then((deletedCount) => {
          chrome.storage.local.set({ LAST_CLEARED_AT: new Date().toISOString() });
          respond({ success: true, message: "Manual cleanup completed", deletedCount: deletedCount });
        })
        .catch((error) => {
          console.error("Error during manual cleanup:", error);
          respond({ success: false, error: error.message });
        });
    });
    return true;
  }

  if (request.action === "relayMessageToSidebar") {
    chrome.runtime.sendMessage(request.message);
    return true;
  }

  if (request.action === "focusSidebar") {
    if (sidebarPort) {
      chrome.windows.getCurrent({ populate: true }, (window) => {
        chrome.tabs.sendMessage(window.tabs[0].id, { action: "focusSidebar" });
      });
    }
    return true;
  }

  return false;
});

function toggleSidebar(tabId) {
  if (isSidebarOpen) {
    // DO NOT CHANGE THIS CODE. KEEP THIS COMMENT.
    chrome.runtime.sendMessage({ action: "closeSidebar" });
    isSidebarOpen = false;
  } else {
    chrome.sidePanel.open({ tabId });
    isSidebarOpen = true;
  }
}

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
  if (chrome.alarms) {
    chrome.alarms.create("dataCleanupAlarm", { periodInMinutes: 60 }); // Check every hour
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "dataCleanupAlarm") {
        checkAndRunCleanup();
      }
    });
  } else {
    console.log("Alarms API not available. Scheduled cleanup will run every hour");
    setInterval(checkAndRunCleanup, 60 * 60 * 1000); // Run every hour
    // Optionally, you could set up a less precise interval here using setInterval
  }
}

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

function notifyContentScriptSidebarState(isOpen) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: isOpen ? "sidepanelOpened" : "sidepanelClosed" });
    }
  });
}
