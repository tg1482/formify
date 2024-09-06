let db;
const dbName = "FormDataDB";
const storeName = "entries";

export async function ensureDBInitialized() {
  if (db) {
    return Promise.resolve(db);
  }
  return initDB();
}

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 5);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      console.log("Database opened successfully");
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      console.log("Database upgrade needed");
      const db = event.target.result;

      if (!db.objectStoreNames.contains(storeName)) {
        const objectStore = db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("createdAt", "createdAt", { unique: false });
        objectStore.createIndex("lastUsedAt", "lastUsedAt", { unique: false });
        objectStore.createIndex("useCount", "useCount", { unique: false });
        console.log("Object store created");
      } else {
        console.log("Object store already exists");
      }
    };
  });
}

export async function storeFormData(data) {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      for (const [key, value] of Object.entries(data)) {
        const now = new Date().toISOString();
        const update_request = store.put({
          id: cleanString(key),
          data: value,
          createdAt: value.createdAt || now,
          lastUsedAt: value.lastUsedAt || now,
          useCount: value.useCount || 0,
        });

        update_request.onerror = function (event) {
          console.error("Failed to store form data for key:", key, "error:", event.target.error);
          reject(event.target.error);
        };
      }

      transaction.oncomplete = function () {
        resolve();
      };

      transaction.onerror = function (event) {
        console.error("Transaction failed: ", event.target.error);
        reject(event.target.error);
      };
    });
  });
}

export async function updateUsageStats(id) {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = function (event) {
        const data = event.target.result;
        if (data) {
          data.lastUsedAt = new Date().toISOString();
          data.useCount = (data.useCount || 0) + 1;

          const updateRequest = store.put(data);
          updateRequest.onsuccess = function () {
            resolve({ success: true });
          };
          updateRequest.onerror = function (event) {
            reject({ success: false, error: event.target.error });
          };
        } else {
          reject({ success: false, error: "Entry not found" });
        }
      };

      request.onerror = function (event) {
        reject({ success: false, error: event.target.error });
      };
    });
  });
}

export async function deleteOldRecords(strategy, lruDays) {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      if (strategy === "all") {
        resolve(0);
        return;
      }

      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      const deletePromises = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lruDays);
      let deletedCount = 0;

      request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          const lastUsedDate = new Date(record.lastUsedAt);
          const createdDate = new Date(record.createdAt);

          const dateToCompare = isNaN(lastUsedDate.getTime()) ? createdDate : lastUsedDate;
          if (dateToCompare < cutoffDate) {
            deletePromises.push(
              new Promise((resolveDelete) => {
                const deleteRequest = cursor.delete();
                deleteRequest.onsuccess = () => {
                  deletedCount++;
                  resolveDelete();
                };
              })
            );
          }
          cursor.continue();
        } else {
          Promise.all(deletePromises)
            .then(() => resolve(deletedCount))
            .catch(reject);
        }
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  });
}

export async function readAllData() {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        console.error("Failed to read data:", event.target.error);
        reject(event.target.error);
      };
    });
  });
}

export async function searchData(keyword, filters = [], currentHostname) {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = function (event) {
        const allData = event.target.result;
        const filteredData = allData.filter((entry) => matchesFilters(entry, filters, currentHostname) && matchesKeyword(entry, keyword));
        resolve({ filteredData, totalCount: allData.length });
      };

      request.onerror = function (event) {
        console.error("Failed to search data:", event.target.error);
        reject(event.target.error);
      };
    });
  });
}

export async function deleteKey(key) {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = function () {
        resolve();
      };

      request.onerror = function (event) {
        console.error("Failed to delete data for key:", key, "error:", event.target.error);
        reject(event.target.error);
      };
    });
  });
}

export async function deleteAllData() {
  return ensureDBInitialized().then(() => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = function () {
        console.log("All data deleted successfully.");
        resolve();
      };

      request.onerror = function (event) {
        console.error("Failed to delete all data:", event.target.error);
        reject(event.target.error);
      };
    });
  });
}

function toSentenceCase(str) {
  return str.replace(/(^\w|\s+\w)/g, function (match) {
    return match.toUpperCase();
  });
}

function cleanString(str) {
  return toSentenceCase(str.trim().replace(/^[^\w]+|[^\w]+$/g, ""));
}

function matchesFilters(entry, filters, currentHostname) {
  if (filters.length === 0) return true;

  const now = new Date();
  const entryDate = new Date(entry.data.createdAt);

  return filters.every((filter) => {
    switch (filter) {
      case "thisSite":
        return (entry.data.domain || new URL(entry.data.url).hostname) === currentHostname;
      case "last60Mins":
        return now - entryDate <= 60 * 60 * 1000;
      case "today":
        return entryDate.toDateString() === now.toDateString();
      case "thisWeek":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return entryDate >= weekAgo;
      default:
        return true;
    }
  });
}

function matchesKeyword(entry, keyword) {
  if (keyword === "all") return true;

  const searchableFields = [
    { field: "id", value: entry.id },
    { field: "value", value: entry.data.value },
    { field: "pageHeader", value: entry.data.pageHeader },
    { field: "url", value: entry.data.url },
    { field: "domain", value: entry.data.domain },
  ];

  return searchableFields.some((item) => item.value && item.value.toLowerCase().includes(keyword.toLowerCase()));
}
