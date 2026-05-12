// Composes the ingest stages into one function the worker calls per claim.
// Pure orchestration — every step lives in its own module so each is testable
// in isolation and the order of operations is visible at a glance.

import { runGemini } from "./gemini-runner";
import {
  createBranch,
  pushBranch,
  resolveWorkspace,
  stageAndCommit,
  syncMain,
} from "./git-ops";
import { writePost } from "./mdx-writer";
import { openPullRequest } from "./pr-creator";
import type { PipelineInput, PipelineResult } from "./types";

function branchName(input: PipelineInput): string {
  if (input.kind === "image") {
    return `ingest/img-${input.batchId}`;
  }
  return `ingest/${input.submission.id.slice(0, 12)}`;
}

function commitMessage(input: PipelineInput, title: string): string {
  if (input.kind === "image") {
    return `ingest(${input.images.length}img): ${title}`;
  }
  return `ingest(${input.kind}): ${title}`;
}

function prBody(input: PipelineInput, filePath: string): string {
  const lines = [
    "Auto-drafted from iOS Shortcut ingest.",
    "",
    `**File:** \`${filePath}\``,
    "",
  ];
  if (input.kind === "url") {
    lines.push("**Source URLs:**");
    for (const url of input.urls) {
      lines.push(`- ${url}`);
    }
    if (input.notes.trim()) {
      lines.push("", "**Notes:**", input.notes.trim());
    }
  } else if (input.kind === "image") {
    lines.push(`**Batch:** ${input.batchId} (${input.images.length} images)`);
    if (input.notes.trim()) {
      lines.push("", "**Notes:**", input.notes.trim());
    }
  } else {
    lines.push("**Notes:**", input.notes);
  }
  lines.push("", "Draft post — review type/tags before merging.");
  return lines.join("\n");
}

export type StageLogger = (
  stage: string,
  extra?: Record<string, unknown>
) => void;

const noopLogger: StageLogger = () => {};

async function timed<T>(
  stage: string,
  logger: StageLogger,
  fn: () => Promise<T>
): Promise<T> {
  logger(`${stage}:start`);
  const start = Date.now();
  try {
    const result = await fn();
    logger(`${stage}:done`, { ms: Date.now() - start });
    return result;
  } catch (error) {
    logger(`${stage}:error`, {
      ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function processIngest(
  input: PipelineInput,
  logger: StageLogger = noopLogger
): Promise<PipelineResult> {
  const workspace = resolveWorkspace();
  const parsed = await timed("gemini", logger, () => runGemini(input));
  logger("gemini:parsed", {
    title: parsed.title,
    slug: parsed.slug,
    type: parsed.type,
  });
  await timed("git:syncMain", logger, () => syncMain(workspace.path));
  const branch = branchName(input);
  await timed("git:branch", logger, () =>
    createBranch(workspace.path, branch)
  );
  logger("git:branch:name", { branch });
  const written = await timed("mdx:write", logger, () =>
    writePost(workspace.path, parsed, input)
  );
  logger("mdx:write:path", { filePath: written.relativePath });
  await timed("git:commit", logger, () =>
    stageAndCommit(workspace.path, commitMessage(input, parsed.title))
  );
  await timed("git:push", logger, () =>
    pushBranch(workspace.path, branch)
  );
  const prUrl = await timed("gh:pr", logger, () =>
    openPullRequest({
      workspace: workspace.path,
      title: `ingest: ${parsed.title}`,
      body: prBody(input, written.relativePath),
      draft: true,
    })
  );
  return {
    postSlug: parsed.slug,
    branch,
    prUrl,
    filePath: written.relativePath,
  };
}
