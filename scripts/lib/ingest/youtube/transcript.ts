// Transcript fetcher wrapping @danielxceron/youtube-transcript. The library
// emits one record per caption segment with offset+duration in seconds (both
// the HTML scrape path and the InnerTube fallback normalize to seconds).
// We expose:
//   - normalized segments with startSeconds/endSeconds + text
//   - a cleanedText blob suitable for handing to Gemini as grounding
//   - the detected language when the library reports it
// Returns null when transcripts are disabled/unavailable so callers can degrade.

import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptEmptyError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptVideoUnavailableError,
} from "@danielxceron/youtube-transcript";

export type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type TranscriptFetch = {
  segments: TranscriptSegment[];
  cleanedText: string;
  language: string | null;
};

function decodeBasicEntities(input: string): string {
  // The library decodes most entities for the InnerTube path but leaves the
  // raw HTML-scrape path's text untouched. Cover the common ones we'd see in
  // YouTube captions.
  return input
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanSegmentText(raw: string): string {
  return decodeBasicEntities(raw).replace(/\s+/g, " ").trim();
}

export async function fetchYouTubeTranscript(
  videoId: string
): Promise<TranscriptFetch | null> {
  let raw: Awaited<ReturnType<typeof YoutubeTranscript.fetchTranscript>>;
  try {
    raw = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (error) {
    if (
      error instanceof YoutubeTranscriptDisabledError ||
      error instanceof YoutubeTranscriptNotAvailableError ||
      error instanceof YoutubeTranscriptVideoUnavailableError ||
      error instanceof YoutubeTranscriptEmptyError
    ) {
      return null;
    }
    throw error;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const segments: TranscriptSegment[] = [];
  let language: string | null = null;
  for (const entry of raw) {
    if (!entry) continue;
    const text = cleanSegmentText(entry.text ?? "");
    if (!text) continue;
    const start = Number.isFinite(entry.offset) ? entry.offset : 0;
    const duration = Number.isFinite(entry.duration) ? entry.duration : 0;
    segments.push({
      startSeconds: start,
      endSeconds: start + duration,
      text,
    });
    if (!language && typeof entry.lang === "string" && entry.lang.length > 0) {
      language = entry.lang;
    }
  }

  if (segments.length === 0) {
    return null;
  }

  segments.sort((a, b) => a.startSeconds - b.startSeconds);
  const cleanedText = segments.map((s) => s.text).join(" ");
  return { segments, cleanedText, language };
}
