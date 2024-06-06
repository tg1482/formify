console.log("Formify content script loaded");

function addCustomSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "my-custom-sidebar";
  sidebar.style.width = "400px";
  sidebar.style.height = "100%";
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "0";
  sidebar.style.backgroundColor = "white";
  sidebar.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";
  sidebar.style.zIndex = "9999";
  sidebar.innerHTML = "<h1>Form Data</h1><div id='formDataContainer'></div>";
  document.body.appendChild(sidebar);

  //   document.addEventListener("input", handleInputChange);
  document.addEventListener("mouseup", handleTextSelection);
}

// function handleInputChange(event) {
//   if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
//     const value = event.target.value;
//     if (value.length > 2) {
//       // Threshold to avoid too frequent updates
//       fetchDataFromDB(value);
//     }
//   }
// }

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 2) {
    fetchDataFromDB(selectedText);
  }
}

function fetchDataFromDB(keyword) {
  chrome.runtime.sendMessage({ action: "searchData", keyword: keyword }, (response) => {
    console.log("Search results", response);
    const container = document.getElementById("formDataContainer");
    container.innerHTML = ""; // Clear previous data

    response.entries?.forEach((entry) => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "8px";
      div.style.padding = "10px";
      div.style.marginBottom = "10px";
      div.style.backgroundColor = "#f9f9f9";

      const id = document.createElement("p");
      id.innerHTML = `<strong>ID:</strong> ${entry.id}`;
      div.appendChild(id);

      const value = document.createElement("p");
      value.innerHTML = `<strong>Value:</strong> "${entry.data.value}"`;
      div.appendChild(value);

      const pageHeader = document.createElement("p");
      pageHeader.innerHTML = `<strong>Page:</strong> ${entry.data.pageHeader}`;
      div.appendChild(pageHeader);

      const createdAt = document.createElement("p");
      createdAt.innerHTML = `<strong>Created At:</strong> ${entry.data.createdAt}`;
      div.appendChild(createdAt);

      const copyButton = document.createElement("button");
      copyButton.textContent = "Copy Value";
      copyButton.style.marginTop = "10px";
      copyButton.onclick = () => {
        navigator.clipboard.writeText(entry.data.value).then(() => {
          alert("Value copied to clipboard!");
        });
      };
      div.appendChild(copyButton);

      container.appendChild(div);
    });
  });
}

function init() {
  console.log("Formify content script initialized with DOM");
  const url = window.location.href;
  const pageHeader = document.title;
  const createdAt = new Date().toISOString();

  document.querySelectorAll("input, textarea").forEach((input) => {
    // Attach blur listener to each input/textarea
    input.addEventListener("blur", () => {
      console.log("Input blurred", input);
      let key = findLabel(input);

      // Prepare data object
      const value = input.value;
      const data = { value, url, pageHeader, createdAt };

      // Log the entry using found label as key
      console.log("Input blurred", { [key]: data });

      // Optionally, send the data somewhere, like to saveData function
      if (key && value) {
        saveData({ [key]: data });
      }
    });
  });
}

// Function to find the correct label or paragraph tag for an input
function findLabel(input) {
  const id = input.id;
  let label = document.querySelector(`label[for="${id}"]`);
  if (!label) {
    // If no label with 'for', find the closest preceding sibling that is a label or p tag
    let sibling = input.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === "LABEL" || sibling.tagName === "P") {
        label = sibling;
        break;
      }
      sibling = sibling.previousElementSibling;
    }
  }
  return label ? label.innerText.trim() : "Unknown";
}

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // ensure that the added node is not my custom sidebar
        if (mutation.addedNodes[0].id !== "my-custom-sidebar") {
          init();
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      init();
      setupObserver();
    }, 5000);
  });
} else {
  setTimeout(() => {
    init();
    setupObserver();
  }, 5000);
}

function saveData(entries) {
  chrome.runtime.sendMessage({ action: "saveData", entries });
}

document.addEventListener("keydown", function (event) {
  console.log("Keydown", event);
  // Check if 'Option' (or 'Alt') and 'O' are pressed together
  if (event.ctrlKey && event.key === "o") {
    // Check if the sidebar does not already exist
    if (!document.getElementById("my-custom-sidebar")) {
      addCustomSidebar();
    }
  }
});
