#!/usr/bin/env bun

/**
 * Test version of reduce-rules.ts that processes only a subset of files
 * for faster demonstration of functionality
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Schema for extracted rules from AI analysis
const ExtractedRuleSchema = z.object({
  rule: z.string(),
  summary: z.string(),
  usefulness_score: z.number().min(1).max(10),
  domain: z.string(),
  source_file: z.string(),
  source_path: z.string(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]),
});

const ExtractedRulesSchema = z.object({
  rules: z.array(ExtractedRuleSchema),
});

type ExtractedRule = z.infer<typeof ExtractedRuleSchema>;

// Global log file
let globalLogFile: string | null = null;

async function log(message: string): Promise<void> {
  if (!globalLogFile) {
    throw new Error("Log file not initialized");
  }
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  await writeFile(globalLogFile, logMessage, { flag: "a" });
}

async function main(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = join("test-output", `test-reduce-${timestamp}.log`);
  const outputDir = join("test-output", `reduced-rules-${timestamp}`);

  globalLogFile = logFile;

  // Create directories
  await mkdir("test-output", { recursive: true });
  await mkdir(outputDir, { recursive: true });

  await log(`Starting TEST rule reduction at ${new Date().toISOString()}`);

  try {
    // Process only first 3 files for testing
    const rulerDir = ".ruler";
    const files = await readdir(rulerDir);
    const mdFiles = files.filter((f) => f.endsWith(".md")).slice(0, 3);

    await log(`\n=== Processing ${mdFiles.length} files for testing ===`);

    const allRules: ExtractedRule[] = [];

    for (const file of mdFiles) {
      await log(`Processing ${file}...`);
      const content = await readFile(join(rulerDir, file), "utf-8");

      const extractionPrompt = `
Analyze this rule file and extract the TOP 3 most important rules. For each rule, provide:
1. The complete rule text (preserve formatting)
2. A one-line summary
3. Usefulness score (1-10)
4. Domain category (one of: nextjs-app, state-management, ui-components, data-pipeline, development-workflow, type-safety, code-quality, security, documentation, architecture)
5. Priority level (Critical, High, Medium, Low)

Return as JSON matching this exact schema:
{
  "rules": [
    {
      "rule": "complete rule text",
      "summary": "one-line summary",
      "usefulness_score": 8,
      "domain": "nextjs-app",
      "source_file": "${file}",
      "source_path": ".ruler/${file}",
      "priority": "High"
    }
  ]
}

File content (first 1000 chars):
${content.substring(0, 1000)}
`;

      const claudeQuery = query({
        prompt: extractionPrompt,
        options: {
          model: "sonnet",
          executable: "bun",
        },
      });

      let response = "";
      for await (const message of claudeQuery) {
        if (message.type === "assistant" && message.message) {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === "text") {
                response += block.text;
              }
            }
          } else if (typeof content === "string") {
            response += content;
          }
        }
      }

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = ExtractedRulesSchema.parse(
            JSON.parse(jsonMatch[0])
          );
          allRules.push(...extracted.rules);
          await log(`✓ Extracted ${extracted.rules.length} rules from ${file}`);
        }
      } catch (_error) {
        await log(`✗ Failed to parse rules from ${file}`);
      }
    }

    // Calculate dynamic threshold
    const scores = allRules
      .map((r) => r.usefulness_score)
      .sort((a, b) => b - a);
    const threshold = Math.min(7, scores[Math.floor(scores.length * 0.3)] || 7);

    await log("\n=== Summary ===");
    await log(`Total rules extracted: ${allRules.length}`);
    await log(`Dynamic threshold: ${threshold}`);
    await log(
      `High-value rules: ${allRules.filter((r) => r.usefulness_score >= threshold).length}`
    );

    // Save results
    const resultsPath = join(outputDir, "extracted-rules.json");
    await writeFile(resultsPath, JSON.stringify(allRules, null, 2));

    // Generate sample markdown
    let md = "# Reduced Rules Sample\n\n";
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## High-Value Rules (score >= ${threshold})\n\n`;

    for (const rule of allRules.filter(
      (r) => r.usefulness_score >= threshold
    )) {
      md += `### ${rule.summary}\n`;
      md += `- **Domain**: ${rule.domain}\n`;
      md += `- **Score**: ${rule.usefulness_score}/10\n`;
      md += `- **Source**: ${rule.source_path}\n\n`;
    }

    md += "\n## References to Detailed Rules\n\n";
    for (const rule of allRules.filter((r) => r.usefulness_score < threshold)) {
      md += `- ${rule.summary} - See ${rule.source_path}\n`;
    }

    const mdPath = join(outputDir, "sample-output.md");
    await writeFile(mdPath, md);

    console.log(`\n${"=".repeat(50)}`);
    console.log("✅ TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(50));
    console.log(`📁 Results saved to: ${outputDir}`);
    console.log(`📋 Log file: ${logFile}`);
    console.log("=".repeat(50));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(`\n❌ Error: ${errorMessage}`);
    throw error;
  }
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}
