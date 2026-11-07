# copy-to-clipboard

An [Obsidian](https://obsidian.md/) plugin that copies the content of a code block or blockquote at the cursor to the clipboard.

## Features

- Ribbon button ("Copy code block at cursor") and command ("Copy code block at cursor to clipboard"). The command works even if the ribbon icon is hidden (e.g. when using a toolbar plugin).
- The cursor position is read from the active editor. If it sits inside a code block or blockquote, the *content* of that block is copied; otherwise nothing is copied.
- Two kinds of blocks are recognised (based on raw Markdown source text):
  - Inline code span: `` `Dummy Text` `` → copies `Dummy Text`.
  - Fenced code block: a triple-backtick block containing `Yet another Text` → copies the content, preserving newlines.
  - Blockquote: one or more lines starting with `>` (including simple nesting like `>>`) → copies the text without the markers, preserving newlines.

## Installation

1. Build the plugin (`npm run build`).
2. Copy `main.js` and `manifest.json` into your vault's `.obsidian/plugins/obsidian-copy-to-clipboard/` folder.
3. Enable it in Obsidian under *Settings → Community Plugins*.

## Development

```bash
# Install dependencies
npm install

# Create a development build (watcher is running)
npm run dev

# Create a production build
npm run build
```

After the build, the files `main.js` and `manifest.json` are produced. Copy both into your vault's `.obsidian/plugins/obsidian-copy-to-clipboard/` folder. Note that this plugin has no custom CSS, so no `styles.css` is generated.

## Testing

The block-detection logic lives in `src/codeblock.ts` and is covered by unit tests with no Obsidian or build dependencies:

```bash
node tests/test-codeblock.mjs
```

## License

MIT