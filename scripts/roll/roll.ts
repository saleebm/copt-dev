#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { resolveApiKey } from "../lib/ai-config";
import { bannerOrFallback, totalsCard } from "./lib/glamour";
import { rollTopic } from "./lib/pool";
import {
  closeInput,
  readBlock,
  readChoice,
  readLine,
  withInputSuppressed,
} from "./lib/readline";
import { streamReshape } from "./lib/reshape";
import { saveRoll } from "./lib/save";
import { startSpinner } from "./lib/spinner";
import { streamSparks } from "./lib/sparks";
import { formatMs, Stopwatch } from "./lib/timer";
import type { Lane, RolledTopic, SparkAnswer } from "./lib/types";

const VALID_LANES: Lane[] = ["hlexicon", "concept", "quote", "wild"];

type Args = {
  dryRun: boolean;
  lane?: Lane;
  help: boolean;
};

function parseCli(): Args {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", short: "d", default: false },
      lane: { type: "string", short: "l" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const lane =
    values.lane && VALID_LANES.includes(values.lane as Lane)
      ? (values.lane as Lane)
      : undefined;
  return {
    dryRun: values["dry-run"] ?? false,
    lane,
    help: values.help ?? false,
  };
}

function printHelp(): void {
  console.log(`
🎲 roll — fucking-random topic + tiny gemini loop → draft mdx

USAGE:
  bun run roll
  bun run roll:dry              # roll only, no AI, no save
  bun run roll --lane hlexicon  # force a lane (hlexicon|concept|quote|wild)

FLOW:
  1. dice roll      — pick a topic from h0p3's extracted wiki
  2. sparks         — gemini streams 3–5 spark questions
  3. free-write     — answer each spark (end each with "." on its own line)
  4. reshape        — gemini drafts a post in your voice
  5. save           — writes DRAFT mdx to posts/blog/dummy/rolls/

ENV:
  GEMINI_API_KEY    — required for sparks + reshape (see .env.example)
  AI_MODEL          — default gemini-2.5-flash
  AI_TEMPERATURE    — default 0.7
`);
}

function printTopic(t: RolledTopic): void {
  const lane = t.lane.toUpperCase().padEnd(8);
  console.log(`\n  [${lane}]  ${t.title}`);
  if (t.sourceTitle !== t.title) {
    console.log(`  source:  "${t.sourceTitle}"`);
  }
  if (t.sourceBody) {
    const preview = t.sourceBody.slice(0, 320).replace(/\s+/g, " ").trim();
    console.log(`  preview: ${preview}${t.sourceBody.length > 320 ? "…" : ""}`);
  }
  if (t.relatedHlexicons.length > 0) {
    console.log("  related hlexicons:");
    for (const h of t.relatedHlexicons) {
      console.log(`    · ${h.term} := ${h.definition.slice(0, 80)}`);
    }
  }
  console.log("");
}

async function rollPhase(forceLane?: Lane): Promise<RolledTopic | null> {
  while (true) {
    const topic = rollTopic(forceLane);
    printTopic(topic);
    const choice = await readChoice(
      "  [k]eep / [r]e-roll / [q]uit ? →",
      ["k", "r", "q"]
    );
    if (choice === "k") return topic;
    if (choice === "q") return null;
  }
}

async function sparksPhase(
  topic: RolledTopic
): Promise<{ sparks: string[]; ms: number }> {
  console.log(
    "\n  ✨ striking sparks — please don't type until it's done."
  );
  const sw = new Stopwatch();
  const sp = startSpinner("waiting for gemini");
  const { sparks } = await withInputSuppressed(() =>
    streamSparks(topic, () => sp.stop())
  );
  sp.stop();
  const ms = sw.elapsedMs();
  console.log(`\n  ✅ sparks ready in ${formatMs(ms)}. you can type now.`);
  if (sparks.length === 0) {
    console.log(
      "  ⚠️  no sparks parsed from response — using one fallback prompt"
    );
    return {
      sparks: [`What does "${topic.title}" pull out of you right now?`],
      ms,
    };
  }
  return { sparks, ms };
}

async function freewritePhase(
  sparks: string[]
): Promise<{ answers: SparkAnswer[]; ms: number }> {
  console.log("\n  📝 free-write — type your answer to each spark.");
  console.log(
    '     end each answer with "." on its own line. type "skip" to skip a spark.\n'
  );
  const sw = new Stopwatch();
  const answers: SparkAnswer[] = [];
  for (let i = 0; i < sparks.length; i++) {
    console.log(`  (${i + 1}/${sparks.length})  ${sparks[i]}`);
    process.stdout.write("  > ");
    const first = (await readLine()).trim();
    if (first === "skip") {
      answers.push({ spark: sparks[i], answer: "" });
      console.log("");
      continue;
    }
    if (first === "done") {
      answers.push({ spark: sparks[i], answer: "" });
      break;
    }
    const rest = await readBlock(["."]);
    const answer = [first, rest].filter(Boolean).join("\n").trim();
    answers.push({ spark: sparks[i], answer });
    console.log("");
  }
  const ms = sw.elapsedMs();
  console.log(`  📝 wrote in ${formatMs(ms)}.`);
  return { answers, ms };
}

async function reshapeLoop(
  topic: RolledTopic,
  answers: SparkAnswer[]
): Promise<{ draft: string | null; ms: number }> {
  let draft = "";
  let totalMs = 0;
  while (true) {
    console.log("\n  🪡 reshaping — please don't type until it's done.");
    const sw = new Stopwatch();
    const sp = startSpinner("waiting for gemini");
    draft = await withInputSuppressed(() =>
      streamReshape(topic, answers, () => sp.stop())
    );
    sp.stop();
    const ms = sw.elapsedMs();
    totalMs += ms;
    console.log(`\n  ✅ draft ready in ${formatMs(ms)}.`);
    const choice = await readChoice(
      "\n  [s]ave / [e]dit again / [d]iscard ? →",
      ["s", "e", "d"]
    );
    if (choice === "s") return { draft, ms: totalMs };
    if (choice === "d") return { draft: null, ms: totalMs };
  }
}

async function main(): Promise<void> {
  const args = parseCli();
  if (args.help) {
    printHelp();
    return;
  }

  bannerOrFallback();
  const session = new Stopwatch();

  if (!args.dryRun && !resolveApiKey()) {
    console.error(
      "\n❌ GEMINI_API_KEY not set — required for sparks + reshape."
    );
    console.error("   try `bun run roll:dry` to test the dice without AI.\n");
    process.exit(1);
  }

  const topic = await rollPhase(args.lane);
  if (!topic) {
    console.log("\n  👋 bye.\n");
    return;
  }

  if (args.dryRun) {
    console.log("\n  (dry-run — stopping before AI + save)\n");
    return;
  }

  const { sparks, ms: sparksMs } = await sparksPhase(topic);
  const { answers, ms: writeMs } = await freewritePhase(sparks);

  const nonEmpty = answers.filter((a) => a.answer.trim().length > 0).length;
  if (nonEmpty === 0) {
    console.log("\n  ⚠️  no answers given — nothing to reshape. exiting.\n");
    return;
  }

  const { draft, ms: reshapeMs } = await reshapeLoop(topic, answers);
  if (!draft) {
    console.log("\n  🗑  discarded.\n");
    return;
  }

  const filePath = saveRoll(topic, draft);
  totalsCard([
    { label: "✨  sparks", value: formatMs(sparksMs) },
    { label: "📝  write", value: formatMs(writeMs) },
    { label: "🪡  reshape", value: formatMs(reshapeMs) },
    { label: "🎲  total", value: formatMs(session.elapsedMs()) },
  ]);
  console.log(`  ✅ saved → ${filePath}`);
  console.log(`     next: \`bun run db:sync-posts\` when you're ready.\n`);
}

if (import.meta.main) {
  main()
    .catch((err) => {
      console.error("\n❌ roll failed");
      console.error(err);
      process.exit(1);
    })
    .finally(() => {
      closeInput();
    });
}
