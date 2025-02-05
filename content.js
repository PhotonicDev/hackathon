chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "replaceText") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(message.summary);
      range.insertNode(textNode);
    }
  }
});
