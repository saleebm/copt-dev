#!/usr/bin/env bun
/**
 * Post Scaffolding CLI
 * Creates new posts with AI-generated outlines (model configured via AI_MODEL env var)
 */

import {
  displayHelp,
  parseCliArguments,
  validateCliArguments,
} from "./lib/cli-parser";
import { resolveApiKey } from "./lib/ai-config";
import { AIServiceFactory } from "./lib/services/ai-service";
import { DatabaseServiceFactory } from "./lib/services/database-service";
import { FileServiceFactory } from "./lib/services/file-service";
import { InteractiveServiceFactory } from "./lib/services/interactive-service";
import {
  type PostScaffoldRequest,
  PostScaffoldServiceFactory,
} from "./lib/services/post-scaffold-service";

async function main(): Promise<void> {
  try {
    // Parse command-line arguments
    const args = parseCliArguments();

    // Show help if requested
    if (args.help) {
      displayHelp();
      return;
    }

    // Validate arguments
    const validationErrors = validateCliArguments(args);
    if (validationErrors.length > 0) {
      console.error("❌ Validation errors:");
      validationErrors.forEach((error) => console.error(`   ${error}`));
      console.error("\nUse --help for usage information.");
      process.exit(1);
    }

    const apiKey = resolveApiKey();
    if (args.outline && !apiKey) {
      console.warn(
        "⚠️  No API key found. AI outline generation will be disabled."
      );
      console.warn(
        "   Set GEMINI_API_KEY environment variable to enable (see .env.example)."
      );
    }

    // Initialize services
    const aiService = AIServiceFactory.create(apiKey);
    const databaseService = DatabaseServiceFactory.create();
    const fileService = FileServiceFactory.create();
    const interactiveService =
      InteractiveServiceFactory.create(databaseService);

    const scaffoldService = PostScaffoldServiceFactory.create(
      aiService,
      databaseService,
      fileService,
      interactiveService
    );

    console.log("🚀 Post Scaffolding CLI\n");

    let result;

    if (args.interactive) {
      // Interactive mode
      result = await scaffoldService.scaffoldInteractively();
    } else {
      // Command-line mode
      if (!args.title) {
        console.error("❌ Title is required in non-interactive mode.");
        console.error("Use --interactive flag or provide a title.");
        process.exit(1);
      }

      const request: PostScaffoldRequest = {
        title: args.title,
        type: args.type || "BLOG",
        category: args.category,
        tags: args.tags || [],
        template: args.template || "minimal",
        generateOutline: args.outline ?? false,
        dryRun: args.dryRun,
        verbose: args.verbose,
      };

      result = await scaffoldService.scaffoldPost(request);
    }

    // Handle result
    if (result.success) {
      if (!args.dryRun) {
        console.log("\n✅ Post scaffolded successfully!");
        console.log(`📁 File created: ${result.filePath}`);

        if (result.metadata) {
          console.log(
            `📊 Stats: ${result.metadata.wordsGenerated} words, ${result.metadata.processingTime}ms`
          );
          if (result.metadata.outlineGenerated) {
            console.log("🤖 AI outline included");
          }
        }

        console.log("\n💡 Next steps:");
        console.log("   1. Edit the generated content");
        console.log("   2. Run: bun run db:sync-posts");
        console.log("   3. Start writing!");
      }
    } else {
      console.error(`\n❌ Failed to create post: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "\n❌ Unexpected error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    // Cleanup resources
    process.exit(0);
  }
}

// Handle process signals for graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Cancelled by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Terminated");
  process.exit(0);
});

// Run the main function if this script is executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
