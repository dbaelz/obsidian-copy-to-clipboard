import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { findCodeAtOffset, findQuoteAtOffset, offsetAt } from "./codeblock";

/** Copy text to the clipboard, with a legacy fallback for older contexts. */
async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* fall through to legacy path */
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

/** Read the cursor position from an editor. */
function getCursorOffset(editor: Editor): { text: string; offset: number } {
  const text = editor.getValue();
  const pos = editor.getCursor();
  return { text, offset: offsetAt(text, pos) };
}

export default class MarkdownCodeClipboardPlugin extends Plugin {
  private async copyCodeAtCursor(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    if (!editor) {
      new Notice("No active Markdown editor to copy from.", 5000);
      return;
    }

    const { text, offset } = getCursorOffset(editor);
    const content = findCodeAtOffset(text, offset) ?? findQuoteAtOffset(text, offset);

    if (content === null) {
      new Notice("Cursor is not inside a code block or quote.", 4000);
      return;
    }

    await copyToClipboard(content);
    new Notice(`Copied ${content.length} character${content.length === 1 ? "" : "s"} to clipboard.`, 3000);
  }

  async onload(): Promise<void> {
    this.addRibbonIcon("clipboard", "Copy code block at cursor", async () => {
      await this.copyCodeAtCursor();
    });

    this.addCommand({
      id: "copy-code-block-at-cursor",
      name: "Copy code block at cursor to clipboard",
      callback: () => {
        void this.copyCodeAtCursor();
      },
    });
  }
}
