// Live Braille spinner with elapsed time, written to stderr so the AI stream
// (stdout) stays clean. Stopped by the orchestrator the moment the first
// streamed chunk arrives, then erased with a one-line clear.
import { stderr } from "node:process";
import { formatMs, Stopwatch } from "./timer";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_MS = 100;

export type SpinnerHandle = {
  stop: () => void;
};

export function startSpinner(label: string): SpinnerHandle {
  // No-op when stderr isn't a TTY — `\r` overwrites don't work in piped output,
  // and printing every frame to a log file would be a wall of garbage.
  if (!stderr.isTTY) {
    return { stop: () => {} };
  }

  const sw = new Stopwatch();
  let frame = 0;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    stderr.write(
      `\r  ${FRAMES[frame]} ${label}  ⏱ ${formatMs(sw.elapsedMs())}`
    );
    frame = (frame + 1) % FRAMES.length;
  };

  render();
  const id = setInterval(render, FRAME_MS);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(id);
      // \r → start of line; \x1b[2K → erase entire line. Together: leave no trace.
      stderr.write("\r\x1b[2K");
    },
  };
}
