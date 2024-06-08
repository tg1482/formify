const dbName = "FormDataDB";
const storeName = "entries";

export function initDB() {
  let db;
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: "id" });
    }
  };

  request.onerror = function (event) {
    console.error("Database error: " + event.target.errorCode);
  };

  request.onsuccess = function (event) {};
}

export function storeFormData(data) {
  return new Promise((resolve, reject) => {
    const open_request = indexedDB.open(dbName);

    open_request.onsuccess = function (event) {
      const db = event.target.result;

      // Open a transaction as soon as the database is open
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      // Iterate through each key-value pair in the data object
      for (const [key, value] of Object.entries(data)) {
        const update_request = store.put({ id: cleanString(key), data: value });

        update_request.onsuccess = function () {};

        update_request.onerror = function (event) {
          console.error("Failed to store form data for key:", key, "error:", event.target.error);
          reject(event.target.error);
        };
      }

      // Listen to transaction complete to confirm data is written
      transaction.oncomplete = function () {
        resolve();
      };

      transaction.onerror = function (event) {
        console.error("Transaction failed: ", event.target.error);
        reject(event.target.error);
      };
    };

    open_request.onerror = function (event) {
      console.error("Database error: " + event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
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

export function searchData(keyword) {
  return new Promise((resolve, reject) => {
    const open_request = indexedDB.open(dbName);
    const filteredData = [];
    open_request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const cursor_request = store.openCursor();

      cursor_request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.key.toLowerCase().includes(keyword.toLowerCase())) {
            filteredData.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(filteredData); // Resolve the promise with filtered data
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
