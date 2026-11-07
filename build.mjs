import esbuild from "esbuild";
import process from "process";

const watch = process.argv[2] === "--watch";
const minify = process.argv[2] === "--minify";

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/commands", "@codemirror/state", "@codemirror/view"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  minify,
  outfile: "main.js",
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  process.exit(0);
}