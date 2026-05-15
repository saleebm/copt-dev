import { describe, expect, it } from "bun:test";
import {
  buildTimestampUrl,
  isYouTubeUrl,
  parseYouTubeUrl,
} from "./youtube-url";

describe("parseYouTubeUrl", () => {
  it("parses canonical /watch URLs", () => {
    const r = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r).not.toBeNull();
    expect(r?.videoId).toBe("dQw4w9WgXcQ");
    expect(r?.canonicalUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r?.isShort).toBe(false);
    expect(r?.startSeconds).toBeNull();
  });

  it("parses youtu.be short links", () => {
    const r = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(r?.videoId).toBe("dQw4w9WgXcQ");
    expect(r?.canonicalUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("parses /shorts/ as a Short", () => {
    const r = parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(r?.videoId).toBe("dQw4w9WgXcQ");
    expect(r?.isShort).toBe(true);
  });

  it("parses /embed/ and /v/ paths", () => {
    expect(
      parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")?.videoId
    ).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeUrl("https://www.youtube.com/v/dQw4w9WgXcQ")?.videoId
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses m. and music. subdomains", () => {
    expect(
      parseYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")?.videoId
    ).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")?.videoId
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtube-nocookie hosts", () => {
    expect(
      parseYouTubeUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")
        ?.videoId
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts numeric ?t= start seconds", () => {
    const r = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90"
    );
    expect(r?.startSeconds).toBe(90);
  });

  it("extracts ?t=1m30s style start", () => {
    const r = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=1m30s");
    expect(r?.startSeconds).toBe(90);
  });

  it("extracts ?t=1h2m3s style start", () => {
    const r = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s"
    );
    expect(r?.startSeconds).toBe(3723);
  });

  it("falls back to ?start= when ?t= is absent", () => {
    const r = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=42"
    );
    expect(r?.startSeconds).toBe(42);
  });

  it("rejects non-YouTube hosts", () => {
    expect(
      parseYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ")
    ).toBeNull();
    expect(parseYouTubeUrl("https://vimeo.com/123456")).toBeNull();
  });

  it("rejects malformed video ids", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeUrl("https://youtu.be/way-too-long-12345")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(parseYouTubeUrl("")).toBeNull();
    expect(parseYouTubeUrl("not a url")).toBeNull();
    // @ts-expect-error — guarding against non-string runtime values
    expect(parseYouTubeUrl(null)).toBeNull();
  });

  it("isYouTubeUrl matches parseYouTubeUrl", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://example.com/")).toBe(false);
  });
});

describe("buildTimestampUrl", () => {
  it("builds canonical deeplinks", () => {
    expect(buildTimestampUrl("dQw4w9WgXcQ", 90)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s"
    );
  });

  it("clamps non-finite or negative seconds to 0", () => {
    expect(buildTimestampUrl("dQw4w9WgXcQ", -5)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0s"
    );
    expect(buildTimestampUrl("dQw4w9WgXcQ", Number.NaN)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0s"
    );
  });

  it("floors fractional seconds", () => {
    expect(buildTimestampUrl("dQw4w9WgXcQ", 12.9)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12s"
    );
  });
});
