/**
 * Shared AI configuration — single source of truth for env vars, model defaults, and API key resolution.
 * All AI scripts import from here instead of hardcoding env lookups or model names.
 */

export type AIConfig = {
  apiKey: string;
  model: string;
  temperature: number;
  embeddingModel: string;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

export function resolveApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  );
}

export function requireApiKey(): string {
  const key = resolveApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable required (see .env.example)"
    );
  }
  return key;
}

export function getAIConfig(apiKeyOverride?: string): AIConfig {
  const apiKey = apiKeyOverride ?? requireApiKey();
  return {
    apiKey,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
    temperature: Number(process.env.AI_TEMPERATURE ?? DEFAULT_TEMPERATURE),
    embeddingModel: process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
  };
}

export { DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_EMBEDDING_MODEL };
