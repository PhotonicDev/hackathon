document.addEventListener("DOMContentLoaded", () => {
  const modelSelect = document.getElementById("modelSelect");

  // Load saved model preference
  chrome.storage.local.get(["model"], (result) => {
    if (result.model) {
      modelSelect.value = result.model;
    }
  });

  // Save model preference when changed
  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ model: modelSelect.value });
  });
});
