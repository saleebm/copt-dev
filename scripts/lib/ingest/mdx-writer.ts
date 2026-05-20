// Writes the parsed post into the worker's git workspace using the same
// filename conventions as scripts/lib/services/file-service.ts (BLOG/FINDING
// get an MMddyyyy prefix, SIGHT does not). For image batches, copies staged
// files to posts/sight/<batch>/<n>.<ext>, publishes them under
// public/posts/sight/<batch>/<n>.<ext> via relative symlinks so Next.js can
// serve them, and rewrites IMAGE_N placeholders.
import { copyFileSync, existsSync, lstatSync, mkdirSync, symlinkSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { escapeMdxProse, validateMdx } from "@/lib/mdx-validate";
import { getPostDirectory } from "../post-type-meta";
import type { GeminiOutput, PipelineInput, StagedImage } from "./types";

function formatDatePrefix(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}${d}${date.getFullYear()}`;
}

function fileName(parsed: GeminiOutput): string {
  if (parsed.type === "BLOG" || parsed.type === "FINDING") {
    return `${formatDatePrefix(new Date())}-${parsed.slug}.mdx`;
  }
  return `${parsed.slug}.mdx`;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function rewriteImagePlaceholders(
  body: string,
  imageRelPaths: string[]
): string {
  return body.replace(/IMAGE_(\d+)/g, (match, idx) => {
    const i = Number.parseInt(idx, 10) - 1;
    return imageRelPaths[i] ?? match;
  });
}

// Publish a freshly-copied sight image into `public/` via a relative symlink so
// Next.js can serve it. Idempotent: skips if anything already exists at the
// target path (the caller has just written the source, so a pre-existing link
// from a re-run is fine). Doing this here keeps `db:sync-posts` side-effect-free.
function linkImageToPublic(
  workspace: string,
  sourceAbs: string,
  batchId: string,
  imageFileName: string
): void {
  const publicDir = join(workspace, "public", "posts", "sight", batchId);
  const publicPath = join(publicDir, imageFileName);
  ensureDir(publicDir);
  let alreadyThere = false;
  try {
    lstatSync(publicPath);
    alreadyThere = true;
  } catch {
    alreadyThere = false;
  }
  if (alreadyThere) {
    return;
  }
  const relativeTarget = relative(publicDir, sourceAbs);
  symlinkSync(relativeTarget, publicPath, "file");
}

function copyImages(
  workspace: string,
  batchId: string,
  images: StagedImage[]
): { absolute: string[]; relative: string[] } {
  const relDir = join("posts", "sight", batchId);
  const absDir = join(workspace, relDir);
  ensureDir(absDir);
  const absolute: string[] = [];
  const relativePaths: string[] = [];
  for (const img of images) {
    const imageFileName = `${img.index + 1}.${img.extension}`;
    const dest = join(absDir, imageFileName);
    copyFileSync(img.stagedFilePath, dest);
    linkImageToPublic(workspace, dest, batchId, imageFileName);
    absolute.push(dest);
    const fromPost = `/posts/sight/${batchId}/${imageFileName}`;
    relativePaths.push(fromPost);
  }
  return { absolute, relative: relativePaths };
}

export type WriteResult = {
  filePath: string;
  relativePath: string;
  imagePaths: string[];
};

export async function writePost(
  workspace: string,
  parsed: GeminiOutput,
  input: PipelineInput
): Promise<WriteResult> {
  let body = parsed.body;
  let imagePaths: string[] = [];

  if (input.kind === "image") {
    const { absolute, relative } = copyImages(
      workspace,
      input.batchId,
      input.images
    );
    body = rewriteImagePlaceholders(body, relative);
    imagePaths = absolute;
  }

  const dirName = getPostDirectory(parsed.type);
  const relDir = join("posts", dirName);
  const absDir = join(workspace, relDir);
  ensureDir(absDir);
  const name = fileName(parsed);
  const absPath = join(absDir, name);
  const relPath = join(relDir, name);

  body = escapeMdxProse(body);
  try {
    await validateMdx(body, relPath);
  } catch (err) {
    console.warn(
      `[ingest] MDX pre-flight failed for ${relPath}; writing anyway — sync-posts will reject if still broken. Reason: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const finalMdx = matter.stringify(body, parsed.frontmatter);
  // matter.stringify omits trailing newline; ensure consistent file ending
  const withNewline = finalMdx.endsWith("\n") ? finalMdx : `${finalMdx}\n`;
  await Bun.write(absPath, withNewline);

  return { filePath: absPath, relativePath: relPath, imagePaths };
}
