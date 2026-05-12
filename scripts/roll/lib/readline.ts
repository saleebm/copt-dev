import { stdin, stdout } from "node:process";

export async function readLine(): Promise<string> {
  for await (const line of console) {
    return line;
  }
  return "";
}

export async function readBlock(
  endSentinels: readonly string[] = ["."]
): Promise<string> {
  const lines: string[] = [];
  for await (const line of console) {
    const trimmed = line.trim();
    if (endSentinels.includes(trimmed)) break;
    lines.push(line);
  }
  return lines.join("\n").trim();
}

export async function readChoice(
  prompt: string,
  validKeys: readonly string[]
): Promise<string> {
  while (true) {
    stdout.write(`${prompt} `);
    const raw = (await readLine()).trim().toLowerCase();
    if (validKeys.includes(raw)) return raw;
    stdout.write(`  → expected one of: ${validKeys.join(", ")}\n`);
  }
}

export function closeInput(): void {
  /* no-op for `for await (const line of console)`; kept for API stability */
}

/**
 * While `work()` runs, put the terminal into raw mode and swallow every
 * keystroke so the terminal stops echoing typed characters into a stream
 * that isn't theirs, and so that buffered keystrokes can't poison the next
 * readline call. Ctrl+C still works. No-op when stdin is not a TTY (piped).
 */
export async function withInputSuppressed<T>(work: () => Promise<T>): Promise<T> {
  if (!stdin.isTTY) {
    return work();
  }

  const wasRaw = Boolean(stdin.isRaw);
  stdin.setRawMode(true);
  stdin.resume();

  const onData = (chunk: Buffer | string) => {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    if (buf.length === 1 && buf[0] === 0x03) {
      process.kill(process.pid, "SIGINT");
    }
  };
  stdin.on("data", onData);

  try {
    return await work();
  } finally {
    stdin.off("data", onData);
    stdin.setRawMode(wasRaw);
    stdin.pause();
  }
}
