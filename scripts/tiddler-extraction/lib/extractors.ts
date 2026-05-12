import type {
  ExtractedSignals,
  MetaLabel,
  Quote,
  RawTiddler,
  WikiLink,
} from "./types";

const LINK_RE = /\[\[([^\]\n]+?)\]\]/g;
const QUOTE_RE = /—\s*["“]([^"”\n]{4,400})["”](?:\s*[—\-]\s*([^\n.;]+))?/g;
const BLOCKQUOTE_RE = /<<<\s*([\s\S]*?)\s*<<</g;
const HEADING_RE = /^(!{1,3})\s+(.+?)\s*$/gm;
const META_LABEL_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

const URL_HINT = /^(https?:\/\/|mailto:|www\.)/i;

export function extractLinks(body: string): WikiLink[] {
  const links: WikiLink[] = [];
  for (const match of body.matchAll(LINK_RE)) {
    const inner = match[1];
    if (inner.includes("|")) {
      const [label, target] = inner.split("|", 2).map((s) => s.trim());
      links.push({
        label,
        target,
        external: URL_HINT.test(target),
      });
    } else {
      const target = inner.trim();
      links.push({
        label: target,
        target,
        external: URL_HINT.test(target),
      });
    }
  }
  return links;
}

export function extractQuotes(body: string): Quote[] {
  const quotes: Quote[] = [];
  for (const match of body.matchAll(QUOTE_RE)) {
    const text = match[1].trim();
    const attribution = match[2]?.trim() || null;
    if (text.length >= 4 && text.length <= 600) {
      quotes.push({ text, attribution });
    }
  }
  return quotes;
}

export function extractBlockquotes(body: string): string[] {
  const out: string[] = [];
  for (const match of body.matchAll(BLOCKQUOTE_RE)) {
    const text = match[1].trim();
    if (text.length >= 8 && text.length <= 2000) out.push(text);
  }
  return out;
}

export function extractHeadings(
  body: string
): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  for (const match of body.matchAll(HEADING_RE)) {
    out.push({ level: match[1].length, text: match[2].trim() });
  }
  return out;
}

export function extractMetaLabels(body: string): MetaLabel[] {
  const out: MetaLabel[] = [];
  const dateRe = /(\d{4}[.\-/]\d{2}[.\-/]\d{2})/;
  for (const match of body.matchAll(META_LABEL_RE)) {
    const raw = match[1].trim();
    if (raw.includes(":=")) continue;
    if (raw.length < 4 || raw.length > 300) continue;
    const dateMatch = raw.match(dateRe);
    let author: string | null = null;
    let description: string | null = null;
    const dashIdx = raw.indexOf(" - ");
    if (dashIdx !== -1) {
      const rest = raw.slice(dashIdx + 3);
      const colonIdx = rest.indexOf(":");
      if (colonIdx !== -1) {
        author = rest.slice(0, colonIdx).trim() || null;
        description = rest.slice(colonIdx + 1).trim() || null;
      } else {
        description = rest.trim();
      }
    }
    out.push({
      raw,
      date: dateMatch?.[1] ?? null,
      author,
      description,
    });
  }
  return out;
}

export function extractSignals(t: RawTiddler): ExtractedSignals {
  const links = extractLinks(t.body);
  const hlexiconRefs = links
    .filter((l) => !l.external)
    .map((l) => l.target)
    .filter((target) => /^[a-z][\w-]{2,40}$/.test(target));
  return {
    links,
    quotes: extractQuotes(t.body),
    blockquotes: extractBlockquotes(t.body),
    headings: extractHeadings(t.body),
    metaLabels: extractMetaLabels(t.body),
    hlexiconRefs,
  };
}
