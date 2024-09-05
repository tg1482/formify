chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.action) {
    case "displayData":
      updateSidebarUI(message.entries, message.keyword);
      break;
    case "closeSidebar":
      window.close();
      break;
    case "refreshData":
      const searchbar = document.querySelector(".search-bar-container input");
      fetchDataFromDB(searchbar.value || "all");
      break;
    default:
      console.warn("Unhandled message action:", message.action);
  }
  return true;
});

let focusedIndex = -1;

function addCustomSidebar() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  document.head.appendChild(link);

  const sidebar = document.createElement("div");
  sidebar.id = "formie-sidebar";

  const header = document.createElement("h1");
  header.textContent = "Formie Data";
  sidebar.appendChild(header);

  const contentPrevious = document.createElement("div");
  contentPrevious.id = "contentPrevious";
  const searchBarContainer = document.createElement("div");
  searchBarContainer.className = "search-bar-container";
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.placeholder = "Search...";

  let searchTimeout;
  searchBar.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFiltersAndSearch();
    }, 300); // 300ms delay
  });

  searchBarContainer.appendChild(searchBar);
  contentPrevious.appendChild(searchBarContainer);

  // Add filter buttons
  const filterContainer = document.createElement("div");
  filterContainer.className = "filter-container";
  const filterButtons = [
    { id: "thisSite", text: "This Site" },
    { id: "last60Mins", text: "Last 60 mins" },
    { id: "today", text: "Today" },
    { id: "thisWeek", text: "This Week" },
  ];

  filterButtons.forEach((button) => {
    const filterButton = document.createElement("button");
    filterButton.id = button.id;
    filterButton.textContent = button.text;
    filterButton.className = "filter-button";
    filterButton.addEventListener("click", () => toggleFilter(filterButton));
    filterContainer.appendChild(filterButton);
  });

  contentPrevious.appendChild(filterContainer);

  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  contentPrevious.appendChild(dataContainer);
  sidebar.appendChild(contentPrevious);

  const bottomBar = document.createElement("div");
  bottomBar.id = "bottomBar";

  const deleteAllButton = document.createElement("button");
  deleteAllButton.innerHTML = "☠ Delete All";
  deleteAllButton.id = "deleteAllButton";
  deleteAllButton.onclick = () => {
    if (confirm("Are you sure you want to delete all data?")) {
      chrome.runtime.sendMessage({ action: "deleteAllData" }, () => {
        fetchDataFromDB("all");
      });
    }
  };

  const settingsButton = document.createElement("button");
  settingsButton.innerHTML = "⚙ Settings";
  settingsButton.id = "settingsButton";
  settingsButton.onclick = toggleSettings;

  bottomBar.appendChild(deleteAllButton);
  bottomBar.appendChild(settingsButton);
  sidebar.appendChild(bottomBar);

  // Add settings panel
  const settingsPanel = createSettingsPanel();
  sidebar.appendChild(settingsPanel);

  document.body.appendChild(sidebar);

  // Add event listener for keydown events
  document.addEventListener("keydown", handleKeyPress);

  // Focus on the first element when the sidebar is opened
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sidebarOpened") {
      focusFirstElement();
    }
  });
}

function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settingsPanel";
  settingsPanel.style.display = "none";

  const title = document.createElement("h2");
  title.textContent = "Settings";
  settingsPanel.appendChild(title);

  // Editable hotkey section
  const editableHotkeySection = document.createElement("div");
  editableHotkeySection.className = "hotkey-section";

  const editableTitle = document.createElement("h3");
  editableTitle.textContent = "Sidebar Toggle Hotkey";
  editableHotkeySection.appendChild(editableTitle);

  const hotkeyContainer = document.createElement("div");
  hotkeyContainer.className = "hotkey-container";

  const key1Select = document.createElement("select");
  key1Select.id = "formie-key1";
  ["Ctrl", "Alt", "Shift"].forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key === "Alt" ? "Alt / Option" : key;
    key1Select.appendChild(option);
  });

  const plusSign = document.createElement("span");
  plusSign.className = "plus-sign";
  plusSign.textContent = "+";

  const key2Select = document.createElement("select");
  key2Select.id = "formie-key2";
  for (let i = 65; i <= 90; i++) {
    const option = document.createElement("option");
    option.value = String.fromCharCode(i);
    option.textContent = String.fromCharCode(i);
    if (i === 79) option.selected = true;
    key2Select.appendChild(option);
  }

  const saveButton = document.createElement("button");
  saveButton.className = "saveButton";
  saveButton.textContent = "Save";
  saveButton.onclick = saveSettings;

  hotkeyContainer.appendChild(key1Select);
  hotkeyContainer.appendChild(plusSign);
  hotkeyContainer.appendChild(key2Select);
  hotkeyContainer.appendChild(saveButton);

  editableHotkeySection.appendChild(hotkeyContainer);

  settingsPanel.appendChild(editableHotkeySection);

  // Non-editable hotkeys section
  const nonEditableHotkeySection = document.createElement("div");
  nonEditableHotkeySection.className = "hotkey-section";

  const nonEditableTitle = document.createElement("h3");
  nonEditableTitle.textContent = "Other Hotkeys";
  nonEditableHotkeySection.appendChild(nonEditableTitle);

  const backButton = document.createElement("button");
  backButton.id = "backButton";
  backButton.onclick = toggleSettings;
  settingsPanel.insertBefore(backButton, settingsPanel.firstChild);

  const hotkeys = [
    { keys: "Ctrl + S", description: "Toggle settings panel" },
    { keys: "Ctrl + C", description: "Copy focused entry" },
    { keys: "Ctrl + D", description: "Delete focused entry" },
    { keys: "↑", description: "Move focus up" },
    { keys: "↓", description: "Move focus down" },
    { keys: "ESC", description: "Exit settings" },
  ];

  hotkeys.forEach((hotkey) => {
    const hotkeyDiv = document.createElement("div");
    hotkeyDiv.className = "hotkey-info";
    hotkeyDiv.innerHTML = `<span class="hotkey-keys">${hotkey.keys}</span>: ${hotkey.description}`;
    nonEditableHotkeySection.appendChild(hotkeyDiv);
  });

  settingsPanel.appendChild(nonEditableHotkeySection);

  // Add data retention strategy section
  const dataRetentionSection = document.createElement("div");
  dataRetentionSection.className = "data-retention-section";

  const dataRetentionTitle = document.createElement("h3");
  dataRetentionTitle.textContent = "Data Retention Strategy";
  dataRetentionSection.appendChild(dataRetentionTitle);

  const strategyContainer = document.createElement("div");
  strategyContainer.className = "strategy-container";

  const strategySelect = document.createElement("select");
  strategySelect.id = "data-retention-strategy";

  const strategies = [
    { value: "all", text: "Keep All Data" },
    { value: "lru", text: "LRU (Least Recently Used)" },
  ];

  strategies.forEach((strategy) => {
    const option = document.createElement("option");
    option.value = strategy.value;
    option.textContent = strategy.text;
    strategySelect.appendChild(option);
  });

  strategyContainer.appendChild(strategySelect);

  const lruDaysInput = document.createElement("input");
  lruDaysInput.type = "number";
  lruDaysInput.id = "lru-days";
  lruDaysInput.min = "1";
  lruDaysInput.placeholder = "Days to keep data";
  lruDaysInput.style.display = "none";

  strategyContainer.appendChild(lruDaysInput);

  const saveStrategyButton = document.createElement("button");
  saveStrategyButton.textContent = "Save Strategy";
  saveStrategyButton.className = "save-strategy-button";
  saveStrategyButton.onclick = saveDataRetentionStrategy;

  strategyContainer.appendChild(saveStrategyButton);

  dataRetentionSection.appendChild(strategyContainer);

  strategySelect.addEventListener("change", function () {
    lruDaysInput.style.display = this.value === "lru" ? "inline-block" : "none";
  });

  // Add manual cleanup button
  const manualCleanupButton = document.createElement("button");
  manualCleanupButton.textContent = "Run Cleanup Now";
  manualCleanupButton.className = "manual-cleanup-button";
  manualCleanupButton.onclick = runManualCleanup;
  dataRetentionSection.appendChild(manualCleanupButton);

  settingsPanel.appendChild(dataRetentionSection);

  return settingsPanel;
}

function toggleSettings() {
  const settingsPanel = document.getElementById("settingsPanel");
  const dataContainer = document.getElementById("dataContainer");
  const searchBarContainer = document.querySelector(".search-bar-container");

  if (settingsPanel.style.display === "none") {
    settingsPanel.style.display = "block";
    dataContainer.style.display = "none";
    searchBarContainer.style.display = "none";
    loadCurrentSettings();
  } else {
    settingsPanel.style.display = "none";
    dataContainer.style.display = "block";
    searchBarContainer.style.display = "flex";
  }
}

function loadCurrentSettings() {
  chrome.storage.local.get(["hotKey1", "hotKey2", "dataRetentionStrategy", "lruDays"], function (items) {
    if (items.hotKey1 && items.hotKey2) {
      document.getElementById("formie-key1").value = items.hotKey1;
      document.getElementById("formie-key2").value = items.hotKey2;
    }
    if (items.dataRetentionStrategy) {
      document.getElementById("data-retention-strategy").value = items.dataRetentionStrategy;
      document.getElementById("lru-days").style.display = items.dataRetentionStrategy === "lru" ? "block" : "none";
    }
    if (items.lruDays) {
      document.getElementById("lru-days").value = items.lruDays;
    }
  });
}

function saveSettings() {
  const key1 = document.getElementById("formie-key1").value;
  const key2 = document.getElementById("formie-key2").value;
  const dataRetentionStrategy = document.getElementById("data-retention-strategy").value;
  const lruDays = document.getElementById("lru-days").value;

  chrome.storage.local.set(
    {
      hotKey1: key1,
      hotKey2: key2,
      dataRetentionStrategy: dataRetentionStrategy,
      lruDays: lruDays,
    },
    function () {
      alert("Settings saved successfully!");
      toggleSettings(); // Close settings panel after saving
    }
  );

  chrome.runtime.sendMessage({
    action: "updateSettings",
    hotKey1: key1,
    hotKey2: key2,
    dataRetentionStrategy: dataRetentionStrategy,
    lruDays: lruDays,
  });
}

function saveDataRetentionStrategy() {
  const dataRetentionStrategy = document.getElementById("data-retention-strategy").value;
  const lruDays = document.getElementById("lru-days").value;

  chrome.storage.local.set(
    {
      dataRetentionStrategy: dataRetentionStrategy,
      lruDays: lruDays,
    },
    function () {
      alert("Data retention strategy saved successfully!");
    }
  );

  chrome.runtime.sendMessage({
    action: "updateDataRetentionStrategy",
    dataRetentionStrategy: dataRetentionStrategy,
    lruDays: lruDays,
  });
}

function runManualCleanup() {
  chrome.runtime.sendMessage({ action: "manualCleanup" }, function (response) {
    if (response.success) {
      alert("Manual cleanup completed successfully!");
    } else {
      alert("Error during manual cleanup: " + response.error);
    }
  });
}

function focusFirstElement() {
  const entries = document.querySelectorAll(".data-entry");
  if (entries.length > 0) {
    focusedIndex = 0;
    entries[0].classList.add("focused");
    entries[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function handleKeyPress(event) {
  const entries = document.querySelectorAll(".data-entry");
  const settingsPanel = document.getElementById("settingsPanel");

  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    toggleSettings();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    if (settingsPanel.style.display === "block") {
      toggleSettings();
    }
    return;
  }

  if (entries.length === 0 && settingsPanel.style.display === "none") return;

  if (event.ctrlKey) {
    switch (event.key.toLowerCase()) {
      case "c":
        event.preventDefault();
        copyFocusedEntry(entries);
        break;
      case "d":
        event.preventDefault();
        deleteFocusedEntry(entries);
        break;
    }
  } else {
    const searchBar = document.querySelector(".search-bar-container input");
    if (searchBar !== document.activeElement) {
      switch (event.key.toLowerCase()) {
        case "arrowdown":
          event.preventDefault();
          moveFocus(1, entries);
          break;
        case "arrowup":
          event.preventDefault();
          moveFocus(-1, entries);
          break;
      }
    }
  }
}

function moveFocus(direction, entries) {
  if (focusedIndex !== -1) {
    entries[focusedIndex].classList.remove("focused");
  }
  focusedIndex = (focusedIndex + direction + entries.length) % entries.length;
  entries[focusedIndex].classList.add("focused");
  entries[focusedIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function copyFocusedEntry(entries) {
  const focusedEntry = entries[focusedIndex];
  const value = focusedEntry.querySelector("p").textContent.replace(/^"|"$/g, "");
  const copyButton = focusedEntry.querySelector(".copy-button");
  copyEntry(value, copyButton);
}

function deleteFocusedEntry(entries) {
  const focusedEntry = entries[focusedIndex];
  const id = focusedEntry.querySelector("h3 strong").textContent;
  chrome.runtime.sendMessage({ action: "deleteKey", id: id }, () => {
    focusedEntry.remove();
    // Adjust focus after deletion
    if (entries.length > 1) {
      focusedIndex = Math.min(focusedIndex, entries.length - 2);
      moveFocus(0, document.querySelectorAll(".data-entry"));
    } else {
      focusedIndex = -1;
    }
  });
}

function toggleFilter(button) {
  button.classList.toggle("active");
  applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
  const searchTerm = document.querySelector(".search-bar-container input").value;
  const activeFilters = Array.from(document.querySelectorAll(".filter-button.active")).map((btn) => btn.id);

  fetchDataFromDB(searchTerm, activeFilters);
}

function fetchDataFromDB(keyword, filters = []) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let currentHostname = "";
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const currentUrl = new URL(tabs[0].url);
        currentHostname = currentUrl.hostname;
      } catch (error) {
        console.error("Error parsing URL:", error);
        // If URL parsing fails, we'll just use an empty string for hostname
      }
    }

    const message = {
      action: "searchData",
      keyword: keyword || "all",
      filters: filters,
      currentHostname: currentHostname,
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error fetching data:", chrome.runtime.lastError);
        return;
      }
      updateSidebarUI(response.entries, keyword);
    });
  });
}

function updateSidebarUI(entries, keyword) {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  const searchbar = document.querySelector(".search-bar-container input");
  searchbar.value = keyword === "all" ? "" : keyword;

  if (entries && entries.length > 0) {
    entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
    entries.forEach((entry, index) => dataEntryTemplate(entry, container, index === entries.length - 1));
    focusFirstElement();
  } else {
    container.innerHTML = "<p>No data found.</p>";
  }
}

function dataEntryTemplate(entry, container, isLast) {
  const div = document.createElement("div");
  div.className = "data-entry";
  const id = document.createElement("h3");
  id.innerHTML = `<strong>${entry.id}</strong>`;
  div.appendChild(id);

  const valueContainer = document.createElement("div");
  valueContainer.className = "value-container";

  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.onclick = () => copyEntry(entry.data.value, copyButton);
  valueContainer.appendChild(copyButton);

  const value = document.createElement("p");
  value.id = "main-entry";
  value.innerHTML = `"${entry.data.value}"`;
  valueContainer.appendChild(value);
  div.appendChild(valueContainer);

  const contextContainer = document.createElement("div");
  contextContainer.className = "context-container";

  const essentialInfo = [
    { label: "Source", value: entry.data.pageHeader },
    { label: "Domain", value: entry.data.domain },
    { label: "URL", value: entry.data.url, isLink: true },
    { label: "Updated", value: timeSince(entry.data.createdAt) },
  ];

  essentialInfo.forEach(({ label, value, isLink }) => {
    if (value) {
      const p = document.createElement("p");
      p.innerHTML = `<span class="context-label">${label}:</span> `;
      if (isLink) {
        p.innerHTML += `<a href="${value}" target="_blank" class="context-link">${value}</a>`;
      } else {
        p.innerHTML += `<span class="context-value">${value}</span>`;
      }
      contextContainer.appendChild(p);
    }
  });

  div.appendChild(contextContainer);

  // Create collapsible details section only if there are details to show
  const detailsInfo = [
    { label: "Input Type", value: entry.data.inputType },
    { label: "Input Name", value: entry.data.inputName },
    { label: "Input ID", value: entry.data.inputId },
    { label: "Use Count", value: entry.data.useCount },
    { label: "Last Used", value: timeSince(entry.data.lastUsedAt) },
  ];

  const hasDetails = detailsInfo.some((item) => item.value);

  if (hasDetails) {
    const detailsButton = document.createElement("button");
    detailsButton.className = "details-button";
    detailsButton.innerHTML = "▼ Details";
    div.appendChild(detailsButton);

    const detailsContainer = document.createElement("div");
    detailsContainer.className = "details-container";
    detailsContainer.style.display = "none";

    detailsInfo.forEach(({ label, value }) => {
      if (value) {
        const p = document.createElement("p");
        p.innerHTML = `<span class="context-label">${label}:</span> <span class="context-value">${value}</span>`;
        detailsContainer.appendChild(p);
      }
    });

    div.appendChild(detailsContainer);

    detailsButton.onclick = () => {
      if (detailsContainer.style.display === "none") {
        detailsContainer.style.display = "block";
        detailsButton.innerHTML = "▲ Details";
      } else {
        detailsContainer.style.display = "none";
        detailsButton.innerHTML = "▼ Details";
      }
    };
  }

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.onclick = () => {
    div.remove();
    chrome.runtime.sendMessage({ action: "deleteKey", id: entry.id });
  };
  div.appendChild(deleteButton);
  container.appendChild(div);

  if (isLast) {
    div.classList.add("last-entry");
  }
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}

function copyEntry(value, button) {
  navigator.clipboard.writeText(value).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);

    // Update usage stats
    const entryId = button.closest(".data-entry").querySelector("h3 strong").textContent;
    chrome.runtime.sendMessage({ action: "updateUsageStats", id: entryId });
  });
}

addCustomSidebar();

fetchDataFromDB("all");

chrome.runtime.connect({ name: "mySidepanel" });
