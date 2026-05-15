// Thin REST client for Gemini's generateContent endpoint, used only by the
// YouTube chunked-evidence path. We bypass the AI SDK here because its Google
// provider does not pass `videoMetadata.startOffset/endOffset` through for
// fileData parts — that field is what lets us clip a YouTube URL to a time
// range and stay under the 1M-token input limit on long videos.
//
// We deliberately keep this surface tiny: one function, one shape. The
// non-video parts of the pipeline (merge, structuring) still go through the
// AI SDK like the rest of the codebase.
//
// Docs:
//   https://ai.google.dev/api/generate-content
//   https://ai.google.dev/gemini-api/docs/video-understanding#youtube

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiVideoClipRequest = {
  apiKey: string;
  model: string;
  videoUri: string;
  prompt: string;
  // Inclusive start / exclusive end, in seconds. Both required for a chunk.
  startSeconds: number;
  endSeconds: number;
  // Gemini accepts "default" or "low". Low cuts tokens ~3x at small quality
  // cost; we use it on retry when a chunk overflows the input window.
  mediaResolution?: "default" | "low";
  temperature?: number;
};

export type GeminiVideoClipResponse = {
  text: string;
  raw: unknown;
};

type GeminiPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: unknown;
};

function formatOffset(seconds: number): string {
  // Gemini expects Google protobuf Duration string: "<seconds>s".
  // Fractional values are allowed but we clamp to whole seconds.
  const safe = Math.max(0, Math.floor(seconds));
  return `${safe}s`;
}

export class GeminiRestError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
    public requestUrl: string
  ) {
    super(message);
    this.name = "GeminiRestError";
  }
}

export async function generateContentForVideoClip(
  request: GeminiVideoClipRequest
): Promise<GeminiVideoClipResponse> {
  const url = `${API_BASE}/models/${encodeURIComponent(request.model)}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: request.prompt },
          {
            fileData: {
              // YouTube URIs are not mp4 — use the generic wildcard. Sending
              // "video/mp4" here trips INVALID_ARGUMENT.
              mimeType: "video/*",
              fileUri: request.videoUri,
            },
            videoMetadata: {
              startOffset: formatOffset(request.startSeconds),
              endOffset: formatOffset(request.endSeconds),
            },
          },
        ],
      },
    ],
    generationConfig: {
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.mediaResolution === "low"
        ? { mediaResolution: "MEDIA_RESOLUTION_LOW" }
        : {}),
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": request.apiKey,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new GeminiRestError(
      `Gemini ${response.status}: ${rawText.slice(0, 500)}`,
      response.status,
      rawText,
      url
    );
  }

  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(rawText) as GeminiResponse;
  } catch {
    throw new GeminiRestError(
      `Gemini returned non-JSON body`,
      response.status,
      rawText,
      url
    );
  }

  const text =
    parsed.candidates
      ?.flatMap((c) => c.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new GeminiRestError(
      `Gemini returned empty text for clip ${request.startSeconds}-${request.endSeconds}`,
      response.status,
      rawText,
      url
    );
  }

  return { text, raw: parsed };
}
