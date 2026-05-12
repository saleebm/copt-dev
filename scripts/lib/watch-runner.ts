import fs from "node:fs";
import path from "node:path";

export interface WatchRunnerOptions {
  paths: string[];
  extensions?: string[];
  ignore?: RegExp;
  debounceMs?: number;
  label?: string;
  run: () => Promise<void> | void;
  runOnStart?: boolean;
}

export interface WatchRunnerHandle {
  stop: () => void;
}

export function watchAndRun(opts: WatchRunnerOptions): WatchRunnerHandle {
  const {
    paths,
    extensions,
    ignore,
    debounceMs = 300,
    label = "watch",
    run,
    runOnStart = true,
  } = opts;

  const prefix = `[${label}]`;
  const cwd = process.cwd();
  const watchers: fs.FSWatcher[] = [];

  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let pending = false;
  let stopped = false;

  const matches = (filename: string | null): boolean => {
    if (!filename) {
      return false;
    }
    if (ignore?.test(filename)) {
      return false;
    }
    if (extensions && extensions.length > 0) {
      const ext = path.extname(filename).toLowerCase();
      if (!extensions.includes(ext)) {
        return false;
      }
    }
    return true;
  };

  const execute = async (reason: string) => {
    if (stopped) {
      return;
    }
    if (running) {
      pending = true;
      return;
    }
    running = true;
    const start = Date.now();
    console.log(`${prefix} ${reason} → run`);
    try {
      await run();
      console.log(`${prefix} done (${Date.now() - start}ms)`);
    } catch (err) {
      console.error(`${prefix} run failed:`, err);
    } finally {
      running = false;
      if (pending && !stopped) {
        pending = false;
        await execute("pending run");
      }
    }
  };

  const schedule = (reason: string) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void execute(reason);
    }, debounceMs);
  };

  for (const dir of paths) {
    const abs = path.resolve(cwd, dir);
    if (!fs.existsSync(abs)) {
      console.warn(`${prefix} skipping missing path: ${dir}`);
      continue;
    }
    const watcher = fs.watch(abs, { recursive: true }, (_event, filename) => {
      if (!matches(filename)) {
        return;
      }
      const rel = path.relative(cwd, path.join(abs, filename ?? ""));
      schedule(`event: ${rel}`);
    });
    watcher.on("error", (err) => {
      console.error(`${prefix} watcher error on ${dir}:`, err);
    });
    watchers.push(watcher);
  }

  const extLabel = extensions?.length ? ` (${extensions.join(", ")})` : "";
  console.log(`${prefix} watching: ${paths.join(", ")}${extLabel}`);

  if (runOnStart) {
    void execute("initial run");
  }

  const stop = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    for (const w of watchers) {
      w.close();
    }
    console.log(`${prefix} stopped`);
  };

  const onSignal = () => {
    stop();
    process.exit(0);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return { stop };
}
