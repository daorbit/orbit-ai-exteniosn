import { Anchor, Code, Divider, List, Table, Text, Title } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import classes from "./richText.module.css";

const FENCE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;

const INLINE =
  /(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|((?<![*\w])\*(?!\s)[^*\n]+?\*(?![*\w]))|(#[0-9a-fA-F]{6}\b)/g;

const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;

const HEADING_CLASS = [classes.h1, classes.h2, classes.h3];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const BARE_URL_LABEL =
  /(^|[^[])\b([A-Za-z0-9][\w .'-]{0,80}?)\s*\((https?:\/\/[^\s()]+)\)/g;

function linkifyBareUrls(text: string): string {
  return text.replace(
    BARE_URL_LABEL,
    (_match, before: string, label: string, url: string) => `${before}[${label.trim()}](${url})`,
  );
}


export function toPlainText(text: string): string {
  return text
    .replace(FENCE, (_match, _lang: string, code: string) => code.replace(/\n$/, ""))
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <Text span inherit style={{ whiteSpace: "nowrap" }}>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 11,
          height: 11,
          borderRadius: 3,
          marginRight: 4,
          verticalAlign: "middle",
          background: hex,
          border: "1px solid color-mix(in srgb, var(--mantine-color-text) 25%, transparent)",
        }}
      />
      <Code style={{ fontSize: "0.85em" }}>{hex}</Code>
    </Text>
  );
}

function renderInline(text: string, keyBase: number): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = keyBase;

  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(text.slice(cursor, at));

    const [token, link, code, bold, italic, hex] = match;

    if (link) {
      const close = link.indexOf("](");
      const label = link.slice(1, close);
      const href = link.slice(close + 2, -1);
      out.push(
        <Anchor
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          c="brand.5"
          fw={500}
          underline="always"
        >
          {label}
        </Anchor>,
      );
    } else if (code) {

      const inner = code.slice(1, -1);
      out.push(
        HEX_RE.test(inner) ? (
          <ColorSwatch key={key++} hex={inner} />
        ) : (
          <Code key={key++} style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
            {inner}
          </Code>
        ),
      );
    } else if (bold) {
      out.push(
        <Text key={key++} span fw={600} c="var(--mantine-color-text)" inherit>
          {renderInline(bold.slice(2, -2), key * 1000)}
        </Text>,
      );
    } else if (italic) {
      out.push(
        <Text key={key++} span fs="italic" inherit>
          {renderInline(italic.slice(1, -1), key * 1000)}
        </Text>,
      );
    } else if (hex) {
      out.push(<ColorSwatch key={key++} hex={hex} />);
    }

    cursor = at + token.length;
  }

  if (cursor < text.length) out.push(text.slice(cursor));

  return out;
}

const HEADING = /^(#{1,3})\s+(.+)$/;

const HEADING_ORDER = [3, 4, 5] as const;

const BULLET = /^([ \t]*)[-*]\s+(.+)$/;
const NUMBERED = /^([ \t]*)\d+[.)]\s+(.+)$/;

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

/** Split one `| a | b |` row into its cells, dropping the outer empty edges
 * a leading/trailing `|` produces. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableStart(lines: string[], i: number): boolean {
  return (
    TABLE_ROW.test(lines[i]) &&
    i + 1 < lines.length &&
    TABLE_SEPARATOR.test(lines[i + 1]) &&
    tableCells(lines[i]).length === tableCells(lines[i + 1]).length
  );
}

function renderTable(
  lines: string[],
  start: number,
  keyBase: number,
): { node: React.ReactNode; next: number; key: number } {
  const header = tableCells(lines[start]);
  let key = keyBase;
  let i = start + 2; // past the header row and its --- separator

  const rows: string[][] = [];
  while (i < lines.length && TABLE_ROW.test(lines[i])) {
    rows.push(tableCells(lines[i]));
    i++;
  }

  const node = (
    <Table.ScrollContainer key={key++} minWidth={420} className={classes.tableWrap}>
    <Table striped withTableBorder withColumnBorders fz="sm" className={classes.table}>
      <Table.Thead>
        <Table.Tr>
          {header.map((cell, ci) => (
            <Table.Th key={ci}>{renderInline(cell, key * 1000 + ci)}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, ri) => (
          <Table.Tr key={ri}>
            {row.map((cell, ci) => (
              <Table.Td key={ci}>{renderInline(cell, key * 1000 + ri * 100 + ci)}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
    </Table.ScrollContainer>
  );

  return { node, next: i, key };
}

function isListLine(line: string): boolean {
  return BULLET.test(line) || NUMBERED.test(line);
}

function renderList(
  lines: string[],
  start: number,
  keyBase: number,
  animate: boolean,
): { node: React.ReactNode; next: number; key: number } {
  const first = BULLET.exec(lines[start]) ?? NUMBERED.exec(lines[start]);
  if (!first) return { node: null, next: start + 1, key: keyBase };

  const ordered = NUMBERED.test(lines[start]);
  const indent = first[1].length;
  let key = keyBase;
  let i = start;
  const items: { text: string; children: React.ReactNode }[] = [];

  while (i < lines.length) {
    const m = ordered ? NUMBERED.exec(lines[i]) : BULLET.exec(lines[i]);
    if (!m || m[1].length !== indent) break;
    i++;

    let children: React.ReactNode = null;
    if (i < lines.length && isListLine(lines[i])) {
      const nestedIndent = (BULLET.exec(lines[i]) ?? NUMBERED.exec(lines[i]))![1].length;
      if (nestedIndent > indent) {
        const nested = renderList(lines, i, key * 1000, animate);
        children = nested.node;
        i = nested.next;
        key = nested.key;
      }
    }

    items.push({ text: m[2], children });
  }

  const node = (
    <List
      key={key++}
      type={ordered ? "ordered" : "unordered"}
      size="sm"
      spacing={6}
      className={classes.list}
    >
      {items.map((item, idx) => (
        <List.Item key={idx} className={animate ? classes.fadeIn : undefined}>
          {renderInline(item.text, key * 1000 + idx)}
          {item.children}
        </List.Item>
      ))}
    </List>
  );

  return { node, next: i, key };
}

function renderBlocks(text: string, keyBase: number, animate: boolean): React.ReactNode[] {
  const lines = linkifyBareUrls(text).split("\n");
  const out: React.ReactNode[] = [];
  const fadeClass = animate ? classes.fadeIn : undefined;
  let key = keyBase;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 3) - 1;
      out.push(
        <Title
          key={key++}
          order={HEADING_ORDER[level]}
          className={[classes.heading, HEADING_CLASS[level], fadeClass].filter(Boolean).join(" ")}
        >
          {renderInline(heading[2], key * 1000)}
        </Title>,
      );
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push(<Divider key={key++} className={classes.rule} />);
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(QUOTE.exec(lines[i])![1]);
        i++;
      }
      out.push(
        <blockquote key={key++} className={[classes.quote, fadeClass].filter(Boolean).join(" ")}>
          {renderBlocks(quoted.join("\n"), key * 1000, animate)}
        </blockquote>,
      );
      continue;
    }

    if (isListLine(line)) {
      const list = renderList(lines, i, key, animate);
      out.push(list.node);
      i = list.next;
      key = list.key;
      continue;
    }

    if (isTableStart(lines, i)) {
      const table = renderTable(lines, i, key);
      out.push(table.node);
      i = table.next;
      key = table.key;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }
    const start = i;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !isListLine(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      i++;
    }
    const paragraph = lines.slice(start, i).join("\n");
    out.push(
      <Text
        key={key++}
        span
        inherit
        display="block"
        className={[classes.paragraph, fadeClass].filter(Boolean).join(" ")}
      >
        {renderInline(paragraph, key * 1000)}
      </Text>,
    );
  }

  return out;
}

export function RichText({ text, animate = false }: { text: string; animate?: boolean }) {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(FENCE)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(...renderBlocks(text.slice(cursor, at), key, animate));

    const [whole, lang, code] = match;
    out.push(
      <CodeHighlight
        key={key++}
        code={code.replace(/\n$/, "")}
        language={lang || "tsx"}
        radius="md"
        my={8}
        withCopyButton
        className={[classes.codeBlock, animate ? classes.fadeIn : undefined].filter(Boolean).join(" ")}
        style={{
          fontSize: "0.85em",
          border: "1px solid var(--mantine-color-default-border)",
        }}
        styles={{ pre: { background: "var(--mantine-color-default)" } }}
      />,
    );

    cursor = at + whole.length;
    key += 1000;
  }

  if (cursor < text.length) out.push(...renderBlocks(text.slice(cursor), key, animate));

  return <>{out}</>;
}
