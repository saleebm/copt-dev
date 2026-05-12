import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { getAIConfig } from "../../lib/ai-config";
import type { RolledTopic, SparkAnswer } from "./types";
import { loadVoice } from "./voice";

function buildReshapePrompt(
  topic: RolledTopic,
  answers: SparkAnswer[]
): string {
  const hlexiconList = topic.relatedHlexicons
    .map((h) => `{{${h.term}|${h.definition}}}`)
    .join("\n");

  const freewrite = answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a) => `Q: ${a.spark}\nA: ${a.answer}`)
    .join("\n\n");

  return `TOPIC: ${topic.title}  (lane: ${topic.lane}, source: "${topic.sourceTitle}")

MINA'S FREE-WRITE:
${freewrite}

AVAILABLE HLEXICONS (use 0–2 where they fit naturally, exact syntax shown — never invent your own):
${hlexiconList}

TASK: Reshape Mina's free-write into a short draft blog post in his voice.
- Length: 250–500 words. Tight.
- Open with a single concrete sentence, not a thesis.
- Preserve his exact specifics (objects, memories, names, code). Don't generalize them away.
- Use markdown. Use a single H1 at the top with the topic. Sub-sections are optional.
- Where natural, embed at most 2 of the hlexicons above by copy-pasting the literal \`{{term|definition}}\` syntax. If none fit, use zero — don't force them.
- No "in conclusion". No "ultimately". No summary paragraph. Stop when it stops.
- Write in first person. The "I" is Mina, not you.

Output ONLY the MDX body (no frontmatter, no fences).`;
}

export async function streamReshape(
  topic: RolledTopic,
  answers: SparkAnswer[],
  onFirstChunk?: () => void
): Promise<string> {
  const cfg = getAIConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });

  const result = streamText({
    model: provider(cfg.model),
    system: loadVoice(),
    prompt: buildReshapePrompt(topic, answers),
    temperature: cfg.temperature,
  });

  let captured = "";
  let started = false;
  for await (const chunk of result.textStream) {
    if (!started) {
      onFirstChunk?.();
      started = true;
    }
    process.stdout.write(chunk);
    captured += chunk;
  }
  process.stdout.write("\n");
  return captured.trim();
}
