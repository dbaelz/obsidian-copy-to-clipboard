# copy-to-clipboard

An [Obsidian](https://obsidian.md/) plugin that allows copying content to the clipboard.

## Features

- Adds a button (and command) to copy the currently selected or highlighted Markdown text as a formatted `code` element into the clipboard.

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