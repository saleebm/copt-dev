export class Stopwatch {
  private startedAt = Date.now();

  reset(): void {
    this.startedAt = Date.now();
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }
}

export function formatMs(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}
