import { parseTiddlyDate } from "./parser";
import type { ExtractedSignals, RawTiddler, ScoredTiddler } from "./types";

const RECENCY_CUTOFF_YEARS = 3;

function isRecent(modified: string): boolean {
  const date = parseTiddlyDate(modified);
  if (!date) return false;
  const ageYears =
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears <= RECENCY_CUTOFF_YEARS;
}

function isChatlogOnly(tags: string[]): boolean {
  const lower = tags.map((t) => t.toLowerCase());
  return (
    (lower.includes("chatlog") || lower.includes("@")) &&
    !lower.some((t) =>
      ["hlexicon", "highdeas", "review", "tdl", "fto"].includes(t)
    )
  );
}

function isChatIndexTitle(title: string): boolean {
  return title.startsWith("@:") || /^\d{4}\.\d{2}\.\d{2}\s+-\s+/.test(title);
}

export function scoreTiddler(
  t: RawTiddler,
  signals: ExtractedSignals
): number {
  const bodyLen = t.body.length;
  const lengthScore = Math.min(Math.max(bodyLen, 0), 4000) / 4000;
  const linkScore = (0.5 * Math.min(signals.links.length, 6)) / 6;
  const quoteScore = (0.6 * Math.min(signals.quotes.length, 3)) / 3;
  const hlexiconBonus =
    signals.hlexiconRefs.length > 0 || t.tags.includes("hlexicon") ? 1.0 : 0;
  const recencyBonus = isRecent(t.modified) ? 0.3 : 0;
  const chatlogPenalty = isChatlogOnly(t.tags) ? 1.5 : 0;
  const chatIndexPenalty = isChatIndexTitle(t.title) ? 1.5 : 0;
  const blockquoteBonus = (0.6 * Math.min(signals.blockquotes.length, 3)) / 3;
  const highdeasBonus = t.tags
    .map((tag) => tag.toLowerCase())
    .some((tag) => ["highdeas", "hlexicon"].includes(tag))
    ? 0.5
    : 0;
  return (
    lengthScore +
    linkScore +
    quoteScore +
    hlexiconBonus +
    recencyBonus +
    blockquoteBonus +
    highdeasBonus -
    chatlogPenalty -
    chatIndexPenalty
  );
}

export function rankTiddlers(
  scored: ScoredTiddler[],
  topN: number
): ScoredTiddler[] {
  return [...scored]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.title.localeCompare(b.title);
    })
    .slice(0, topN);
}
