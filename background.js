import { initDB, storeFormData, readAllData, searchData } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  // Initialize or upgrade IndexedDB
  initDB();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchData") {
    readAllData().then((values) => {
      console.log("Values", values);
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
      console.log("Filtered data", filteredData);
      sendResponse({ entries: filteredData });
    });
    return true;
  }
});
