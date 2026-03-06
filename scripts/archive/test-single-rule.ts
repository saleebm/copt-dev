#!/usr/bin/env bun

/**
 * Test script for Claude Agent SDK rule organization
 * This script tests the AI analysis on a single rule file without affecting the repository
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  callClaudeWithRetry,
  type ExtractedRules,
  ExtractedRulesSchema,
} from "./reduce-rules";

async function testSingleRule(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = join("test-output", timestamp);

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  console.log("🔄 Testing Claude Agent SDK with a single rule file...\n");
  console.log(`📁 Output directory: ${outputDir}\n`);

  try {
    // Test with the first rule file (00-master-agent-rule.md)
    const testFile = "00-master-agent-rule.md";
    const content = await readFile(join(".ruler", testFile), "utf-8");

    console.log(`📖 Reading ${testFile} (${content.length} characters)\n`);

    console.log("🤖 Calling Claude Agent SDK for AI analysis...\n");

    // Create a temporary log file for the test
    const logFile = join(outputDir, "test-log.txt");
    await writeFile(logFile, `Test started at ${new Date().toISOString()}\n`, {
      flag: "a",
    });

    // Create extraction prompt for AI analysis using the tool format
    const toolPrompt = `
You have a tool called "extract_rules" that you MUST use to return the extracted rules.

Analyze this rule file and extract all individual rules. For each rule, provide:
1. The complete rule text (preserve formatting)
2. A one-line summary
3. Usefulness score (1-10) in context of a Next.js/TypeScript codebase
4. Domain category (one of: nextjs-app, state-management, ui-components, data-pipeline, development-workflow, type-safety, code-quality, security, documentation, architecture)
5. Priority level (Critical, High, Medium, Low)
6. Source path from repository root

Use the extract_rules tool to return the results. The tool expects an object with a "rules" array.
Each rule should include:
- rule: complete rule text
- summary: one-line summary
- usefulness_score: number from 1-10
- domain: the domain category
- source_file: "${testFile}"
- source_path: ".ruler/${testFile}"
- priority: Critical, High, Medium, or Low

IMPORTANT: You MUST use the extract_rules tool, do not return JSON directly in text.

File content:
${content}
`;

    // Use the exported callClaudeWithRetry function from reduce-rules
    const response = await callClaudeWithRetry(
      toolPrompt,
      3,
      logFile,
      "extract"
    );

    console.log(`✅ Received response (${response.length} characters)\n`);

    if (!response.trim()) {
      throw new Error("Empty response from Claude Agent SDK");
    }

    // Debug: Save the raw response to check format
    const debugPath = join(outputDir, "debug-response.json");
    await writeFile(debugPath, response);
    console.log(`🐛 Debug response saved to: ${debugPath}\n`);

    // Parse the extracted data
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response);
    } catch (e) {
      console.error(`❌ Failed to parse JSON response: ${e}`);
      throw new Error(`Invalid JSON response: ${response.substring(0, 200)}`);
    }

    // The response may have rules as a string or array
    let extractedData: ExtractedRules;
    if (typeof parsedResponse.rules === "string") {
      // The rules are returned as a JSON string, need to parse them
      const rulesArray = JSON.parse(parsedResponse.rules);
      extractedData = ExtractedRulesSchema.parse({ rules: rulesArray });
    } else if (Array.isArray(parsedResponse.rules)) {
      // Rules are already an array
      extractedData = ExtractedRulesSchema.parse(parsedResponse);
    } else if (Array.isArray(parsedResponse)) {
      // Direct array of rules
      extractedData = ExtractedRulesSchema.parse({ rules: parsedResponse });
    } else {
      throw new Error(
        `Unexpected response format: ${JSON.stringify(parsedResponse).substring(0, 200)}`
      );
    }

    console.log(
      `📊 Extracted ${extractedData.rules.length} rules from ${testFile}\n`
    );

    // Save raw response
    const rawOutputPath = join(outputDir, "raw-response.txt");
    await writeFile(rawOutputPath, response);
    console.log(`💾 Saved raw response to: ${rawOutputPath}\n`);

    // Save extracted rules as JSON
    const jsonOutputPath = join(outputDir, "extracted-rules.json");
    await writeFile(jsonOutputPath, JSON.stringify(extractedData, null, 2));
    console.log(`📋 Saved extracted rules to: ${jsonOutputPath}\n`);

    // Generate a summary report
    let report = "# Rule Extraction Test Report\n\n";
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Source File**: ${testFile}\n`;
    report += `**Total Rules Extracted**: ${extractedData.rules.length}\n\n`;

    report += "## Rules by Domain\n\n";
    const byDomain: Record<string, typeof extractedData.rules> = {};
    extractedData.rules.forEach((rule) => {
      if (!byDomain[rule.domain]) {
        byDomain[rule.domain] = [];
      }
      byDomain[rule.domain].push(rule);
    });

    for (const [domain, rules] of Object.entries(byDomain)) {
      report += `### ${domain} (${rules.length} rules)\n\n`;
      for (const rule of rules) {
        report += `- **${rule.summary}** (Score: ${rule.usefulness_score}/10, Priority: ${rule.priority})\n`;
      }
      report += "\n";
    }

    report += "## High Value Rules (Score >= 8)\n\n";
    const highValueRules = extractedData.rules.filter(
      (r) => r.usefulness_score >= 8
    );
    for (const rule of highValueRules) {
      report += `### ${rule.summary}\n`;
      report += `- **Domain**: ${rule.domain}\n`;
      report += `- **Score**: ${rule.usefulness_score}/10\n`;
      report += `- **Priority**: ${rule.priority}\n\n`;
      report += `${rule.rule.substring(0, 200)}${rule.rule.length > 200 ? "..." : ""}\n\n`;
    }

    const reportPath = join(outputDir, "report.md");
    await writeFile(reportPath, report);
    console.log(`📄 Saved report to: ${reportPath}\n`);

    console.log("✅ Test completed successfully!\n");
    console.log("📂 Check the output files in:", outputDir);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${errorMessage}\n`);

    // Save error details
    const errorPath = join(outputDir, "error.txt");
    await writeFile(
      errorPath,
      `Error: ${errorMessage}\n\n${error instanceof Error ? error.stack : ""}`
    );
    console.error(`💾 Error details saved to: ${errorPath}`);

    throw error;
  }
}

// Run the test
if (import.meta.main) {
  testSingleRule().catch(process.exit.bind(null, 1));
}
