import { findQuoteAtOffset } from "../src/codeblock.ts";

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n        expected ${e}\n        actual   ${a}`); }
}

function off(text, line, ch) {
  let offset = 0;
  for (let i = 0; i < line; i++) {
    const nl = text.indexOf("\n", offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  return offset + ch;
}

// The EXACT document from the user's report.
const t = "> test\n> Text\n> 123\n> last line note\n\nabc\n\n> test\n>> nested 1\n>>> nested 2\n> > > nested 3\n> > >> nested 4";

// Key behavior of findQuoteAtOffset against raw Markdown source: cursor
// anywhere in a block returns the FULL enclosing block; blank lines and
// normal text return null. NOTE: these tests cover only the pure extraction
// logic, not how Obsidian's getValue()/getCursor() hand positions to it —
// that integration path is verified separately against live Obsidian.

// --- Cursor in FIRST blockquote -> only first block (whole, no tabs) ---
check("cursor L0 in first block", findQuoteAtOffset(t, off(t, 0, 3)), "test\nText\n123\nlast line note");
check("cursor L1 in first block", findQuoteAtOffset(t, off(t, 1, 5)), "test\nText\n123\nlast line note");
check("cursor L2 in first block", findQuoteAtOffset(t, off(t, 2, 4)), "test\nText\n123\nlast line note");
check("cursor L3 (last) in first block", findQuoteAtOffset(t, off(t, 3, 5)), "test\nText\n123\nlast line note");

// --- Blank lines and normal text -> nothing copied ---
check("cursor on blank L4 -> null", findQuoteAtOffset(t, off(t, 4, 0)), null);
check("cursor on 'abc' L5 -> null", findQuoteAtOffset(t, off(t, 5, 1)), null);
check("cursor on blank L6 -> null", findQuoteAtOffset(t, off(t, 6, 0)), null);

// --- Cursor in SECOND blockquote -> only second block (whole, with tabs) ---
const sec = "test\n\tnested 1\n\t\tnested 2\n\t\tnested 3\n\t\t\tnested 4";
check("cursor L7 in second block", findQuoteAtOffset(t, off(t, 7, 2)), "test\n\tnested 1\n\t\tnested 2\n\t\tnested 3\n\t\t\tnested 4");
check("cursor L8 nested1 in second block", findQuoteAtOffset(t, off(t, 8, 5)), sec);
check("cursor L9 nested2 in second block", findQuoteAtOffset(t, off(t, 9, 6)), sec);
check("cursor L10 > > > in second block", findQuoteAtOffset(t, off(t, 10, 6)), sec);
check("cursor L11 (last) in second block", findQuoteAtOffset(t, off(t, 11, 5)), sec);

// --- Sanity: a single block still works end-to-end ---
const solo = "> only\n> here";
check("single block cursor mid", findQuoteAtOffset(solo, off(solo, 1, 2)), "only\nhere");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
