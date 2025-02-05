async function fetchOllamaModels() {
  const statusEl = document.getElementById("modelStatus");
  try {
    statusEl.className = "loading";
    statusEl.textContent = "Connecting to Ollama...";

    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.models && data.models.length > 0) {
      statusEl.textContent = `${data.models.length} models available`;
    } else {
      statusEl.textContent =
        "No models found. Try pulling one with 'ollama pull'";
      statusEl.className = "error";
    }

    return data.models;
  } catch (error) {
    console.error("Error fetching models:", error);
    statusEl.textContent = "Could not connect to Ollama. Is it running?";
    statusEl.className = "error";
    return null;
  }
}

function populateModelSelect(models) {
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.innerHTML = ""; // Clear existing options

  if (!models || models.length === 0) {
    // Add a default option if we couldn't fetch models
    const option = document.createElement("option");
    option.value = "qwen2.5:3b";
    option.textContent = "Qwen 2.5 3B (Default)";
    modelSelect.appendChild(option);
    return;
  }

  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.name;
    option.textContent = model.name;
    modelSelect.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const modelSelect = document.getElementById("modelSelect");

  // Fetch available models
  const models = await fetchOllamaModels();
  populateModelSelect(models);

  // Load saved model preference
  chrome.storage.local.get(["model"], (result) => {
    if (
      result.model &&
      modelSelect.querySelector(`option[value="${result.model}"]`)
    ) {
      modelSelect.value = result.model;
    }
  });

  // Save model preference when changed
  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ model: modelSelect.value });
  });
});
