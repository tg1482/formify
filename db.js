let db;
const dbName = "FormDataDB";
const storeName = "entries";

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 5); // Keep the version number

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

      if (!db.objectStoreNames.contains("formData")) {
        const objectStore = db.createObjectStore("formData", { keyPath: "id", autoIncrement: true });
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

export function storeFormData(data) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

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
}

export function updateUsageStats(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

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
}

export function deleteOldRecords(strategy, lruDays) {
  return new Promise((resolve, reject) => {
    if (strategy === "all") {
      resolve(0); // No deletion needed
      return;
    }

    if (!db) {
      initDB()
        .then(() => {
          performDeletion(strategy, lruDays, resolve, reject);
        })
        .catch(reject);
    } else {
      performDeletion(strategy, lruDays, resolve, reject);
    }
  });
}

function performDeletion(strategy, lruDays, resolve, reject) {
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

      // Use createdAt if lastUsedAt is invalid
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
}

export function readData(key) {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const get_request = store.get(key);

    get_request.onsuccess = function (event) {};

    get_request.onerror = function (event) {
      console.error("Failed to read data:", event.target.error);
    };
  };
}

export function readAllData() {
  return new Promise((resolve, reject) => {
    const open_request = indexedDB.open(dbName);
    const data = [];
    open_request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const cursor_request = store.openCursor();

      cursor_request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          data.push(cursor.value);
          cursor.continue(); // Move to the next object in the store
        } else {
          resolve(data); // Resolve the promise with the data when done
        }
      };

      cursor_request.onerror = function (event) {
        console.error("Failed to read data:", event.target.error);
        reject(event.target.error); // Reject the promise on error
      };
    };

    open_request.onerror = function (event) {
      console.error("Database error:", event.target.errorCode);
      reject(event.target.errorCode); // Reject the promise on error
    };
  });
}

export function searchData(keyword, filters = [], currentHostname) {
  return new Promise((resolve, reject) => {
    const open_request = indexedDB.open(dbName);
    const filteredData = [];
    let totalCount = 0;

    open_request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const cursor_request = store.openCursor();

      cursor_request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          totalCount++;
          const entry = cursor.value;
          if (matchesFilters(entry, filters, currentHostname) && matchesKeyword(entry, keyword)) {
            filteredData.push(entry);
          }
          cursor.continue();
        } else {
          // Sort the filtered data based on matchPriority
          filteredData.sort((a, b) => {
            if (a.matchPriority !== b.matchPriority) {
              return a.matchPriority - b.matchPriority;
            }
            // If matchPriority is the same, sort alphabetically by id
            return a.id.toLowerCase().localeCompare(b.id.toLowerCase());
          });

          resolve({ filteredData, totalCount });
        }
      };

      cursor_request.onerror = function (event) {
        console.error("Failed to read data:", event.target.error);
        reject(event.target.error);
      };
    };

    open_request.onerror = function (event) {
      console.error("Database error:", event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

export function deleteKey(key) {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const delete_request = store.delete(key);

    delete_request.onsuccess = function () {};

    delete_request.onerror = function (event) {
      console.error("Failed to delete data for key:", key, "error:", event.target.error);
    };

    transaction.oncomplete = function () {};

    transaction.onerror = function (event) {
      console.error("Transaction failed on deletion:", event.target.error);
    };
  };

  open_request.onerror = function (event) {
    console.error("Database error on open during delete:", event.target.errorCode);
  };
}

export function deleteAllData() {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const clear_request = store.clear();

    clear_request.onsuccess = function () {
      console.log("All data deleted successfully.");
    };

    clear_request.onerror = function (event) {
      console.error("Failed to delete all data:", event.target.error);
    };

    transaction.oncomplete = function () {};

    transaction.onerror = function (event) {
      console.error("Transaction failed on all data deletion:", event.target.error);
    };
  };

  open_request.onerror = function (event) {
    console.error("Database error on open during delete:", event.target.errorCode);
  };
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
