import { CreateExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { getMessages, saveMessage } from "./db.js";

let chatReady = false;
let engine;
let userInput;
let messagesLoaded = false;
const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k";

// Callback function to update model loading progress
const initProgressCallback = (initProgress) => {
  console.log(initProgress);
  const text = initProgress.text;
  const match = text.match(/(\d+)\/(\d+)/);
  if (match) {
    const loaded = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const percentage = Math.round((loaded / total) * 100);
    userInput.placeholder = `Loading model... ${percentage}%`;
  }
};

function initializeEngine() {
  CreateExtensionServiceWorkerMLCEngine(selectedModel, { initProgressCallback })
    .then((eng) => {
      engine = eng;
      console.log("Engine is ready");
      chatReady = true;
      userInput.disabled = false;
      userInput.placeholder = "Type a message...";
    })
    .catch((error) => {
      console.error("Failed to initialize the engine", error);
      userInput.placeholder = "Failed to load model"; // Show error in placeholder
    });
}

export function showChat() {
  messagesLoaded = false;
  const container = document.getElementById("contentContainer");
  container.innerHTML = ""; // Clear previous content

  // Create chat container
  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";
  container.appendChild(chatContainer);

  // Create message display area
  const messageDisplay = document.createElement("div");
  messageDisplay.className = "message-display";
  chatContainer.appendChild(messageDisplay);

  // Create user input area
  const inputArea = document.createElement("div");
  inputArea.className = "input-area";
  chatContainer.appendChild(inputArea);

  // Create text input
  userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = "Type a message...";
  userInput.className = "user-input";
  userInput.disabled = true; // Initially disable input until engine is ready
  inputArea.appendChild(userInput);

  // Create send button
  const sendButton = document.createElement("button");
  sendButton.textContent = "Send";
  sendButton.className = "send-button";
  inputArea.appendChild(sendButton);

  // Function to add messages to display
  function addMessage(author, text, saveToDB = true) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${author}`;
    messageElement.textContent = text;
    messageDisplay.appendChild(messageElement);
    messageDisplay.scrollTop = messageDisplay.scrollHeight; // Scroll to bottom
    if (saveToDB) {
      saveMessage({ author, text });
    }
  }

  // Event listener for send button
  sendButton.onclick = async () => {
    if (!chatReady) {
      console.error("Chat is not ready");
      return;
    }
    const userText = userInput.value;
    if (userText.trim()) {
      addMessage("user", userText);
      const messages = [
        {
          role: "system",
          content:
            "You are a helpful AI assistant for a google chrome extension called Formie. You help people fill out forms faster by using pre-saved data.",
        },
        { role: "user", content: userText },
      ];

      addMessage("ai", "Typing...", false); // Show typing message

      const reply = await engine.chat.completions.create({
        messages,
        stream: true,
      });

      let fullReply = "";
      for await (const chunk of reply) {
        const chunkMessage = chunk.choices[0].message.content;
        fullReply += chunkMessage;
      }

      // remove the typing message which is the last message
      messageDisplay.removeChild(messageDisplay.lastChild);
      addMessage("ai", fullReply, false);
      userInput.value = "";
    }
  };

  // Event listener for Enter key
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendButton.click();
    }
  });

  function loadMessages() {
    if (messagesLoaded) {
      return;
    }
    getMessages().then((messages) => {
      messages.forEach((message) => {
        addMessage(message.author, message.text, false);
      });
      messagesLoaded = true; // Set flag to true after messages are loaded
    });
  }

  function init() {
    if (!engine) {
      chatReady = false;
      initializeEngine();
    }
    if (chatReady) {
      userInput.disabled = false;
      userInput.placeholder = "Type a message...";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
    });
  } else {
    init();
  }

  loadMessages();
  // Initial AI message
  addMessage("ai", "Welcome to Formie Chat", false);
}
