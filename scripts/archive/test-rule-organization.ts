#!/usr/bin/env bun

/**
 * Test script for enhanced rule organization with cross-references
 * Tests dynamic thresholds and path references
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
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

// Test the full reorganization workflow
async function testRuleOrganization(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = join("test-output", `org-${timestamp}`);

  await mkdir(outputDir, { recursive: true });

  console.log("🔄 Testing Enhanced Rule Organization...\n");
  console.log(`📁 Output directory: ${outputDir}\n`);

  try {
    // Test with the master rule file
    const testFile = "00-master-agent-rule.md";
    const content = await readFile(join(".ruler", testFile), "utf-8");

    console.log(`📖 Processing ${testFile}\n`);

    // Extract rules with enhanced prompt
    const extractionPrompt = `
Analyze this rule file and extract all individual rules. For each rule, provide:
1. The complete rule text (preserve formatting)
2. A one-line summary
3. Usefulness score (1-10) based on:
   - Practical applicability in modern development
   - Prevents common mistakes and bugs
   - Improves code quality and maintainability
   - Critical for security or performance
4. Domain category (one of: nextjs-app, state-management, ui-components, data-pipeline, development-workflow, type-safety, code-quality, security, documentation, architecture)
5. Priority level (Critical, High, Medium, Low)
6. Source path from repository root

Return as JSON matching this exact schema:
{
  "rules": [
    {
      "rule": "complete rule text",
      "summary": "one-line summary",
      "usefulness_score": 8,
      "domain": "nextjs-app",
      "source_file": "${testFile}",
      "source_path": ".ruler/${testFile}",
      "priority": "High"
    }
  ]
}

File content:
${content}
`;

    console.log("🤖 Calling Claude Agent SDK for rule extraction...\n");

    const claudeQuery = query({
      prompt: extractionPrompt,
      options: {
        model: "claude-3-5-sonnet-20241022",
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

    // Parse extracted rules
    let extractedData: { rules: ExtractedRule[] };
    try {
      extractedData = ExtractedRulesSchema.parse(JSON.parse(response));
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found");
      }
      extractedData = ExtractedRulesSchema.parse(JSON.parse(jsonMatch[0]));
    }

    console.log(`✅ Extracted ${extractedData.rules.length} rules\n`);

    // Calculate dynamic threshold
    const scores = extractedData.rules
      .map((r) => r.usefulness_score)
      .sort((a, b) => b - a);
    const percentileIndex = Math.floor(scores.length * 0.3);
    const threshold = Math.min(7, scores[percentileIndex] || 7);

    console.log(`📊 Dynamic threshold: ${threshold} (30th percentile)\n`);

    // Group rules
    const highValueRules = extractedData.rules.filter(
      (r) => r.usefulness_score >= threshold
    );
    const lowValueRules = extractedData.rules.filter(
      (r) => r.usefulness_score < threshold
    );

    // Generate report
    let report = "# Rule Organization Test Report\n\n";
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Source**: ${testFile}\n`;
    report += `**Total Rules**: ${extractedData.rules.length}\n`;
    report += `**Dynamic Threshold**: ${threshold}\n`;
    report += `**High-Value Rules**: ${highValueRules.length}\n`;
    report += `**Low-Value Rules**: ${lowValueRules.length}\n\n`;

    report += "## Score Distribution\n\n";
    for (let score = 10; score >= 1; score--) {
      const count = extractedData.rules.filter(
        (r) => r.usefulness_score === score
      ).length;
      if (count > 0) {
        report += `- Score ${score}: ${count} rules ${"█".repeat(count)}\n`;
      }
    }

    report += `\n## High-Value Rules (≥ ${threshold})\n\n`;
    for (const rule of highValueRules) {
      report += `### ${rule.summary}\n`;
      report += `- **Domain**: ${rule.domain}\n`;
      report += `- **Score**: ${rule.usefulness_score}/10\n`;
      report += `- **Priority**: ${rule.priority}\n`;
      report += `- **Source**: ${rule.source_path}\n\n`;
    }

    report += `\n## Lower-Priority Rules (< ${threshold})\n\n`;
    report += "These would be referenced in the main files with paths:\n\n";

    // Group by domain
    const byDomain: Record<string, ExtractedRule[]> = {};
    lowValueRules.forEach((rule) => {
      if (!byDomain[rule.domain]) {
        byDomain[rule.domain] = [];
      }
      byDomain[rule.domain].push(rule);
    });

    for (const [domain, rules] of Object.entries(byDomain)) {
      report += `### Domain: ${domain}\n\n`;
      for (const rule of rules) {
        report += `- **${rule.summary}** (Score: ${rule.usefulness_score})\n`;
        report += `  - Path: \`${rule.source_path}\`\n`;
        report += `  - When to view: When working on ${domain} specifics\n`;
      }
      report += "\n";
    }

    report += "## Recommended File Structure\n\n";
    report += "```\n";
    report += ".ruler/\n";
    report += "├── 01-nextjs-app.md (High-value rules + references)\n";
    report += "├── 02-state-management.md (High-value rules + references)\n";
    report += "├── ...\n";
    report += "└── original files (Detailed rules referenced by main files)\n";
    report += "```\n";

    // Save outputs
    const jsonPath = join(outputDir, "extracted-rules.json");
    await writeFile(jsonPath, JSON.stringify(extractedData, null, 2));

    const reportPath = join(outputDir, "organization-report.md");
    await writeFile(reportPath, report);

    console.log(`📄 Saved report to: ${reportPath}`);
    console.log(`📋 Saved JSON to: ${jsonPath}\n`);

    // Generate sample reorganized output
    const sampleReorg = {
      domain: "nextjs-app",
      title: "Next.js Application Rules",
      priority: "High",
      sections: [
        {
          header: "Core Principles",
          rules: highValueRules
            .filter((r) => r.domain === "nextjs-app")
            .slice(0, 3)
            .map((r) => ({
              summary: r.summary,
              do: ["Example DO item"],
              dont: ["Example DON'T item"],
            })),
        },
      ],
      detailed_rules: [
        {
          path: ".ruler/01-behavior.md",
          description: "Detailed execution behavior patterns",
          when_to_view: "When implementing new features or debugging",
        },
        {
          path: ".ruler/14-frontend-ui.md",
          description: "UI component guidelines and patterns",
          when_to_view: "When building React components",
        },
      ],
    };

    const samplePath = join(outputDir, "sample-reorganized.json");
    await writeFile(samplePath, JSON.stringify(sampleReorg, null, 2));
    console.log(`📝 Saved sample reorganized structure to: ${samplePath}`);

    console.log("\n✅ Test completed successfully!");
    console.log("🔍 Review the outputs to verify:");
    console.log("   1. Dynamic threshold calculation");
    console.log("   2. Rule categorization by score");
    console.log("   3. Path references for detailed rules");
    console.log("   4. Cross-references structure");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${errorMessage}\n`);

    const errorPath = join(outputDir, "error.txt");
    await writeFile(
      errorPath,
      `Error: ${errorMessage}\n\n${error instanceof Error ? error.stack : ""}`
    );
    console.error(`💾 Error saved to: ${errorPath}`);

    throw error;
  }
}

// Run the test
if (import.meta.main) {
  testRuleOrganization().catch(process.exit.bind(null, 1));
}
