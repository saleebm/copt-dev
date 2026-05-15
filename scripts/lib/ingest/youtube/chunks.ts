// Plans time-windowed chunks for the YouTube evidence call. Long videos blow
// past Gemini's 1M-token input window in a single call; chunking by clip
// (videoMetadata.startOffset/endOffset) keeps each call comfortably under the
// limit and lets us parallelize.
//
// Defaults agreed in the design call:
//   - 45-minute windows
//   - 60-second overlap to avoid cutting mid-sentence
// Override at runtime via env (YOUTUBE_CHUNK_SECONDS / YOUTUBE_CHUNK_OVERLAP_SECONDS).

const DEFAULT_CHUNK_SECONDS = 45 * 60; // 45 min
const DEFAULT_OVERLAP_SECONDS = 60; // 1 min

export type VideoChunk = {
  index: number; // 0-based
  startSeconds: number; // inclusive
  endSeconds: number; // exclusive
};

export type ChunkPlan = {
  durationSeconds: number;
  chunkSeconds: number;
  overlapSeconds: number;
  chunks: VideoChunk[];
};

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getChunkConfig(): {
  chunkSeconds: number;
  overlapSeconds: number;
} {
  const chunkSeconds = readPositiveIntEnv(
    "YOUTUBE_CHUNK_SECONDS",
    DEFAULT_CHUNK_SECONDS
  );
  const overlapSeconds = readPositiveIntEnv(
    "YOUTUBE_CHUNK_OVERLAP_SECONDS",
    DEFAULT_OVERLAP_SECONDS
  );
  // Sanity: overlap must be strictly smaller than chunk size, otherwise we'd
  // never advance.
  if (overlapSeconds >= chunkSeconds) {
    return { chunkSeconds, overlapSeconds: Math.floor(chunkSeconds / 4) };
  }
  return { chunkSeconds, overlapSeconds };
}

export function planChunks(
  durationSeconds: number,
  config: { chunkSeconds: number; overlapSeconds: number } = getChunkConfig()
): ChunkPlan {
  const { chunkSeconds, overlapSeconds } = config;
  const safeDuration = Math.max(0, Math.floor(durationSeconds));

  // For videos shorter than one chunk, just one chunk covering the whole thing.
  if (safeDuration <= chunkSeconds) {
    return {
      durationSeconds: safeDuration,
      chunkSeconds,
      overlapSeconds,
      chunks: safeDuration > 0
        ? [{ index: 0, startSeconds: 0, endSeconds: safeDuration }]
        : [],
    };
  }

  const stride = chunkSeconds - overlapSeconds;
  const chunks: VideoChunk[] = [];
  let cursor = 0;
  let index = 0;
  while (cursor < safeDuration) {
    const end = Math.min(cursor + chunkSeconds, safeDuration);
    chunks.push({ index, startSeconds: cursor, endSeconds: end });
    index += 1;
    if (end >= safeDuration) break;
    cursor += stride;
  }

  return {
    durationSeconds: safeDuration,
    chunkSeconds,
    overlapSeconds,
    chunks,
  };
}

export type ConcurrencyConfig = { maxParallel: number };

function readConcurrency(): ConcurrencyConfig {
  const raw = process.env.YOUTUBE_CHUNK_PARALLEL;
  if (!raw) return { maxParallel: 2 };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return { maxParallel: 2 };
  return { maxParallel: parsed };
}

// Runs `worker` over `items` with at most `maxParallel` in flight. Preserves
// input order in the results array (including for failures, where the slot
// holds the rejection reason).
export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: ConcurrencyConfig = readConcurrency()
): Promise<Array<{ ok: true; value: R } | { ok: false; error: unknown }>> {
  const results: Array<
    { ok: true; value: R } | { ok: false; error: unknown }
  > = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency.maxParallel, items.length) },
    async () => {
      while (true) {
        const slot = cursor;
        cursor += 1;
        if (slot >= items.length) return;
        try {
          const value = await worker(items[slot], slot);
          results[slot] = { ok: true, value };
        } catch (error) {
          results[slot] = { ok: false, error };
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}
