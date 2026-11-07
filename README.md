# copy-to-clipboard

An [Obsidian](https://obsidian.md/) plugin that copies the content of a code block at the cursor to the clipboard.

## Features

- Ribbon button ("Copy code block at cursor") and command ("Copy code block at cursor to clipboard").
- The cursor position is read from the active editor. If it sits inside a code block, the *content* of that block is copied; otherwise nothing is copied.
- Two kinds of blocks are recognised (based on raw Markdown source text):
  - Inline code span: `` `Dummy Text` `` → copies `Dummy Text`.
  - Fenced code block: a triple-backtick block containing `Yet another Text` → copies the content, preserving newlines.

## Installation

1. Place the plugin in the `.obsidian/plugins/` folder of your vault.
2. Enable it in Obsidian under *Settings → Community Plugins*.

## Development

```bash
# Install dependencies
npm install

# Create a development build (watcher is running)
npm run dev

# Create a production build
npm run build
```

After the build, the files `main.js`, `manifest.json` and `styles.css` are placed in the output directory and can be copied into the plugins folder of your vault.

## License

MIT