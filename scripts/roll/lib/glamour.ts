import { spawnSync } from "node:child_process";
import { stdout } from "node:process";

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

function runGumStyle(args: string[], body: string): boolean {
  if (!stdout.isTTY) return false;
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

  console.log(`
   ╭──────────────────────────────────╮
   │   🎲  roll                       │
   │      one die. one topic. write.  │
   ╰──────────────────────────────────╯`);
}

export function totalsCard(
  rows: readonly { label: string; value: string }[]
): void {
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
