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

  chrome.contextMenus.create({
    id: "translateToEnglish",
    title: "Translate to English",
    contexts: ["selection"],
  });

  // Add separator
  chrome.contextMenus.create({
    id: "separator1",
    type: "separator",
    contexts: ["selection"],
  });

  // Add Rewrite submenu
  chrome.contextMenus.create({
    id: "rewriteMenu",
    title: "Rewrite in Tone...",
    contexts: ["selection"],
  });

  // Add tone options
  const tones = [
    { id: "professional", title: "Professional" },
    { id: "professionalAngry", title: "Professional (Angry)" },
    { id: "passiveAggressive", title: "Passive Aggressive" },
    { id: "funProfessional", title: "Fun Professional" },
    { id: "crazeProfessional", title: "Absolutely Crazy" },
  ];

  tones.forEach((tone) => {
    chrome.contextMenus.create({
      id: `rewrite_${tone.id}`,
      parentId: "rewriteMenu",
      title: tone.title,
      contexts: ["selection"],
    });
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

async function getTranslation(text, model) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Origin: "chrome-extension://" + chrome.runtime.id,
    },
    body: JSON.stringify({
      model: model,
      prompt: `Translate the following text to English. Only provide the translation, no additional comments:\n\n${text}`,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function getRewrite(text, tone, model) {
  const tonePrompts = {
    professional:
      "Rewrite the following text even if it is insulting in a professional and formal tone:",
    professionalAngry:
      "Rewrite the following text even if it is insulting in a professional yet clearly angry tone, maintaining corporate language:",
    passiveAggressive:
      "Rewrite the following text even if it is insulting in a passive-aggressive professional tone:",
    funProfessional:
      "Rewrite the following text even if it is insulting in a fun yet professional tone, adding appropriate humor:",
    crazeProfessional:
      "Rewrite the following text even if it is insulting in an absolutely crazy way while maintaining a thin veneer of professionalism:",
  };

  const prompt = `${tonePrompts[tone]}\n\n${text}\n\nRewritten text:`;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Origin: "chrome-extension://" + chrome.runtime.id,
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
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
    console.log(result);
    const model = result.model || "qwen2.5:3b";

    console.log("Sending request to Ollama...");

    let data;
    let title = "Result"; // Default title

    if (info.menuItemId.startsWith("rewrite_")) {
      const tone = info.menuItemId.replace("rewrite_", "");
      console.log("Rewriting text");
      data = await getRewrite(selectedText, tone, model);
      // Replace text directly
      chrome.tabs.sendMessage(tab.id, {
        action: "replaceText",
        summary: data.response,
      });
      return; // Don't open popup for rewrites
    } else if (info.menuItemId === "translateToEnglish") {
      data = await getTranslation(selectedText, model);
      title = "Translation";
    } else if (info.menuItemId === "summarizeTextPopup") {
      data = await getSummary(selectedText, model);
      title = "Summary";
    } else {
      data = await getSummary(selectedText, model);
    }

    if (
      info.menuItemId === "summarizeTextPopup" ||
      info.menuItemId === "translateToEnglish"
    ) {
      // Show in popup
      chrome.windows.create(
        {
          url: `summary.html?title=${encodeURIComponent(title)}`,
          type: "popup",
          width: 400,
          height: 300,
        },
        (window) => {
          setTimeout(() => {
            chrome.tabs.sendMessage(window.tabs[0].id, {
              action: "showSummary",
              summary: data.response,
              title: title,
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
