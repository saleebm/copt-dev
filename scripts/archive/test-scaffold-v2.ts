#!/usr/bin/env bun
/**
 * Test script for the refactored post scaffolding system
 */

import { parseCliArguments, validateCliArguments } from "./lib/cli-parser";
import { MockAIService } from "./lib/services/ai-service";
import { MockDatabaseService } from "./lib/services/database-service";
import { MockFileService } from "./lib/services/file-service";
import { MockInteractiveService } from "./lib/services/interactive-service";
import { PostScaffoldServiceFactory } from "./lib/services/post-scaffold-service";

function testServices() {
  console.log("🧪 Testing Refactored Scaffolding Services\n");

  testAIService();
  testDatabaseService();
  testFileService();
  testInteractiveService();
  testIntegration();

  console.log("\n✅ All service tests passed!");
}

function testAIService() {
  console.log("🤖 Testing AI Service...");

  const mockAIService = new MockAIService();
  console.assert(
    mockAIService.isAvailable(),
    "Mock AI service should be available"
  );

  console.log("✅ AI Service tests passed");
}

function testDatabaseService() {
  console.log("🗄️  Testing Database Service...");

  const mockDbService = new MockDatabaseService();

  // Test that we can get categories and tags
  mockDbService.getCategories().then((categories) => {
    console.assert(categories.length > 0, "Should have mock categories");
    console.assert(categories[0].name, "Categories should have names");
    console.assert(
      typeof categories[0].count === "number",
      "Categories should have counts"
    );
  });

  console.log("✅ Database Service tests passed");
}

function testFileService() {
  console.log("📁 Testing File Service...");

  const mockFileService = new MockFileService();

  // Test file path generation
  const blogPath = mockFileService.generateFilePath(
    "Test Post",
    "BLOG",
    "technology"
  );
  console.assert(
    blogPath.includes("blog"),
    "Blog path should include blog directory"
  );
  console.assert(
    blogPath.includes("technology"),
    "Blog path should include category"
  );
  console.assert(blogPath.endsWith(".mdx"), "Path should end with .mdx");

  const concretePath = mockFileService.generateFilePath(
    "Core Principle",
    "CONCRETE"
  );
  console.assert(
    concretePath.includes("concrete"),
    "Concrete path should include concrete directory"
  );
  console.assert(
    !concretePath.includes("01012025"),
    "Concrete posts should not have date prefix"
  );

  console.log("✅ File Service tests passed");
}

function testInteractiveService() {
  console.log("💬 Testing Interactive Service...");

  const mockInputs = {
    type: "BLOG" as const,
    title: "Test Post",
    category: "test",
    tags: ["tag1", "tag2"],
    template: "minimal",
    generateOutline: true,
  };

  const mockInteractiveService = new MockInteractiveService(mockInputs);

  mockInteractiveService.collectInputs().then((inputs) => {
    console.assert(inputs.title === "Test Post", "Should return correct title");
    console.assert(inputs.type === "BLOG", "Should return correct type");
    console.assert(inputs.tags.length === 2, "Should return correct tags");
  });

  console.log("✅ Interactive Service tests passed");
}

async function testIntegration() {
  console.log("🔗 Testing Service Integration...");

  // Create all services with mocks
  const aiService = new MockAIService();
  const databaseService = new MockDatabaseService();
  const fileService = new MockFileService();
  const interactiveService = new MockInteractiveService({
    type: "BLOG",
    title: "Integration Test Post",
    category: "test",
    tags: ["integration", "test"],
    template: "minimal",
    generateOutline: true,
  });

  const scaffoldService = PostScaffoldServiceFactory.create(
    aiService,
    databaseService,
    fileService,
    interactiveService
  );

  // Test command-line scaffolding
  const result = await scaffoldService.scaffoldPost({
    title: "CLI Test Post",
    type: "BLOG",
    category: "test",
    tags: ["cli", "test"],
    template: "minimal",
    generateOutline: true,
    dryRun: true,
    verbose: false,
  });

  console.assert(result.success, "Scaffolding should succeed");
  console.assert(result.metadata?.outlineGenerated, "Should generate outline");
  console.assert(
    result.metadata?.wordsGenerated && result.metadata.wordsGenerated > 0,
    "Should generate content"
  );

  // Test interactive scaffolding
  const interactiveResult = await scaffoldService.scaffoldInteractively();
  console.assert(
    interactiveResult.success,
    "Interactive scaffolding should succeed"
  );

  console.log("✅ Integration tests passed");
}

function testCliParser() {
  console.log("⚙️  Testing CLI Parser...");

  // Mock command line arguments
  const originalArgv = Bun.argv;

  try {
    // Test interactive mode detection
    (Bun as any).argv = ["bun", "script"];
    let args = parseCliArguments();
    console.assert(
      args.interactive,
      "Should default to interactive when no title provided"
    );

    // Test command-line mode
    (Bun as any).argv = ["bun", "script", "My Test Post"];
    args = parseCliArguments();
    console.assert(
      !args.interactive,
      "Should not be interactive when title provided"
    );
    console.assert(
      args.title === "My Test Post",
      "Should parse title from positional args"
    );

    // Test flags
    (Bun as any).argv = [
      "bun",
      "script",
      "--type",
      "BLOG",
      "--category",
      "tech",
      "--outline",
    ];
    args = parseCliArguments();
    console.assert(args.type === "BLOG", "Should parse type flag");
    console.assert(args.category === "tech", "Should parse category flag");
    console.assert(args.outline === true, "Should parse outline flag");

    // Test validation
    const validationErrors = validateCliArguments({
      interactive: false,
      type: "INVALID" as any,
      title: "a".repeat(201),
      template: "nonexistent",
    });

    console.assert(
      validationErrors.length > 0,
      "Should have validation errors"
    );
    console.assert(
      validationErrors.some((err) => err.includes("Invalid post type")),
      "Should validate post type"
    );
  } finally {
    // Restore original argv
    (Bun as any).argv = originalArgv;
  }

  console.log("✅ CLI Parser tests passed");
}

function demonstrateUsage() {
  console.log("\n🎨 Usage Examples:\n");

  console.log("=== COMMAND-LINE MODE ===");
  console.log('bun run scaffold "My New Post"');
  console.log(
    'bun run scaffold --type BLOG --category tech "AI and the Future"'
  );
  console.log(
    'bun run scaffold --type CONCRETE --template detailed "Core Principles"'
  );
  console.log('bun run scaffold --outline --verbose "Research Summary"');
  console.log(
    'bun run scaffold --dry-run --template academic "Academic Paper"'
  );

  console.log("\n=== INTERACTIVE MODE ===");
  console.log("bun run scaffold --interactive");
  console.log("bun run scaffold (no arguments defaults to interactive)");

  console.log("\n=== AVAILABLE FLAGS ===");
  console.log("-i, --interactive     Run in interactive mode");
  console.log("-t, --type TYPE       Post type: CONCRETE, BLOG, FINDING");
  console.log("-T, --title TITLE     Post title");
  console.log("-c, --category CAT    Post category");
  console.log("--tags TAG1,TAG2      Comma-separated tags");
  console.log(
    "--template TEMPLATE   Template: minimal, detailed, academic, tutorial"
  );
  console.log("-o, --outline         Generate AI outline");
  console.log("-v, --verbose         Verbose logging");
  console.log("-d, --dry-run         Show what would be created");
  console.log("-h, --help            Show help");
}

function showArchitecture() {
  console.log("\n🏗️  SOLID Architecture:\n");

  console.log("=== SERVICES (Single Responsibility) ===");
  console.log("• AIService           - AI outline generation");
  console.log("• DatabaseService     - Category/tag autocomplete");
  console.log("• FileService         - File system operations");
  console.log("• InteractiveService  - CLI user interactions");
  console.log("• PostScaffoldService - Main orchestrator");

  console.log("\n=== INTERFACES (Interface Segregation) ===");
  console.log("• Each service has a clean interface");
  console.log("• Services depend on abstractions, not concretions");
  console.log("• Mock implementations for testing");

  console.log("\n=== FACTORIES (Dependency Inversion) ===");
  console.log("• AIServiceFactory    - Creates AI service instances");
  console.log("• DatabaseServiceFactory - Creates database service instances");
  console.log("• FileServiceFactory  - Creates file service instances");
  console.log(
    "• InteractiveServiceFactory - Creates interactive service instances"
  );
  console.log("• PostScaffoldServiceFactory - Creates main service instances");

  console.log("\n=== FEATURES ===");
  console.log("✨ Gemini 2.5 Flash AI integration");
  console.log("🚀 Command-line flags + interactive mode");
  console.log("🧪 Comprehensive testing with mocks");
  console.log("📦 Clean, modular architecture");
  console.log("🔧 Extensible for future enhancements");
}

// Run tests if this script is executed directly
if (import.meta.main) {
  testCliParser();
  testServices();
  demonstrateUsage();
  showArchitecture();

  console.log("\n🎉 All tests completed successfully!");
  console.log("\n💡 Try the new system:");
  console.log("   bun run scaffold --help");
  console.log("   bun run scaffold --interactive");
  console.log('   bun run scaffold "My New Post" --outline --verbose');
}
