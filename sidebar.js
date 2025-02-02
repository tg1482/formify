chrome.runtime.connect({ name: "sidebar" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "displayData":
      updateSidebarUI(message.entries, message.keyword, message.totalCount);
      break;
    case "closeSidebar":
      window.close();
      break;
    case "refreshData":
      const searchbar = document.querySelector(".search-bar-container input");
      fetchDataFromDB(searchbar.value || "all");
      break;
    case "textSelected":
      handleTextSelection(message.selectedText);
      break;
    case "toggleSettings":
      toggleSettings();
      break;
    case "copyFocusedEntry":
      copyFocusedEntry(document.querySelectorAll(".data-entry"));
      break;
    case "deleteFocusedEntry":
      deleteFocusedEntry(document.querySelectorAll(".data-entry"));
      break;
    case "moveFocus":
      moveFocus(message.direction, document.querySelectorAll(".data-entry"));
      break;
    case "focusSearchBar":
      focusSearchBar();
      break;
    default:
      break;
  }
  return true;
});

function handleTextSelection(selectedText) {
  const searchbar = document.querySelector(".search-bar-container input");
  searchbar.value = selectedText;
  fetchDataFromDB(selectedText);
}

let focusedIndex = -1;

function addCustomSidebar() {
  const sidebar = createSidebarElement();
  document.body.appendChild(sidebar);
  focusFirstElement();
  setupKeyboardListeners(); // Add this line to set up the keyboard listeners
}

function setupKeyboardListeners() {
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey) {
      switch (event.key.toLowerCase()) {
        case "s":
          event.preventDefault();
          toggleSettings();
          break;
        case "c":
          event.preventDefault();
          copyFocusedEntry(document.querySelectorAll(".data-entry"));
          break;
        case "d":
          event.preventDefault();
          deleteFocusedEntry(document.querySelectorAll(".data-entry"));
          break;
        case "k":
          event.preventDefault();
          moveFocus(1, document.querySelectorAll(".data-entry"));
          break;
        case "j":
          event.preventDefault();
          moveFocus(-1, document.querySelectorAll(".data-entry"));
          break;
        case "o":
          event.preventDefault();
          window.close();
          break;
      }
    }
  });
}

function createSidebarElement() {
  const sidebar = document.createElement("div");
  sidebar.id = "formie-sidebar";

  sidebar.appendChild(createHeader());
  sidebar.appendChild(createContentPrevious());
  sidebar.appendChild(createBottomBar());
  sidebar.appendChild(createSettingsPanel());

  return sidebar;
}

function createHeader() {
  const header = document.createElement("h1");
  header.textContent = "Formify";
  return header;
}

function createContentPrevious() {
  const contentPrevious = document.createElement("div");
  contentPrevious.id = "contentPrevious";

  contentPrevious.appendChild(createCountDisplay());
  contentPrevious.appendChild(createSearchBar());
  contentPrevious.appendChild(createFilterContainer());
  contentPrevious.appendChild(createDataContainer());

  return contentPrevious;
}

function createSearchBar() {
  const searchBarContainer = document.createElement("div");
  searchBarContainer.className = "search-bar-container";
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.placeholder = "Search...";

  let searchTimeout;
  searchBar.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFiltersAndSearch, 300);
  });

  searchBarContainer.appendChild(searchBar);
  return searchBarContainer;
}

function createFilterContainer() {
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

  return filterContainer;
}

function createDataContainer() {
  const dataContainer = document.createElement("div");
  dataContainer.id = "dataContainer";
  return dataContainer;
}

function createBottomBar() {
  const bottomBar = document.createElement("div");
  bottomBar.id = "bottomBar";

  bottomBar.appendChild(createDeleteAllButton());
  bottomBar.appendChild(createSettingsButton());

  return bottomBar;
}

function createOverview() {
  const overview = document.createElement("div");
  overview.className = "overview";
  overview.innerHTML = `
    <p>Formify is a browser extension that automatically saves your form inputs locally. 
    It listens for changes in input fields and text areas, storing the data securely in your browser. 
    No data is sent to external servers, ensuring your privacy.</p>
    <p>Use the search bar below to find your saved entries quickly. 
    You can also manage your data retention settings and blacklists in the Settings panel.</p>
  `;
  return overview;
}

function createDeleteAllButton() {
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
  return deleteAllButton;
}

function createSettingsButton() {
  const settingsButton = document.createElement("button");
  settingsButton.innerHTML = "⚙ Settings";
  settingsButton.id = "settingsButton";
  settingsButton.onclick = toggleSettings;
  return settingsButton;
}

function createSettingsPanel() {
  const settingsPanel = document.createElement("div");
  settingsPanel.id = "settingsPanel";
  settingsPanel.style.display = "none";

  settingsPanel.appendChild(createSettingsTitle());
  settingsPanel.appendChild(createOverview());
  settingsPanel.appendChild(createBackButton());
  settingsPanel.appendChild(createDataRetentionSection());
  settingsPanel.appendChild(createWebsiteBlacklistSection());
  settingsPanel.appendChild(createTitleBlacklistSection());
  settingsPanel.appendChild(createNonEditableHotkeySection());

  return settingsPanel;
}

function createSettingsTitle() {
  const title = document.createElement("h2");
  title.textContent = "Settings";
  return title;
}

function createBackButton() {
  const backButton = document.createElement("button");
  backButton.id = "backButton";
  backButton.onclick = toggleSettings;
  return backButton;
}

function createNonEditableHotkeySection() {
  const nonEditableHotkeySection = document.createElement("div");
  nonEditableHotkeySection.className = "hotkey-section";

  const nonEditableTitle = document.createElement("h3");
  nonEditableTitle.textContent = "Other Hotkeys";
  nonEditableHotkeySection.appendChild(nonEditableTitle);

  const description = "These hotkeys are used to navigate the sidebar and perform actions. They work when you're inside the sidebar.";
  nonEditableHotkeySection.appendChild(createCollapsibleDescription(description));

  const hotkeys = [
    { keys: "Ctrl + O", description: "Open sidebar" },
    { keys: "Ctrl + S", description: "Toggle settings panel" },
    { keys: "Ctrl + C", description: "Copy focused entry" },
    { keys: "Ctrl + D", description: "Delete focused entry" },
    { keys: "Ctrl + J", description: "Move focus down" },
    { keys: "Ctrl + K", description: "Move focus up" },
    { keys: "ESC", description: "Exit settings" },
  ];

  hotkeys.forEach((hotkey) => {
    const hotkeyDiv = document.createElement("div");
    hotkeyDiv.className = "hotkey-info";
    hotkeyDiv.innerHTML = `<span class="hotkey-keys">${hotkey.keys}</span>: ${hotkey.description}`;
    nonEditableHotkeySection.appendChild(hotkeyDiv);
  });

  return nonEditableHotkeySection;
}

function createDataRetentionSection() {
  const dataRetentionSection = document.createElement("div");
  dataRetentionSection.className = "data-retention-section";

  const dataRetentionTitle = document.createElement("h3");
  dataRetentionTitle.textContent = "Data Retention Strategy";
  dataRetentionSection.appendChild(dataRetentionTitle);

  const description =
    "Choose how long to keep your data. 'Keep All Data' saves everything, while 'LRU' removes the least recently used entries after a specified number of days.";

  dataRetentionSection.appendChild(createCollapsibleDescription(description));

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

  const lruDaysContainer = document.createElement("div");
  lruDaysContainer.className = "lru-days-container";
  lruDaysContainer.style.display = "none";

  const lruDaysInput = document.createElement("input");
  lruDaysInput.type = "number";
  lruDaysInput.id = "lru-days";
  lruDaysInput.min = "1";
  lruDaysInput.value = "30"; // Set a default value
  lruDaysInput.placeholder = "Days to keep";

  const lruDaysLabel = document.createElement("span");
  lruDaysLabel.textContent = "days";
  lruDaysLabel.className = "lru-days-label";

  lruDaysContainer.appendChild(lruDaysInput);
  lruDaysContainer.appendChild(lruDaysLabel);

  strategyContainer.appendChild(lruDaysContainer);

  const saveStrategyButton = document.createElement("button");
  saveStrategyButton.textContent = "Save";
  saveStrategyButton.className = "save-strategy-button";
  saveStrategyButton.onclick = saveDataRetentionStrategy;

  strategyContainer.appendChild(saveStrategyButton);

  dataRetentionSection.appendChild(strategyContainer);

  // Add manual cleanup button
  const manualCleanupButton = document.createElement("button");
  manualCleanupButton.textContent = "Run Cleanup Now";
  manualCleanupButton.className = "manual-cleanup-button";
  manualCleanupButton.style.display = "none"; // Hide by default
  manualCleanupButton.onclick = runManualCleanup;
  dataRetentionSection.appendChild(manualCleanupButton);

  strategySelect.addEventListener("change", function () {
    const isLRU = this.value === "lru";
    lruDaysContainer.style.display = isLRU ? "flex" : "none";
    manualCleanupButton.style.display = isLRU ? "block" : "none";
  });

  return dataRetentionSection;
}

function createCollapsibleDescription(fullDescription) {
  const description = document.createElement("p");
  description.className = "section-description collapsible";
  const shortDescription = fullDescription.split(" ").slice(0, 8).join(" ");

  description.innerHTML = `
    <span class="short-desc">${shortDescription} <span class="expand-btn">...</span></span>
    <span class="full-desc" style="display: none;">${fullDescription} <span class="collapse-btn">Collapse</span></span>
  `;
  description.querySelector(".expand-btn").addEventListener("click", () => toggleDescription(description));
  description.querySelector(".collapse-btn").addEventListener("click", () => toggleDescription(description));

  return description;
}

function toggleDescription(descElement) {
  const shortDesc = descElement.querySelector(".short-desc");
  const fullDesc = descElement.querySelector(".full-desc");

  if (shortDesc.style.display !== "none") {
    shortDesc.style.display = "none";
    fullDesc.style.display = "inline";
  } else {
    shortDesc.style.display = "inline";
    fullDesc.style.display = "none";
  }
}

function createWebsiteBlacklistSection() {
  return createBlacklistSection("Website Blacklist", "websiteBlacklist");
}

function createTitleBlacklistSection() {
  return createBlacklistSection("Title Blacklist", "titleBlacklist");
}

function createTitleBlacklistDescription() {
  return "Add keywords to this blacklist to prevent Formify from saving entries with these words in their titles.";
}

function createWebsiteBlacklistDescription() {
  return "Add websites to this blacklist to prevent Formify from saving data from these domains.";
}

function createBlacklistSection(title, id) {
  const section = document.createElement("div");
  section.className = "blacklist-section";

  const sectionTitle = document.createElement("h3");
  sectionTitle.textContent = title;
  section.appendChild(sectionTitle);

  const description = id === "websiteBlacklist" ? createWebsiteBlacklistDescription() : createTitleBlacklistDescription();
  section.appendChild(createCollapsibleDescription(description));

  const input = document.createElement("input");
  input.type = "text";
  input.id = `${id}Input`;
  input.placeholder = "Enter keyword and press Enter";
  section.appendChild(input);

  const blacklistContainer = document.createElement("div");
  blacklistContainer.id = `${id}Container`;
  blacklistContainer.className = "blacklist-container";
  section.appendChild(blacklistContainer);

  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      addBlacklistItem(id, this.value);
      this.value = "";
    }
  });

  return section;
}

function addBlacklistItem(listId, value) {
  if (!value.trim()) return;

  const container = document.getElementById(`${listId}Container`);

  // Check for duplicates
  const existingItems = Array.from(container.querySelectorAll(".blacklist-item")).map((item) =>
    item.textContent.slice(0, -1).toLowerCase()
  );

  if (existingItems.includes(value.toLowerCase())) {
    return;
  }

  const item = document.createElement("div");
  item.className = "blacklist-item";
  item.textContent = value;

  const removeButton = document.createElement("button");
  removeButton.textContent = "X";
  removeButton.className = "remove-blacklist-item";
  removeButton.onclick = function () {
    container.removeChild(item);
    saveBlacklist(listId);
  };

  item.appendChild(removeButton);
  container.appendChild(item);
  saveBlacklist(listId);
}

function saveBlacklist(listId) {
  const items = Array.from(document.querySelectorAll(`#${listId}Container .blacklist-item`)).map((item) => item.textContent.slice(0, -1)); // Remove the 'X' from the text
  chrome.storage.local.set({ [listId]: items }, function () {
    console.log(`${listId} saved:`, items);
  });
}

function loadBlacklists() {
  chrome.storage.local.get(["websiteBlacklist", "titleBlacklist"], function (result) {
    if (result.websiteBlacklist) {
      result.websiteBlacklist.forEach((item) => addBlacklistItem("websiteBlacklist", item));
    }
    if (result.titleBlacklist) {
      result.titleBlacklist.forEach((item) => addBlacklistItem("titleBlacklist", item));
    }
  });
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
  chrome.storage.local.get(["dataRetentionStrategy", "lruDays"], function (items) {
    if (items.dataRetentionStrategy) {
      const strategySelect = document.getElementById("data-retention-strategy");
      strategySelect.value = items.dataRetentionStrategy;
      const lruDaysContainer = document.querySelector(".lru-days-container");
      const manualCleanupButton = document.querySelector(".manual-cleanup-button");
      const isLRU = items.dataRetentionStrategy === "lru";
      lruDaysContainer.style.display = isLRU ? "flex" : "none";
      manualCleanupButton.style.display = isLRU ? "block" : "none";
    }
    if (items.lruDays) {
      document.getElementById("lru-days").value = items.lruDays;
    }
    loadBlacklists();
  });
}

function saveSettings() {
  const dataRetentionStrategy = document.getElementById("data-retention-strategy").value;
  const lruDays = document.getElementById("lru-days").value;

  chrome.storage.local.set(
    {
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
      alert(`Manual cleanup completed successfully! ${response.deletedCount} record(s) deleted.`);
      fetchDataFromDB("all"); // Reload the data
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
  console.log("copyFocusedEntry");
  const focusedEntry = entries[focusedIndex];
  if (focusedEntry) {
    const value = focusedEntry.querySelector("p").textContent.replace(/^"|"$/g, "");
    const copyButton = focusedEntry.querySelector(".copy-button");
    copyEntry(value, copyButton);
  } else {
    console.log("No focused entry found");
  }
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
      updateSidebarUI(response.entries, keyword, response.totalCount);
    });
  });
}

function updateSidebarUI(entries, keyword, totalCount) {
  const container = document.getElementById("dataContainer");
  container.innerHTML = "";

  const searchbar = document.querySelector(".search-bar-container input");
  searchbar.value = keyword === "all" ? "" : keyword;

  // Update count display
  const countDisplay = document.getElementById("count-display");
  countDisplay.textContent = `Showing ${entries.length} of ${totalCount} results`;

  if (entries && entries.length > 0) {
    entries.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));
    entries.forEach((entry, index) => dataEntryTemplate(entry, container, index === entries.length - 1));
    focusFirstElement();
  } else {
    const noDataMessage = document.createElement("p");
    noDataMessage.textContent = "No data found.";
    noDataMessage.id = "no-data-message";
    container.appendChild(noDataMessage);
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
    { label: "Use Count", value: entry.useCount },
    { label: "Last Used", value: timeSince(entry.lastUsedAt) },
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

function copyEntry(text, button) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    updateCopyButtonState(button, successful);
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
    updateCopyButtonState(button, false);
  }

  document.body.removeChild(textArea);
}

function updateCopyButtonState(button, successful) {
  const originalText = button.textContent;
  button.textContent = successful ? "Copied!" : "Copy failed";
  setTimeout(() => {
    button.textContent = originalText;
  }, 1000);

  if (successful) {
    const entryId = button.closest(".data-entry").querySelector("h3 strong").textContent;
    chrome.runtime.sendMessage({ action: "updateUsageStats", id: entryId }, (response) => {
      if (response.success) {
        console.log("Usage stats updated successfully");
      } else {
        console.error("Failed to update usage stats:", response.error);
      }
    });
  }
}

function createCountDisplay() {
  const countDisplay = document.createElement("div");
  countDisplay.id = "count-display";
  countDisplay.className = "count-display";
  return countDisplay;
}

addCustomSidebar();

fetchDataFromDB("all");

const port = chrome.runtime.connect({ name: "sidebar-bg-port" });
