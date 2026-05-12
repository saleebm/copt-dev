import { randomInt } from "node:crypto";

export function rollInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("rollInt: maxExclusive must be > 0");
  return randomInt(0, maxExclusive);
}

export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick: empty list");
  return items[rollInt(items.length)];
}
