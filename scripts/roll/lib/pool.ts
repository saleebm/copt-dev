import fs from "node:fs";
import path from "node:path";
import { pick, rollInt } from "./dice";
import type { Lane, RolledTopic } from "./types";

const PROJECT_ROOT = process.cwd();
const TIDDLERS_DIR = path.join(PROJECT_ROOT, "records/tiddlers");

type HlexiconEntry = {
  term: string;
  definition: string;
  aliases: string[];
  sourceTitle: string;
};

type RankedEntry = {
  title: string;
  tags: string[];
  body: string;
};

type Blockquote = {
  text: string;
  sourceTitle: string;
};

type IndexEntry = {
  title: string;
  tags: string[];
  bodyLength: number;
};

const LANES: Lane[] = ["hlexicon", "concept", "quote", "wild"];

function loadJson<T>(name: string): T {
  const p = path.join(TIDDLERS_DIR, name);
  if (!fs.existsSync(p)) {
    throw new Error(
      `missing ${name} — run \`bun run extract:tiddlers\` first to populate records/tiddlers/`
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

// Pools are loaded lazily and cached for the life of the process.
// `tiddlers.index.json` is ~3MB on disk and parses to >16k objects;
// re-loading on every roll would punish re-rolls.
let cached: {
  hlexicon: HlexiconEntry[];
  ranked: RankedEntry[];
  blockquotes: Blockquote[];
  index: IndexEntry[];
} | null = null;

function loadPools() {
  if (cached) return cached;
  cached = {
    hlexicon: loadJson<HlexiconEntry[]>("hlexicon.json"),
    ranked: loadJson<RankedEntry[]>("ranked.json"),
    blockquotes: loadJson<Blockquote[]>("blockquotes.json"),
    index: loadJson<IndexEntry[]>("tiddlers.index.json"),
  };
  return cached;
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length >= 3)
  );
}

function findRelatedHlexicons(
  pools: ReturnType<typeof loadPools>,
  topicTitle: string,
  topicBody: string | null,
  k = 3
): { term: string; definition: string }[] {
  const haystack = `${topicTitle} ${topicBody ?? ""}`.toLowerCase();
  const topicTokens = tokens(topicTitle);

  const scored = pools.hlexicon.map((h) => {
    const term = h.term.toLowerCase();
    let score = 0;
    if (haystack.includes(term)) score += 3;
    const termTokens = tokens(h.term);
    for (const t of termTokens) {
      if (topicTokens.has(t)) score += 2;
    }
    const defTokens = tokens(h.definition);
    for (const t of defTokens) {
      if (topicTokens.has(t)) score += 1;
    }
    return { entry: h, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => ({ term: s.entry.term, definition: s.entry.definition }));

  if (ranked.length >= k) return ranked;

  // Top up to k with random hlexicons so the AI always has 3 to work with —
  // sparks lean on these names directly, so an empty list weakens the prompt.
  const filler: { term: string; definition: string }[] = [];
  while (ranked.length + filler.length < k) {
    const h = pick(pools.hlexicon);
    if (
      !ranked.some((r) => r.term === h.term) &&
      !filler.some((r) => r.term === h.term)
    ) {
      filler.push({ term: h.term, definition: h.definition });
    }
  }
  return [...ranked, ...filler];
}

export function rollTopic(forceLane?: Lane): RolledTopic {
  const pools = loadPools();
  const lane = forceLane ?? LANES[rollInt(LANES.length)];

  if (lane === "hlexicon") {
    const entry = pick(pools.hlexicon);
    return {
      lane,
      title: entry.term,
      sourceTitle: entry.sourceTitle,
      sourceBody: entry.definition,
      relatedHlexicons: findRelatedHlexicons(pools, entry.term, entry.definition),
    };
  }

  if (lane === "concept") {
    const entry = pick(pools.ranked);
    return {
      lane,
      title: entry.title,
      sourceTitle: entry.title,
      sourceBody: entry.body.slice(0, 1200),
      relatedHlexicons: findRelatedHlexicons(pools, entry.title, entry.body),
    };
  }

  if (lane === "quote") {
    const entry = pick(pools.blockquotes);
    return {
      lane,
      title: entry.text.slice(0, 80),
      sourceTitle: entry.sourceTitle,
      sourceBody: entry.text,
      relatedHlexicons: findRelatedHlexicons(pools, entry.sourceTitle, entry.text),
    };
  }

  const entry = pick(pools.index);
  return {
    lane,
    title: entry.title,
    sourceTitle: entry.title,
    sourceBody: null,
    relatedHlexicons: findRelatedHlexicons(pools, entry.title, null),
  };
}
