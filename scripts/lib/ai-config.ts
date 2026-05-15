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
// YouTube ingest needs a model that supports fileData YouTube URIs. Preview
// models (e.g. gemini-3.1-pro-preview) routinely return INVALID_ARGUMENT for
// YouTube fileData, so we pin a known-good default and let env override.
const DEFAULT_YOUTUBE_MODEL = "gemini-2.5-pro";

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

export function getYouTubeModel(): string {
  return process.env.YOUTUBE_AI_MODEL ?? DEFAULT_YOUTUBE_MODEL;
}

export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_YOUTUBE_MODEL,
};
