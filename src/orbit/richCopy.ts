const FENCE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
const HEADING = /^(#{1,6})\s+(.+)$/;
const BULLET = /^\s*[-*]\s+(.+)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.+)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1<em>$2</em>");
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function isListLine(line: string): boolean {
  return BULLET.test(line) || NUMBERED.test(line);
}

function isBlockStart(lines: string[], i: number): boolean {
  const line = lines[i];
  return (
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    isListLine(line) ||
    (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]))
  );
}

function blocksHtml(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      out.push(`<h${level}>${inlineHtml(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(QUOTE.exec(lines[i])![1]);
        i++;
      }
      out.push(`<blockquote>${blocksHtml(quoted.join("\n"))}</blockquote>`);
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const head = cells(line).map((c) => `<th>${inlineHtml(c)}</th>`).join("");
      i += 2;
      const rows: string[] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(`<tr>${cells(lines[i]).map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`);
        i++;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>`);
      continue;
    }

    if (isListLine(line)) {
      const ordered = NUMBERED.test(line);
      const items: string[] = [];
      while (i < lines.length && isListLine(lines[i])) {
        const m = BULLET.exec(lines[i]) ?? NUMBERED.exec(lines[i]);
        items.push(`<li>${inlineHtml(m![1])}</li>`);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
      paragraph.push(inlineHtml(lines[i]));
      i++;
    }
    out.push(`<p>${paragraph.join("<br>")}</p>`);
  }

  return out.join("");
}

export function markdownToHtml(markdown: string): string {
  const out: string[] = [];
  let cursor = 0;

  for (const match of markdown.matchAll(FENCE)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(blocksHtml(markdown.slice(cursor, at)));
    out.push(`<pre><code>${escapeHtml(match[2].replace(/\n$/, ""))}</code></pre>`);
    cursor = at + match[0].length;
  }

  if (cursor < markdown.length) out.push(blocksHtml(markdown.slice(cursor)));
  return out.join("");
}

async function writePlain(plain: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}

export async function copyRichText(markdown: string, plain: string): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return writePlain(plain);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([markdownToHtml(markdown)], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    return writePlain(plain);
  }
}
