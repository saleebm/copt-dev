import { stdin, stdout } from "node:process";
import { createInterface, type Interface as ReadlineInterface } from "node:readline";

// One readline interface for the life of the process. Bun's `for await
// (const line of console)` locks stdin's ReadableStream; once it's locked it
// stays locked across re-rolls and any stdin.on('data') from
// `withInputSuppressed`. We re-create the interface lazily so raw-mode windows
// can tear it down and start fresh, avoiding buffer pollution from keystrokes
// the user banged out during an AI stream.
let rl: ReadlineInterface | null = null;
let lineQueue: string[] = [];
let pendingResolvers: Array<(line: string) => void> = [];
let closed = false;

function getReadline(): ReadlineInterface {
  if (rl) return rl;
  closed = false;
  rl = createInterface({ input: stdin, terminal: false });
  rl.on("line", (line) => {
    const resolver = pendingResolvers.shift();
    if (resolver) {
      resolver(line);
    } else {
      lineQueue.push(line);
    }
  });
  rl.once("close", () => {
    closed = true;
    // Drain any waiters with empty strings so callers see EOF and stop.
    while (pendingResolvers.length > 0) {
      const r = pendingResolvers.shift();
      r?.("");
    }
  });
  return rl;
}

export function readLine(): Promise<string> {
  getReadline();
  return new Promise<string>((resolve) => {
    if (lineQueue.length > 0) {
      resolve(lineQueue.shift() ?? "");
      return;
    }
    if (closed) {
      resolve("");
      return;
    }
    pendingResolvers.push(resolve);
  });
}

export async function readBlock(
  endSentinels: readonly string[] = ["."]
): Promise<string> {
  const lines: string[] = [];
  while (true) {
    const line = await readLine();
    if (closed && lineQueue.length === 0 && line === "") break;
    if (endSentinels.includes(line.trim())) break;
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
  if (rl) {
    rl.close();
    rl = null;
  }
  // Preserve buffered lines across raw-mode windows; only the interface goes.
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

  // Tear down readline before entering raw mode so its line-buffer can't
  // accumulate the raw bytes we're about to drop on the floor.
  closeInput();

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
    // readline interface gets rebuilt lazily on the next read* call.
  }
}
