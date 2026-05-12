// Writes the parsed post into the worker's git workspace using the same
// filename conventions as scripts/lib/services/file-service.ts (BLOG/FINDING
// get an MMddyyyy prefix, SIGHT does not). For image batches, copies staged
// files to posts/sight/<batch>/<n>.<ext> and rewrites IMAGE_N placeholders.
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
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

function copyImages(
  workspace: string,
  batchId: string,
  images: StagedImage[]
): { absolute: string[]; relative: string[] } {
  const relDir = join("posts", "sight", batchId);
  const absDir = join(workspace, relDir);
  ensureDir(absDir);
  const absolute: string[] = [];
  const relative: string[] = [];
  for (const img of images) {
    const dest = join(absDir, `${img.index + 1}.${img.extension}`);
    copyFileSync(img.stagedFilePath, dest);
    absolute.push(dest);
    const fromPost = `/posts/sight/${batchId}/${img.index + 1}.${img.extension}`;
    relative.push(fromPost);
  }
  return { absolute, relative };
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

  const finalMdx = matter.stringify(body, parsed.frontmatter);
  // matter.stringify omits trailing newline; ensure consistent file ending
  const withNewline = finalMdx.endsWith("\n") ? finalMdx : `${finalMdx}\n`;
  await Bun.write(absPath, withNewline);

  return { filePath: absPath, relativePath: relPath, imagePaths };
}
