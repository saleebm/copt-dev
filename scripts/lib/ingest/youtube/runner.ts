// YouTube-specific Gemini runner. Two-call pattern mirroring the url_context
// flow in gemini-runner.ts:
//   1. Evidence call: send the YouTube URL as a FilePart (Gemini-native video
//      ingest via fileData.fileUri), plus the transcript + Data API metadata
//      + parsed chapters as text. The model returns a grounded prose summary
//      with timestamps.
//   2. Structuring call: take that summary + author notes, return a strict
//      PostDraftSchema object (title/slug/tags/categories/body).
//
// Output shape is identical to the regular URL branch — same FINDING MDX,
// same downstream pipeline. The YouTube branch is purely an enrichment of
// the evidence we hand to the model.

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import {
  buildTimestampUrl,
  parseYouTubeUrl,
  type YouTubeUrlParse,
} from "@/lib/ingest/youtube-url";
import { getAIConfig, getYouTubeModel } from "../../ai-config";
import {
  PostDraftSchema,
  toGeminiOutput,
} from "../gemini-runner";
import type { GeminiOutput } from "../types";
import {
  parseChaptersFromDescription,
  type YouTubeChapter,
} from "./chapters";
import {
  getChunkConfig,
  mapWithConcurrency,
  planChunks,
  type VideoChunk,
} from "./chunks";
import {
  fetchYouTubeMetadata,
  resolveYouTubeApiKey,
  type YouTubeVideoMetadata,
} from "./data-api";
import {
  generateContentForVideoClip,
  GeminiRestError,
} from "./gemini-rest";
import {
  fetchYouTubeTranscript,
  type TranscriptFetch,
  type TranscriptSegment,
} from "./transcript";
import {
  buildAnalysisPrompt,
  renderYouTubeAppendix,
  YouTubeAnalysisSchema,
  type YouTubeAnalysis,
} from "./analysis";

// Cap how much transcript text we send to the model. Long videos can blow past
// context windows; this keeps the prompt sane while preserving timestamp
// grounding (segments include their offsets).
const MAX_TRANSCRIPT_CHARS = 60_000;

export type YouTubeEvidence = {
  parse: YouTubeUrlParse;
  metadata: YouTubeVideoMetadata | null;
  transcript: TranscriptFetch | null;
  chapters: YouTubeChapter[];
  warnings: string[];
};

function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function truncateTranscript(segments: TranscriptSegment[]): {
  text: string;
  truncated: boolean;
} {
  const lines: string[] = [];
  let used = 0;
  for (const seg of segments) {
    const stamped = `[${formatTimestamp(seg.startSeconds)}] ${seg.text}`;
    if (used + stamped.length + 1 > MAX_TRANSCRIPT_CHARS) {
      return { text: lines.join("\n"), truncated: true };
    }
    lines.push(stamped);
    used += stamped.length + 1;
  }
  return { text: lines.join("\n"), truncated: false };
}

export async function gatherYouTubeEvidence(
  url: string
): Promise<YouTubeEvidence | null> {
  const parse = parseYouTubeUrl(url);
  if (!parse) return null;

  const warnings: string[] = [];
  const apiKey = resolveYouTubeApiKey();
  if (!apiKey) {
    warnings.push("YOUTUBE_DATA_API_KEY not set; skipping Data API metadata");
  }

  const [metadataResult, transcriptResult] = await Promise.allSettled([
    apiKey
      ? fetchYouTubeMetadata(parse.videoId, apiKey)
      : Promise.resolve(null),
    fetchYouTubeTranscript(parse.videoId),
  ]);

  let metadata: YouTubeVideoMetadata | null = null;
  if (metadataResult.status === "fulfilled") {
    metadata = metadataResult.value;
    if (apiKey && !metadata) {
      warnings.push(`YouTube Data API returned no item for ${parse.videoId}`);
    }
  } else {
    warnings.push(
      `YouTube Data API failed: ${metadataResult.reason instanceof Error ? metadataResult.reason.message : String(metadataResult.reason)}`
    );
  }

  let transcript: TranscriptFetch | null = null;
  if (transcriptResult.status === "fulfilled") {
    transcript = transcriptResult.value;
    if (!transcript) {
      warnings.push("transcript unavailable (disabled or no captions)");
    }
  } else {
    warnings.push(
      `transcript fetch failed: ${transcriptResult.reason instanceof Error ? transcriptResult.reason.message : String(transcriptResult.reason)}`
    );
  }

  const chapters = metadata
    ? parseChaptersFromDescription(
        metadata.description,
        metadata.durationSeconds || null
      )
    : [];

  return { parse, metadata, transcript, chapters, warnings };
}

// Build the shared context (metadata, chapters, transcript, notes) that's
// useful in every evidence call — both the legacy single-call path and each
// chunked clip call. Chunks slice the transcript to their window so we don't
// re-send the full thing per chunk.
function buildSharedContext(
  evidence: YouTubeEvidence,
  notes: string,
  windowSeconds: { start: number; end: number } | null
): string {
  const { parse, metadata, transcript, chapters } = evidence;
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `Today's date: ${today}.`,
    "",
    `Canonical URL: ${parse.canonicalUrl}`,
    `Video ID: ${parse.videoId}`,
  ];
  if (parse.isShort) lines.push("Format: YouTube Short.");
  if (metadata) {
    lines.push("", "## Metadata");
    if (metadata.title) lines.push(`Title: ${metadata.title}`);
    if (metadata.channelTitle) lines.push(`Channel: ${metadata.channelTitle}`);
    if (metadata.publishedAt) lines.push(`Published: ${metadata.publishedAt}`);
    if (metadata.durationSeconds > 0) {
      lines.push(`Duration: ${formatTimestamp(metadata.durationSeconds)}`);
    }
    if (metadata.tags.length > 0) {
      lines.push(`Tags: ${metadata.tags.slice(0, 20).join(", ")}`);
    }
    if (metadata.description) {
      lines.push("", "## Description", metadata.description.trim());
    }
  }
  if (chapters.length > 0) {
    lines.push("", "## Official chapters");
    for (const ch of chapters) {
      lines.push(`- [${formatTimestamp(ch.startSeconds)}] ${ch.title}`);
    }
  }
  if (transcript) {
    const sliced = windowSeconds
      ? transcript.segments.filter(
          (s) =>
            s.endSeconds >= windowSeconds.start &&
            s.startSeconds < windowSeconds.end
        )
      : transcript.segments;
    const { text, truncated } = truncateTranscript(sliced);
    const heading = windowSeconds
      ? `## Transcript (window ${formatTimestamp(windowSeconds.start)}–${formatTimestamp(windowSeconds.end)})`
      : `## Transcript${transcript.language ? ` (${transcript.language})` : ""}`;
    lines.push(
      "",
      `${heading}${truncated ? " — truncated" : ""}`,
      text || "(no transcript lines in this window)"
    );
  } else {
    lines.push("", "## Transcript", "(unavailable — rely on video + description)");
  }
  if (notes.trim()) {
    lines.push("", "## Author's notes (verbatim)", notes.trim());
  }
  return lines.join("\n");
}

function buildEvidencePrompt(
  evidence: YouTubeEvidence,
  notes: string
): { prompt: string; videoUri: string } {
  const lines: string[] = [
    "You are gathering evidence from a YouTube video so a second model call can draft a short FINDING post for a personal blog.",
    "Your job here is to produce a grounded, timestamped summary of what the video is about, what's specifically notable, and any concrete tools, claims, or moments worth citing. Do not invent timestamps — only use ones present in the transcript, the official chapters, or directly visible in the video.",
    "Use the attached video for visual/audio context. Use the transcript and metadata below as the source of truth for quoted text and timing.",
    "",
    buildSharedContext(evidence, notes, null),
    "",
    "Write a 200-400 word grounded summary. Reference timestamps in [m:ss] form for any specific claim, moment, or quote. Cite quoted phrases inline. Surface tools, frameworks, products, repos, or named techniques the speaker uses. If the transcript is missing, lean on the video and description and say so explicitly. Do not output frontmatter or code fences.",
  ];
  return {
    prompt: lines.join("\n"),
    videoUri: evidence.parse.canonicalUrl,
  };
}

function buildChunkPrompt(
  evidence: YouTubeEvidence,
  notes: string,
  chunk: VideoChunk
): string {
  const lines: string[] = [
    "You are gathering evidence from a single time window of a longer YouTube video. Other windows will be analysed in parallel and merged later.",
    `This window covers ${formatTimestamp(chunk.startSeconds)}–${formatTimestamp(chunk.endSeconds)} of the full video.`,
    "ALL timestamps in your output MUST be absolute timestamps within the full video, in [m:ss] or [h:mm:ss] form. Do not invent timestamps — only use ones present in the transcript window, the official chapters, or directly visible in this video window.",
    "Do NOT summarize the whole video. Cover only what's in this window. If this window contains nothing notable, say so plainly.",
    "",
    buildSharedContext(evidence, notes, {
      start: chunk.startSeconds,
      end: chunk.endSeconds,
    }),
    "",
    "Produce a compact, factual bullet list grouped by sub-section:",
    "- Topic / what's being covered in this window",
    "- Key claims (with timestamps)",
    "- Tools, frameworks, products, repos, or named techniques mentioned",
    "- Notable moments worth a deeplink (demos, before/after, surprising results)",
    "- Direct quotes worth citing (with timestamp + speaker if identifiable)",
    "Do not output frontmatter or code fences. Plain markdown only.",
  ];
  return lines.join("\n");
}

function buildMergePrompt(
  evidence: YouTubeEvidence,
  notes: string,
  parts: Array<{ chunk: VideoChunk; summary: string; status: "ok" | "skipped" }>
): string {
  const lines: string[] = [
    "You are merging per-window evidence summaries of a long YouTube video into a single grounded summary for a FINDING post on a personal blog.",
    "The video was too long for a single pass, so it was split into overlapping time windows. Some windows may have failed and are marked SKIPPED — note any obvious gaps but do not invent content for them.",
    "Reconcile timestamps (they're absolute), deduplicate overlapping content from window boundaries, and keep direct quotes anchored to their timestamp.",
    "Use the full transcript below as the canonical source of truth for any quoted phrasing.",
    "",
    buildSharedContext(evidence, notes, null),
    "",
    "## Per-window evidence",
  ];
  for (const part of parts) {
    const range = `${formatTimestamp(part.chunk.startSeconds)}–${formatTimestamp(part.chunk.endSeconds)}`;
    if (part.status === "skipped") {
      lines.push("", `### Window ${part.chunk.index + 1} (${range}) — SKIPPED`);
      lines.push(part.summary || "(no output)");
    } else {
      lines.push("", `### Window ${part.chunk.index + 1} (${range})`);
      lines.push(part.summary);
    }
  }
  lines.push(
    "",
    "Write a 250-500 word grounded summary of the whole video. Reference timestamps in [m:ss] or [h:mm:ss] form for any specific claim, moment, or quote. Surface tools, frameworks, products, repos, or named techniques the speaker uses. If any windows were SKIPPED, briefly note the gap. Do not output frontmatter or code fences."
  );
  return lines.join("\n");
}

function buildStructuringPrompt(summary: string, notes: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "You are drafting a single FINDING post for the copt-dev personal blog from a pre-gathered YouTube evidence summary.",
    `Today's date: ${today}.`,
    "Voice: first-person, observational, concrete. 120-300 words.",
    "No marketing copy. No 'Here is' preambles. No code fences in the body.",
    "Lead with what the video is and why it's worth a look. Keep any timestamps already present in the evidence summary — they're real and useful as deeplinks.",
    "",
    "Evidence summary:",
    summary,
  ];
  if (notes.trim()) {
    lines.push("", `Author's notes (verbatim): ${notes.trim()}`);
  }
  return lines.join("\n");
}

export type YouTubeRunOptions = {
  url: string;
  notes: string;
};

export type YouTubeRunResult = {
  output: GeminiOutput;
  evidence: YouTubeEvidence;
  evidenceSummary: string;
  analysis: YouTubeAnalysis | null;
};

// Run one chunk's evidence call. On certain failures (input-token-window
// overflow being the prime one), retry once at mediaResolution=low. If that
// still fails, surface the error so the caller can mark the chunk as skipped.
async function runChunkWithRetry(args: {
  apiKey: string;
  model: string;
  videoUri: string;
  prompt: string;
  chunk: VideoChunk;
  temperature: number;
  log: (line: string) => void;
}): Promise<string> {
  const { apiKey, model, videoUri, prompt, chunk, temperature, log } = args;
  try {
    const { text } = await generateContentForVideoClip({
      apiKey,
      model,
      videoUri,
      prompt,
      startSeconds: chunk.startSeconds,
      endSeconds: chunk.endSeconds,
      temperature,
    });
    return text;
  } catch (error) {
    const isRest = error instanceof GeminiRestError;
    const status = isRest ? error.status : 0;
    log(
      `[youtube] chunk ${chunk.index} (${chunk.startSeconds}-${chunk.endSeconds}) failed at default resolution: ${
        error instanceof Error ? error.message : String(error)
      }${isRest ? ` [http ${status}]` : ""}`
    );
    // Retry once at low resolution. This is the documented mitigation for the
    // 1M-token overflow on dense / high-detail video.
    const { text } = await generateContentForVideoClip({
      apiKey,
      model,
      videoUri,
      prompt,
      startSeconds: chunk.startSeconds,
      endSeconds: chunk.endSeconds,
      temperature,
      mediaResolution: "low",
    });
    log(
      `[youtube] chunk ${chunk.index} recovered at mediaResolution=low`
    );
    return text;
  }
}

export async function runYouTubeGemini(
  options: YouTubeRunOptions
): Promise<YouTubeRunResult | null> {
  const evidence = await gatherYouTubeEvidence(options.url);
  if (!evidence) return null;

  // Surface evidence-gathering warnings now, while they're still actionable.
  // (Previously these only printed on a successful run, which masked exactly
  // the kind of "no transcript + no Data API" failures we hit on long videos.)
  for (const warning of evidence.warnings) {
    console.warn(`[youtube] ${warning}`);
  }
  console.log(
    `[youtube] evidence summary: videoId=${evidence.parse.videoId} metadata=${evidence.metadata ? "ok" : "missing"} transcript=${evidence.transcript ? `ok (${evidence.transcript.segments.length} segments)` : "missing"} chapters=${evidence.chapters.length}`
  );

  const config = getAIConfig();
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  // Evidence call needs a model that supports YouTube fileData URIs. Preview
  // models (e.g. gemini-3.1-pro-preview) reject them with INVALID_ARGUMENT, so
  // we pin via YOUTUBE_AI_MODEL (default: gemini-2.5-pro). The merge and
  // structuring calls are text-only and can stay on AI_MODEL.
  const videoModelName = getYouTubeModel();
  const textModel = google(config.model);

  const log = (line: string) => console.log(line);

  // Source-of-truth duration is the Data API. If it's missing (no key, key
  // failed, video not returned) we fall back to the last transcript segment's
  // endSeconds — good enough for chunk planning, since the chunker only needs
  // an upper bound on the timeline. Only if both are missing do we give up and
  // single-call.
  const apiDuration = evidence.metadata?.durationSeconds ?? 0;
  let duration = apiDuration;
  let durationSource: "data-api" | "transcript" | "none" =
    apiDuration > 0 ? "data-api" : "none";
  if (duration <= 0 && evidence.transcript) {
    const segments = evidence.transcript.segments;
    const last = segments[segments.length - 1];
    if (last && Number.isFinite(last.endSeconds) && last.endSeconds > 0) {
      duration = Math.ceil(last.endSeconds);
      durationSource = "transcript";
      log(
        `[youtube] Data API duration unavailable; estimating duration from transcript: ${duration}s`
      );
    }
  }
  if (durationSource === "none") {
    log(
      "[youtube] no duration source (Data API + transcript both missing); falling back to single-call evidence path"
    );
  }
  const chunkConfig = getChunkConfig();
  const plan = duration > 0 ? planChunks(duration, chunkConfig) : null;

  let evidenceSummary: string;

  // Path A: duration known AND video is longer than one chunk → chunked + merge.
  if (plan && plan.chunks.length > 1) {
    log(
      `[youtube] chunking: duration=${duration}s chunks=${plan.chunks.length} window=${plan.chunkSeconds}s overlap=${plan.overlapSeconds}s`
    );
    const results = await mapWithConcurrency(plan.chunks, (chunk) =>
      runChunkWithRetry({
        apiKey: config.apiKey,
        model: videoModelName,
        videoUri: evidence.parse.canonicalUrl,
        prompt: buildChunkPrompt(evidence, options.notes, chunk),
        chunk,
        temperature: config.temperature,
        log,
      })
    );

    const parts: Array<{
      chunk: VideoChunk;
      summary: string;
      status: "ok" | "skipped";
    }> = [];
    let okCount = 0;
    for (let i = 0; i < plan.chunks.length; i += 1) {
      const result = results[i];
      const chunk = plan.chunks[i];
      if (result.ok) {
        parts.push({ chunk, summary: result.value, status: "ok" });
        okCount += 1;
      } else {
        const message =
          result.error instanceof Error
            ? result.error.message
            : String(result.error);
        log(
          `[youtube] chunk ${chunk.index} (${chunk.startSeconds}-${chunk.endSeconds}) skipped after low-res retry: ${message}`
        );
        evidence.warnings.push(
          `chunk ${chunk.index + 1} (${formatTimestamp(chunk.startSeconds)}–${formatTimestamp(chunk.endSeconds)}) skipped: ${message}`
        );
        parts.push({
          chunk,
          summary: `Chunk failed and was skipped. Reason: ${message}`,
          status: "skipped",
        });
      }
    }

    if (okCount === 0) {
      throw new Error(
        `all ${plan.chunks.length} YouTube chunks failed; falling back upstream`
      );
    }

    const { text: merged } = await generateText({
      model: textModel,
      temperature: config.temperature,
      prompt: buildMergePrompt(evidence, options.notes, parts),
    });
    evidenceSummary = merged;
  } else {
    // Path B: short video or unknown duration → single call via AI SDK,
    // identical to the pre-chunking behaviour.
    const videoModel = google(videoModelName);
    const { prompt, videoUri } = buildEvidencePrompt(evidence, options.notes);
    const { text: summary } = await generateText({
      model: videoModel,
      temperature: config.temperature,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              // YouTube URIs are passed to Gemini as fileData.fileUri. The mime
              // type must be a generic video/* — sending "video/mp4" against a
              // youtube.com/watch URL trips INVALID_ARGUMENT because the URI is
              // not actually an mp4. See:
              // https://ai.google.dev/gemini-api/docs/video-understanding#youtube
              type: "file",
              data: new URL(videoUri),
              mediaType: "video/*",
            },
          ],
        },
      ],
    });
    evidenceSummary = summary;
  }

  const { output } = await generateText({
    model: textModel,
    temperature: config.temperature,
    prompt: buildStructuringPrompt(evidenceSummary, options.notes),
    output: Output.object({ schema: PostDraftSchema }),
  });

  // Third call: structured analysis (Overview, Key claims, Tools, Notable
  // moments, Quotes, Entities). Used by the MDX appendix to render the
  // collapsible "Full analysis" block alongside the raw merged summary.
  // Best-effort: if this call fails for any reason, we still ship the post —
  // the appendix block is dropped instead of failing the whole ingest.
  let analysis: YouTubeAnalysis | null = null;
  try {
    const metadataBlock = buildSharedContext(evidence, "", null);
    const { output: analysisOutput } = await generateText({
      model: textModel,
      temperature: config.temperature,
      prompt: buildAnalysisPrompt({
        mergedSummary: evidenceSummary,
        metadataBlock,
        notes: options.notes,
      }),
      output: Output.object({ schema: YouTubeAnalysisSchema }),
    });
    analysis = analysisOutput;
  } catch (err) {
    log(
      `[youtube] structured analysis call failed; appendix will be omitted: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // If we have an analysis, append the collapsible <details> blocks to the
  // post body in place. Transcript block is omitted entirely when missing
  // (per Pass 2 contract).
  const draft = toGeminiOutput(output, "FINDING");
  if (analysis) {
    const appendix = renderYouTubeAppendix({
      videoId: evidence.parse.videoId,
      analysis,
      mergedSummary: evidenceSummary,
      transcript: evidence.transcript
        ? {
            segments: evidence.transcript.segments,
            language: evidence.transcript.language,
          }
        : null,
      chapters: evidence.chapters,
    });
    draft.body = `${draft.body.trimEnd()}\n\n${appendix}\n`;
  }

  return {
    output: draft,
    evidence,
    evidenceSummary,
    analysis,
  };
}

export { buildTimestampUrl };
