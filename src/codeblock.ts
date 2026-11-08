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

  // Determine the true start of the contiguous quote run containing the cursor.
  // Phase 1 walks back over directly adjacent quote lines only. Phase 2 may
  // merge upward across blank separators that lead to another quote block. On
  // a hard break (a non-blank, non-quote line such as "abc", or a blank with no
  // quote above) we simply stop — never resetting an already-found start.
  let runStart = startLine;
  for (let b = runStart - 1; b >= 0; b--) {
    const prev = lines[b];
    if (/^[ \t]{0,3}>/.test(prev)) {
      // Directly adjacent quote line -> part of the same block.
      runStart = b;
    } else if (/^[ \t]*$/.test(prev)) {
      // Blank separator: look upward for a quote block above the blanks.
      let c = b - 1;
      while (c >= 0 && /^[ \t]*$/.test(lines[c])) c--;
      if (c >= 0 && /^[ \t]{0,3}>/.test(lines[c])) {
        // Found an upper quote block: find its true start and jump there.
        let top = c;
        while (top > 0 && /^[ \t]{0,3}>/.test(lines[top - 1])) top--;
        runStart = top;
        b = top; // continue scanning from just above the upper block
      } else {
        break; // Blank with no quote above -> hard break.
      }
    } else {
      break; // Non-blank, non-quote line (e.g. "abc") -> hard break.
    }
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

    // Match the quote prefix: 0–3 leading spaces followed by one or more `>`
    // markers, which may be separated by a single space ("> >Foo" or ">>Foo").
    const prefixMatch = /^[ \t]{0,3}(?:>[ ]?)+/.exec(line)!;
    const depth = (prefixMatch[0].match(/>/g) || []).length;
    // Strip the whole prefix, then one optional leading space.
    let content = line.slice(prefixMatch[0].length).replace(/^ /, "");
    // Indent deeper levels by one tab per extra nesting level.
    collected.push("\t".repeat(depth - 1) + content);
    li++;
  }

  return collected.join("\n");
}
