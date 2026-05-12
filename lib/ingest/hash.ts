// Content hashes drive dedup via the IngestSubmission.contentHash unique index.
// `force=true` salts the URL hash with Date.now() so a user-forced re-ingest
// bypasses the dedup short-circuit. See docs/INGEST.md#deduplication.
import { createHash } from "node:crypto";

export function contentHashForUrls(
  urls: string[],
  notes: string,
  force: boolean
): string {
  const sorted = [...urls].map((u) => u.trim()).sort();
  const base = JSON.stringify({ urls: sorted, notes: notes.trim() });
  const seed = force ? `${base}|force:${Date.now()}` : base;
  return createHash("sha256").update(seed).digest("hex");
}

export function contentHashForBytes(
  bytes: ArrayBuffer | Uint8Array | Buffer
): string {
  const buf = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes as ArrayBuffer);
  return createHash("sha256").update(buf).digest("hex");
}
