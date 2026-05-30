// Detached deploy runner. POST handler returns immediately with a runId;
// the spawned process keeps running after PM2 reloads itself mid-deploy.
//
// Design notes:
//   - `detached: true` + `child.unref()` + `stdio: 'ignore'` (stdout/stderr
//     redirected via the shell into a log file) lets the deploy survive
//     `pm2 startOrReload` even though it kills our Next.js worker.
//   - Run id is just an ISO-ish timestamp slug — sortable, human-readable,
//     collision-free in practice (deploy.sh's own flock prevents real
//     concurrency).
//   - Log files live under `REVIEW_DEPLOY_LOG_DIR` (default `/tmp/copt-deploys`)
//     so the status endpoint can stream them back. Production should override
//     to `/home/deploy/logs` so logs survive across PM2 restarts.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_LOG_DIR = join(tmpdir(), "copt-deploys");
const DEFAULT_COMMAND = "./deploy.sh";

function logDir(): string {
  const dir = process.env.REVIEW_DEPLOY_LOG_DIR?.trim() || DEFAULT_LOG_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
  return dir;
}

function deployCommand(): string {
  return process.env.REVIEW_DEPLOY_CMD?.trim() || DEFAULT_COMMAND;
}

function deployCwd(): string {
  const path =
    process.env.REVIEW_DEPLOY_CWD?.trim() ||
    process.env.REVIEW_REPO_PATH?.trim() ||
    process.env.INGEST_REPO_PATH?.trim();
  if (!path) {
    throw new Error(
      "REVIEW_DEPLOY_CWD (or REVIEW_REPO_PATH / INGEST_REPO_PATH) not configured"
    );
  }
  return path;
}

function makeRunId(): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    "-",
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
    "-",
    pad(now.getUTCMilliseconds(), 3),
  ].join("");
}

export interface StartDeployInput {
  reason?: string;
  triggeredBy?: string;
}

export interface StartDeployResult {
  command: string;
  cwd: string;
  logPath: string;
  pid: number;
  runId: string;
  startedAt: string;
}

export function startDeploy(input: StartDeployInput = {}): StartDeployResult {
  const runId = makeRunId();
  const dir = logDir();
  const logPath = join(dir, `deploy-${runId}.log`);
  const cmd = deployCommand();
  const cwd = deployCwd();
  const startedAt = new Date().toISOString();

  const header = [
    `==> deploy run ${runId}`,
    `==> startedAt ${startedAt}`,
    `==> command   ${cmd}`,
    `==> cwd       ${cwd}`,
    `==> triggeredBy ${input.triggeredBy ?? "review-api"}`,
    `==> reason    ${input.reason ?? "(none)"}`,
    "",
  ].join("\n");

  // Shell out so we get tee-into-logfile + survives parent exit. Escape the
  // single quotes to keep the runId/header injection safe.
  const escapedHeader = header.replace(/'/g, "'\\''");
  const shellCmd = `{ printf '%s' '${escapedHeader}'; ${cmd} 2>&1; echo; echo "==> exitCode $?"; echo "==> finishedAt $(date -u +%FT%TZ)"; } >> '${logPath.replace(/'/g, "'\\''")}'`;

  const child = spawn("/bin/bash", ["-lc", shellCmd], {
    cwd,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();

  return {
    runId,
    pid: child.pid ?? -1,
    command: cmd,
    cwd,
    logPath,
    startedAt,
  };
}

export type DeployState = "running" | "completed" | "failed" | "unknown";

export interface DeployStatus {
  exitCode: number | null;
  finishedAt: string | null;
  log: string;
  logPath: string;
  runId: string;
  sizeBytes: number;
  startedAt: string | null;
  state: DeployState;
}

const EXIT_LINE = /==> exitCode (\d+)/;
const FINISH_LINE = /==> finishedAt (\S+)/;
const START_LINE = /==> startedAt (\S+)/;

function isSafeRunId(runId: string): boolean {
  // Just digits, dashes — our own format. Defensive against path traversal.
  return /^[0-9-]+$/.test(runId);
}

export async function getDeployStatus(
  runId: string,
  opts: { tailBytes?: number } = {}
): Promise<DeployStatus | null> {
  if (!isSafeRunId(runId)) {
    return null;
  }
  const dir = logDir();
  const logPath = resolve(dir, `deploy-${runId}.log`);
  // resolve() collapses traversal; double-check the result is still under dir.
  if (!logPath.startsWith(`${resolve(dir)}/`)) {
    return null;
  }
  if (!existsSync(logPath)) {
    return null;
  }
  const stat = statSync(logPath);
  const buf = await readFile(logPath);
  const tail =
    opts.tailBytes && buf.length > opts.tailBytes
      ? buf.subarray(buf.length - opts.tailBytes).toString("utf8")
      : buf.toString("utf8");

  const startMatch = tail.match(START_LINE);
  const exitMatch = tail.match(EXIT_LINE);
  const finishMatch = tail.match(FINISH_LINE);

  let state: DeployState = "unknown";
  let exitCode: number | null = null;
  if (exitMatch) {
    exitCode = Number.parseInt(exitMatch[1] as string, 10);
    state = exitCode === 0 ? "completed" : "failed";
  } else if (startMatch) {
    state = "running";
  }

  return {
    runId,
    state,
    exitCode,
    startedAt: startMatch ? (startMatch[1] as string) : null,
    finishedAt: finishMatch ? (finishMatch[1] as string) : null,
    logPath,
    log: tail,
    sizeBytes: stat.size,
  };
}
