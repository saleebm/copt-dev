import { describe, expect, it } from "bun:test";
import { parseChaptersFromDescription } from "./chapters";

describe("parseChaptersFromDescription", () => {
  it("parses a valid chapter list", () => {
    const desc = [
      "Some intro line",
      "0:00 Intro",
      "1:30 - Setup",
      "5:00 — Main demo",
      "12:45 Outro",
    ].join("\n");
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters).toEqual([
      { startSeconds: 0, title: "Intro" },
      { startSeconds: 90, title: "Setup" },
      { startSeconds: 300, title: "Main demo" },
      { startSeconds: 765, title: "Outro" },
    ]);
  });

  it("parses H:MM:SS timestamps", () => {
    const desc = [
      "0:00 Intro",
      "0:30 Warmup",
      "1:00:00 - Deep dive",
    ].join("\n");
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters).toHaveLength(3);
    expect(chapters[2]).toEqual({ startSeconds: 3600, title: "Deep dive" });
  });

  it("returns [] when the list has fewer than 3 chapters", () => {
    const desc = "0:00 Intro\n1:00 - Outro";
    expect(parseChaptersFromDescription(desc)).toEqual([]);
  });

  it("returns [] when the first chapter is not at 0:00", () => {
    const desc = "0:30 Intro\n1:00 Setup\n5:00 Outro";
    expect(parseChaptersFromDescription(desc)).toEqual([]);
  });

  it("returns [] when chapters are closer than 10s apart", () => {
    const desc = "0:00 Intro\n0:05 - Beat\n1:00 - Outro";
    expect(parseChaptersFromDescription(desc)).toEqual([]);
  });

  it("returns [] when last chapter starts at or after the video duration", () => {
    const desc = "0:00 Intro\n1:00 Mid\n5:00 Outro";
    expect(parseChaptersFromDescription(desc, 300)).toEqual([]);
  });

  it("ignores lines without leading timestamps", () => {
    const desc = [
      "Find the repo at github.com/example",
      "0:00 Intro",
      "see also: nothing here",
      "1:30 - Setup",
      "5:00 — Main",
    ].join("\n");
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters.map((c) => c.title)).toEqual(["Intro", "Setup", "Main"]);
  });

  it("returns [] for empty description", () => {
    expect(parseChaptersFromDescription("")).toEqual([]);
  });
});
