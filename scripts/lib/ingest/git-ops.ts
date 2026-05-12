// Thin Bun.spawn wrappers for the git subcommands the worker needs.
// Workspace = INGEST_REPO_PATH (a real checkout on the host, not a tmp clone),
// so `gh` and git credentials inherit from the worker's environment.
type RunOptions = {
  cwd: string;
  allowFailure?: boolean;
};

type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function run(cmd: string[], options: RunOptions): Promise<RunResult> {
  const proc = Bun.spawn({
    cmd,
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env as Record<string, string>,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0 && !options.allowFailure) {
    throw new Error(
      `command failed (${cmd.join(" ")}) exit=${exitCode}: ${stderr.trim() || stdout.trim()}`
    );
  }
  return { stdout, stderr, exitCode };
}

export async function syncMain(workspace: string): Promise<void> {
  await run(["git", "fetch", "origin", "main"], { cwd: workspace });
  await run(["git", "checkout", "main"], { cwd: workspace });
  await run(["git", "reset", "--hard", "origin/main"], { cwd: workspace });
}

export async function createBranch(
  workspace: string,
  branch: string
): Promise<void> {
  await run(["git", "checkout", "-b", branch], { cwd: workspace });
}

export async function stageAndCommit(
  workspace: string,
  message: string
): Promise<void> {
  await run(["git", "add", "-A"], { cwd: workspace });
  await run(["git", "commit", "-m", message], { cwd: workspace });
}

export async function pushBranch(
  workspace: string,
  branch: string
): Promise<void> {
  await run(["git", "push", "-u", "origin", branch], { cwd: workspace });
}

export type GitWorkspace = {
  path: string;
};

export function resolveWorkspace(): GitWorkspace {
  const path = process.env.INGEST_REPO_PATH?.trim();
  if (!path) {
    throw new Error("INGEST_REPO_PATH not configured");
  }
  return { path };
}
