/**
 * JSON content provider.
 * Reads post records from records/posts/*.json and produces NormalizedPost records.
 * Each JSON file is one post record, validated through NormalizedPostSchema at load time.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  NormalizedPostSchema,
  type ContentProvider,
  type NormalizedPost,
  type SourceType,
} from "./schema";

const PROVIDER_ID = "json";
const SOURCE_TYPE: SourceType = "json";
const RECORDS_DIR = path.join(process.cwd(), "records", "posts");

export class JsonProvider implements ContentProvider {
  readonly id = PROVIDER_ID;
  readonly sourceType = SOURCE_TYPE;
  private readonly recordsDir: string;

  constructor(recordsDir = RECORDS_DIR) {
    this.recordsDir = recordsDir;
  }

  getPosts(): NormalizedPost[] {
    if (!fs.existsSync(this.recordsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.recordsDir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

    const posts: NormalizedPost[] = [];

    for (const file of files) {
      const filePath = path.join(this.recordsDir, file);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        const sourceHash = crypto
          .createHash("md5")
          .update(raw)
          .digest("hex");

        const withProvenance = {
          ...data,
          provenance: {
            ...(data.provenance ?? {}),
            sourceType: SOURCE_TYPE,
            providerId: PROVIDER_ID,
            sourceHash,
            sourcePath: filePath,
          },
        };

        const parsed = NormalizedPostSchema.parse(withProvenance);
        posts.push(parsed);
      } catch (e) {
        console.error(
          `❌ Invalid JSON post record: ${file}: ${e instanceof Error ? e.message : e}`
        );
      }
    }

    return posts;
  }
}
