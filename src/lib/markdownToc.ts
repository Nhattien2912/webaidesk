/** Stable, URL-safe heading id (shared by the renderer and the table of contents). */
export function headingSlug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "muc"
  );
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Real headings (## and ###) from Markdown source, ignoring fenced code. Ids match MarkdownBody's rendering order. */
export function extractToc(markdown: string): TocEntry[] {
  const seen = new Map<string, number>();
  const entries: TocEntry[] = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = /^ {0,3}(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = match[2]!
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    if (!text) continue;
    const base = headingSlug(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    entries.push({ id: count ? `${base}-${count + 1}` : base, text, level: match[1]!.length as 2 | 3 });
  }
  return entries;
}

