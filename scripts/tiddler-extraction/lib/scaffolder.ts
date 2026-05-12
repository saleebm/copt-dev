import fs from "node:fs";
import path from "node:path";
import { toMdxHlexicon } from "./hlexicon";
import { parseTiddlyDate } from "./parser";
import type { HlexiconEntry, ScoredTiddler } from "./types";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

function uniqueSlug(target: string, existing: Set<string>): string {
  if (!existing.has(target)) return target;
  let i = 2;
  while (existing.has(`${target}-${i}`)) i++;
  return `${target}-${i}`;
}

function escapeFrontmatterString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function fence(label: string): string {
  return `<!-- ${label} -->`;
}

function trimToParagraph(body: string, maxChars: number): string {
  const trimmed = body.slice(0, maxChars);
  const lastBreak = trimmed.lastIndexOf("\n\n");
  if (lastBreak > maxChars * 0.5) return trimmed.slice(0, lastBreak).trim();
  return trimmed.trim();
}

function transformWikiLinks(
  body: string,
  localSlugs: Set<string>
): string {
  return body.replace(/\[\[([^\]\n]+?)\]\]/g, (_match, inner: string) => {
    let label = inner;
    let target = inner;
    if (inner.includes("|")) {
      const parts = inner.split("|", 2);
      label = parts[0].trim();
      target = parts[1].trim();
    }
    if (/^https?:\/\//.test(target)) {
      return `[${label}](${target})`;
    }
    const targetSlug = slugify(target);
    if (localSlugs.has(targetSlug)) {
      return `<PostLink postId="${targetSlug}">${label}</PostLink>`;
    }
    return `*${label}*`;
  });
}

function transformHeadings(body: string): string {
  return body.replace(/^(!{1,3})\s+(.+?)\s*$/gm, (_m, bangs: string, text) => {
    const level = bangs.length + 1;
    return `${"#".repeat(level)} ${text}`;
  });
}

function transformBlockquotes(body: string): string {
  return body.replace(/<<<\s*([\s\S]*?)\s*<<</g, (_m, inner: string) => {
    return inner
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
  });
}

function stripMacros(body: string): string {
  return body
    .replace(/<<[^>]+>>/g, "")
    .replace(/\{\{\s*[^{}]*:=[^{}]*\}\}/g, "")
    .replace(/\$\$[^$]*\$\$/g, "");
}

function stripRawHtml(body: string): string {
  return body
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?(?:p|span|div|sup|sub|small|i|b|em|strong|u)\b[^>]*>/gi, "")
    .replace(/<\/?\w+[^>]*>/g, "");
}

function neutralizeLoneCurlies(body: string): string {
  const placeholder = "\x00HLX\x00";
  let masked = body.replace(/\{\{[^{}]+\}\}/g, (m) => `${placeholder}${Buffer.from(m).toString("base64")}${placeholder}`);
  masked = masked.replace(/\{([^{}]{0,200})\}/g, "$1");
  masked = masked.replace(new RegExp(`${placeholder}([A-Za-z0-9+/=]+)${placeholder}`, "g"), (_m, b64) =>
    Buffer.from(b64, "base64").toString("utf8")
  );
  return masked;
}

const SYSTEM_TIDDLER_RE = /^\$:\//;

function normalizeWikiMarkup(body: string): string {
  return body
    .replace(/''([^']+)''/g, "**$1**")
    .replace(/\/\/([^/\n]{1,200})\/\//g, "*$1*")
    .replace(/\^\^([^^\n]+)\^\^/g, "$1")
    .replace(/,,([^,\n]+),,/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1");
}

function collapseAsciiArt(body: string): string {
  let result = body.replace(
    /([^\sA-Za-z0-9])\1{8,}/g,
    (match) => `${match.slice(0, 3)}…`
  );
  result = result.replace(
    /(\S{2,40}\s)\1{3,}/g,
    (_match, token) => `${token.trim()} …`
  );
  return result;
}

function cleanInlineMarkup(s: string): string {
  return s
    .replace(/<<[^>]+>>/g, "")
    .replace(/\^\^([^^]+)\^\^/g, "$1")
    .replace(/,,+([^,]+?),,+/g, "$1")
    .replace(/''([^']+)''/g, "**$1**")
    .replace(/\/\/([^/\n]{1,200})\/\//g, "*$1*")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTrailingPartial(body: string): string {
  return body
    .replace(/\[\[[^\]\n]{0,80}$/m, "")
    .replace(/<<[^>\n]{0,80}$/m, "")
    .replace(/\s+$/g, "");
}

export type ScaffoldOptions = {
  outDir: string;
  draftCount: number;
  localPostSlugs: Set<string>;
  hlexiconByTerm: Map<string, HlexiconEntry>;
  dryRun: boolean;
};

export type ScaffoldResult = {
  written: string[];
};

export function scaffoldDrafts(
  ranked: ScoredTiddler[],
  options: ScaffoldOptions
): ScaffoldResult {
  const { outDir, draftCount, localPostSlugs, hlexiconByTerm, dryRun } =
    options;

  if (!dryRun) fs.mkdirSync(outDir, { recursive: true });

  const usedSlugs = new Set<string>();
  const written: string[] = [];

  const candidates = ranked
    .filter((t) => !SYSTEM_TIDDLER_RE.test(t.title))
    .filter((t) => t.signals.quotes.length + t.signals.blockquotes.length > 0)
    .slice(0, draftCount);

  for (const t of candidates) {
    const baseSlug = slugify(t.title);
    const slug = uniqueSlug(baseSlug, usedSlugs);
    usedSlugs.add(slug);

    const modifiedDate = parseTiddlyDate(t.modified);
    const dateLabel = modifiedDate
      ? modifiedDate.toISOString().slice(0, 10)
      : "unknown";

    const hlexiconInline = t.signals.hlexiconRefs
      .map((ref) => hlexiconByTerm.get(ref))
      .filter((e): e is HlexiconEntry => Boolean(e))
      .slice(0, 3)
      .map((entry) => toMdxHlexicon(entry));

    const headerQuoteRaw =
      t.signals.quotes[0]?.text ?? t.signals.blockquotes[0] ?? "";
    const headerQuote = cleanInlineMarkup(headerQuoteRaw);
    const headerQuoteBlock = headerQuote
      ? `> ${headerQuote.split("\n").join("\n> ")}\n`
      : "";

    let body = trimToParagraph(t.body, 1800);
    body = stripMacros(body);
    body = stripRawHtml(body);
    body = transformBlockquotes(body);
    body = transformHeadings(body);
    body = transformWikiLinks(body, localPostSlugs);
    body = normalizeWikiMarkup(body);
    body = collapseAsciiArt(body);
    body = neutralizeLoneCurlies(body);
    body = trimTrailingPartial(body);

    const frontmatter = [
      "---",
      `title: "${escapeFrontmatterString(t.title)}"`,
      'tags: "inspired-by-h0p3,draft,inspirations"',
      'status: "DRAFT"',
      "---",
      "",
    ].join("\n");

    const seedNote = fence(
      `seed from h0p3 tiddler "${t.title.replace(/--/g, "—")}" modified ${dateLabel} — rewrite in your voice before promoting`
    );

    const sections = [
      frontmatter,
      seedNote,
      "",
      `# ${t.title}`,
      "",
      headerQuoteBlock,
      body,
      "",
      hlexiconInline.length
        ? `\n${fence("inline hlexicon refs surfaced from the source")}\n${hlexiconInline.join("\n\n")}\n`
        : "",
    ]
      .filter((section) => section !== "")
      .join("\n");

    const filePath = path.join(outDir, `${slug}.mdx`);
    if (!dryRun) {
      fs.writeFileSync(filePath, `${sections.trim()}\n`, "utf8");
    }
    written.push(filePath);
  }

  return { written };
}
