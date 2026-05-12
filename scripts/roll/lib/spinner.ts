import { stderr } from "node:process";
import { formatMs, Stopwatch } from "./timer";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_MS = 100;

export type SpinnerHandle = {
  stop: () => void;
};

export function startSpinner(label: string): SpinnerHandle {
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
      stderr.write("\r\x1b[2K");
    },
  };
}
