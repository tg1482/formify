import React, { useEffect, useState } from "react";

function Popup() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    // Listen to messages from the background script
    chrome.runtime.sendMessage({ action: "fetchData" }, function (response) {
      setEntries(response.entries);
    });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold">Previous Entries</h1>
      <ul>
        {entries.map((entry, index) => (
          <li key={index} className="bg-gray-100 rounded p-2 my-2">
            Header: {entry.header}, Data: {JSON.stringify(entry.data)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Popup;
