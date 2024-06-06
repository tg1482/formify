import { initDB, storeFormData } from "./db.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  // Initialize or upgrade IndexedDB
  initDB();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received");
  console.log(request);
  storeFormData(request.entries);
  sendResponse({ status: "Data stored" });
  return true; // To indicate asynchronous response
});
