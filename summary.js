chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showSummary") {
    document.getElementById("summaryText").textContent = message.summary;
  }
});
