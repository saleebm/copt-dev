// Thin wrapper around the `gh` CLI for the review/merge API. Mirrors the
// patterns in scripts/lib/ingest/git-ops.ts so behavior is consistent across
// the ingest + review surfaces (same cwd resolution, same env passthrough).
//
// All commands run inside REVIEW_REPO_PATH (defaults to INGEST_REPO_PATH).
// This is a real git checkout on the host where `gh auth status` is green.
import { spawn } from "node:child_process";

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

function resolveCwd(): string {
  const path =
    process.env.REVIEW_REPO_PATH?.trim() ||
    process.env.INGEST_REPO_PATH?.trim();
  if (!path) {
    throw new Error(
      "REVIEW_REPO_PATH (or INGEST_REPO_PATH) not configured — the review API needs a git checkout with `gh` authenticated."
    );
  }
  return path;
}

function run(cmd: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd[0] as string, cmd.slice(1), {
      cwd: resolveCwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

export type GhError = Error & {
  stderr: string;
  stdout: string;
  exitCode: number;
};

function ghError(label: string, result: RunResult): GhError {
  const err = new Error(
    `${label} failed (exit=${result.exitCode}): ${result.stderr.trim() || result.stdout.trim()}`
  ) as GhError;
  err.stderr = result.stderr;
  err.stdout = result.stdout;
  err.exitCode = result.exitCode;
  return err;
}

export interface GhPrFile {
  additions: number;
  deletions: number;
  path: string;
}

export interface GhPrSummary {
  author: { login: string } | null;
  baseRefName: string;
  body: string;
  createdAt: string;
  files: GhPrFile[];
  headRefName: string;
  isDraft: boolean;
  labels: { name: string }[];
  mergeable: string;
  number: number;
  state: string;
  title: string;
  updatedAt: string;
  url: string;
}

const LIST_FIELDS = [
  "number",
  "title",
  "headRefName",
  "baseRefName",
  "isDraft",
  "url",
  "author",
  "createdAt",
  "updatedAt",
  "labels",
].join(",");

const VIEW_FIELDS = [
  ...LIST_FIELDS.split(","),
  "body",
  "state",
  "mergeable",
  "files",
].join(",");

export async function listPullRequests(
  opts: {
    state?: "open" | "closed" | "merged" | "all";
    limit?: number;
    headPrefix?: string;
  } = {}
): Promise<GhPrSummary[]> {
  const args = [
    "gh",
    "pr",
    "list",
    "--state",
    opts.state ?? "open",
    "--limit",
    String(opts.limit ?? 50),
    "--json",
    LIST_FIELDS,
  ];
  if (opts.headPrefix) {
    args.push("--search", `head:${opts.headPrefix}`);
  }
  const result = await run(args);
  if (result.exitCode !== 0) {
    throw ghError("gh pr list", result);
  }
  const parsed = JSON.parse(result.stdout) as Partial<GhPrSummary>[];
  return parsed.map((pr) => ({
    number: pr.number ?? 0,
    title: pr.title ?? "",
    body: "",
    headRefName: pr.headRefName ?? "",
    baseRefName: pr.baseRefName ?? "",
    state: "OPEN",
    isDraft: pr.isDraft ?? false,
    mergeable: "UNKNOWN",
    url: pr.url ?? "",
    author: pr.author ?? null,
    createdAt: pr.createdAt ?? "",
    updatedAt: pr.updatedAt ?? "",
    labels: pr.labels ?? [],
    files: [],
  }));
}

export async function viewPullRequest(num: number): Promise<GhPrSummary> {
  const result = await run([
    "gh",
    "pr",
    "view",
    String(num),
    "--json",
    VIEW_FIELDS,
  ]);
  if (result.exitCode !== 0) {
    throw ghError("gh pr view", result);
  }
  const pr = JSON.parse(result.stdout) as Partial<GhPrSummary>;
  return {
    number: pr.number ?? num,
    title: pr.title ?? "",
    body: pr.body ?? "",
    headRefName: pr.headRefName ?? "",
    baseRefName: pr.baseRefName ?? "",
    state: pr.state ?? "",
    isDraft: pr.isDraft ?? false,
    mergeable: pr.mergeable ?? "UNKNOWN",
    url: pr.url ?? "",
    author: pr.author ?? null,
    createdAt: pr.createdAt ?? "",
    updatedAt: pr.updatedAt ?? "",
    labels: pr.labels ?? [],
    files: pr.files ?? [],
  };
}

export type MergeMethod = "squash" | "merge" | "rebase";

export interface MergeOptions {
  admin?: boolean;
  body?: string;
  deleteBranch?: boolean;
  method?: MergeMethod;
}

export async function mergePullRequest(
  num: number,
  opts: MergeOptions = {}
): Promise<void> {
  const args = ["gh", "pr", "merge", String(num)];
  args.push(`--${opts.method ?? "squash"}`);
  if (opts.deleteBranch !== false) {
    args.push("--delete-branch");
  }
  if (opts.admin) {
    args.push("--admin");
  }
  if (opts.body) {
    args.push("--body", opts.body);
  }
  const result = await run(args);
  if (result.exitCode !== 0) {
    throw ghError("gh pr merge", result);
  }
}

export async function markPullRequestReady(num: number): Promise<void> {
  const result = await run(["gh", "pr", "ready", String(num)]);
  if (result.exitCode !== 0) {
    throw ghError("gh pr ready", result);
  }
}

export async function closePullRequest(
  num: number,
  comment?: string
): Promise<void> {
  const args = ["gh", "pr", "close", String(num), "--delete-branch"];
  if (comment) {
    args.push("--comment", comment);
  }
  const result = await run(args);
  if (result.exitCode !== 0) {
    throw ghError("gh pr close", result);
  }
}

export async function readPrFile(
  num: number,
  path: string
): Promise<string | null> {
  // `gh pr diff` is too noisy; use `gh api` to read raw file content from the PR head ref.
  const view = await viewPullRequest(num);
  if (!view.headRefName) {
    return null;
  }
  const result = await run([
    "gh",
    "api",
    `repos/{owner}/{repo}/contents/${path}?ref=${view.headRefName}`,
    "--jq",
    ".content",
  ]);
  if (result.exitCode !== 0) {
    return null;
  }
  const b64 = result.stdout.trim();
  if (!b64) {
    return null;
  }
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function getPrDiff(num: number): Promise<string> {
  const result = await run(["gh", "pr", "diff", String(num)]);
  if (result.exitCode !== 0) {
    throw ghError("gh pr diff", result);
  }
  return result.stdout;
}
