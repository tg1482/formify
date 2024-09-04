let db; // Add this line at the top of the file, outside any function

const dbName = "FormDataDB";
const storeName = "entries";

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FormieDB", 1);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      console.log("Database opened successfully");
      db = event.target.result; // This line should now work
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      console.log("Database upgrade needed");
      const db = event.target.result;
      const objectStore = db.createObjectStore("formData", { keyPath: "id", autoIncrement: true });
      objectStore.createIndex("createdAt", "createdAt", { unique: false });
      console.log("Object store created");
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

    // Iterate through each key-value pair in the data object
    for (const [key, value] of Object.entries(data)) {
      const update_request = store.put({ id: cleanString(key), data: value });

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
