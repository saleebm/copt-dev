#!/usr/bin/env bun

/**
 * USER PROMPT THAT TRIGGERED THIS IMPLEMENTATION:
 *
 * @claude you missed a huge point of the @rule-organization-implementation.md which requires ai analysis of all the existing rules.
 * Do not do this yourself. In fact, all of my instructions which you basically led in your will instead of obeying your duty
 * have to be redirected back to the one core duty which is the direction in the initial prompt file. It must implement the ai
 * analysis like stated. Use the claude code sdk types from the node modules after you update that to the latest version in order
 * to implement the AI categorization and organization of the rules as requested. At least the domains are ok though and better
 * than what I initially requested, but please do not hardcode ABSOLUTELY ANYTHING ELSE, instead do use programmatic approach
 * combined with the Claude Code sdk here https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk and use bun add to install
 * it so the script can use, ensuring absolute correct usage and local file access to each file in .ruler thats an md file for
 * analysis. Ensure this package is used and ABSOLUTELY DO NOT FALL BACK TO ANY OTHER PACKAGE. THE API KEY FOR CLAUDE IS ALREADY
 * SET AS ANTHROPIC_API_KEY in your env, so test out the script when you're done. Create the commit, focusing solely on the tasks
 * in this prompt. 🤟
 *
 * https://docs.claude.com/en/api/agent-sdk/typescript.md here is the documentation for the claude agent sdk
 */

import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Schema for extracted rules from AI analysis
export const ExtractedRuleSchema = z.object({
  rule: z.string(),
  summary: z.string(),
  usefulness_score: z.number().min(1).max(10),
  domain: z.string(),
  source_file: z.string(),
  source_path: z.string(), // Full path from repository root
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
});

export const ExtractedRulesSchema = z.object({
  rules: z.array(ExtractedRuleSchema),
});

// Schema for scored rules from AI analysis
export const ScoredRuleSchema = z.object({
  rule: z.string(),
  summary: z.string(),
  domain: z.string(),
  source_file: z.string(),
  source_path: z.string(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
  confidenceScore: z.number().min(0).max(10),
  relevanceScore: z.number().min(0).max(10),
  practicalityScore: z.number().min(0).max(10),
  overallScore: z.number().min(0).max(10),
  reasoning: z.string(),
  codebaseReferences: z.array(z.string()).optional(),
});

export const ScoredRulesSchema = z.object({
  scoredRules: z.array(ScoredRuleSchema),
});

// Define the tool for extracting rules - this allows Claude to respond with structured JSON
const extractRulesTool = tool(
  "extract_rules",
  "Extract and analyze rules from a documentation file",
  z.object({
    rules: z.array(
      z.object({
        rule: z.string(),
        summary: z.string(),
        usefulness_score: z.number().min(1).max(10),
        domain: z.string(),
        source_file: z.string(),
        source_path: z.string(),
        priority: z.enum(["Critical", "High", "Medium", "Low"]),
      })
    ),
  }).shape,
  async (args: { rules: any[] }) => {
    // The AI will use this tool to return structured data
    console.log(`✓ Tool called with ${args.rules.length} rules`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(args),
        },
      ],
    };
  }
);

// Define tool for scoring rules with codebase context
const scoreRulesTool = tool(
  "score_rules",
  "Score rules for a single domain based on codebase context",
  z.object({
    scoredRules: z.array(
      z.object({
        rule: z.string(),
        summary: z.string(),
        domain: z.string(),
        source_file: z.string(),
        source_path: z.string(),
        priority: z.enum(["Critical", "High", "Medium", "Low"]),
        confidenceScore: z.number().min(0).max(10),
        relevanceScore: z.number().min(0).max(10),
        practicalityScore: z.number().min(0).max(10),
        overallScore: z.number().min(0).max(10),
        reasoning: z.string(),
        codebaseReferences: z.array(z.string()).optional(),
      })
    ),
  }).shape,
  async (args: { scoredRules: any[] }) => {
    console.log(`✓ Tool called with ${args.scoredRules.length} scored rules`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(args),
        },
      ],
    };
  }
);

// Define tool for reorganizing rules
const reorganizeRulesTool = tool(
  "reorganize_rules",
  "Reorganize rules into domain-specific files",
  z.object({
    files: z.array(
      z.object({
        domain: z.string(),
        title: z.string(),
        priority: z.enum(["Critical", "High", "Medium"]),
        sections: z.array(
          z.object({
            header: z.string(),
            rules: z.array(
              z.object({
                summary: z.string(),
                do: z.array(z.string()),
                dont: z.array(z.string()),
                example: z
                  .object({
                    good: z.string(),
                    bad: z.string(),
                  })
                  .optional(),
              })
            ),
          })
        ),
        detailed_rules: z
          .array(
            z.object({
              path: z.string(),
              description: z.string(),
              when_to_view: z.string(),
            })
          )
          .optional(),
      })
    ),
  }).shape,
  async (args: { files: any[] }) => {
    console.log(`✓ Tool called with ${args.files.length} domain files`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(args),
        },
      ],
    };
  }
);

// Create MCP servers for our tools
export const extractionServer = createSdkMcpServer({
  name: "RuleExtractor",
  tools: [extractRulesTool],
});

export const scoringServer = createSdkMcpServer({
  name: "RuleScorer",
  tools: [scoreRulesTool],
});

export const reorganizationServer = createSdkMcpServer({
  name: "RuleReorganizer",
  tools: [reorganizeRulesTool],
});

// Schema for reorganized rule file
const RuleFileSchema = z.object({
  domain: z.string(),
  title: z.string(),
  priority: z.enum(["Critical", "High", "Medium"]),
  sections: z.array(
    z.object({
      header: z.string(),
      rules: z.array(
        z.object({
          summary: z.string(),
          do: z.array(z.string()),
          dont: z.array(z.string()),
          example: z.optional(
            z.object({
              good: z.string(),
              bad: z.string(),
            })
          ),
        })
      ),
    })
  ),
  detailed_rules: z.optional(
    z.array(
      z.object({
        path: z.string(),
        description: z.string(),
        when_to_view: z.string(),
      })
    )
  ),
});

export type ExtractedRule = z.infer<typeof ExtractedRuleSchema>;
export type ExtractedRules = z.infer<typeof ExtractedRulesSchema>;
export type ScoredRule = z.infer<typeof ScoredRuleSchema>;
export type ScoredRules = z.infer<typeof ScoredRulesSchema>;
export type RuleFile = z.infer<typeof RuleFileSchema>;

// Session management schemas for resumability
const SessionMetadataSchema = z.object({
  timestamp: z.string(),
  status: z.enum(["in_progress", "killed", "completed", "restored"]),
  lastStep: z.string(),
  pid: z.number(),
  startTime: z.string(),
  endTime: z.string().optional(),
});

const SessionProgressSchema = z.object({
  currentStep: z.number(),
  totalSteps: z.number(),
  steps: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "failed"]),
      timestamp: z.string().optional(),
      dataFile: z.string().optional(),
    })
  ),
});

type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
type SessionProgress = z.infer<typeof SessionProgressSchema>;

/**
 * SessionManager handles session persistence and restoration for resumable script execution.
 * It tracks progress, saves intermediate data, and allows recovery from killed sessions.
 */
class SessionManager {
  private readonly sessionDir = ".rule-extraction-sessions";
  private readonly currentDir = join(this.sessionDir, "current");
  private readonly previousDir = join(this.sessionDir, "previous");
  private readonly logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  /**
   * Initialize session management system and check for previous sessions
   */
  async initialize(): Promise<{ restored: boolean; data?: any }> {
    await mkdir(this.sessionDir, { recursive: true });

    // Check if there's an existing session
    const hasCurrentSession = await this.checkDirectoryExists(this.currentDir);

    if (hasCurrentSession) {
      const shouldRestore = await this.checkAndPromptForRestore();

      if (shouldRestore) {
        const restoredData = await this.restoreSession();
        return { restored: true, data: restoredData };
      }
      // Rotate current to previous before starting fresh
      await this.rotateSession();
    }

    // Start fresh session
    await this.createNewSession();
    return { restored: false };
  }

  /**
   * Check if directory exists
   */
  private async checkDirectoryExists(dir: string): Promise<boolean> {
    try {
      await access(dir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if previous session was killed and prompt user for restoration
   */
  private async checkAndPromptForRestore(): Promise<boolean> {
    try {
      const metadataPath = join(this.currentDir, "metadata.json");
      const metadataContent = await readFile(metadataPath, "utf-8");
      const metadata = SessionMetadataSchema.parse(JSON.parse(metadataContent));

      // Check if session was not completed
      if (metadata.status !== "completed") {
        console.log(`\n${"=".repeat(60)}`);
        console.log("⚠️  PREVIOUS SESSION DETECTED");
        console.log("=".repeat(60));
        console.log(`Session started: ${metadata.startTime}`);
        console.log(`Last step: ${metadata.lastStep}`);
        console.log(`Status: ${metadata.status}`);

        // Check if the process is still running (though unlikely)
        const isProcessRunning = await this.checkProcessRunning(metadata.pid);
        if (isProcessRunning) {
          console.log(`⚠️  Process ${metadata.pid} is still running!`);
          console.log("Cannot restore while process is active.");
          return false;
        }

        console.log("\nThis session appears to have been interrupted.");
        console.log("Would you like to restore from the previous checkpoint?");

        // Create readline interface for user input
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await rl.question("Restore previous session? [y/N]: ");
        rl.close();

        return answer.toLowerCase() === "y";
      }
    } catch (error) {
      await this.log(`Error reading session metadata: ${error}`);
    }

    return false;
  }

  /**
   * Check if a process is running
   */
  private async checkProcessRunning(pid: number): Promise<boolean> {
    try {
      // Try to send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Restore session from saved data
   */
  private async restoreSession(): Promise<any> {
    await this.log("Restoring session from checkpoint...");

    const progressPath = join(this.currentDir, "progress.json");
    const progressContent = await readFile(progressPath, "utf-8");
    const progress = SessionProgressSchema.parse(JSON.parse(progressContent));

    const restoredData: any = {
      progress,
      extractedRules: null,
      reorganizedRules: null,
    };

    // Load saved data based on completed steps
    for (const step of progress.steps) {
      if (step.status === "completed" && step.dataFile) {
        const dataPath = join(this.currentDir, step.dataFile);
        try {
          const data = await readFile(dataPath, "utf-8");
          if (step.name === "extractRules") {
            restoredData.extractedRules = JSON.parse(data);
          } else if (step.name === "reorganizeRules") {
            restoredData.reorganizedRules = JSON.parse(data);
          }
        } catch (error) {
          await this.log(
            `Warning: Could not load data for step ${step.name}: ${error}`
          );
        }
      }
    }

    // Update metadata to reflect restoration
    const metadataPath = join(this.currentDir, "metadata.json");
    const metadataContent = await readFile(metadataPath, "utf-8");
    const metadata = SessionMetadataSchema.parse(JSON.parse(metadataContent));
    metadata.status = "restored";
    metadata.pid = process.pid; // Update to current process
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    await this.log(
      `✅ Session restored. Resuming from step ${progress.currentStep}/${progress.totalSteps}`
    );

    return restoredData;
  }

  /**
   * Rotate current session to previous
   */
  private async rotateSession(): Promise<void> {
    await this.log("Rotating current session to previous...");

    // Remove old previous directory if exists
    if (await this.checkDirectoryExists(this.previousDir)) {
      await rm(this.previousDir, { recursive: true, force: true });
    }

    // Move current to previous
    await cp(this.currentDir, this.previousDir, { recursive: true });
    await rm(this.currentDir, { recursive: true, force: true });

    await this.log("✅ Previous session backed up");
  }

  /**
   * Create a new session
   */
  private async createNewSession(): Promise<void> {
    await mkdir(this.currentDir, { recursive: true });

    const metadata: SessionMetadata = {
      timestamp: new Date().toISOString(),
      status: "in_progress",
      lastStep: "initialization",
      pid: process.pid,
      startTime: new Date().toISOString(),
    };

    const progress: SessionProgress = {
      currentStep: 0,
      totalSteps: 5,
      steps: [
        { name: "extractRules", status: "pending" },
        { name: "reorganizeRules", status: "pending" },
        { name: "generateFiles", status: "pending" },
        { name: "createArchive", status: "pending" },
        { name: "generateSummary", status: "pending" },
      ],
    };

    await writeFile(
      join(this.currentDir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );
    await writeFile(
      join(this.currentDir, "progress.json"),
      JSON.stringify(progress, null, 2)
    );

    await this.log("✅ New session created");
  }

  /**
   * Save progress and data for a step
   */
  async saveStepData(stepName: string, data: any): Promise<void> {
    // Update progress
    const progressPath = join(this.currentDir, "progress.json");
    const progressContent = await readFile(progressPath, "utf-8");
    const progress = SessionProgressSchema.parse(JSON.parse(progressContent));

    const stepIndex = progress.steps.findIndex((s) => s.name === stepName);
    if (stepIndex !== -1) {
      const dataFileName = `${stepName}.json`;
      progress.steps[stepIndex].status = "completed";
      progress.steps[stepIndex].timestamp = new Date().toISOString();
      progress.steps[stepIndex].dataFile = dataFileName;
      progress.currentStep = stepIndex + 1;

      // Save the data
      await writeFile(
        join(this.currentDir, dataFileName),
        JSON.stringify(data, null, 2)
      );

      // Update progress
      await writeFile(progressPath, JSON.stringify(progress, null, 2));

      // Update metadata
      const metadataPath = join(this.currentDir, "metadata.json");
      const metadataContent = await readFile(metadataPath, "utf-8");
      const metadata = SessionMetadataSchema.parse(JSON.parse(metadataContent));
      metadata.lastStep = stepName;
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      await this.log(`💾 Saved checkpoint for step: ${stepName}`);
    }
  }

  /**
   * Mark session as completed
   */
  async completeSession(): Promise<void> {
    const metadataPath = join(this.currentDir, "metadata.json");
    const metadataContent = await readFile(metadataPath, "utf-8");
    const metadata = SessionMetadataSchema.parse(JSON.parse(metadataContent));

    metadata.status = "completed";
    metadata.endTime = new Date().toISOString();

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    await this.log("✅ Session marked as completed");
  }

  /**
   * Mark session as failed/killed on error
   */
  async markSessionKilled(error?: string): Promise<void> {
    try {
      const metadataPath = join(this.currentDir, "metadata.json");
      const metadataContent = await readFile(metadataPath, "utf-8");
      const metadata = SessionMetadataSchema.parse(JSON.parse(metadataContent));

      metadata.status = "killed";
      metadata.endTime = new Date().toISOString();

      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      await this.log(`⚠️ Session marked as killed${error ? `: ${error}` : ""}`);
    } catch (err) {
      // Best effort - don't throw if this fails
      console.error("Failed to mark session as killed:", err);
    }
  }

  /**
   * Get current progress
   */
  async getProgress(): Promise<SessionProgress> {
    const progressPath = join(this.currentDir, "progress.json");
    const progressContent = await readFile(progressPath, "utf-8");
    return SessionProgressSchema.parse(JSON.parse(progressContent));
  }

  /**
   * Log with file output
   */
  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [SESSION] ${message}\n`;
    console.log(`[SESSION] ${message}`);
    await writeFile(this.logFile, logMessage, { flag: "a" });
  }
}

// Claude Agent SDK uses environment variables automatically

// Domain mapping for files generated
const DOMAIN_FILE_MAP: Record<string, string> = {
  "nextjs-app": "01-nextjs-app.md",
  "state-management": "02-state-management.md",
  "ui-components": "03-ui-components.md",
  "data-pipeline": "04-data-pipeline.md",
  "development-workflow": "05-development-workflow.md",
  "type-safety": "06-type-safety.md",
  "code-quality": "07-code-quality.md",
  security: "08-security.md",
  documentation: "09-documentation.md",
  architecture: "10-architecture.md",
} as const;

async function createBackup(
  sourceDir: string,
  backupDir: string,
  logFile: string
): Promise<void> {
  try {
    // Check if source directory exists
    await stat(sourceDir);

    // Copy the entire directory recursively
    await cp(sourceDir, backupDir, { recursive: true });

    // Count files in backup
    const files = await readdir(backupDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    await log(logFile, `✅ Backup created at: ${backupDir}`);
    await log(
      logFile,
      `   Backed up ${mdFiles.length} .md files and ${files.length} total files`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(logFile, `❌ Backup failed: ${errorMessage}`);
    throw new Error(`Failed to create backup: ${errorMessage}`);
  }
}

async function main(): Promise<void> {
  // Check for TEST_MODE
  const TEST_MODE = process.env.TEST_MODE === "true";
  const OUTPUT_RULER_DIR =
    process.env.RULER_DIR || (TEST_MODE ? "test.ruler" : ".ruler");

  if (TEST_MODE) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("🧪 RUNNING IN TEST MODE (FAST MODE WITH HAIKU)");
    console.log("=".repeat(60));
    console.log("📁 Output Directory: test.ruler (NOT .ruler)");
    console.log("🤖 Using Haiku model for speed");
    console.log("✅ Your actual .ruler files are SAFE");
    console.log(`${"=".repeat(60)}\n`);
  } else {
    console.log(`\n${"=".repeat(60)}`);
    console.log("🚀 RUNNING IN PRODUCTION MODE");
    console.log("=".repeat(60));
    console.log("📁 Output Directory: .ruler (REAL FILES)");
    console.log("🤖 Using Sonnet model for quality");
    console.log("⚠️  This will modify your actual .ruler directory");
    console.log(`${"=".repeat(60)}\n`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = join("logs", `reduce-rules-${timestamp}.log`);
  const tempDir = ".rule-extraction-temp";
  const backupDir = join("backups", `ruler-backup-${timestamp}`);

  // Set the global log file
  globalLogFile = logFile;

  // Create directories - ensure test.ruler is created if in TEST_MODE
  await mkdir(tempDir, { recursive: true });
  await mkdir("logs", { recursive: true });
  await mkdir("docs/rule-archive", { recursive: true });
  await mkdir("backups", { recursive: true });

  if (TEST_MODE) {
    await mkdir(OUTPUT_RULER_DIR, { recursive: true });
  }

  // Start logging - now we can use the simpler signature
  await log(`Starting rule reduction at ${new Date().toISOString()}`);

  // Initialize session manager
  const sessionManager = new SessionManager(logFile);
  const { restored, data } = await sessionManager.initialize();

  // Set up signal handlers to mark session as killed on interruption
  const handleInterruption = async (signal: string) => {
    console.log(`\n⚠️ Received ${signal}, saving session state...`);
    await sessionManager.markSessionKilled(`Process interrupted by ${signal}`);
    process.exit(1);
  };

  process.on("SIGINT", () => handleInterruption("SIGINT"));
  process.on("SIGTERM", () => handleInterruption("SIGTERM"));

  let extractedRules: ExtractedRule[] = [];
  let reorganizedRules: RuleFile[] = [];
  let shouldCreateBackup = true;

  try {
    if (restored && data) {
      // Restored from previous session
      await log("\n=== RESTORED SESSION ===");
      const progress = data.progress;

      // Check what steps are already completed
      const extractStep = progress.steps.find(
        (s: any) => s.name === "extractRules"
      );
      const reorganizeStep = progress.steps.find(
        (s: any) => s.name === "reorganizeRules"
      );

      // Load previously processed data if available
      if (extractStep?.status === "completed" && data.extractedRules) {
        extractedRules = data.extractedRules;
        await log(
          `✅ Loaded ${extractedRules.length} previously extracted rules`
        );
        shouldCreateBackup = false; // Don't create backup if restoring
      }

      if (reorganizeStep?.status === "completed" && data.reorganizedRules) {
        reorganizedRules = data.reorganizedRules;
        await log(
          `✅ Loaded ${reorganizedRules.length} previously reorganized rule files`
        );
      }

      // Continue from where we left off
      await log(
        `Resuming from step ${progress.currentStep + 1}/${progress.totalSteps}`
      );
    }

    // Create backup of current .ruler folder (only if not restored)
    if (shouldCreateBackup) {
      await log("\n=== CREATING BACKUP ===");
      await createBackup(OUTPUT_RULER_DIR, backupDir, logFile);
    }

    // Step 1: Extract rules from all .ruler/*.md files using AI analysis
    if (extractedRules.length === 0) {
      await log(
        logFile,
        `\n=== STEP 1: Extracting rules from ${OUTPUT_RULER_DIR}/*.md files ===`
      );
      extractedRules = await extractRules(tempDir, logFile, OUTPUT_RULER_DIR);

      // Save checkpoint
      await sessionManager.saveStepData("extractRules", extractedRules);
    } else {
      await log(
        logFile,
        "\n=== STEP 1: Skipping extraction (already completed) ==="
      );
    }

    // Step 2: Reorganize rules into domains using AI
    if (reorganizedRules.length === 0) {
      await log(logFile, "\n=== STEP 2: Reorganizing rules by domain ===");
      reorganizedRules = await reorganizeRules(extractedRules, logFile);

      // Save checkpoint
      await sessionManager.saveStepData("reorganizeRules", reorganizedRules);
    } else {
      await log(
        logFile,
        "\n=== STEP 2: Skipping reorganization (already completed) ==="
      );
    }

    // Step 3: Generate final rule files
    await log(logFile, "\n=== STEP 3: Generating final rule files ===");
    await generateRuleFiles(reorganizedRules, logFile, OUTPUT_RULER_DIR);

    // Save checkpoint
    await sessionManager.saveStepData("generateFiles", { completed: true });

    // Step 4: Create archive file
    await log(logFile, "\n=== STEP 4: Creating archive file ===");
    await createArchiveFile(extractedRules, reorganizedRules, logFile);

    // Save checkpoint
    await sessionManager.saveStepData("createArchive", { completed: true });

    // Step 5: Generate summary
    await log(logFile, "\n=== STEP 5: Summary ===");
    await generateSummary(backupDir, extractedRules, reorganizedRules, logFile);

    // Save checkpoint
    await sessionManager.saveStepData("generateSummary", { completed: true });

    // Mark session as completed
    await sessionManager.completeSession();

    await log(
      logFile,
      `\n✅ Rule reduction completed successfully at ${new Date().toISOString()}`
    );
    console.log(`\n${"=".repeat(60)}`);
    console.log("✅ RULE REORGANIZATION COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(
      `📁 Backup saved to: ${shouldCreateBackup ? backupDir : "Using restored session"}`
    );
    console.log(`📋 Log file: ${logFile}`);
    console.log("📚 Archive: docs/rule-archive/archived-rules.md");
    console.log(`🎯 New rule files generated in: ${OUTPUT_RULER_DIR}/`);
    if (TEST_MODE) {
      console.log("✅ Your original .ruler files are UNTOUCHED");
    }
    console.log("=".repeat(60));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(logFile, `\n❌ Error: ${errorMessage}`);
    console.error(
      "\n❌ Rule reorganization failed. Check log file for details."
    );
    console.error(
      "💡 You can resume from the last checkpoint by running the script again."
    );

    // Mark session as killed so it can be restored
    await sessionManager.markSessionKilled(errorMessage);

    throw error;
  }
}

async function generateSummary(
  backupDir: string,
  extractedRules: ExtractedRule[],
  reorganizedRules: RuleFile[],
  logFile: string
): Promise<void> {
  const threshold = calculateDynamicThreshold(extractedRules);
  const highValueCount = extractedRules.filter(
    (r) => r.usefulness_score >= threshold
  ).length;
  const lowValueCount = extractedRules.filter(
    (r) => r.usefulness_score < threshold
  ).length;

  await log(logFile, "\nSummary:");
  await log(logFile, `- Total rules extracted: ${extractedRules.length}`);
  await log(logFile, `- Dynamic threshold used: ${threshold}`);
  await log(logFile, `- High-value rules: ${highValueCount}`);
  await log(logFile, `- Lower-priority rules archived: ${lowValueCount}`);
  await log(logFile, `- Domain files generated: ${reorganizedRules.length}`);
  await log(logFile, `- Backup location: ${backupDir}`);
}

async function extractRules(
  tempDir: string,
  logFile: string,
  rulerDir = ".ruler"
): Promise<ExtractedRule[]> {
  // Use provided rulerDir (can be .ruler or test.ruler)
  const files = await readdir(rulerDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const allExtractedRules: ExtractedRule[] = [];

  for (const file of mdFiles) {
    await log(logFile, `Processing ${file}...`);
    const content = await readFile(join(rulerDir, file), "utf-8");

    // Create extraction prompt for AI analysis
    const extractionPrompt = `
You have access to a tool called "extract_rules" that you MUST use to return your analysis.

Analyze the documentation file below and extract all individual rules, guidelines, and best practices.

For each rule found, determine:
- The complete rule text (preserve formatting)
- A one-line summary
- Usefulness score (1-10)
- Domain category
- Priority level

Call the extract_rules tool with your analysis. The tool expects:
- rules: an array of rule objects

Each rule object needs:
- rule: string (the complete rule text)
- summary: string (one-line summary)
- usefulness_score: number (1-10)
- domain: string (must be one of: nextjs-app, state-management, ui-components, data-pipeline, development-workflow, type-safety, code-quality, security, documentation, architecture)
- source_file: "${file}"
- source_path: "${rulerDir}/${file}"
- priority: string (must be one of: Critical, High, Medium, Low)

IMPORTANT: You MUST call the extract_rules tool. Do not return JSON as text - use the tool.

File to analyze:
${content}`;

    // Call Claude AI with retries for analysis
    const extractedData = await callClaudeWithRetry(
      extractionPrompt,
      3,
      logFile
    );

    // Validate and save
    try {
      const validated = ExtractedRulesSchema.parse(JSON.parse(extractedData));
      const outputPath = join(
        tempDir,
        `rule-set-${file.replace(".md", "")}.json`
      );
      await writeFile(outputPath, JSON.stringify(validated, null, 2));
      allExtractedRules.push(...validated.rules);
      await log(
        logFile,
        `✓ Extracted ${validated.rules.length} rules from ${file}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await log(
        logFile,
        `✗ Failed to parse rules from ${file}: ${errorMessage}`
      );
    }
  }

  return allExtractedRules;
}

function calculateDynamicThreshold(rules: ExtractedRule[]): number {
  // Calculate threshold based on score distribution
  const scores = rules.map((r) => r.usefulness_score).sort((a, b) => b - a);
  const totalRules = scores.length;

  if (totalRules === 0) {
    return 7;
  }

  // Keep top 30% of rules or minimum score of 7, whichever is lower
  const percentileIndex = Math.floor(totalRules * 0.3);
  const percentileScore = scores[percentileIndex] || 7;

  // Use minimum of 7 to ensure quality baseline
  const threshold = Math.min(7, percentileScore);

  return threshold;
}

async function scoreRulesByDomain(
  domain: string,
  rules: ExtractedRule[],
  logFile: string
): Promise<ScoredRule[]> {
  await log(logFile, `Scoring ${rules.length} rules for domain: ${domain}`);

  // Map domain to relevant codebase paths for context
  const domainCodebasePaths: Record<string, string[]> = {
    "nextjs-app": ["apps/web/app", "apps/web/components", "apps/web/public"],
    "state-management": [
      "lib/post-stack-machine.ts",
      "components/post-stack/post-stack-provider-xstate.tsx",
      "hooks",
    ],
    "ui-components": ["components", "packages/ui/src", "apps/web/components"],
    "data-pipeline": ["packages/database", "scripts/sync-posts.ts", "lib"],
    "development-workflow": ["scripts", "package.json", ".github", "bun.lockb"],
    "type-safety": ["tsconfig.json", "*.ts", "*.tsx"],
    "code-quality": [".eslintrc.js", ".prettierrc", "tests"],
    security: [".env.example", "middleware.ts", "apps/web/app/api"],
    documentation: ["docs", "README.md", "CLAUDE.md", ".ruler"],
    architecture: ["packages", "apps", "lib"],
  };

  const relevantPaths = domainCodebasePaths[domain] || [];

  // Read sample files from relevant paths for context
  const codebaseContext: string[] = [];
  for (const path of relevantPaths.slice(0, 3)) {
    // Limit to 3 files for context
    try {
      const fullPath = join(process.cwd(), path);
      const stats = await stat(fullPath).catch(() => null);

      if (stats?.isDirectory()) {
        const files = await readdir(fullPath).catch(() => []);
        const sampleFile = files.find(
          (f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".md")
        );
        if (sampleFile) {
          const content = await readFile(join(fullPath, sampleFile), "utf-8");
          codebaseContext.push(
            `File: ${path}/${sampleFile}\n${content.substring(0, 1000)}...`
          );
        }
      } else if (stats?.isFile()) {
        const content = await readFile(fullPath, "utf-8");
        codebaseContext.push(`File: ${path}\n${content.substring(0, 1000)}...`);
      }
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  // Create scoring prompt with codebase context
  const scoringPrompt = `
You have a tool called "score_rules" that you MUST use to return the scored rules.

Score these ${domain} rules based on their relevance to the actual codebase and practical value.
Consider the following criteria for each rule:

1. **Confidence Score (0-10)**: How certain are you about this scoring based on available context?
2. **Relevance Score (0-10)**: How relevant is this rule to the actual codebase patterns and structure?
3. **Practicality Score (0-10)**: How practical and immediately applicable is this rule?
4. **Overall Score (0-10)**: Weighted combination of all factors

Codebase Context for ${domain}:
${codebaseContext.join("\n\n---\n\n")}

Rules to score:
${JSON.stringify(rules, null, 2)}

Use the score_rules tool to return the results. The tool expects an object with a "scoredRules" array.
Each scored rule should include all the original fields plus:
- confidenceScore: your confidence in this scoring
- relevanceScore: relevance to the codebase
- practicalityScore: practical applicability
- overallScore: weighted average
- reasoning: brief explanation of the scores
- codebaseReferences: optional array of specific files/patterns that relate to this rule

IMPORTANT: You MUST use the score_rules tool, do not return JSON directly in text.
Score each rule individually based on its merit and the codebase context provided.
`;

  const scoredData = await callClaudeWithRetry(
    scoringPrompt,
    3,
    logFile,
    "scoring"
  );

  try {
    // Parse the response which may contain stringified JSON for the scoredRules array
    const parsedData = JSON.parse(scoredData);
    if (typeof parsedData.scoredRules === "string") {
      parsedData.scoredRules = JSON.parse(parsedData.scoredRules);
    }
    const validated = ScoredRulesSchema.parse(parsedData);
    await log(
      logFile,
      `✓ Scored ${validated.scoredRules.length} rules for ${domain}`
    );
    return validated.scoredRules;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(
      logFile,
      `✗ Failed to parse scored rules for ${domain}: ${errorMessage}`
    );
    // Fallback: convert ExtractedRules to ScoredRules with default scores
    return rules.map((rule) => ({
      ...rule,
      confidenceScore: 5,
      relevanceScore: 5,
      practicalityScore: 5,
      overallScore: 5,
      reasoning: "Default scoring due to parsing error",
      codebaseReferences: [],
    }));
  }
}

async function reorganizeRules(
  extractedRules: ExtractedRule[],
  logFile: string
): Promise<RuleFile[]> {
  const domains = [
    "nextjs-app",
    "state-management",
    "ui-components",
    "data-pipeline",
    "development-workflow",
    "type-safety",
    "code-quality",
    "security",
    "documentation",
    "architecture",
  ];

  // Step 1: Score rules by domain for better context-aware evaluation
  await log(logFile, "Scoring rules by domain with codebase context...");
  const allScoredRules: ScoredRule[] = [];

  for (const domain of domains) {
    const domainRules = extractedRules.filter((r) => r.domain === domain);
    if (domainRules.length > 0) {
      const scoredDomainRules = await scoreRulesByDomain(
        domain,
        domainRules,
        logFile
      );
      allScoredRules.push(...scoredDomainRules);
    }
  }

  // Step 2: Calculate dynamic threshold based on scored rules
  const overallScores = allScoredRules
    .map((r) => r.overallScore)
    .sort((a, b) => b - a);
  const totalRules = overallScores.length;

  if (totalRules === 0) {
    await log(logFile, "No rules to reorganize");
    return [];
  }

  // Keep top 30% of rules or minimum score of 7, whichever is lower
  const percentileIndex = Math.floor(totalRules * 0.3);
  const percentileScore = overallScores[percentileIndex] || 7;
  const threshold = Math.min(7, percentileScore);

  await log(
    logFile,
    `Using dynamic threshold: ${threshold} (based on ${totalRules} scored rules)`
  );

  // Step 3: Group scored rules by domain and filter by overall score
  const domainGroups: Record<string, ScoredRule[]> = {};
  const belowThreshold: Record<string, ScoredRule[]> = {};

  for (const domain of domains) {
    domainGroups[domain] = allScoredRules
      .filter((r) => r.domain === domain && r.overallScore >= threshold)
      .sort((a, b) => b.overallScore - a.overallScore);

    belowThreshold[domain] = allScoredRules
      .filter((r) => r.domain === domain && r.overallScore < threshold)
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  // Step 4: Create reorganization prompt with scored rules
  const reorganizationPrompt = `
You have a tool called "reorganize_rules" that you MUST use to return the reorganized rules.

Reorganize these rules into concise, actionable domain files. For each domain:
1. Combine similar/overlapping rules into clear guidance
2. Create concise DO/DON'T lists (max 3-4 items each)
3. Keep main content under 300 words
4. Focus on the MOST critical rules (top 20-30%)
5. Add references to detailed rule files for deeper guidance

For rules below threshold (lower priority), create a "Detailed Rules" section that references the original source files where users can find more specific guidance.

High-value rules (above threshold ${threshold}):
${JSON.stringify(domainGroups, null, 2)}

Lower-priority rules (below threshold) - create references only:
${JSON.stringify(belowThreshold, null, 2)}

Use the reorganize_rules tool to return the results. The tool expects an object with a "files" array.
Each file object should include:
- domain: the domain name
- title: descriptive title for the domain
- priority: Critical, High, or Medium
- sections: array of rule sections with headers and rules
- detailed_rules: references to original files for additional guidance

IMPORTANT: You MUST use the reorganize_rules tool, do not return JSON directly in text.

Example structure (but use the tool, don't return this as text):
The tool expects: { "files": [...array of domain file objects...] }

Each domain file should have sections with rules that include:
- summary: brief description
- do: array of things to do
- dont: array of things to avoid

And detailed_rules with:
- description: what's in the file
- files: array of { path: "...", when_to_view: "..." }

Create appropriate cross-references based on the actual rule content and domains. Group related detailed rules logically.
`;

  const reorganizedData = await callClaudeWithRetry(
    reorganizationPrompt,
    3,
    logFile,
    "reorganize"
  );
  const parsed = JSON.parse(reorganizedData);
  // The tool returns { files: [...] }, so extract the files array
  return (parsed.files || parsed) as RuleFile[];
}

async function generateRuleFiles(
  reorganizedRules: RuleFile[],
  logFile: string,
  rulerDir = ".ruler"
): Promise<void> {
  // SAFETY: Use test.ruler in TEST_MODE, .ruler otherwise
  for (const domainRules of reorganizedRules) {
    const fileName =
      DOMAIN_FILE_MAP[domainRules.domain as keyof typeof DOMAIN_FILE_MAP];
    if (!fileName) {
      await log(
        logFile,
        `Warning: No file mapping for domain ${domainRules.domain}`
      );
      continue;
    }

    const markdown = generateMarkdown(domainRules);
    const filePath = join(rulerDir, fileName);
    await writeFile(filePath, markdown);
    await log(logFile, `Generated ${fileName} in ${rulerDir}`);
  }
}

function generateMarkdown(domainRules: RuleFile): string {
  let md = `# ${domainRules.title}\n\n`;
  md += `Priority: ${domainRules.priority}\n\n`;

  // Main rule sections
  for (const section of domainRules.sections) {
    md += `## ${section.header}\n\n`;

    for (const rule of section.rules) {
      md += `**Rule**: ${rule.summary}\n`;

      if (rule.do.length > 0) {
        md += `- ✅ DO: ${rule.do.join("; ")}\n`;
      }

      if (rule.dont.length > 0) {
        md += `- ❌ DON'T: ${rule.dont.join("; ")}\n`;
      }

      if (rule.example) {
        md += `\n\`\`\`typescript\n// Good:\n${rule.example.good}\n\n// Bad:\n${rule.example.bad}\n\`\`\`\n`;
      }

      md += "\n";
    }
  }

  // Add detailed rules section if present
  if (domainRules.detailed_rules && domainRules.detailed_rules.length > 0) {
    md += "## Detailed Rules & References\n\n";
    md += "For more specific guidance, consult these detailed rule files:\n\n";

    for (const detailedRule of domainRules.detailed_rules) {
      md += `### ${detailedRule.path}\n`;
      md += `**Description**: ${detailedRule.description}\n`;
      md += `**When to view**: ${detailedRule.when_to_view}\n\n`;
    }
  }

  return md;
}

async function createArchiveFile(
  allRules: ExtractedRule[],
  reorganizedRules: RuleFile[],
  logFile: string
): Promise<void> {
  // Calculate threshold
  const threshold = calculateDynamicThreshold(allRules);

  // Find rules that didn't make it to the main files
  const includedRules = new Set<string>();
  reorganizedRules.forEach((domain) => {
    domain.sections.forEach((section) => {
      section.rules.forEach((rule) => {
        includedRules.add(rule.summary);
      });
    });
  });

  const archivedRules = allRules.filter(
    (r) => r.usefulness_score < threshold || !includedRules.has(r.summary)
  );

  // Group by domain and then source file
  const byDomain: Record<string, Record<string, ExtractedRule[]>> = {};
  archivedRules.forEach((rule) => {
    if (!byDomain[rule.domain]) {
      byDomain[rule.domain] = {};
    }
    if (!byDomain[rule.domain][rule.source_file]) {
      byDomain[rule.domain][rule.source_file] = [];
    }
    byDomain[rule.domain][rule.source_file].push(rule);
  });

  // Generate archive markdown with references
  let archiveMd = "# Archived Rules Reference\n\n";
  archiveMd += `> These are lower-priority rules (score < ${threshold}) organized by domain.\n`;
  archiveMd +=
    "> For high-priority rules, see the main domain files in .ruler/\n\n";

  archiveMd += "## Quick Navigation\n\n";
  archiveMd += "### Main Rule Files (High Priority)\n";
  Object.entries(DOMAIN_FILE_MAP).forEach(([domain, file]) => {
    archiveMd += `- **${domain}**: [.ruler/${file}](.ruler/${file})\n`;
  });
  archiveMd += "\n";

  archiveMd += "### Archived Rules by Domain\n\n";

  for (const [domain, sources] of Object.entries(byDomain)) {
    archiveMd += `## Domain: ${domain}\n\n`;

    for (const [source, rules] of Object.entries(sources)) {
      archiveMd += `### Source: ${source}\n`;
      archiveMd += `Original file: [${source}](.ruler/${source})\n\n`;

      for (const rule of rules.sort(
        (a, b) => b.usefulness_score - a.usefulness_score
      )) {
        archiveMd += `#### ${rule.summary}\n`;
        archiveMd += `- **Score**: ${rule.usefulness_score}/10\n`;
        archiveMd += `- **Priority**: ${rule.priority}\n`;
        archiveMd += `- **Path**: ${rule.source_path}\n`;
        archiveMd += `- **When to consult**: When working on ${rule.domain} specifics\n\n`;

        // Include truncated rule content
        const truncatedRule = rule.rule.substring(0, 200);
        archiveMd += `> ${truncatedRule}${rule.rule.length > 200 ? "..." : ""}\n\n`;
      }
    }
  }

  archiveMd += "\n## How to Use This Archive\n\n";
  archiveMd += "1. Start with the main rule files for general guidance\n";
  archiveMd +=
    "2. Consult this archive when you need specific details for a domain\n";
  archiveMd += "3. Use the source paths to find the complete original rules\n";

  await writeFile("docs/rule-archive/archived-rules.md", archiveMd);
  await log(
    logFile,
    `Archived ${archivedRules.length} rules with threshold ${threshold}`
  );
}

export async function callClaudeWithRetry(
  prompt: string,
  maxRetries: number,
  logFile: string,
  toolType: "extract" | "reorganize" | "scoring" = "extract"
): Promise<string> {
  // Check TEST_MODE for model selection
  const TEST_MODE = process.env.TEST_MODE === "true";
  const MODEL_TO_USE = TEST_MODE ? "haiku" : "sonnet";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await log(logFile, `  Attempt ${attempt}/${maxRetries}...`);

      if (TEST_MODE && attempt === 1) {
        await log(
          logFile,
          `  🧪 TEST MODE: Using ${MODEL_TO_USE} model for speed`
        );
      }

      // Choose the appropriate MCP server based on tool type
      let mcpServer, toolName;
      switch (toolType) {
        case "extract":
          mcpServer = extractionServer;
          toolName = "extract_rules";
          break;
        case "scoring":
          mcpServer = scoringServer;
          toolName = "score_rules";
          break;
        case "reorganize":
          mcpServer = reorganizationServer;
          toolName = "reorganize_rules";
          break;
        default:
          throw new Error(`Unknown tool type: ${toolType}`);
      }

      // Call Claude using the Agent SDK with the appropriate tool
      const claudeQuery = query({
        prompt,
        options: {
          model: MODEL_TO_USE, // Use haiku in TEST_MODE, sonnet otherwise
          executable: "bun",
          mcpServers: { [toolName]: mcpServer },
        },
      });

      let toolCallResult: any = null;
      let textResponse = "";
      let toolCallError: any = null;

      for await (const message of claudeQuery) {
        // Debug logging for troubleshooting
        if (TEST_MODE && attempt === 1) {
          await log(logFile, `  DEBUG: Message type: ${message.type}`);
        }

        if (message.type === "assistant" && message.message) {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              // Tool use blocks have the tool name prefixed with mcp__[server]__[tool]
              if (block.type === "tool_use") {
                const expectedPrefix = `mcp__${toolName}__`;
                if (block.name?.startsWith(expectedPrefix)) {
                  toolCallResult = block.input;
                  await log(logFile, `  ✓ Tool called: ${block.name}`);
                  // Log the first few fields to confirm structure
                  if (toolCallResult) {
                    const preview = JSON.stringify(toolCallResult).substring(
                      0,
                      200
                    );
                    await log(logFile, `  Tool input preview: ${preview}...`);
                  }
                  break;
                }
              } else if (block.type === "text") {
                textResponse += block.text;
              }
            }
          } else if (typeof content === "string") {
            textResponse += content;
          }
        } else if ("error" in message && message.error) {
          toolCallError = message.error;
          await log(
            logFile,
            `  ERROR from Claude: ${JSON.stringify(message.error)}`
          );
        }
      }

      // If we have an error, handle it
      if (toolCallError) {
        throw new Error(`Claude API Error: ${JSON.stringify(toolCallError)}`);
      }

      // Return tool call result if available
      if (toolCallResult) {
        await log(logFile, "  Tool result received");

        // Handle case where fields might be JSON strings instead of objects
        if (typeof toolCallResult.rules === "string") {
          try {
            toolCallResult.rules = JSON.parse(toolCallResult.rules);
            await log(logFile, "  Parsed string rules field to array");
          } catch (e) {
            await log(logFile, `  Failed to parse rules string: ${e}`);
          }
        }
        if (typeof toolCallResult.scoredRules === "string") {
          try {
            toolCallResult.scoredRules = JSON.parse(toolCallResult.scoredRules);
            await log(logFile, "  Parsed string scoredRules field to array");
          } catch (e) {
            await log(logFile, `  Failed to parse scoredRules string: ${e}`);
          }
        }
        if (typeof toolCallResult.files === "string") {
          try {
            toolCallResult.files = JSON.parse(toolCallResult.files);
            await log(logFile, "  Parsed string files field to array");
          } catch (e) {
            await log(logFile, `  Failed to parse files string: ${e}`);
          }
        }

        return JSON.stringify(toolCallResult);
      }

      // Fallback: Try to parse text response as JSON if it looks like JSON
      if (textResponse) {
        const trimmed = textResponse.trim();

        // Check if the text response looks like it contains JSON
        if (trimmed.includes("{") && trimmed.includes("}")) {
          try {
            // Try to extract JSON from the text response
            const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              await log(logFile, "  Extracted JSON from text response");
              return JSON.stringify(parsed);
            }
          } catch (parseError) {
            await log(
              logFile,
              `  Failed to extract JSON from text response: ${parseError}`
            );
          }
        }

        await log(logFile, "  WARNING: Got text response instead of tool use");
        return trimmed;
      }

      throw new Error("No response from Claude Agent SDK");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await log(logFile, `  Attempt ${attempt} failed: ${errorMessage}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${errorMessage}`);
      }
      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error("Unreachable code");
}

// Global log file path, set once at the beginning of main()
let globalLogFile: string | null = null;

async function log(
  messageOrLogFile: string,
  optionalMessage?: string
): Promise<void> {
  // Handle both old signature (logFile, message) and new signature (message)
  let logFile: string;
  let message: string;

  if (optionalMessage !== undefined) {
    // Old signature: log(logFile, message) - for backward compatibility
    logFile = messageOrLogFile;
    message = optionalMessage;
  } else {
    // New signature: log(message) - uses global log file
    if (!globalLogFile) {
      throw new Error(
        "Log file not initialized. Call log with explicit path first or set globalLogFile"
      );
    }
    logFile = globalLogFile;
    message = messageOrLogFile;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  await writeFile(logFile, logMessage, { flag: "a" });
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}
