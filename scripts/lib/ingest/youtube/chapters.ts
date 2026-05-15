// Parse YouTube "official" chapters out of a video description. YouTube's
// chapter rules (https://support.google.com/youtube/answer/9884579):
//   - at least 3 timestamps
//   - first timestamp is 0:00
//   - timestamps appear in ascending order
//   - each chapter ≥ 10 seconds
// We return [] when any rule is violated — callers should treat that as "no
// official chapters" rather than emitting model-guessed chapters.

export type YouTubeChapter = {
  startSeconds: number;
  title: string;
};

// Matches a leading timestamp in a line: optional brackets, [H:]M:SS or H:MM:SS.
// Captures: hours? / minutes / seconds / trailing title.
const LINE_PATTERN =
  /^\s*[\[\(]?\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*[\]\)]?\s*[-–—:|.\s]\s*(.+?)\s*$/;

function timestampToSeconds(
  hours: string | undefined,
  minutes: string,
  seconds: string
): number {
  return (
    Number.parseInt(hours ?? "0", 10) * 3600 +
    Number.parseInt(minutes, 10) * 60 +
    Number.parseInt(seconds, 10)
  );
}

export function parseChaptersFromDescription(
  description: string,
  totalDurationSeconds: number | null = null
): YouTubeChapter[] {
  if (!description) return [];
  const lines = description.split(/\r?\n/);
  const candidates: YouTubeChapter[] = [];

  for (const line of lines) {
    const match = line.match(LINE_PATTERN);
    if (!match) continue;
    const [, h, m, s, rawTitle] = match;
    const start = timestampToSeconds(h, m, s);
    const title = rawTitle.trim();
    if (!title) continue;
    candidates.push({ startSeconds: start, title });
  }

  if (candidates.length < 3) return [];
  if (candidates[0].startSeconds !== 0) return [];

  // Must be strictly ascending and each chapter ≥ 10s long.
  for (let i = 1; i < candidates.length; i += 1) {
    const prev = candidates[i - 1];
    const curr = candidates[i];
    if (curr.startSeconds - prev.startSeconds < 10) return [];
  }

  if (totalDurationSeconds && totalDurationSeconds > 0) {
    const last = candidates.at(-1);
    if (last && last.startSeconds >= totalDurationSeconds) {
      return [];
    }
  }

  return candidates;
}
