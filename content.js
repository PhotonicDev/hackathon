chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "replaceText") {
    console.log("Replacing text", message.summary);
    const selection = window.getSelection();
    const activeElement = document.activeElement;

    console.log("Active element:", activeElement.tagName);
    console.log("Is contenteditable:", activeElement.isContentEditable);
    console.log("Parent element:", activeElement.parentElement);

    // Find the actual editable element in Teams
    const teamsEditor =
      activeElement.closest('[role="textbox"]') || // Try to find Teams editor
      activeElement.querySelector('[role="textbox"]') ||
      activeElement.closest('[contenteditable="true"]') ||
      (activeElement.isContentEditable ? activeElement : null);

    // Handle input fields and textareas
    if (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA"
    ) {
      console.log("Handling input/textarea");
      handleInputField(activeElement, message.summary);
    }
    // Handle Teams and other rich text editors
    else if (teamsEditor) {
      console.log("Handling Teams/rich text editor", teamsEditor);
      handleRichTextEditor(teamsEditor, selection, message.summary);
    }
    // Handle regular text selections
    else if (selection.rangeCount > 0) {
      console.log("Handling regular text selection");
      handleRegularText(selection, message.summary);
    } else {
      console.log("No valid selection found");
    }
  }
});

function handleInputField(element, newText) {
  try {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const currentValue = element.value;

    if (start !== undefined && end !== undefined && start !== end) {
      const newValue =
        currentValue.substring(0, start) +
        newText +
        currentValue.substring(end);

      console.log("New value:", newValue);
      element.value = newValue;

      // Trigger events
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));

      // Reset cursor
      element.selectionStart = start;
      element.selectionEnd = start + newText.length;
    }
  } catch (error) {
    console.error("Error in handleInputField:", error);
  }
}

function handleRichTextEditor(editor, selection, newText) {
  try {
    console.log("Editor element:", editor);
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      console.log("Selection range:", range);

      // Check if the selection is within the editor
      if (!isRangeInElement(range, editor)) {
        console.log("Selection is not in editor");
        return;
      }

      // Create and insert the new text
      range.deleteContents();
      const textNode = document.createTextNode(newText);
      range.insertNode(textNode);

      // Update selection
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger multiple types of events for better compatibility
      const events = [
        new Event("input", { bubbles: true, composed: true }),
        new Event("change", { bubbles: true, composed: true }),
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: newText,
          composed: true,
        }),
        new Event("keyup", { bubbles: true, composed: true }),
        new Event("blur", { bubbles: true, composed: true }),
        new Event("focus", { bubbles: true, composed: true }),
      ];

      events.forEach((event) => {
        editor.dispatchEvent(event);
        // Also dispatch to parent elements for event bubbling
        let parent = editor.parentElement;
        while (parent) {
          parent.dispatchEvent(event);
          parent = parent.parentElement;
        }
      });
    }
  } catch (error) {
    console.error("Error in handleRichTextEditor:", error);
  }
}

function handleRegularText(selection, newText) {
  try {
    const range = selection.getRangeAt(0);
    const wrapper = document.createElement("span");
    wrapper.style.whiteSpace = "pre-wrap";
    wrapper.textContent = newText;
    range.deleteContents();
    range.insertNode(wrapper);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (error) {
    console.error("Error in handleRegularText:", error);
  }
}

function isRangeInElement(range, element) {
  try {
    return element.contains(range.commonAncestorContainer);
  } catch (error) {
    console.error("Error checking range:", error);
    return false;
  }
}
