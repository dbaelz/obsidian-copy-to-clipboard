/**
 * Pure code-block detection logic (no Obsidian dependencies) so it can be unit
 * tested directly. See main.ts for the Obsidian glue that calls these.
 */

interface Position {
  line: number;
  ch: number;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert an Obsidian {line, ch} position into a character offset in `text`. */
export function offsetAt(text: string, pos: Position): number {
  let offset = 0;
  for (let i = 0; i < pos.line; i++) {
    const nl = text.indexOf("\n", offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  return offset + pos.ch;
}

/** Find an inline code span that starts exactly at `start`. */
function findInlineSpan(text: string, start: number): { start: number; end: number; content: string } | null {
  let openLen = 0;
  while (text[start + openLen] === "`") openLen++;
  if (openLen === 0) return null;

  let j = start + openLen;
  while (j < text.length) {
    if (text[j] === "`") {
      let runLen = 0;
      while (text[j + runLen] === "`") runLen++;
      if (runLen === openLen) {
        let content = text.slice(start + openLen, j);
        // Per CommonMark: a code span that begins and ends with a single space
        // has those trimmed.
        if (content.startsWith(" ") && content.endsWith(" ")) {
          content = content.slice(1, -1);
        }
        return { start, end: j + openLen, content };
      }
      j += runLen;
    } else {
      j++;
    }
  }
  return null;
}

/**
 * Given full Markdown source and a character offset of the cursor, return the
 * content of the enclosing code block (inline span or fenced block), or null.
 */
export function findCodeAtOffset(text: string, offset: number): string | null {
  const n = text.length;
  let i = 0;

  while (i <= offset && i < n) {
    // Fenced code block must start at the beginning of a line.
    if (i === 0 || text[i - 1] === "\n") {
      const fenceMatch = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(text.slice(i));
      if (fenceMatch) {
        const fenceChar = fenceMatch[1][0];
        const fenceLen = fenceMatch[1].length;
        const afterOpen = i + fenceMatch[0].length;

        const firstNl = text.indexOf("\n", afterOpen);
        if (firstNl === -1) {
          return offset >= i ? text.slice(afterOpen) : null;
        }
        const contentStart = firstNl + 1;

        const closeRe = new RegExp(
          "^\\s{0," + (fenceLen + 3) + "}" + escapeRegExp(fenceChar) + "{" + fenceLen + ",}\\s*$",
          "m"
        );
        const closeMatch = closeRe.exec(text.slice(contentStart));
        const contentEnd = closeMatch ? contentStart + closeMatch.index : n;

        if (offset >= i && offset <= contentEnd) {
          let inner = text.slice(contentStart, contentEnd);
          inner = inner.replace(/\s*$/, "");
          return inner;
        }

        const nextNl = text.indexOf("\n", afterOpen);
        i = nextNl === -1 ? n : nextNl + 1;
        continue;
      }
    }

    if (text[i] === "`") {
      const span = findInlineSpan(text, i);
      if (span) {
        if (offset >= span.start && offset <= span.end) {
          return span.content;
        }
        i = span.end;
        continue;
      }
    }

    i++;
  }

  return null;
}

/**
 * Given full Markdown source and a character offset of the cursor, return the
 * content of an enclosing blockquote (0–3 leading spaces + one or more `>`),
 * with markers stripped and newlines preserved. Returns null if the offset is
 * not inside any blockquote line.
 */
export function findQuoteAtOffset(text: string, offset: number): string | null {
  const lines = text.split("\n");

  let startLine = -1;
  for (let li = 0; li < lines.length; li++) {
    if (!/^[ \t]{0,3}>/.test(lines[li])) continue;
    let lineStart = 0;
    for (let k = 0; k < li; k++) lineStart += lines[k].length + 1;
    if (offset >= lineStart && offset <= lineStart + lines[li].length) {
      startLine = li;
      break;
    }
  }

  if (startLine === -1) return null;

  // Backtrack to the true start of the contiguous quote run (single blank
  // separators keep a run together).
  let runStart = startLine;
  while (runStart > 0) {
    const prev = lines[runStart - 1];
    if (/^[ \t]{0,3}>/.test(prev)) {
      runStart--;
      continue;
    }
    // Blank line before: it is a separator within the block only if the
    // previous non-blank line (before any blanks) is also a quote.
    let k = runStart - 2;
    while (k >= 0 && /^[ \t]*$/.test(lines[k])) k--;
    if (k >= 0 && /^[ \t]{0,3}>/.test(lines[k])) {
      runStart = k + 1;
      continue;
    }
    break;
  }

  const collected: string[] = [];
  let li = runStart;
  while (li < lines.length) {
    const line = lines[li];
    if (/^[ \t]*$/.test(line)) {
      // Blank line: only continue if the next non-blank line is still a quote.
      let peek = li + 1;
      while (peek < lines.length && /^[ \t]*$/.test(lines[peek])) peek++;
      if (peek >= lines.length || !/^[ \t]{0,3}>/.test(lines[peek])) break;
      collected.push("");
      li++;
      continue;
    }
    if (!/^[ \t]{0,3}>/.test(line)) break;

    // Strip 0–3 leading spaces, then all consecutive `>`, then one optional space.
    let content = line.replace(/^[ \t]{0,3}>+/, "").replace(/^ /, "");
    collected.push(content);
    li++;
  }

  return collected.join("\n");
}
