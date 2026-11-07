import { findCodeAtOffset, offsetAt } from "../src/codeblock.ts";

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n        expected ${e}\n        actual   ${a}`);
  }
}

function off(text, line, ch) {
  return offsetAt(text, { line, ch });
}

// --- Inline code spans ---
{
  const t = "Hello `Dummy Text` world";
  const mid = off(t, 0, 10); // inside the span
  check("inline single backtick", findCodeAtOffset(t, mid), "Dummy Text");
  check("inline not-in-block (before)", findCodeAtOffset(t, off(t, 0, 2)), null);
}

{
  const t = "Use `x` for x and `y` for y";
  check("inline first span", findCodeAtOffset(t, off(t, 0, 7)), "x");
  check("inline second span", findCodeAtOffset(t, off(t, 0, 19)), "y");
}

{
  // code span with embedded single backticks inside longer fence run
  const t = "`` `nested` ``";
  check("inline double-backtick span content", findCodeAtOffset(t, off(t, 0, 5)), "`nested`");
}

// --- Fenced code blocks ---
{
  const t = "# Title\n\n```js\nconst x = 1;\nconsole.log(x);\n```\n\nEnd";
  check("fenced single-line content", findCodeAtOffset(t, off(t, 3, 5)), "const x = 1;\nconsole.log(x);");

  // cursor on the fence line itself should also work
  check("fenced cursor on opening fence", findCodeAtOffset(t, off(t, 2, 0)), "const x = 1;\nconsole.log(x);");
  check("fenced cursor on closing fence", findCodeAtOffset(t, off(t, 5, 0)), "const x = 1;\nconsole.log(x);");

  // content with a language identifier should still return the body
  const t2 = "```\nYet another Text\n```\n";
  check("fenced no-lang single line", findCodeAtOffset(t2, off(t2, 1, 3)), "Yet another Text");
}

{
  // tilde fences
  const t = "~~~\ncode here\n~~~\n";
  check("tilde fence content", findCodeAtOffset(t, off(t, 1, 0)), "code here");
}

{
  // cursor outside any block -> null
  const t = "# Heading\n\nJust some text, no code.\n";
  check("no block anywhere", findCodeAtOffset(t, off(t, 2, 3)), null);
}

{
  // multiple blocks: pick the right one
  const t = "```\nfirst block\n```\n\ntext\n\n```\nsecond block\n```\n";
  check("first fenced block", findCodeAtOffset(t, off(t, 1, 0)), "first block");
  check("second fenced block", findCodeAtOffset(t, off(t, 7, 0)), "second block");
}

{
  // inline span and fenced block coexist; cursor decides. The mid-line ```
  // (not at line start) is NOT a fence per CommonMark, so it opens an inline
  // code span whose content includes the surrounding newlines.
  const t = "`inline` then ```\nfenced\n```";
  check("cursor in inline over fenced", findCodeAtOffset(t, off(t, 0, 3)), "inline");
  check("mid-line fence => inline span content", findCodeAtOffset(t, off(t, 2, 1)), "\nfenced\n");
}

{
  // realistic case: fenced block on its own line after some prose
  const t = "Some text before.\n\n```js\ncode here\n```\n\nMore.";
  check("realistic fenced at line start", findCodeAtOffset(t, off(t, 3, 2)), "code here");
}

{
  // unclosed fence runs to end of doc
  const t = "```\nnever closed\nmore";
  check("unclosed fence content", findCodeAtOffset(t, off(t, 1, 0)), "never closed\nmore");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// --- Independent literal-offset tests (offsets counted by hand, not via offsetAt) ---
{
  const t = "```\nfirst block\n```\n\ntext\n\n```\nsecond block\n```\n";
  // offsets: "```\n"=0..3, "first block\n"=4..15, "```\n"=16..19, ...
  check("literal-idx first block (char 8)", findCodeAtOffset(t, 8), "first block");
  // "second block" starts at char 30
  check("literal-idx second block (char 34)", findCodeAtOffset(t, 34), "second block");
}
{
  const t = "`inline` then ```\nfenced\n```";
  // "`inline`" spans chars 0..8; char 3 is inside the inline span
  check("literal-idx inline (char 3)", findCodeAtOffset(t, 3), "inline");
}

{
  const t = "# H\n\n```\nsecond block\n```\n";
  // "second block" starts at char 10; char 14 is inside it
  check("literal-idx fenced (char 14)", findCodeAtOffset(t, 14), "second block");
}
