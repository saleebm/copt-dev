// Minimal YouTube Data API v3 client for the ingest worker. One call:
// videos.list?part=snippet,contentDetails&id=<videoId>. We do not paginate,
// we do not need OAuth — a single API key is enough for public video data.
// Docs: https://developers.google.com/youtube/v3/docs/videos/list
//
// Returns null when the key is missing or the video is unavailable; callers
// degrade gracefully to transcript-only extraction.

const ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

export type YouTubeVideoMetadata = {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  description: string;
  tags: string[];
  durationSeconds: number;
  thumbnails: Record<string, string>;
};

type SnippetThumbnail = { url?: string };
type SnippetPayload = {
  title?: string;
  description?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  tags?: string[];
  thumbnails?: Record<string, SnippetThumbnail>;
};
type ContentDetailsPayload = { duration?: string };
type VideoItem = {
  id?: string;
  snippet?: SnippetPayload;
  contentDetails?: ContentDetailsPayload;
};
type ListResponse = { items?: VideoItem[] };

export function resolveYouTubeApiKey(): string | undefined {
  const key = process.env.YOUTUBE_DATA_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

// ISO 8601 duration (PT#H#M#S) → seconds. Only handles the subset YouTube emits.
export function parseIsoDuration(input: string): number {
  const match = input.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (
    Number.parseInt(h ?? "0", 10) * 3600 +
    Number.parseInt(m ?? "0", 10) * 60 +
    Number.parseInt(s ?? "0", 10)
  );
}

function pickThumbnails(
  raw: Record<string, SnippetThumbnail> | undefined
): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value?.url) {
      out[key] = value.url;
    }
  }
  return out;
}

export async function fetchYouTubeMetadata(
  videoId: string,
  apiKey: string = resolveYouTubeApiKey() ?? ""
): Promise<YouTubeVideoMetadata | null> {
  if (!apiKey) {
    return null;
  }
  const url = new URL(ENDPOINT);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(
      `YouTube Data API ${response.status}: ${await response.text().catch(() => response.statusText)}`
    );
  }
  const body = (await response.json()) as ListResponse;
  const item = body.items?.[0];
  if (!item?.snippet) {
    return null;
  }
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;
  return {
    videoId,
    title: snippet.title ?? "",
    channelTitle: snippet.channelTitle ?? "",
    channelId: snippet.channelId ?? "",
    publishedAt: snippet.publishedAt ?? "",
    description: snippet.description ?? "",
    tags: Array.isArray(snippet.tags) ? snippet.tags : [],
    durationSeconds: contentDetails?.duration
      ? parseIsoDuration(contentDetails.duration)
      : 0,
    thumbnails: pickThumbnails(snippet.thumbnails),
  };
}
