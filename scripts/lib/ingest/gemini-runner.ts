// Calls Gemini via Vercel AI SDK (`ai` + `@ai-sdk/google`). Uses generateText
// with Output.object(zodSchema) so the returned `output` is guaranteed to
// match the Zod schema — no manual JSON parsing, no hand-rolled JSON Schema.
// URL ingests run a two-step pattern: first call uses google.tools.urlContext
// to fetch + summarize (https://ai.google.dev/gemini-api/docs/url-context),
// second call structures that summary into PostDraftSchema. Gemini rejects
// tools + responseMimeType=application/json in the same request, so we split
// them. For images we attach inline image parts. The worker forces the post
// type after the model returns so a model regression can't drift it.

import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import type { PostType } from "@/lib/generated/prisma";
import { parseYouTubeUrl } from "@/lib/ingest/youtube-url";
import { getAIConfig } from "../ai-config";
import type { GeminiOutput, PipelineInput, StagedImage } from "./types";
import { runYouTubeGemini } from "./youtube/runner";

export const PostDraftSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe("Short, plainspoken title; no clickbait, no marketing copy"),
  slug: z
    .string()
    .optional()
    .describe(
      "Lowercase kebab-case slug derived from the title; the worker will normalize"
    ),
  tags: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("1-5 lowercase kebab-case tags"),
  categories: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1-3 lowercase kebab-case categories"),
  body: z
    .string()
    .min(1)
    .describe(
      "MDX body content. First-person, observational, 80-300 words. No frontmatter, no wrapping code fences. For image posts, reference the images in order with literal markdown ![alt](IMAGE_1), ![alt](IMAGE_2), … — the worker rewrites IMAGE_N to final paths."
    ),
});

export type PostDraft = z.infer<typeof PostDraftSchema>;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

function mimeForImage(staged: StagedImage): string {
  const ext = (staged.extension || extname(staged.stagedFilePath).slice(1)).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `untitled-${Date.now()}`
  );
}

function expectedType(input: PipelineInput): PostType {
  if (input.kind === "url") return "FINDING";
  if (input.kind === "image") return "SIGHT";
  return "BLOG";
}

function buildPrompt(input: PipelineInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "You are drafting a single post for the copt-dev personal blog.",
    `Today's date: ${today}.`,
    "Voice: first-person, observational, concrete. 80-300 words.",
    "No marketing copy. No 'Here is' preambles. No code fences in the body.",
    "",
  ];

  if (input.kind === "url") {
    lines.push(
      "Use the url_context tool to fetch every URL below before drafting. Summarize what you found as a short FINDING — what's on the page, why it's worth noting, anything specific that surprised you. Cite any quoted phrases inline naturally.",
      "",
      "URLs:"
    );
    for (const url of input.urls) {
      lines.push(`  - ${url}`);
    }
    if (input.notes.trim()) {
      lines.push("", `Author's notes (verbatim): ${input.notes.trim()}`);
    }
  } else if (input.kind === "image") {
    lines.push(
      `${input.images.length} image(s) are attached, in order. Write a SIGHT post — describe what's visually present, the mood, anything notable.`,
      "Reference each image in the body using IMAGE_1, IMAGE_2, … in order. Example: ![alt text](IMAGE_1). The worker rewrites those placeholders to committed file paths."
    );
    if (input.notes.trim()) {
      lines.push("", `Author's notes (verbatim): ${input.notes.trim()}`);
    }
  } else {
    lines.push(
      "Compose a short BLOG entry from the author's notes:",
      "",
      input.notes.trim()
    );
  }
  return lines.join("\n");
}

function buildUrlStructuringPrompt(summary: string, notes: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "You are drafting a single FINDING post for the copt-dev personal blog from a pre-fetched URL summary.",
    `Today's date: ${today}.`,
    "Voice: first-person, observational, concrete. 80-300 words.",
    "No marketing copy. No 'Here is' preambles. No code fences in the body.",
    "Summarize what's on the page, why it's worth noting, anything specific that surprised you. Cite any quoted phrases inline naturally.",
    "",
    "Pre-fetched URL summary:",
    summary,
  ];
  if (notes.trim()) {
    lines.push("", `Author's notes (verbatim): ${notes.trim()}`);
  }
  return lines.join("\n");
}

function loadImagePart(staged: StagedImage) {
  return {
    type: "image" as const,
    image: readFileSync(staged.stagedFilePath),
    mediaType: mimeForImage(staged),
  };
}

export function toGeminiOutput(
  draft: PostDraft,
  forcedType: PostType,
  originalUrl?: string
): GeminiOutput {
  const title = draft.title.trim() || "Untitled Ingest";
  const slug = slugify(draft.slug?.trim() || title);
  const trimmedUrl = originalUrl?.trim() || "";
  const frontmatter: Record<string, unknown> = {
    title,
    type: forcedType,
    status: "DRAFT",
    published: false,
    date: new Date().toISOString().slice(0, 10),
    tags: draft.tags,
    categories: draft.categories,
    slug,
  };
  if (trimmedUrl) {
    frontmatter.original_url = trimmedUrl;
  }
  const drafted = draft.body.trim();
  let sourceLine = "";
  if (trimmedUrl) {
    sourceLine = parseYouTubeUrl(trimmedUrl)
      ? `<YouTubeEmbed url="${trimmedUrl}" />\n\n`
      : `Source: ${trimmedUrl}\n\n`;
  }
  const body = `${sourceLine}${drafted}\n`;
  return {
    slug,
    title,
    type: forcedType,
    body,
    frontmatter,
    rawMdx: body,
  };
}

export async function runGemini(input: PipelineInput): Promise<GeminiOutput> {
  const config = getAIConfig();
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey });
  const model = google(config.model);
  const prompt = buildPrompt(input);

  if (input.kind === "url") {
    const youtubeUrls = input.urls.filter((u) => parseYouTubeUrl(u));
    const nonYoutubeUrls = input.urls.filter((u) => !parseYouTubeUrl(u));
    // Single-URL YouTube ingest: take the dedicated path. Mixed batches stay
    // on url_context so we don't lose the non-YouTube URLs.
    if (youtubeUrls.length === 1 && nonYoutubeUrls.length === 0) {
      try {
        const result = await runYouTubeGemini({
          url: youtubeUrls[0]!,
          notes: input.notes,
        });
        if (result) {
          return result.output;
        }
      } catch (error) {
        console.warn(
          `[youtube] dedicated path failed, falling back to url_context: ${error instanceof Error ? error.message : String(error)}`
        );
        // Surface the underlying Gemini response so 400s like INVALID_ARGUMENT
        // are actually debuggable. The AI SDK wraps the raw Google error on
        // `cause` and exposes the response body on `responseBody`/`data`.
        const e = error as {
          cause?: unknown;
          responseBody?: unknown;
          data?: unknown;
          statusCode?: unknown;
          url?: unknown;
        };
        if (e.statusCode !== undefined) {
          console.warn(`[youtube] http status: ${String(e.statusCode)}`);
        }
        if (e.url !== undefined) {
          console.warn(`[youtube] request url: ${String(e.url)}`);
        }
        if (e.responseBody !== undefined) {
          console.warn(
            `[youtube] response body: ${typeof e.responseBody === "string" ? e.responseBody : JSON.stringify(e.responseBody)}`
          );
        }
        if (e.data !== undefined) {
          console.warn(
            `[youtube] response data: ${typeof e.data === "string" ? e.data : JSON.stringify(e.data)}`
          );
        }
        if (e.cause !== undefined) {
          const cause = e.cause as { message?: unknown };
          console.warn(
            `[youtube] cause: ${cause?.message !== undefined ? String(cause.message) : JSON.stringify(e.cause)}`
          );
        }
      }
    }
    const { text: summary } = await generateText({
      model,
      tools: { url_context: google.tools.urlContext({}) },
      stopWhen: stepCountIs(4),
      temperature: config.temperature,
      prompt,
    });
    const { output } = await generateText({
      model,
      temperature: config.temperature,
      prompt: buildUrlStructuringPrompt(summary, input.notes),
      output: Output.object({ schema: PostDraftSchema }),
    });
    return toGeminiOutput(output, "FINDING", input.urls[0]);
  }

  if (input.kind === "image") {
    const imageParts = input.images.map(loadImagePart);
    const { output } = await generateText({
      model,
      temperature: config.temperature,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageParts],
        },
      ],
      output: Output.object({ schema: PostDraftSchema }),
    });
    return toGeminiOutput(output, "SIGHT");
  }

  const { output } = await generateText({
    model,
    temperature: config.temperature,
    prompt,
    output: Output.object({ schema: PostDraftSchema }),
  });
  return toGeminiOutput(output, "BLOG");
}
