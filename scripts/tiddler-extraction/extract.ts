#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { extractSignals } from "./lib/extractors";
import { parseHlexiconTiddler, toMdxHlexicon } from "./lib/hlexicon";
import { streamTiddlers } from "./lib/parser";
import { rankTiddlers, scoreTiddler } from "./lib/ranker";
import { scaffoldDrafts } from "./lib/scaffolder";
import type {
  ConcreteProposal,
  HlexiconEntry,
  ScoredTiddler,
} from "./lib/types";

const PROJECT_ROOT = process.cwd();
const DEFAULT_SOURCE = path.join(
  PROJECT_ROOT,
  "scripts/tiddler-extraction/data/index.html"
);
const OUT_DIR = path.join(PROJECT_ROOT, "records/tiddlers");
const SCAFFOLD_DIR = path.join(
  PROJECT_ROOT,
  "posts/blog/dummy/inspirations"
);

type Args = {
  dryRun: boolean;
  verbose: boolean;
  scaffold: boolean;
  top: number;
  scaffoldCount: number;
  source: string;
  help: boolean;
};

function parseCli(): Args {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", short: "d", default: false },
      verbose: { type: "boolean", short: "v", default: false },
      scaffold: { type: "boolean", short: "s", default: false },
      top: { type: "string", default: "200" },
      "scaffold-count": { type: "string", default: "30" },
      source: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  return {
    dryRun: values["dry-run"] ?? false,
    verbose: values.verbose ?? false,
    scaffold: values.scaffold ?? false,
    top: Number.parseInt(values.top ?? "200", 10),
    scaffoldCount: Number.parseInt(values["scaffold-count"] ?? "30", 10),
    source: values.source ?? DEFAULT_SOURCE,
    help: values.help ?? false,
  };
}

function printHelp(): void {
  console.log(`
🜂  tiddler-extraction — distill h0p3's wiki into JSON + drafts

USAGE:
  bun run extract:tiddlers
  bun run extract:tiddlers:dry
  bun run extract:tiddlers:scaffold

OPTIONS:
  -d, --dry-run          parse + score, write nothing
  -v, --verbose          per-tiddler logging
  -s, --scaffold         after JSON, write draft MDX into posts/blog/dummy/inspirations
      --top N            ranked output size (default 200)
      --scaffold-count N draft mdx count (default 30)
      --source PATH      override source HTML (default: scripts/tiddler-extraction/data/index.html)
  -h, --help             this
`);
}

function printBanner(): void {
  const banner = String.raw`
   ╭─────────────────────────────────────────────────────────╮
   │   ⟡  tiddler-extraction  ⟡                              │
   │      h0p3 → JSON → draft mdx                            │
   │      a hyperconversation, sampled                       │
   ╰─────────────────────────────────────────────────────────╯
`;
  console.log(banner);
}

function writeJson(outPath: string, data: unknown, dryRun: boolean): void {
  if (dryRun) return;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function deriveLocalSlugs(): Set<string> {
  const slugs = new Set<string>();
  const postsDir = path.join(PROJECT_ROOT, "posts");
  if (!fs.existsSync(postsDir)) return slugs;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.mdx?$/.test(entry.name)) {
        slugs.add(path.basename(entry.name).replace(/\.mdx?$/, ""));
      }
    }
  };
  walk(postsDir);
  return slugs;
}

async function main(): Promise<void> {
  const args = parseCli();
  if (args.help) {
    printHelp();
    return;
  }

  printBanner();

  if (!fs.existsSync(args.source)) {
    console.error(`❌ source not found: ${args.source}`);
    console.error(
      "   copy your TiddlyWiki export there first, e.g.:\n   cp ~/Dropbox/index.html scripts/tiddler-extraction/data/index.html"
    );
    process.exit(1);
  }

  console.log(`📂 source:  ${path.relative(PROJECT_ROOT, args.source)}`);
  console.log(`📦 outDir:  ${path.relative(PROJECT_ROOT, OUT_DIR)}`);
  console.log(
    `🎚  mode:    ${args.dryRun ? "DRY-RUN" : "WRITE"}${args.scaffold ? " + scaffold" : ""}`
  );
  console.log("");

  const scored: ScoredTiddler[] = [];
  const hlexicon: HlexiconEntry[] = [];
  const quotesAll: {
    text: string;
    attribution: string | null;
    sourceTitle: string;
  }[] = [];
  const blockquotesAll: { text: string; sourceTitle: string }[] = [];
  const metaLabelsAll: { raw: string; sourceTitle: string }[] = [];
  const linkGraph: Record<string, string[]> = {};
  const titleIndex: { title: string; tags: string[]; modified: string }[] = [];

  let count = 0;
  const startedAt = Date.now();

  for await (const { tiddler } of streamTiddlers(args.source)) {
    count++;

    if (tiddler.tags.includes("hlexicon")) {
      const entry = parseHlexiconTiddler(tiddler);
      if (entry) hlexicon.push(entry);
    }

    const signals = extractSignals(tiddler);
    const score = scoreTiddler(tiddler, signals);

    titleIndex.push({
      title: tiddler.title,
      tags: tiddler.tags,
      modified: tiddler.modified,
    });

    for (const q of signals.quotes) {
      quotesAll.push({
        text: q.text,
        attribution: q.attribution,
        sourceTitle: tiddler.title,
      });
    }
    for (const bq of signals.blockquotes) {
      blockquotesAll.push({ text: bq, sourceTitle: tiddler.title });
    }
    for (const ml of signals.metaLabels) {
      metaLabelsAll.push({ raw: ml.raw, sourceTitle: tiddler.title });
    }

    const internalLinks = signals.links
      .filter((l) => !l.external)
      .map((l) => l.target);
    if (internalLinks.length > 0) {
      linkGraph[tiddler.title] = internalLinks;
    }

    scored.push({
      ...tiddler,
      signals,
      score,
      bodyLength: tiddler.body.length,
    });

    if (args.verbose && count % 500 === 0) {
      console.log(`  · parsed ${count} tiddlers (latest: "${tiddler.title}")`);
    } else if (!args.verbose && count % 2000 === 0) {
      process.stderr.write(`\r  parsing ${count} tiddlers …`);
    }
  }
  if (!args.verbose) process.stderr.write("\r");

  const elapsedMs = Date.now() - startedAt;

  const ranked = rankTiddlers(scored, args.top);

  const targetMentions = new Map<string, number>();
  const targetContexts = new Map<string, string[]>();
  for (const t of ranked) {
    for (const link of t.signals.links) {
      if (link.external) continue;
      targetMentions.set(link.target, (targetMentions.get(link.target) ?? 0) + 1);
      const ctx = targetContexts.get(link.target) ?? [];
      if (ctx.length < 3) {
        const snippet =
          t.signals.quotes[0]?.text ??
          t.signals.blockquotes[0] ??
          t.body.slice(0, 200);
        ctx.push(`${t.title}: ${snippet.slice(0, 200)}`);
        targetContexts.set(link.target, ctx);
      }
    }
  }
  const concreteProposals: ConcreteProposal[] = [...targetMentions.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([concept, mentionCount]) => ({
      concept,
      mentionCount,
      sampleContexts: targetContexts.get(concept) ?? [],
    }));

  console.log("");
  console.log(`✅ parsed ${count} tiddlers in ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`   hlexicon entries: ${hlexicon.length}`);
  console.log(`   quotes: ${quotesAll.length}`);
  console.log(`   blockquotes: ${blockquotesAll.length}`);
  console.log(`   meta-labels: ${metaLabelsAll.length}`);
  console.log(`   ranked top-${args.top}: first 5 →`);
  for (const t of ranked.slice(0, 5)) {
    console.log(
      `     · ${t.score.toFixed(2)}  ${t.title}  [${t.tags.slice(0, 3).join(", ")}]`
    );
  }
  console.log("");

  const indexLite = titleIndex.map((t, i) => ({
    title: t.title,
    tags: t.tags,
    modified: t.modified,
    score: scored[i].score,
    bodyLength: scored[i].bodyLength,
  }));

  writeJson(path.join(OUT_DIR, "tiddlers.index.json"), indexLite, args.dryRun);
  writeJson(
    path.join(OUT_DIR, "hlexicon.json"),
    hlexicon
      .slice()
      .sort((a, b) => a.term.localeCompare(b.term))
      .map((e) => ({ ...e, mdx: toMdxHlexicon(e) })),
    args.dryRun
  );
  writeJson(
    path.join(OUT_DIR, "quotes.json"),
    quotesAll.slice(0, 5000),
    args.dryRun
  );
  writeJson(
    path.join(OUT_DIR, "blockquotes.json"),
    blockquotesAll.slice(0, 5000),
    args.dryRun
  );
  writeJson(
    path.join(OUT_DIR, "meta-labels.json"),
    metaLabelsAll.slice(0, 5000),
    args.dryRun
  );
  writeJson(path.join(OUT_DIR, "links.json"), linkGraph, args.dryRun);
  writeJson(
    path.join(OUT_DIR, "ranked.json"),
    ranked.map((r) => ({
      title: r.title,
      tags: r.tags,
      modified: r.modified,
      created: r.created,
      score: r.score,
      bodyLength: r.bodyLength,
      body: r.body,
      signals: r.signals,
    })),
    args.dryRun
  );
  writeJson(
    path.join(OUT_DIR, "concrete-proposals.json"),
    concreteProposals,
    args.dryRun
  );

  if (!args.dryRun) {
    console.log(`📝 wrote 8 JSON files to ${path.relative(PROJECT_ROOT, OUT_DIR)}/`);
  } else {
    console.log("📝 dry-run — nothing written");
  }

  if (args.scaffold) {
    const localSlugs = deriveLocalSlugs();
    const hlexiconByTerm = new Map<string, HlexiconEntry>();
    for (const e of hlexicon) hlexiconByTerm.set(e.term, e);

    const { written } = scaffoldDrafts(ranked, {
      outDir: SCAFFOLD_DIR,
      draftCount: args.scaffoldCount,
      localPostSlugs: localSlugs,
      hlexiconByTerm,
      dryRun: args.dryRun,
    });

    console.log(
      `\n🌱 scaffold: ${written.length} draft mdx ${args.dryRun ? "(would write)" : "written"} → ${path.relative(PROJECT_ROOT, SCAFFOLD_DIR)}/`
    );
  }

  console.log("");
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ extraction failed");
    console.error(err);
    process.exit(1);
  });
}
