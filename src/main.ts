import { Plugin } from "obsidian";

export default class MarkdownCodeClipboardPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addRibbonIcon("code", "Copy to clipboard", async () => {
      // Dummy implementation – to be implemented in a later step.
      console.log("[obsidian-copy-to-clipboard] button clicked (dummy)");
    });

    this.addCommand({
      id: "copy-markdown-code",
      name: "Copy markdown as code to clipboard",
      callback: () => {
        // Dummy implementation – to be implemented in a later step.
        console.log("[obsidian-copy-to-clipboard] command triggered (dummy)");
      },
    });
  }
}