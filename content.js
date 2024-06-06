console.log("Formify content script loaded");

function init() {
  console.log("Formify content script loaded with DOM");
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      console.log("Form submitted");
      const data = new FormData(form);
      const entries = {};
      for (const [key, value] of data) {
        entries[key] = value;
      }

      saveData(entries);
    });
  });
}

// Check if the document is already loaded
if (document.readyState === "loading") {
  // Loading hasn't finished yet
  document.addEventListener("DOMContentLoaded", init);
} else {
  // `DOMContentLoaded` has already fired
  init();
}

function saveData(entries) {
  chrome.runtime.sendMessage({ entries });
}
