/**
 * Post Scaffolding Service - Main orchestrator
 * Follows Dependency Inversion and Single Responsibility Principles
 */

import type { PostType } from "@/lib/generated/prisma";
import {
  createPostTemplate,
  createTemplateVariation,
} from "../scaffold-templates";
import type { PostTemplateConfig, ScaffoldResult } from "../scaffold-types";

import type { AIService } from "./ai-service";
import type { DatabaseService } from "./database-service";
import type { FileService } from "./file-service";
import type { InteractiveService } from "./interactive-service";

export type PostScaffoldRequest = {
  title: string;
  type: PostType;
  category?: string;
  tags: string[];
  template: string;
  generateOutline: boolean;
  dryRun?: boolean;
  verbose?: boolean;
};

export type PostScaffoldService = {
  scaffoldPost(request: PostScaffoldRequest): Promise<ScaffoldResult>;
  scaffoldInteractively(): Promise<ScaffoldResult>;
};

/**
 * Main Post Scaffolding Service Implementation
 */
export class MainPostScaffoldService implements PostScaffoldService {
  constructor(
    private readonly aiService: AIService,
    readonly _databaseService: DatabaseService,
    private readonly fileService: FileService,
    private readonly interactiveService: InteractiveService
  ) {}

  async scaffoldPost(request: PostScaffoldRequest): Promise<ScaffoldResult> {
    const startTime = Date.now();

    try {
      if (request.verbose) {
        console.log("🏗️  Starting post scaffolding...");
        console.log(`📋 Title: ${request.title}`);
        console.log(`📂 Type: ${request.type}`);
        console.log(`🏷️  Category: ${request.category || "None"}`);
        console.log(`🏷️  Tags: ${request.tags.join(", ") || "None"}`);
        console.log(`📄 Template: ${request.template}`);
        console.log(`🤖 AI Outline: ${request.generateOutline ? "Yes" : "No"}`);
      }

      // Generate file path
      const filePath = this.fileService.generateFilePath(
        request.title,
        request.type,
        request.category
      );

      if (request.verbose) {
        console.log(`📁 Output: ${filePath}`);
      }

      // Create template configuration
      const templateConfig: PostTemplateConfig = {
        title: request.title,
        type: request.type,
        category: request.category,
        tags: request.tags,
        date: new Date().toISOString().split("T")[0],
        status: "DRAFT",
        published: false,
      };

      // Generate content
      let content = this.generateContent(templateConfig, request.template);

      // Generate AI outline if requested
      let outlineGenerated = false;
      if (request.generateOutline && this.aiService.isAvailable()) {
        try {
          if (request.verbose) {
            console.log("🤔 Generating AI outline...");
          }

          const outlineResponse = await this.aiService.generateOutline({
            title: request.title,
            type: request.type,
            category: request.category,
            detailLevel: this.getDetailLevel(request.template),
          });

          content = content.replace(
            "<!-- AI-generated outline will be inserted here -->",
            outlineResponse.outline
          );

          outlineGenerated = true;

          if (request.verbose) {
            console.log(
              `✨ AI outline generated in ${outlineResponse.processingTime}ms`
            );
          }
        } catch (error) {
          console.warn(
            "⚠️  Failed to generate AI outline:",
            error instanceof Error ? error.message : String(error)
          );
          content = content.replace(
            "<!-- AI-generated outline will be inserted here -->",
            "*Add your outline here or start writing directly.*"
          );
        }
      } else {
        content = content.replace(
          "<!-- AI-generated outline will be inserted here -->",
          "*Add your outline here or start writing directly.*"
        );
      }

      // Create file (or dry run)
      if (request.dryRun) {
        console.log("\n📄 Generated content (dry run):");
        console.log("=".repeat(50));
        console.log(content);
        console.log("=".repeat(50));

        return {
          success: true,
          filePath,
          metadata: {
            wordsGenerated: content.split(/\s+/).length,
            outlineGenerated,
            processingTime: Date.now() - startTime,
          },
        };
      }

      const fileResult = await this.fileService.createFile({
        content,
        filePath,
        overwrite: false,
      });

      if (!fileResult.success) {
        return {
          success: false,
          error: fileResult.error,
          filePath,
        };
      }

      return {
        success: true,
        filePath: fileResult.filePath,
        metadata: {
          wordsGenerated: content.split(/\s+/).length,
          outlineGenerated,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath: "",
      };
    }
  }

  async scaffoldInteractively(): Promise<ScaffoldResult> {
    try {
      const inputs = await this.interactiveService.collectInputs();

      const request: PostScaffoldRequest = {
        title: inputs.title,
        type: inputs.type,
        category: inputs.category,
        tags: inputs.tags,
        template: inputs.template,
        generateOutline: inputs.generateOutline,
        verbose: true,
      };

      return await this.scaffoldPost(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath: "",
      };
    }
  }

  private generateContent(
    config: PostTemplateConfig,
    template: string
  ): string {
    if (template === "minimal") {
      return createPostTemplate(config);
    }

    try {
      return createTemplateVariation(config, template as any);
    } catch (_error) {
      console.warn(
        `⚠️  Invalid template "${template}", falling back to minimal`
      );
      return createPostTemplate(config);
    }
  }

  private getDetailLevel(
    template: string
  ): "basic" | "detailed" | "comprehensive" {
    switch (template) {
      case "minimal":
        return "basic";
      case "academic":
      case "detailed":
        return "comprehensive";
      default:
        return "detailed";
    }
  }
}

/**
 * Factory for creating post scaffold service instances
 */
export class PostScaffoldServiceFactory {
  static create(
    aiService: AIService,
    databaseService: DatabaseService,
    fileService: FileService,
    interactiveService: InteractiveService
  ): PostScaffoldService {
    return new MainPostScaffoldService(
      aiService,
      databaseService,
      fileService,
      interactiveService
    );
  }
}
