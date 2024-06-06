import { initDB, storeFormData, readAllData, searchData, deleteKey, deleteAllData } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  initDB();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    readAllData().then((values) => {
      sendResponse({ entries: values });
    });
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
      sendResponse({ entries: filteredData });
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
