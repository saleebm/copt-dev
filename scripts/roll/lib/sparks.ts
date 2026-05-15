import {
  createGoogleGenerativeAI,
  type GoogleLanguageModelOptions,
} from "@ai-sdk/google";
import { streamText } from "ai";
import { getAIConfig } from "../../lib/ai-config";
import type { RolledTopic } from "./types";
import { loadVoice } from "./voice";

// Gemini 3.1 Pro can't disable thinking; 'low' is the floor. Override the
// shared AI_MODEL default so roll doesn't drag every other script onto Pro.
const ROLL_MODEL = process.env.AI_MODEL ?? "gemini-3.1-pro-preview";
const ROLL_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: { thinkingLevel: "low" },
  } satisfies GoogleLanguageModelOptions,
};

function buildSparkPrompt(topic: RolledTopic): string {
  const related = topic.relatedHlexicons
    .map((h) => `- ${h.term} := ${h.definition}`)
    .join("\n");
  const sourceContext = topic.sourceBody
    ? `\nSOURCE CONTEXT (from h0p3's wiki, for grounding only — do not summarize it):\n${topic.sourceBody.slice(0, 1200)}\n`
    : "";
  return `Today's rolled topic: **${topic.title}** (lane: ${topic.lane}, source tiddler: "${topic.sourceTitle}").

Related hlexicons (Mina's evolving lexicon, lifted from h0p3):
${related}
${sourceContext}
Produce exactly 4 SPARK QUESTIONS that would help Mina write a short blog post about this topic.
Rules:
- Each spark = ONE question. Sharp. Specific. Not generic ("what is X?" is banned).
- At least one spark should reference a memory, a body sensation, or a concrete object.
- At least one spark should poke at a tension or stance.
- At most one spark may invite a riff on a hlexicon by name (use the literal term).
- No preamble. No numbering. One spark per line. End each with a question mark.`;
}

export async function streamSparks(
  topic: RolledTopic,
  onFirstChunk?: () => void
): Promise<{ sparks: string[]; raw: string }> {
  const cfg = getAIConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });

  const result = streamText({
    model: provider(ROLL_MODEL),
    system: loadVoice(),
    prompt: buildSparkPrompt(topic),
    temperature: cfg.temperature,
    providerOptions: ROLL_PROVIDER_OPTIONS,
  });

  let raw = "";
  let started = false;
  for await (const chunk of result.textStream) {
    if (!started) {
      // First chunk arrived — kill the spinner exactly here so it can't race
      // with the streamed output. The orchestrator passes its spinner.stop().
      onFirstChunk?.();
      started = true;
    }
    process.stdout.write(chunk);
    raw += chunk;
  }
  process.stdout.write("\n");

  const sparks = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-*0-9.()]+/, "").trim())
    .filter((l) => l.endsWith("?"))
    .slice(0, 5);

  return { sparks, raw };
}
