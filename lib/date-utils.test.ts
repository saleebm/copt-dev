#!/usr/bin/env bun

import { describe, expect, it } from "bun:test";
import { extractDateFromBody, parsePostDate } from "./date-utils";

const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).getTime();

describe("parsePostDate", () => {
  it("parses YYYY-MM-DD at UTC midnight", () => {
    const r = parsePostDate("2025-07-20", "test");
    expect(r).not.toBeNull();
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("parses YYYY/MM/DD", () => {
    const r = parsePostDate("2025/07/20", "test");
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("parses M/D/YY with the 00-69→2000s pivot", () => {
    expect(parsePostDate("7/20/25", "test")?.getTime()).toBe(utc(2025, 7, 20));
    expect(parsePostDate("12/31/69", "test")?.getTime()).toBe(
      utc(2069, 12, 31)
    );
    expect(parsePostDate("1/1/70", "test")?.getTime()).toBe(utc(1970, 1, 1));
  });

  it("parses MM/DD/YYYY", () => {
    expect(parsePostDate("07/20/2025", "test")?.getTime()).toBe(
      utc(2025, 7, 20)
    );
  });

  it("parses MM-DD-YYYY", () => {
    expect(parsePostDate("07-20-2025", "test")?.getTime()).toBe(
      utc(2025, 7, 20)
    );
  });

  it("parses YYYYMMDD", () => {
    expect(parsePostDate("20250720", "test")?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("parses MMDDYYYY when YYYYMMDD interpretation is invalid", () => {
    // 05122026: as YYYYMMDD = year 0512, month 20 → invalid → falls back
    expect(parsePostDate("05122026", "test")?.getTime()).toBe(utc(2026, 5, 12));
  });

  it("preserves ISO 8601 timestamps (truncated to UTC midnight)", () => {
    const r = parsePostDate("2025-07-20T13:45:00Z", "test");
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("returns null for empty/undefined", () => {
    expect(parsePostDate(undefined, "test")).toBeNull();
    expect(parsePostDate("", "test")).toBeNull();
    expect(parsePostDate("   ", "test")).toBeNull();
  });

  it("returns null for nonsense", () => {
    expect(parsePostDate("not a date", "test")).toBeNull();
  });

  it("rejects impossible month/day combos", () => {
    expect(parsePostDate("13/40/25", "test")).toBeNull();
    expect(parsePostDate("2025-02-30", "test")).toBeNull();
    expect(parsePostDate("2025-13-01", "test")).toBeNull();
  });

  it("does NOT silently accept locale-ambiguous engine parsing", () => {
    // "Jul 20 2025" is engine-parseable but not in our explicit set,
    // so it should be rejected unless it has T/Z.
    expect(parsePostDate("Jul 20 2025", "test")).toBeNull();
  });
});

describe("extractDateFromBody", () => {
  it("returns null for empty input", () => {
    expect(extractDateFromBody("")).toBeNull();
    expect(extractDateFromBody(null)).toBeNull();
    expect(extractDateFromBody(undefined)).toBeNull();
  });

  it("finds a M/D/YY date in body prose", () => {
    const r = extractDateFromBody("On 7/20/25 we shipped the thing.");
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("finds a YYYY-MM-DD date in body prose", () => {
    const r = extractDateFromBody("Logged on 2025-07-20: it works.");
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("returns the earliest occurring date when multiple are present", () => {
    const r = extractDateFromBody(
      "Started 7/20/25, then again on 8/15/25 — finally 9/1/25."
    );
    expect(r?.getTime()).toBe(utc(2025, 7, 20));
  });

  it("returns null when no date appears", () => {
    expect(
      extractDateFromBody("Just some prose with no date in it.")
    ).toBeNull();
  });

  it("only scans the first ~2000 chars", () => {
    const filler = "x".repeat(2100);
    const r = extractDateFromBody(`${filler}7/20/25`);
    expect(r).toBeNull();
  });
});
