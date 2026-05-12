// Optional `gum` integration for static glamour (banner + totals card).
// Detected once at startup; falls back to hand-drawn ASCII boxes when absent
// or when stdout is piped. Per the tui-glamorous skill's "Graceful Degradation"
// pre-flight item: detect at startup, hide what isn't available.
import { spawnSync } from "node:child_process";
import { stdout } from "node:process";

// One-shot cache — spawnSync is expensive; we only ask once per process.
let cachedHasGum: boolean | null = null;

export function hasGum(): boolean {
  if (cachedHasGum !== null) return cachedHasGum;
  const result = spawnSync("command", ["-v", "gum"], {
    shell: true,
    stdio: ["ignore", "ignore", "ignore"],
  });
  cachedHasGum = result.status === 0;
  return cachedHasGum;
}

// Returns true when gum rendered the body; false signals "fall back to ASCII".
// Skipped on non-TTY because gum emits ANSI that becomes noise when piped/captured.
function runGumStyle(args: string[], body: string): boolean {
  if (!stdout.isTTY) return false;
  // Pipe the body through stdin — passing it as an argv member fights shell quoting.
  const result = spawnSync("gum", ["style", ...args], {
    input: body,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return result.status === 0;
}

export function bannerOrFallback(): void {
  const body = "🎲  roll\none die. one topic. write.";
  if (
    hasGum() &&
    runGumStyle(
      [
        "--border",
        "double",
        "--padding",
        "0 2",
        "--margin",
        "1 1",
        "--align",
        "center",
        "--foreground",
        "212",
      ],
      body
    )
  ) {
    return;
  }

  // Plain template literal (not String.raw) — Bun has a bug where String.raw
  // with characters above U+007F emits them as literal `\uXXXX` escape TEXT
  // instead of the actual glyph. Verified: `bun -e 'console.log(String.raw\`╭\`)'`
  // outputs `╭`, while `bun -e 'console.log(\`╭\`)'` outputs `╭`.
  console.log(`
   ╭──────────────────────────────────╮
   │   🎲  roll                       │
   │      one die. one topic. write.  │
   ╰──────────────────────────────────╯`);
}

export function totalsCard(
  rows: readonly { label: string; value: string }[]
): void {
  // Two-column alignment: pad each label out to widest label, each value out
  // to widest value, so "✨  sparks  4.2s" and "🎲  total  1m 24s" line up.
  const widestLabel = rows.reduce((n, r) => Math.max(n, r.label.length), 0);
  const widestValue = rows.reduce((n, r) => Math.max(n, r.value.length), 0);
  const lines = rows.map((r) => {
    const pad = widestLabel - r.label.length;
    const valPad = widestValue - r.value.length;
    return `${r.label}${" ".repeat(pad)}   ${" ".repeat(valPad)}${r.value}`;
  });
  const body = ["session totals", "", ...lines].join("\n");

  if (
    hasGum() &&
    runGumStyle(
      [
        "--border",
        "rounded",
        "--padding",
        "0 2",
        "--margin",
        "1 1",
        "--foreground",
        "212",
      ],
      body
    )
  ) {
    return;
  }

  const innerWidth = Math.max(
    "session totals".length,
    ...lines.map((l) => l.length)
  );
  const horiz = "─".repeat(innerWidth + 2);
  console.log("");
  console.log(` ╭${horiz}╮`);
  console.log(
    ` │ session totals${" ".repeat(innerWidth - "session totals".length)} │`
  );
  console.log(` │${" ".repeat(innerWidth + 2)}│`);
  for (const line of lines) {
    console.log(` │ ${line}${" ".repeat(innerWidth - line.length)} │`);
  }
  console.log(` ╰${horiz}╯`);
}
