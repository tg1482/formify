const dbName = "FormDataDB";
const storeName = "entries";

export function initDB() {
  let db;
  const delete_request = indexedDB.deleteDatabase(dbName);

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

  request.onsuccess = function (event) {
    storeFormData({ header: "test", data: "test" });
    console.log("Database opened successfully");
    readData(1);
    readAllData();
  };
}

export function storeFormData(data) {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;

    // Open a transaction as soon as the database is open
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    // Iterate through each key-value pair in the data object
    for (const [key, value] of Object.entries(data)) {
      const update_request = store.put({ id: key, data: value });

      update_request.onsuccess = function () {
        console.log("Form data stored for key:", key, "value:", value);
      };

      update_request.onerror = function (event) {
        console.error("Failed to store form data for key:", key, "error:", event.target.error);
      };
    }

    // Listen to transaction complete to confirm data is written
    transaction.oncomplete = function () {
      console.log("Transaction completed.");
    };

    transaction.onerror = function (event) {
      console.error("Transaction failed: ", event.target.error);
    };
  };

  open_request.onerror = function (event) {
    console.error("Database error: " + event.target.errorCode);
  };
}

export function readData(key) {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const get_request = store.get(key);

    get_request.onsuccess = function (event) {
      console.log("Data read", event.target.result);
    };

    get_request.onerror = function (event) {
      console.error("Failed to read data:", event.target.error);
    };
  };
}

export function readAllData() {
  const open_request = indexedDB.open(dbName);

  open_request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const cursor_request = store.openCursor();

    cursor_request.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        console.log("Data key:", cursor.key);
        console.log("Data read:", cursor.value);
        cursor.continue(); // Move to the next object in the store
      } else {
        console.log("No more entries!");
      }
    };

    cursor_request.onerror = function (event) {
      console.error("Failed to read data:", event.target.error);
    };
  };

  open_request.onerror = function (event) {
    console.error("Database error:", event.target.errorCode);
  };
}
