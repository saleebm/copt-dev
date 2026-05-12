import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { RawTiddler } from "./types";

const TIDDLER_OPEN_RE = /^<div\b/;
const PRE_OPEN_RE = /<pre>/;
const PRE_CLOSE_RE = /<\/pre>/;
const DIV_CLOSE_RE = /^<\/div>$/;

const ATTR_RE = /(\w[\w-]*)="([^"]*)"/g;

function parseAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of line.matchAll(ATTR_RE)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function splitTags(raw: string): string[] {
  if (!raw) return [];
  const tags: string[] = [];
  let i = 0;
  const n = raw.length;
  while (i < n) {
    while (i < n && raw[i] === " ") i++;
    if (i >= n) break;
    if (raw[i] === "[" && raw[i + 1] === "[") {
      const end = raw.indexOf("]]", i + 2);
      if (end === -1) break;
      tags.push(raw.slice(i + 2, end));
      i = end + 2;
    } else {
      const start = i;
      while (i < n && raw[i] !== " ") i++;
      tags.push(raw.slice(start, i));
    }
  }
  return tags.filter(Boolean);
}

export type TiddlerParseEvent = {
  index: number;
  tiddler: RawTiddler;
};

export async function* streamTiddlers(
  filePath: string
): AsyncGenerator<TiddlerParseEvent> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });

  let inStore = false;
  let inTiddler = false;
  let inPre = false;
  let attrs: Record<string, string> = {};
  let bodyParts: string[] = [];
  let index = 0;

  for await (const rawLine of rl) {
    const line = rawLine;

    if (!inStore) {
      if (line.includes('id="storeArea"')) inStore = true;
      continue;
    }

    if (!inTiddler) {
      if (TIDDLER_OPEN_RE.test(line)) {
        attrs = parseAttributes(line);
        if (attrs.title === undefined) continue;
        inTiddler = true;
        inPre = false;
        bodyParts = [];

        const preIdx = line.indexOf("<pre>");
        if (preIdx !== -1) {
          inPre = true;
          let rest = line.slice(preIdx + 5);
          const closeIdx = rest.indexOf("</pre>");
          if (closeIdx !== -1) {
            bodyParts.push(rest.slice(0, closeIdx));
            inPre = false;
            rest = rest.slice(closeIdx + 6);
          } else {
            bodyParts.push(rest);
          }
        }

        if (DIV_CLOSE_RE.test(line)) {
          yield emit(attrs, bodyParts, index++);
          inTiddler = false;
        }
      }
      continue;
    }

    if (inPre) {
      const closeIdx = line.indexOf("</pre>");
      if (closeIdx !== -1) {
        bodyParts.push(line.slice(0, closeIdx));
        inPre = false;
      } else {
        bodyParts.push(line);
      }
      continue;
    }

    if (!inPre) {
      if (PRE_OPEN_RE.test(line)) {
        inPre = true;
        const preIdx = line.indexOf("<pre>");
        let rest = line.slice(preIdx + 5);
        const closeIdx = rest.indexOf("</pre>");
        if (closeIdx !== -1) {
          bodyParts.push(rest.slice(0, closeIdx));
          inPre = false;
        } else {
          bodyParts.push(rest);
        }
        continue;
      }
      if (DIV_CLOSE_RE.test(line) || line.startsWith("</div>")) {
        yield emit(attrs, bodyParts, index++);
        inTiddler = false;
        inPre = false;
        bodyParts = [];
      }
    }
  }
}

function emit(
  attrs: Record<string, string>,
  bodyParts: string[],
  index: number
): TiddlerParseEvent {
  const tiddler: RawTiddler = {
    title: attrs.title ?? "",
    tags: splitTags(attrs.tags ?? ""),
    created: attrs.created ?? "",
    modified: attrs.modified ?? "",
    body: unescapeHtml(bodyParts.join("\n")),
  };
  return { index, tiddler };
}

export function parseTiddlyDate(stamp: string): Date | null {
  if (!stamp || stamp.length < 8) return null;
  const y = Number.parseInt(stamp.slice(0, 4), 10);
  const m = Number.parseInt(stamp.slice(4, 6), 10);
  const d = Number.parseInt(stamp.slice(6, 8), 10);
  const hh = Number.parseInt(stamp.slice(8, 10) || "0", 10);
  const mm = Number.parseInt(stamp.slice(10, 12) || "0", 10);
  const ss = Number.parseInt(stamp.slice(12, 14) || "0", 10);
  const ms = Number.parseInt(stamp.slice(14, 17) || "0", 10);
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
  return Number.isNaN(date.getTime()) ? null : date;
}
