#!/usr/bin/env bun

import { query } from "@anthropic-ai/claude-agent-sdk";
import { type ExtractedRule, scoringServer } from "./reduce-rules";

// Test scoring a single domain with a few rules
async function testScoring() {
  console.log("Testing rule scoring functionality...\n");

  const testRules: ExtractedRule[] = [
    {
      rule: "Always use Server Components by default in Next.js app router",
      summary: "Use Server Components by default",
      usefulness_score: 9,
      domain: "nextjs-app",
      source_file: "01-nextjs-app.md",
      source_path: ".ruler/01-nextjs-app.md",
      priority: "High",
    },
    {
      rule: "Mark client components with 'use client' directive",
      summary: "Use 'use client' for client components",
      usefulness_score: 8,
      domain: "nextjs-app",
      source_file: "01-nextjs-app.md",
      source_path: ".ruler/01-nextjs-app.md",
      priority: "High",
    },
  ];

  const scoringPrompt = `
You have a tool called "score_rules" that you MUST use to return the scored rules.

Score these nextjs-app rules based on their relevance and practical value:

${JSON.stringify(testRules, null, 2)}

Use the score_rules tool to return the results. The tool expects an object with a "scoredRules" array.
Each scored rule should include all the original fields plus:
- confidenceScore: your confidence in this scoring (0-10)
- relevanceScore: relevance to modern Next.js development (0-10)
- practicalityScore: practical applicability (0-10)
- overallScore: weighted average (0-10)
- reasoning: brief explanation of the scores
- codebaseReferences: optional array of relevant files

IMPORTANT: You MUST use the score_rules tool, do not return JSON directly in text.
`;

  try {
    console.log("Calling Claude with scoring tool...");

    const claudeQuery = query({
      prompt: scoringPrompt,
      options: {
        model: "sonnet",
        executable: "bun",
        mcpServers: { score_rules: scoringServer },
      },
    });

    let toolCallResult: any = null;
    let textResponse = "";

    for await (const message of claudeQuery) {
      if (message.type === "assistant" && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (
              block.type === "tool_use" &&
              block.name?.includes("score_rules")
            ) {
              toolCallResult = block.input;
              console.log("Tool called successfully!");
              break;
            }
            if (block.type === "text") {
              textResponse += block.text;
            }
          }
        }
      }
    }

    if (toolCallResult) {
      console.log("\nScored Rules:");
      console.log(JSON.stringify(toolCallResult, null, 2));
      return toolCallResult;
    }
    console.log("\nText response (no tool call):");
    console.log(textResponse);
    return null;
  } catch (error) {
    console.error("Error during scoring:", error);
    return null;
  }
}

// Run the test
if (import.meta.main) {
  testScoring().then((result) => {
    if (result) {
      console.log("\n✅ Test completed successfully!");
    } else {
      console.log("\n❌ Test failed - no tool result returned");
      process.exit(1);
    }
  });
}
