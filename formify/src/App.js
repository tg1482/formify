import React, { useEffect, useState } from "react";

function Popup() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    // Listen to messages from the background script
    if (window.chrome && window.chrome.runtime) {
      window.chrome.runtime.sendMessage({ action: "fetchData" }, function (response) {
        console.log("Entries fetched", response);
        setEntries(response.entries);
      });
    }
  }, []);

  return (
    <div className="p-4 w-[500px]">
      <h1 className="text-lg font-bold">Previous Entries</h1>
      <ul>
        {entries?.map((entry, index) => (
          <li key={index} className="bg-gray-100 rounded p-2 my-2">
            <div className="flex flex-col">
              <span className="font-bold">ID: {entry.id}</span>
              <span>Value: {JSON.stringify(entry.data.value)}</span>
              <span>Page Header: {entry.data.pageHeader}</span>
              <span>Created At: {entry.data.createdAt}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Popup;
