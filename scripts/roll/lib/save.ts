import fs from "node:fs";
import path from "node:path";
import type { RolledTopic } from "./types";

const ROLLS_DIR = path.join(process.cwd(), "posts/blog/dummy/rolls");

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function escapeFrontmatter(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function saveRoll(topic: RolledTopic, body: string): string {
  fs.mkdirSync(ROLLS_DIR, { recursive: true });
  const stamp = todayStamp();
  const baseSlug = slugify(topic.title);
  let slug = `${stamp}-${baseSlug}`;
  let i = 2;
  while (fs.existsSync(path.join(ROLLS_DIR, `${slug}.mdx`))) {
    slug = `${stamp}-${baseSlug}-${i++}`;
  }
  const filePath = path.join(ROLLS_DIR, `${slug}.mdx`);
  const trace = `<!-- rolled ${topic.lane} from "${topic.sourceTitle.replace(/--/g, "—")}" on ${stamp} -->`;
  const frontmatter = [
    "---",
    `title: "${escapeFrontmatter(topic.title)}"`,
    `tags: "rolls,draft,${topic.lane}"`,
    'status: "DRAFT"',
    "---",
    "",
    trace,
    "",
    body.trim(),
    "",
  ].join("\n");
  fs.writeFileSync(filePath, frontmatter, "utf8");
  return filePath;
}
