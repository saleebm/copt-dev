// Canonicalize YouTube URLs and extract their videoId. Used by the ingest
// worker to decide whether a URL goes through the YouTube branch and to build
// the canonical URL + timestamp deeplinks used in posts. Pure functions — no
// network, no env reads. See scripts/lib/ingest/youtube/runner.ts for usage.

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const SHORT_HOSTS = new Set(["youtu.be"]);

export type YouTubeUrlParse = {
  videoId: string;
  canonicalUrl: string;
  startSeconds: number | null;
  isShort: boolean;
};

function isValidVideoId(
  candidate: string | null | undefined
): candidate is string {
  return typeof candidate === "string" && VIDEO_ID_PATTERN.test(candidate);
}

function parseStartParam(params: URLSearchParams): number | null {
  // Accept ?t=90, ?t=90s, ?t=1m30s, ?start=90
  const raw = params.get("t") ?? params.get("start");
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) {
    return null;
  }
  const [, h, m, s] = match;
  if (!(h || m || s)) {
    return null;
  }
  const seconds =
    Number.parseInt(h ?? "0", 10) * 3600 +
    Number.parseInt(m ?? "0", 10) * 60 +
    Number.parseInt(s ?? "0", 10);
  return seconds > 0 ? seconds : null;
}

function videoIdFromPath(pathname: string): {
  id: string | null;
  isShort: boolean;
} {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { id: null, isShort: false };
  }
  const [first, second] = segments;
  if (first === "watch") {
    // /watch handled via search params; caller resolves.
    return { id: null, isShort: false };
  }
  if (first === "embed" && second) {
    return { id: second, isShort: false };
  }
  if (first === "shorts" && second) {
    return { id: second, isShort: true };
  }
  if (first === "v" && second) {
    return { id: second, isShort: false };
  }
  if (first === "live" && second) {
    return { id: second, isShort: false };
  }
  return { id: null, isShort: false };
}

export function parseYouTubeUrl(raw: string): YouTubeUrlParse | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  let videoId: string | null = null;
  let isShort = false;

  if (SHORT_HOSTS.has(host)) {
    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    if (isValidVideoId(segment)) {
      videoId = segment;
    }
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parsed.pathname === "/watch" || parsed.pathname === "/watch/") {
      const v = parsed.searchParams.get("v");
      if (isValidVideoId(v)) {
        videoId = v;
      }
    } else {
      const fromPath = videoIdFromPath(parsed.pathname);
      if (isValidVideoId(fromPath.id)) {
        videoId = fromPath.id;
        isShort = fromPath.isShort;
      } else {
        // Some clients append ?v= even on non-/watch paths.
        const v = parsed.searchParams.get("v");
        if (isValidVideoId(v)) {
          videoId = v;
        }
      }
    }
  } else {
    return null;
  }

  if (!videoId) {
    return null;
  }

  const startSeconds = parseStartParam(parsed.searchParams);
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    startSeconds,
    isShort,
  };
}

export function isYouTubeUrl(raw: string): boolean {
  return parseYouTubeUrl(raw) !== null;
}

export function buildTimestampUrl(videoId: string, seconds: number): string {
  const safe =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `https://www.youtube.com/watch?v=${videoId}&t=${safe}s`;
}
