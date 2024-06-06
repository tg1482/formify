document.addEventListener("DOMContentLoaded", function () {
  const key2Select = document.getElementById("formify-key2");
  // Dynamically add alphabet letters to the dropdown
  for (let i = 65; i <= 90; i++) {
    // ASCII values for A-Z
    const option = document.createElement("option");
    option.value = String.fromCharCode(i);
    option.text = String.fromCharCode(i);
    key2Select.appendChild(option);
  }

  // Load the currently saved hotkeys and set them as the default selections
  chrome.storage.local.get(["hotKey1", "hotKey2"], function (items) {
    if (items.hotKey1 && items.hotKey2) {
      document.getElementById("formify-key1").value = items.hotKey1;
      key2Select.value = items.hotKey2;
    }
  });
});

function saveSettings() {
  const key1 = document.getElementById("formify-key1").value;
  const key2 = document.getElementById("formify-key2").value;

  // Save settings
  chrome.storage.local.set({ hotKey1: key1, hotKey2: key2 }, function () {
    alert("Settings saved successfully!");
  });

  // Update hotkeys in content or background script
  chrome.runtime.sendMessage({ action: "updateHotkeys", hotKey1: key1, hotKey2: key2 }, function (response) {
    console.log("Hotkeys updated:", response);
  });
}
