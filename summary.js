chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showSummary") {
    document.getElementById("summaryText").textContent = message.summary;
    if (message.title) {
      document.getElementById("popupTitle").textContent = message.title;
    }
  }
});

// Get title from URL parameter when page loads
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title");
  if (title) {
    document.getElementById("popupTitle").textContent = title;
  }
});
