// Opens a draft PR via the `gh` CLI in the worker's git workspace.
// Returns the PR URL parsed from gh's stdout/stderr.
export type OpenPrInput = {
  workspace: string;
  title: string;
  body: string;
  draft?: boolean;
};

const URL_RE = /https?:\/\/\S+/;

export async function openPullRequest(input: OpenPrInput): Promise<string> {
  const args = [
    "pr",
    "create",
    "--title",
    input.title,
    "--body",
    input.body,
  ];
  if (input.draft !== false) {
    args.push("--draft");
  }
  const proc = Bun.spawn({
    cmd: ["gh", ...args],
    cwd: input.workspace,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env as Record<string, string>,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `gh pr create failed exit=${exitCode}: ${stderr.trim() || stdout.trim()}`
    );
  }
  const match = stdout.match(URL_RE) ?? stderr.match(URL_RE);
  if (!match) {
    throw new Error(`gh pr create did not return a PR URL: ${stdout.trim()}`);
  }
  return match[0];
}
