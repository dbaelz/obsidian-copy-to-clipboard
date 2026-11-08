import { findCodeAtOffset, findQuoteAtOffset, offsetAt } from "../src/codeblock.ts";

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
  check("literal-idx first block (char 8)", findCodeAtOffset(t, 8), "first block");
  check("literal-idx second block (char 34)", findCodeAtOffset(t, 34), "second block");
}
{
  const t = "`inline` then ```\nfenced\n```";
  check("literal-idx inline (char 3)", findCodeAtOffset(t, 3), "inline");
}

{
  const t = "# H\n\n```\nsecond block\n```\n";
  check("literal-idx fenced (char 14)", findCodeAtOffset(t, 14), "second block");
}

// --- Blockquote tests ---
{
  // simple single-line quote
  const t = "> First line only";
  check("quote single line", findQuoteAtOffset(t, off(t, 0, 10)), "First line only");
}

{
  // multi-line quote, markers stripped, newlines preserved
  const t = "> First line\n> Second line\n> Third line";
  check("quote multiline", findQuoteAtOffset(t, off(t, 1, 5)), "First line\nSecond line\nThird line");
}

{
  // cursor on the `>` marker itself should still work
  const t = "# Title\n\n> quoted text here\n\nEnd";
  check("quote cursor on marker", findQuoteAtOffset(t, off(t, 2, 0)), "quoted text here");
}

{
  // leading spaces before `>` (up to 3) are allowed
  const t = "> indented quote line";
  check("quote with leading space", findQuoteAtOffset(t, off(t, 0, 4)), "indented quote line");
}

{
  // > > nested (simple nesting), markers fully stripped, one tab prefix
  const t = ">> nested content";
  check("quote simple nesting", findQuoteAtOffset(t, off(t, 0, 5)), "\tnested content");
}

{
  // space-separated nested markers are handled the same way
  const t = "> >Foo";
  check("quote space-separated nesting", findQuoteAtOffset(t, off(t, 0, 3)), "\tFoo");
}

{
  // cursor outside any quote -> null
  const t = "# Heading\n\nJust some plain text.\n";
  check("no quote anywhere", findQuoteAtOffset(t, off(t, 2, 3)), null);
}

{
  // multiple quotes: pick the right one
  const t = "> first quote\n> more first\n\ntext\n\n> second quote\n";
  check("quote first block", findQuoteAtOffset(t, off(t, 0, 2)), "first quote\nmore first");
  check("quote second block", findQuoteAtOffset(t, off(t, 5, 2)), "second quote");
}

{
  // blank line inside a quote (single separator) is preserved
  const t = "> line one\n\n> line two";
  check("quote with blank separator", findQuoteAtOffset(t, off(t, 0, 2)), "line one\n\nline two");
}

{
  // literal-offset independent test: "> hello" starts at char 8 after "# H\n\n"
  const t = "# H\n\n> hello world";
  check("literal-idx quote (char 10)", findQuoteAtOffset(t, 10), "hello world");
}

{
  // the exact input from the request: one tab per extra nesting level
  const t = "> test\n> test2\n> 123\n> >Foo";
  check("quote nested tabs", findQuoteAtOffset(t, off(t, 0, 2)), "test\ntest2\n123\n\tFoo");
}

{
  // two extra levels => two tabs
  const t = "> a\n> > b\n> >> c";
  check("quote deeper nesting", findQuoteAtOffset(t, off(t, 0, 2)), "a\n\tb\n\t\tc");
}

{
  // mixing nested and non-nested lines keeps the tab only on deep lines
  const t = "> top line\n> > indented line\nplain text";
  check("quote mixed then prose", findQuoteAtOffset(t, off(t, 0, 2)), "top line\n\tindented line");
}

{
  // cursor inside a nested line still extracts the whole block
  const t = "> outer\n> > inner content";
  check("cursor in nested line", findQuoteAtOffset(t, off(t, 1, 5)), "outer\n\tinner content");
}