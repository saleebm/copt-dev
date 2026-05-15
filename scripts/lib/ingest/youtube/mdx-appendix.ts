// Renders the "Full analysis" and "Transcript" <details> blocks that get
// appended to the FINDING body for YouTube ingests. The blog's MDX pipeline
// (next-mdx-remote + remark-gfm + rehype-slug) passes raw HTML through, so
// <details>/<summary> render as native disclosure widgets.
//
// Design rules:
//   - Everything goes inside <details>. The visible FINDING body above stays
//     short and skimmable.
//   - Timestamps inside both sections are real YouTube deeplinks (youtu.be/ID?t=Ns).
//   - When the transcript is missing, the Transcript block is omitted entirely
//     (per Pass 2 contract).
//   - The raw merged evidence summary is appended verbatim inside the Full
//     analysis block as a "Raw evidence" sub-section — nothing the upstream
//     call captured is silently dropped.
import { buildTimestampUrl } from "@/lib/ingest/youtube-url";
import type { YouTubeChapter } from "./chapters";
import type { YouTubeAnalysis } from "./analysis";
import type { TranscriptSegment } from "./transcript";

function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

// Parse "[m:ss]" or "[h:mm:ss]" (or the same without brackets) into seconds.
// Returns null if it doesn't look like a timestamp.
function parseTimestampToSeconds(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\[|\]$/g, "");
  const parts = trimmed.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

// Replace [m:ss] / [h:mm:ss] tokens in arbitrary prose with markdown links to
// the YouTube deeplink. Conservative: only matches the bracketed form so we
// don't accidentally rewrite version numbers or ratios.
function linkifyTimestamps(text: string, videoId: string): string {
  return text.replace(/\[(\d{1,2}(?::\d{2}){1,2})\]/g, (_match, ts: string) => {
    const seconds = parseTimestampToSeconds(ts);
    if (seconds === null) return `[${ts}]`;
    return `[[${ts}]](${buildTimestampUrl(videoId, seconds)})`;
  });
}

function renderAnalysis(
  analysis: YouTubeAnalysis,
  videoId: string,
  mergedSummary: string
): string {
  const lines: string[] = [];
  lines.push("<details>");
  lines.push("<summary>Full analysis</summary>");
  lines.push("");

  if (analysis.overview.trim()) {
    lines.push("### Overview");
    lines.push(linkifyTimestamps(analysis.overview.trim(), videoId));
    lines.push("");
  }

  if (analysis.keyClaims.length > 0) {
    lines.push("### Key claims");
    for (const c of analysis.keyClaims) {
      const ts = c.timestamp ? `${linkifyTimestamps(`[${stripBrackets(c.timestamp)}]`, videoId)} ` : "";
      lines.push(`- ${ts}${c.claim}`);
    }
    lines.push("");
  }

  if (analysis.toolsAndFrameworks.length > 0) {
    lines.push("### Tools and frameworks");
    for (const t of analysis.toolsAndFrameworks) {
      lines.push(`- **${t.name}** — ${t.note}`);
    }
    lines.push("");
  }

  if (analysis.notableMoments.length > 0) {
    lines.push("### Notable moments");
    for (const m of analysis.notableMoments) {
      const ts = linkifyTimestamps(`[${stripBrackets(m.timestamp)}]`, videoId);
      lines.push(`- ${ts} **${m.title}** — ${m.description}`);
    }
    lines.push("");
  }

  if (analysis.quotes.length > 0) {
    lines.push("### Quotes");
    for (const q of analysis.quotes) {
      const ts = q.timestamp
        ? ` — ${linkifyTimestamps(`[${stripBrackets(q.timestamp)}]`, videoId)}`
        : "";
      const speaker = q.speaker ? ` *(${q.speaker})*` : "";
      lines.push(`> ${q.text}${speaker}${ts}`);
      lines.push("");
    }
  }

  if (analysis.entities.length > 0) {
    lines.push("### Entities");
    for (const e of analysis.entities) {
      lines.push(`- ${e.name} *(${e.kind})*`);
    }
    lines.push("");
  }

  lines.push("### Raw evidence");
  lines.push("");
  lines.push("<details>");
  lines.push("<summary>Merged per-window summary (verbatim)</summary>");
  lines.push("");
  lines.push(linkifyTimestamps(mergedSummary.trim(), videoId));
  lines.push("");
  lines.push("</details>");
  lines.push("");
  lines.push("</details>");
  return lines.join("\n");
}

function stripBrackets(ts: string): string {
  return ts.trim().replace(/^\[|\]$/g, "");
}

function renderTranscript(args: {
  segments: TranscriptSegment[];
  chapters: YouTubeChapter[];
  videoId: string;
  language: string | null;
}): string {
  const { segments, chapters, videoId, language } = args;
  const lines: string[] = [];
  lines.push("<details>");
  lines.push(
    `<summary>Transcript${language ? ` (${language})` : ""}</summary>`
  );
  lines.push("");

  // If chapters exist, group segments under each chapter. Otherwise emit a
  // single flat list.
  if (chapters.length > 0) {
    const sortedChapters = [...chapters].sort(
      (a, b) => a.startSeconds - b.startSeconds
    );
    for (let i = 0; i < sortedChapters.length; i += 1) {
      const ch = sortedChapters[i];
      const next = sortedChapters[i + 1];
      const endSeconds = next ? next.startSeconds : Number.POSITIVE_INFINITY;
      const inChapter = segments.filter(
        (s) => s.startSeconds >= ch.startSeconds && s.startSeconds < endSeconds
      );
      if (inChapter.length === 0) continue;
      const chTs = formatTimestamp(ch.startSeconds);
      const chLink = buildTimestampUrl(videoId, ch.startSeconds);
      lines.push(`#### [[${chTs}](${chLink})] ${ch.title}`);
      lines.push("");
      for (const seg of inChapter) {
        const ts = formatTimestamp(seg.startSeconds);
        const link = buildTimestampUrl(videoId, seg.startSeconds);
        lines.push(`- [[${ts}](${link})] ${seg.text}`);
      }
      lines.push("");
    }
  } else {
    for (const seg of segments) {
      const ts = formatTimestamp(seg.startSeconds);
      const link = buildTimestampUrl(videoId, seg.startSeconds);
      lines.push(`- [[${ts}](${link})] ${seg.text}`);
    }
    lines.push("");
  }

  lines.push("</details>");
  return lines.join("\n");
}

export type YouTubeAppendixInput = {
  videoId: string;
  analysis: YouTubeAnalysis;
  mergedSummary: string;
  transcript: {
    segments: TranscriptSegment[];
    language: string | null;
  } | null;
  chapters: YouTubeChapter[];
};

export function renderYouTubeAppendix(input: YouTubeAppendixInput): string {
  const parts: string[] = [];
  parts.push(renderAnalysis(input.analysis, input.videoId, input.mergedSummary));
  if (input.transcript && input.transcript.segments.length > 0) {
    parts.push(
      renderTranscript({
        segments: input.transcript.segments,
        chapters: input.chapters,
        videoId: input.videoId,
        language: input.transcript.language,
      })
    );
  }
  return parts.join("\n\n");
}
