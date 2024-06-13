import { CreateExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";

// Callback function to update model loading progress
const initProgressCallback = (initProgress) => {
  console.log(initProgress);
};
const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k";

const engine = await CreateExtensionServiceWorkerMLCEngine(
  selectedModel,
  { initProgressCallback: initProgressCallback } // engineConfig
);

export function showChat() {
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
  const userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = "Type your message...";
  userInput.className = "user-input";
  inputArea.appendChild(userInput);

  // Create send button
  const sendButton = document.createElement("button");
  sendButton.textContent = "Send";
  sendButton.className = "send-button";
  inputArea.appendChild(sendButton);

  // Function to add messages to display
  function addMessage(author, text) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${author}`;
    messageElement.textContent = text;
    messageDisplay.appendChild(messageElement);
    messageDisplay.scrollTop = messageDisplay.scrollHeight; // Scroll to bottom
  }

  // Event listener for send button
  sendButton.onclick = async () => {
    const userText = userInput.value;
    if (userText.trim()) {
      addMessage("user", userText);
      const messages = [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: userText },
      ];

      const reply = await engine.chat.completions.create({
        messages,
        stream: true,
      });

      let fullReply = "";
      for await (const chunk of reply) {
        fullReply += chunk.choices[0].delta.content;
      }

      addMessage("ai", fullReply);
      userInput.value = ""; // Clear input after sending
    }
  };

  // Event listener for Enter key
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendButton.click();
    }
  });

  // Initial AI message
  addMessage("ai", "Message from AI");
}
