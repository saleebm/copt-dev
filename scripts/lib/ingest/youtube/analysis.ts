// Pass 2 of the YouTube ingest: takes the merged evidence summary from the
// chunked runner and produces a structured analysis (Overview, Key claims,
// Tools/Frameworks, Notable moments, Quotes, Entities). The MDX body then
// gets two collapsible <details> blocks appended to whatever the structuring
// call wrote: a Full analysis section (structured + raw appendix) and a
// Transcript section (chapter-grouped, with timestamped deeplinks back to
// YouTube). Transcript section is omitted entirely when no transcript exists.
//
// Why a separate module: keeps the runner focused on the Gemini control flow
// and keeps the prompt + Zod schema + MDX section assembly together where
// they're easy to reason about.

import { z } from "zod";
import { buildTimestampUrl } from "@/lib/ingest/youtube-url";
import type { YouTubeChapter } from "./chapters";
import type { TranscriptSegment } from "./transcript";

// Zod schema for the analysis call. Kept deliberately simple — the goal is
// stable JSON we can render to MDX, not a research-grade ontology. Quotes
// carry their own timestamp so we can deeplink them; entities are flat to
// avoid the model inventing nested taxonomies it can't sustain.
export const YouTubeAnalysisSchema = z.object({
  overview: z
    .string()
    .describe("2-4 paragraph plain-prose summary of the video as a whole."),
  keyClaims: z
    .array(
      z.object({
        claim: z.string(),
        startSeconds: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Approximate timestamp in seconds for where this claim is made; null if it spans the whole video."
          ),
      })
    )
    .describe("Discrete, falsifiable assertions made in the video."),
  toolsAndFrameworks: z
    .array(
      z.object({
        name: z.string(),
        purpose: z
          .string()
          .describe("One-sentence description of what it's used for here."),
      })
    )
    .describe(
      "Software, libraries, products, methods, or frameworks named in the video."
    ),
  notableMoments: z
    .array(
      z.object({
        startSeconds: z.number().int().nonnegative(),
        title: z
          .string()
          .describe("Short label (2-6 words) for what happens at this moment."),
        description: z.string(),
      })
    )
    .describe(
      "Specific moments worth jumping to: demos, surprises, pivots, conclusions."
    ),
  quotes: z
    .array(
      z.object({
        text: z
          .string()
          .describe(
            "Verbatim quote from the video. Do not paraphrase. Trim only leading/trailing whitespace and filler."
          ),
        speaker: z
          .string()
          .nullable()
          .describe("Speaker name if identifiable, otherwise null."),
        startSeconds: z.number().int().nonnegative().nullable(),
      })
    )
    .describe(
      "Up to ~10 short direct quotes that capture the video's distinctive voice."
    ),
  entities: z
    .array(
      z.object({
        name: z.string(),
        kind: z
          .enum([
            "person",
            "organization",
            "product",
            "concept",
            "place",
            "work",
          ])
          .describe(
            "Coarse category. Use 'work' for books, papers, films, episodes, etc."
          ),
      })
    )
    .describe("People, organizations, products, concepts mentioned."),
});

export type YouTubeAnalysis = z.infer<typeof YouTubeAnalysisSchema>;

// The runner already produces a shared context block via buildSharedContext()
// (metadata + chapters + warnings). We accept it pre-built so we don't reach
// back into YouTubeEvidence here.
export function buildAnalysisPrompt(args: {
  mergedSummary: string;
  metadataBlock: string;
  notes: string;
}): string {
  const { mergedSummary, metadataBlock, notes } = args;
  const lines: string[] = [
    "You are producing a structured analysis of a YouTube video for a personal knowledge base.",
    "Ground every output in the evidence below. Do not invent timestamps. If a timestamp is uncertain, use null.",
    "",
    metadataBlock,
    "",
    "Evidence summary (merged from per-chunk model passes; this is your primary source):",
    "---",
    mergedSummary,
    "---",
  ];
  if (notes.trim()) {
    lines.push("", `Author's notes (verbatim): ${notes.trim()}`);
  }
  lines.push(
    "",
    "Constraints:",
    "- keyClaims: prefer concrete, verifiable statements over vibes.",
    "- quotes: must be verbatim from the evidence summary. If you cannot find a verbatim quote, omit it rather than paraphrase.",
    "- notableMoments: only emit a moment when you can attach a real timestamp; include a short title and a one-sentence description.",
    "- entities: dedupe (case-insensitive) and cap at ~25."
  );
  return lines.join("\n");
}

function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function tsLink(videoId: string, seconds: number): string {
  return `[${formatTimestamp(seconds)}](${buildTimestampUrl(videoId, seconds)})`;
}

function renderAnalysisMarkdown(
  analysis: YouTubeAnalysis,
  videoId: string
): string {
  const out: string[] = [];

  out.push("### Overview", "", analysis.overview.trim(), "");

  if (analysis.keyClaims.length > 0) {
    out.push("### Key claims", "");
    for (const c of analysis.keyClaims) {
      const stamp =
        c.startSeconds != null ? `${tsLink(videoId, c.startSeconds)} — ` : "";
      out.push(`- ${stamp}${c.claim}`);
    }
    out.push("");
  }

  if (analysis.toolsAndFrameworks.length > 0) {
    out.push("### Tools and frameworks", "");
    for (const t of analysis.toolsAndFrameworks) {
      out.push(`- **${t.name}** — ${t.purpose}`);
    }
    out.push("");
  }

  if (analysis.notableMoments.length > 0) {
    out.push("### Notable moments", "");
    for (const m of analysis.notableMoments) {
      out.push(
        `- ${tsLink(videoId, m.startSeconds)} **${m.title}** — ${m.description}`
      );
    }
    out.push("");
  }

  if (analysis.quotes.length > 0) {
    out.push("### Quotes", "");
    for (const q of analysis.quotes) {
      const stamp =
        q.startSeconds != null ? ` (${tsLink(videoId, q.startSeconds)})` : "";
      const speaker = q.speaker ? ` — ${q.speaker}` : "";
      out.push(`> ${q.text}${speaker}${stamp}`, "");
    }
  }

  if (analysis.entities.length > 0) {
    out.push("### Entities", "");
    for (const e of analysis.entities) {
      out.push(`- ${e.name} _(${e.kind})_`);
    }
    out.push("");
  }

  return out.join("\n").trimEnd();
}

type TranscriptInput = {
  segments: TranscriptSegment[];
  language: string | null;
};

// Group transcript segments under chapter headings so the disclosure widget
// is browseable. When no chapters exist, we fall back to a single "Full
// transcript" group. Each line is its own bullet with a deeplink timestamp.
function renderTranscriptMarkdown(
  transcript: TranscriptInput,
  chapters: YouTubeChapter[],
  videoId: string
): string {
  const segments = transcript.segments;
  if (segments.length === 0) return "";

  const groups: Array<{ title: string; segments: TranscriptSegment[] }> = [];
  if (chapters.length === 0) {
    groups.push({ title: "Full transcript", segments });
  } else {
    // Sort chapters defensively even though chapters.ts already enforces order.
    const sorted = [...chapters].sort(
      (a, b) => a.startSeconds - b.startSeconds
    );
    for (let i = 0; i < sorted.length; i += 1) {
      const start = sorted[i].startSeconds;
      const end =
        i + 1 < sorted.length ? sorted[i + 1].startSeconds : Infinity;
      const slice = segments.filter(
        (seg) => seg.startSeconds >= start && seg.startSeconds < end
      );
      if (slice.length > 0) {
        groups.push({ title: sorted[i].title, segments: slice });
      }
    }
    // Catch any segments that fall before the first chapter (rare, but
    // happens when chapter 1 starts > 0).
    const firstChapterStart = sorted[0].startSeconds;
    if (firstChapterStart > 0) {
      const intro = segments.filter(
        (seg) => seg.startSeconds < firstChapterStart
      );
      if (intro.length > 0) {
        groups.unshift({ title: "Intro", segments: intro });
      }
    }
  }

  const out: string[] = [];
  for (const group of groups) {
    out.push(`#### ${group.title}`, "");
    for (const seg of group.segments) {
      const text = seg.text.replace(/\s+/g, " ").trim();
      if (!text) continue;
      out.push(`- ${tsLink(videoId, seg.startSeconds)} ${text}`);
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}

// Build the Pass 2 appendix: a "Full analysis" <details> block (structured
// sections + nested raw evidence) and — only when a transcript exists — a
// "Transcript" <details> block grouped by chapter. Returns a single string
// that the caller appends to the MDX body. MDX needs blank lines around
// raw HTML for the nested markdown to be re-parsed.
export function renderYouTubeAppendix(args: {
  videoId: string;
  analysis: YouTubeAnalysis;
  mergedSummary: string;
  transcript: TranscriptInput | null;
  chapters: YouTubeChapter[];
}): string {
  const { videoId, analysis, mergedSummary, transcript, chapters } = args;

  const analysisMd = renderAnalysisMarkdown(analysis, videoId);
  const rawAppendix = mergedSummary.trim();

  const sections: string[] = [
    "<details>",
    "<summary>Full analysis</summary>",
    "",
    analysisMd,
    "",
    "<details>",
    "<summary>Raw evidence summary (verbatim merged per-chunk output)</summary>",
    "",
    rawAppendix,
    "",
    "</details>",
    "",
    "</details>",
  ];

  if (transcript && transcript.segments.length > 0) {
    const transcriptMd = renderTranscriptMarkdown(
      transcript,
      chapters,
      videoId
    );
    if (transcriptMd) {
      const langSuffix = transcript.language
        ? ` (${transcript.language})`
        : "";
      sections.push(
        "",
        "<details>",
        `<summary>Transcript${langSuffix}</summary>`,
        "",
        transcriptMd,
        "",
        "</details>"
      );
    }
  }

  return sections.join("\n");
}
