export function normalizeQuestion(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function questionParagraphs(raw: string): string[] {
  return normalizeQuestion(raw)
    .split(/\n{2,}/)
    .filter(Boolean);
}
