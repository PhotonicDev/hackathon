// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeTextPopup",
    title: "Summarize in Popup",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "summarizeTextInplace",
    title: "Replace with Summary",
    contexts: ["selection"],
  });
});

async function getSummary(text, model) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Origin: "chrome-extension://" + chrome.runtime.id,
    },
    body: JSON.stringify({
      model: model,
      prompt: `Please provide a concise summary of the following text:\n\n${text}`,
      stream: false,
    }),
  });

  if (!response.ok) {
    console.error("HTTP Error:", response.status, response.statusText);
    const errorText = await response.text();
    console.error("Error details:", errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText;
  console.log(selectedText);

  try {
    // Get the selected model from storage
    const result = await chrome.storage.local.get(["model"]);
    const model = result.model || "qwen2.5:3b";

    console.log("Sending request to Ollama...");
    const data = await getSummary(selectedText, model);

    if (info.menuItemId === "summarizeTextPopup") {
      // Show in popup
      chrome.windows.create(
        {
          url: "summary.html",
          type: "popup",
          width: 400,
          height: 300,
        },
        (window) => {
          setTimeout(() => {
            chrome.tabs.sendMessage(window.tabs[0].id, {
              action: "showSummary",
              summary: data.response,
            });
          }, 100);
        }
      );
    } else if (info.menuItemId === "summarizeTextInplace") {
      // Replace text in place
      chrome.tabs.sendMessage(tab.id, {
        action: "replaceText",
        summary: data.response,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert(
      "Error connecting to Ollama. Make sure it's running on localhost:11434"
    );
  }
});
