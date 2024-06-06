console.log("Formify content script loaded");

function init() {
  console.log("Formify content script loaded with DOM");
  const url = window.location.href;
  const pageHeader = document.title;
  const forms = document.querySelectorAll("form");
  const createdAt = new Date().toISOString();
  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      console.log("Form submitted");
      const data = new FormData(form);
      const entries = {};
      for (const [key, value] of data) {
        const newObject = { value, url, pageHeader, createdAt };
        console.log(key, newObject);
        entries[key] = newObject;
      }
      console.log(entries);

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
  chrome.runtime.sendMessage({ action: "saveData", entries });
}
