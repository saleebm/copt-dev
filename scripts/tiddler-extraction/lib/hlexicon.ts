import type { HlexiconEntry, RawTiddler } from "./types";

const DEF_RE = /^\s*([^\s:=][^:=]*?)\s*:=\s*(.+?)\s*$/;
const ALIAS_HINT_RE = /^\s*(?:aliases?|aka|also)\s*[:=]?\s*(.+)$/i;

export function parseHlexiconTiddler(t: RawTiddler): HlexiconEntry | null {
  const lines = t.body.split(/\r?\n/);
  let term: string | null = null;
  let definition: string | null = null;
  const aliases: string[] = [];

  for (const line of lines) {
    const m = line.match(DEF_RE);
    if (m) {
      const candidateTerm = m[1].trim();
      const candidateDef = m[2].trim();
      if (!term) {
        term = candidateTerm;
        definition = candidateDef;
      } else if (candidateTerm.toLowerCase() !== term.toLowerCase()) {
        aliases.push(candidateTerm);
      }
      continue;
    }
    const aliasMatch = line.match(ALIAS_HINT_RE);
    if (aliasMatch) {
      for (const alias of aliasMatch[1].split(/[,;]/)) {
        const cleaned = alias.trim().replace(/^\[\[|\]\]$/g, "");
        if (cleaned) aliases.push(cleaned);
      }
    }
  }

  if (!term) {
    term = t.title;
  }
  if (!definition) {
    const firstNonEmpty = lines.find((l) => l.trim().length > 0);
    if (!firstNonEmpty) return null;
    definition = firstNonEmpty.trim();
  }

  const cleanWiki = (s: string) =>
    s
      .replace(/<<[^>]+>>/g, "")
      .replace(/''([^']+)''/g, "$1")
      .replace(/\/\/([^/]+)\/\//g, "$1")
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
      .replace(/\^\^([^^]+)\^\^/g, "$1")
      .replace(/,,([^,]+),,/g, "$1")
      .replace(/^!{1,3}\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

  definition = cleanWiki(definition);
  term = cleanWiki(term);

  if (definition.length === 0 || term.length === 0) return null;

  return {
    term,
    definition,
    aliases: Array.from(new Set(aliases.map(cleanWiki))).filter(Boolean),
    sourceTitle: t.title,
    sourceModified: t.modified,
  };
}

export function toMdxHlexicon(entry: HlexiconEntry): string {
  const safeDef = entry.definition.replace(/[{}|]/g, " ").trim();
  const safeTerm = entry.term.replace(/[{}|]/g, " ").trim();
  return `{{${safeTerm}|${safeDef}}}`;
}
