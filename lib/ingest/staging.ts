// Stages uploaded image bytes outside the git workspace so the route can finish
// quickly and the worker can move them into posts/sight/<batch>/ at commit time.
// Lives at INGEST_STAGING_DIR (default /tmp/copt-ingest).
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_DIR = "/tmp/copt-ingest";

export function getStagingDir(): string {
  return process.env.INGEST_STAGING_DIR?.trim() || DEFAULT_DIR;
}

export function ensureStagingDir(): string {
  const dir = getStagingDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function stageBytes(
  submissionId: string,
  bytes: ArrayBuffer | Uint8Array,
  extension: string
): Promise<string> {
  const dir = ensureStagingDir();
  const filePath = join(dir, `${submissionId}.${extension}`);
  await Bun.write(filePath, bytes);
  return filePath;
}

export function removeStagedFile(filePath: string | null | undefined): void {
  if (!filePath) {
    return;
  }
  try {
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  } catch {
    // best-effort cleanup; staged files are not load-bearing once committed
  }
}
