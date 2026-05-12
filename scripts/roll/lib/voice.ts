import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

function readMdxBody(relPath: string): string {
  const full = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(full)) return "";
  const raw = fs.readFileSync(full, "utf8");
  return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
}

let cached: string | null = null;

export function loadVoice(): string {
  if (cached) return cached;
  const principles = readMdxBody("posts/concrete/principles.mdx");
  const about = readMdxBody("posts/concrete/about.mdx");
  cached = [
    "You are co-writing with Mina Saleeb, whose voice is captured below.",
    "Mirror his tone: permission-giving, scripture-and-Melville-adjacent, short punchy sentences,",
    "Captain Underpants TDD energy, software-as-spiritual-practice. Never preachy. Never AI-sloppy.",
    "Avoid corporate writing tics: no \"in today's fast-paced world\", no hedge phrases, no signposting.",
    "",
    "--- ANCHOR: principles.mdx ---",
    principles,
    "",
    "--- ANCHOR: about.mdx ---",
    about,
  ].join("\n");
  return cached;
}
