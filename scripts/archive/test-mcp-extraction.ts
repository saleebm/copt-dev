#!/usr/bin/env bun

// Quick test of MCP extraction with a single file
import { mkdir, writeFile } from "node:fs/promises";
import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Tool definition for extraction
const extractTool = tool(
  "extract_test",
  "Extract test data",
  z.object({
    items: z.array(
      z.object({
        name: z.string(),
        value: z.number(),
      })
    ),
  }).shape,
  async (args: { items: Array<{ name: string; value: number }> }) => {
    console.log(`✓ Tool called with ${args.items.length} items`);
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

// Create server
const server = createSdkMcpServer({
  name: "TestExtractor",
  tools: [extractTool],
});

async function testExtraction() {
  console.log("Testing MCP extraction with simple data...\n");

  const prompt = `
You have access to a tool called "extract_test" that you MUST use.

Extract the following information and call the extract_test tool:

Items to extract:
1. Alpha - value 10
2. Beta - value 20
3. Gamma - value 30

Call the extract_test tool with an "items" array containing objects with "name" and "value" fields.

IMPORTANT: Use the tool, don't just describe what you would do.
`;

  const logFile = "logs/test-mcp.log";
  await mkdir("logs", { recursive: true });
  await writeFile(logFile, `Test started at ${new Date().toISOString()}\n`);

  try {
    const claudeQuery = query({
      prompt,
      options: {
        model: "haiku",
        executable: "bun",
        mcpServers: { test: server },
      },
    });

    let result: { items: Array<{ name: string; value: number }> } | null = null;

    for await (const message of claudeQuery) {
      if (message.type === "assistant" && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              const toolName = block.name;
              if (toolName?.includes("extract_test")) {
                console.log("✅ Tool was called:", toolName);
                const input = block.input as any;

                // Handle case where items might be a string
                if (typeof input.items === "string") {
                  input.items = JSON.parse(input.items);
                  console.log("Parsed string items to array");
                }

                result = input as {
                  items: Array<{ name: string; value: number }>;
                };
                console.log("Result:", JSON.stringify(result, null, 2));
                break;
              }
            }
          }
        }
      }
    }

    if (result) {
      console.log("\n✅ SUCCESS: Extraction worked!");
      console.log(`Extracted ${result.items.length} items`);
      await writeFile(logFile, `Success: ${JSON.stringify(result)}\n`, {
        flag: "a",
      });
    } else {
      console.log("\n❌ FAILURE: Tool was not called");
    }
  } catch (error) {
    console.error("Error:", error);
    await writeFile(logFile, `Error: ${error}\n`, { flag: "a" });
  }
}

testExtraction().catch(console.error);
