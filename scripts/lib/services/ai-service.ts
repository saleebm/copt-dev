/**
 * AI Service - Interface and implementation for AI outline generation
 * Follows Interface Segregation Principle
 */

import { GoogleGenAI } from "@google/genai";
import type { PostType } from "@/lib/generated/prisma";
import { getAIConfig } from "../ai-config";
import { getPromptContext } from "../post-type-meta";

export type AIOutlineRequest = {
  title: string;
  type: PostType;
  category?: string;
  detailLevel?: "basic" | "detailed" | "comprehensive";
};

export type AIOutlineResponse = {
  outline: string;
  tokensUsed?: number;
  processingTime: number;
};

export type AIService = {
  generateOutline(request: AIOutlineRequest): Promise<AIOutlineResponse>;
  isAvailable(): boolean;
};

/**
 * Gemini AI Service Implementation
 */
export class GeminiAIService implements AIService {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly temperature: number;
  constructor(apiKey: string) {
    const config = getAIConfig(apiKey);
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.temperature = config.temperature;
  }

  async generateOutline(request: AIOutlineRequest): Promise<AIOutlineResponse> {
    const startTime = Date.now();

    try {
      const prompt = this.createPrompt(request);

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          temperature: this.temperature,
        },
      });

      if (!response.text) {
        throw new Error("No outline generated from AI service");
      }

      const processingTime = Date.now() - startTime;

      return {
        outline: this.formatOutline(response.text),
        processingTime,
      };
    } catch (error) {
      throw new Error(
        `AI outline generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  isAvailable(): boolean {
    return Boolean(this.client);
  }

  private createPrompt(request: AIOutlineRequest): string {
    const { title, type, category, detailLevel = "detailed" } = request;

    const baseContext = `You are helping create an outline for a ${type.toLowerCase()} post titled "${title}".`;

    const typeContext = getPromptContext(type);
    const categoryContext = category
      ? `The post is categorized under "${category}".`
      : "";
    const detailContext = this.getDetailContext(detailLevel);

    const instructions = `
Create a ${detailLevel} hierarchical outline using markdown headers (##, ###, ####) that:

1. Provides a logical flow of ideas
2. Includes key points and sub-points  
3. Suggests specific areas to explore
4. Maintains consistency with the ${type.toLowerCase()} post format
5. Uses proper markdown formatting

${detailContext}

Format the response as clean markdown with proper header hierarchy.`;

    return `${baseContext} ${typeContext} ${categoryContext}\n\n${instructions}`;
  }

  private getDetailContext(level: string): string {
    switch (level) {
      case "basic":
        return "Keep the outline concise with 3-5 main sections and minimal subsections.";
      case "comprehensive":
        return "Create a thorough outline with detailed subsections, supporting points, and suggested research areas.";
      default:
        return "Provide a balanced outline with clear main sections and relevant subsections.";
    }
  }

  private formatOutline(rawOutline: string): string {
    // Clean up the outline and ensure proper formatting
    let formatted = rawOutline
      .replace(/^```markdown\s*/, "") // Remove markdown code block start
      .replace(/\s*```$/, "") // Remove markdown code block end
      .trim();

    // Ensure proper spacing between sections
    formatted = formatted.replace(/\n(?=##)/g, "\n\n");

    // Add header comment
    const header = "<!-- AI-Generated Outline - Edit as needed -->\n\n";

    return header + formatted;
  }
}

/**
 * Mock AI Service for testing and fallback
 */
export class MockAIService implements AIService {
  async generateOutline(request: AIOutlineRequest): Promise<AIOutlineResponse> {
    const startTime = Date.now();

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    const outline = this.createMockOutline(request);
    const processingTime = Date.now() - startTime;

    return {
      outline,
      processingTime,
    };
  }

  isAvailable(): boolean {
    return true;
  }

  private createMockOutline(request: AIOutlineRequest): string {
    return `<!-- Mock AI-Generated Outline -->

## Introduction

*Set the stage for your ${request.type.toLowerCase()} post about "${request.title}".*

## Main Content

*Your primary content goes here.*

## Key Points

*Highlight the most important aspects.*

## Conclusion

*Wrap up your thoughts and provide takeaways.*`;
  }
}

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
  static create(apiKey?: string): AIService {
    if (apiKey) {
      return new GeminiAIService(apiKey);
    }

    // Fallback to mock service if no API key
    return new MockAIService();
  }
}
