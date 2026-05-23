import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { pick, rollInt } from "./lib/dice";
import { rollTopic } from "./lib/pool";
import { saveRoll } from "./lib/save";
import { formatMs, Stopwatch } from "./lib/timer";
import type { Lane } from "./lib/types";

const LANES: Lane[] = ["hlexicon", "concept", "quote", "wild"];

describe("dice", () => {
  it("rollInt stays within [0, maxExclusive)", () => {
    for (let i = 0; i < 200; i++) {
      const n = rollInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("rollInt rejects non-positive bounds", () => {
    expect(() => rollInt(0)).toThrow();
    expect(() => rollInt(-1)).toThrow();
  });

  it("pick returns a member of the list", () => {
    const list = ["a", "b", "c", "d"];
    for (let i = 0; i < 50; i++) {
      expect(list).toContain(pick(list));
    }
  });

  it("pick rejects empty list", () => {
    expect(() => pick([])).toThrow();
  });
});

describe("timer", () => {
  it("formatMs renders sub-minute durations in seconds", () => {
    expect(formatMs(0)).toBe("0.0s");
    expect(formatMs(4_200)).toBe("4.2s");
    expect(formatMs(59_900)).toBe("59.9s");
  });

  it("formatMs renders minute-scale durations as `Xm Ys`", () => {
    expect(formatMs(60_000)).toBe("1m 0s");
    expect(formatMs(84_000)).toBe("1m 24s");
    expect(formatMs(3_600_000)).toBe("60m 0s");
  });

  it("Stopwatch elapses monotonically", async () => {
    const sw = new Stopwatch();
    const first = sw.elapsedMs();
    await new Promise((r) => setTimeout(r, 20));
    const second = sw.elapsedMs();
    expect(second).toBeGreaterThanOrEqual(first);
  });
});

describe("pool.rollTopic", () => {
  it.each(LANES)("returns a valid topic for lane=%s", (lane) => {
    const topic = rollTopic(lane);
    expect(topic.lane).toBe(lane);
    expect(typeof topic.title).toBe("string");
    expect(topic.title.length).toBeGreaterThan(0);
    expect(typeof topic.sourceTitle).toBe("string");
    expect(Array.isArray(topic.relatedHlexicons)).toBe(true);
    // findRelatedHlexicons tops up with fillers, so we always get 3.
    expect(topic.relatedHlexicons.length).toBe(3);
    for (const h of topic.relatedHlexicons) {
      expect(typeof h.term).toBe("string");
      expect(typeof h.definition).toBe("string");
    }
  });

  it("uniform-random lane selection covers all four lanes", () => {
    const seen = new Set<Lane>();
    // 200 rolls × 4 lanes ⇒ probability of missing any one lane is
    // (3/4)^200 ≈ 1e-25. Effectively never flaky.
    for (let i = 0; i < 200; i++) {
      seen.add(rollTopic().lane);
      if (seen.size === LANES.length) break;
    }
    expect(seen.size).toBe(LANES.length);
  });
});

describe("save.saveRoll", () => {
  let tmp: string;
  let prevCwd: string;

  beforeAll(() => {
    prevCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "roll-test-"));
    process.chdir(tmp);
  });

  afterAll(() => {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("writes a DRAFT mdx with the expected frontmatter + trace + body", () => {
    const filePath = saveRoll(
      {
        lane: "hlexicon",
        title: "APFVD",
        sourceTitle: "APFVD",
        sourceBody: null,
        relatedHlexicons: [],
      },
      "# APFVD\n\nbody goes here."
    );

    expect(filePath.endsWith(".mdx")).toBe(true);
    expect(filePath).toContain(
      path.join("posts", "blog", "dummy", "rolls")
    );

    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain('title: "APFVD"');
    expect(content).toContain('tags: "rolls,draft,hlexicon"');
    expect(content).toContain('status: "DRAFT"');
    expect(content).toMatch(/<!-- rolled hlexicon from "APFVD" on \d{4}-\d{2}-\d{2} -->/);
    expect(content).toContain("# APFVD");
    expect(content).toContain("body goes here.");
  });

  it("kebab-cases the slug and appends a numeric suffix on collision", () => {
    const topic = {
      lane: "concept" as const,
      title: "Hello World!  Foo/Bar",
      sourceTitle: "Hello World!  Foo/Bar",
      sourceBody: null,
      relatedHlexicons: [],
    };

    const a = saveRoll(topic, "first");
    const b = saveRoll(topic, "second");
    const c = saveRoll(topic, "third");

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(path.basename(a)).toMatch(/^\d{4}-\d{2}-\d{2}-hello-world-foo-bar\.mdx$/);
    expect(path.basename(b)).toMatch(/^\d{4}-\d{2}-\d{2}-hello-world-foo-bar-2\.mdx$/);
    expect(path.basename(c)).toMatch(/^\d{4}-\d{2}-\d{2}-hello-world-foo-bar-3\.mdx$/);
  });

  it("escapes quotes in the title frontmatter", () => {
    const filePath = saveRoll(
      {
        lane: "quote",
        title: 'She said "yes"',
        sourceTitle: "src",
        sourceBody: null,
        relatedHlexicons: [],
      },
      "body"
    );
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain('title: "She said \\"yes\\""');
  });

  it("collapses `--` to em-dash in the trace comment (MDX comments can't contain `--`)", () => {
    const filePath = saveRoll(
      {
        lane: "wild",
        title: "double-dash",
        sourceTitle: "weird -- title",
        sourceBody: null,
        relatedHlexicons: [],
      },
      "body"
    );
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("weird — title");
    expect(content).not.toContain("weird -- title");
  });
});
