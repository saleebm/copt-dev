// Interactive setup for the iOS Shortcut → PR ingest pipeline.
// Runs preflight checks, generates an INGEST_TOKEN if absent, ensures the
// staging dir exists, and prints the operator's remaining manual steps.
// Re-runnable; idempotent. See docs/ingest.md.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
};

const ENV_PATH = join(process.cwd(), ".env");
const ENV_EXAMPLE_PATH = join(process.cwd(), ".env.example");
const STAGING_DEFAULT = "/tmp/copt-ingest";

function color(code: number, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (s: string) => color(32, s);
const red = (s: string) => color(31, s);
const yellow = (s: string) => color(33, s);
const dim = (s: string) => color(90, s);
const bold = (s: string) => color(1, s);

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function commandAvailable(cmd: string, args: string[] = ["--version"]): Promise<{
  ok: boolean;
  output: string;
}> {
  try {
    const proc = Bun.spawn({
      cmd: [cmd, ...args],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return {
      ok: exitCode === 0,
      output: (stdout + stderr).trim().split("\n")[0] ?? "",
    };
  } catch (error) {
    return {
      ok: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

async function isGitWorkspace(path: string): Promise<boolean> {
  if (!existsSync(path)) return false;
  const proc = Bun.spawn({
    cmd: ["git", "rev-parse", "--is-inside-work-tree"],
    cwd: path,
    stdout: "pipe",
    stderr: "pipe",
  });
  await new Response(proc.stdout).text();
  await new Response(proc.stderr).text();
  return (await proc.exited) === 0;
}

async function ghAuthOk(cwd: string): Promise<boolean> {
  if (!existsSync(cwd)) return false;
  const proc = Bun.spawn({
    cmd: ["gh", "auth", "status"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  await new Response(proc.stdout).text();
  await new Response(proc.stderr).text();
  return (await proc.exited) === 0;
}

function writeEnvVar(path: string, key: string, value: string): void {
  let body = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) {
    body = body.replace(re, `${key}=${value}`);
  } else {
    if (body.length > 0 && !body.endsWith("\n")) body += "\n";
    body += `${key}=${value}\n`;
  }
  writeFileSync(path, body);
}

async function main(): Promise<void> {
  console.log(bold("\nIngest setup — preflight checks\n"));

  const envFromFile = readEnvFile(ENV_PATH);
  const env = { ...envFromFile, ...process.env };
  const results: CheckResult[] = [];

  const bun = await commandAvailable("bun", ["--version"]);
  results.push({
    name: "bun",
    ok: bun.ok,
    detail: bun.ok ? bun.output : "not installed",
    fix: bun.ok ? undefined : "https://bun.com/docs/installation",
  });

  const gh = await commandAvailable("gh", ["--version"]);
  results.push({
    name: "gh CLI",
    ok: gh.ok,
    detail: gh.ok ? gh.output : "not installed",
    fix: gh.ok ? undefined : "brew install gh  # or https://cli.github.com",
  });

  const aiSdk = existsSync(
    join(process.cwd(), "node_modules", "@ai-sdk", "google", "package.json")
  );
  results.push({
    name: "@ai-sdk/google",
    ok: aiSdk,
    detail: aiSdk ? "installed" : "missing",
    fix: aiSdk ? undefined : "bun add ai @ai-sdk/google",
  });

  results.push({
    name: "GEMINI_API_KEY (or GOOGLE_API_KEY)",
    ok: Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENAI_API_KEY),
    detail:
      env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENAI_API_KEY
        ? "set"
        : "missing",
    fix: "https://aistudio.google.com/app/apikey then add GEMINI_API_KEY=... to .env",
  });

  results.push({
    name: "DATABASE_URL",
    ok: Boolean(env.DATABASE_URL),
    detail: env.DATABASE_URL ? "set" : "missing",
    fix: "add DATABASE_URL=postgresql://... to .env",
  });

  let tokenGenerated = false;
  if (!env.INGEST_TOKEN || env.INGEST_TOKEN === "replace_me_with_a_long_random_hex_string") {
    if (existsSync(ENV_PATH)) {
      const fresh = randomBytes(32).toString("hex");
      writeEnvVar(ENV_PATH, "INGEST_TOKEN", fresh);
      tokenGenerated = true;
      env.INGEST_TOKEN = fresh;
      results.push({
        name: "INGEST_TOKEN",
        ok: true,
        detail: "generated and written to .env",
      });
    } else {
      results.push({
        name: "INGEST_TOKEN",
        ok: false,
        detail: ".env missing",
        fix: `cp ${ENV_EXAMPLE_PATH} .env, then re-run this script`,
      });
    }
  } else {
    results.push({
      name: "INGEST_TOKEN",
      ok: true,
      detail: `set (${env.INGEST_TOKEN.slice(0, 6)}…${env.INGEST_TOKEN.slice(-4)})`,
    });
  }

  const stagingDir = env.INGEST_STAGING_DIR?.trim() || STAGING_DEFAULT;
  let stagingOk = true;
  let stagingDetail = "exists";
  if (!existsSync(stagingDir)) {
    try {
      mkdirSync(stagingDir, { recursive: true });
      stagingDetail = "created";
    } catch (error) {
      stagingOk = false;
      stagingDetail = error instanceof Error ? error.message : String(error);
    }
  }
  results.push({
    name: `INGEST_STAGING_DIR (${stagingDir})`,
    ok: stagingOk,
    detail: stagingDetail,
    fix: stagingOk ? undefined : `mkdir -p ${stagingDir}`,
  });

  const repoPath = env.INGEST_REPO_PATH?.trim();
  if (!repoPath) {
    results.push({
      name: "INGEST_REPO_PATH",
      ok: false,
      detail: "missing",
      fix: "set INGEST_REPO_PATH=/absolute/path/to/a/git/checkout in .env",
    });
  } else if (!(await isGitWorkspace(repoPath))) {
    results.push({
      name: `INGEST_REPO_PATH (${repoPath})`,
      ok: false,
      detail: "not a git checkout",
      fix: `git clone <this-repo> ${repoPath}`,
    });
  } else {
    const authed = await ghAuthOk(repoPath);
    results.push({
      name: `INGEST_REPO_PATH (${repoPath})`,
      ok: authed,
      detail: authed ? "git checkout + gh authenticated" : "gh not authenticated for this checkout",
      fix: authed ? undefined : `cd ${repoPath} && gh auth login`,
    });
  }

  console.log(
    results
      .map((r) => {
        const mark = r.ok ? green("✓") : red("✗");
        const head = `${mark} ${bold(r.name)} ${dim("— " + r.detail)}`;
        if (r.ok || !r.fix) return head;
        return `${head}\n  ${yellow("→")} ${r.fix}`;
      })
      .join("\n")
  );

  const allOk = results.every((r) => r.ok);
  console.log("");

  if (tokenGenerated && env.INGEST_TOKEN) {
    console.log(bold("New INGEST_TOKEN generated:"));
    console.log(`  ${env.INGEST_TOKEN}`);
    console.log(dim("  (written to .env — add the same header to your iOS Shortcuts)"));
    console.log("");
  }

  console.log(bold("iOS Shortcut configuration"));
  console.log("In each \"Get contents of URL\" action, expand Headers and add:");
  console.log(`  ${green("Authorization")}: Bearer ${env.INGEST_TOKEN ?? "$INGEST_TOKEN"}`);
  console.log("");
  console.log("For the images shortcut, also add headers so the worker can group the batch:");
  console.log(`  ${green("X-BatchId")}: BatchId    (Magic Variable)`);
  console.log(`  ${green("X-ImageIndex")}: <Repeat Index minus 1>`);
  console.log(`  ${green("X-TotalCount")}: TotalCount`);
  console.log(`  ${green("X-Notes")}: <notes variable>`);
  console.log("");
  console.log(bold("Next"));
  if (!allOk) {
    console.log(red("✗") + " Resolve the ✗ items above before starting the worker.");
    process.exit(1);
  }
  console.log(`${green("✓")} ${dim("bun run dev")}            # Next.js (serves /api/ingest)`);
  console.log(`${green("✓")} ${dim("bun run worker")}         # ingest worker daemon`);
  console.log(`${green("✓")} ${dim("bunx --bun prisma studio")}  # inspect IngestSubmission rows`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(red("setup failed:"), error);
    process.exit(1);
  });
}
