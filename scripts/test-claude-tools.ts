#!/usr/bin/env bun

import {
  createSdkMcpServer,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Create a simple test tool
const testTool = tool(
  "test_tool",
  "A simple test tool that returns whatever you give it",
  z.object({
    message: z.string(),
    number: z.number(),
  }).shape,
  async (args: { message: string; number: number }) => {
    console.log("🎯 Tool was called with:", args);
    return {
      content: [
        {
          type: "text",
          text: `Tool received: message="${args.message}", number=${args.number}`,
        },
      ],
    };
  }
);

// Create MCP server
const testServer = createSdkMcpServer({
  name: "TestServer",
  tools: [testTool],
});

async function testSimpleTool() {
  console.log("Testing Claude Agent SDK tool usage...\n");

  const prompt = `
You have access to a tool called "test_tool" that you MUST use.

Call the test_tool with:
- message: "Hello from Claude"
- number: 42

IMPORTANT: You MUST use the test_tool, don't just describe what you would do.
`;

  try {
    const claudeQuery = query({
      prompt,
      options: {
        model: "haiku",
        executable: "bun",
        mcpServers: { test: testServer },
      },
    });

    let toolWasCalled = false;
    let responseText = "";

    for await (const message of claudeQuery) {
      console.log("Message type:", message.type);

      if (message.type === "assistant" && message.message) {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            console.log("Block type:", block.type);
            if (block.type === "tool_use") {
              console.log("✅ Tool use detected:", block.name);
              console.log("Tool input:", block.input);
              toolWasCalled = true;
            } else if (block.type === "text") {
              responseText += block.text;
            }
          }
        }
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    if (toolWasCalled) {
      console.log("✅ SUCCESS: Tool was called!");
    } else {
      console.log("❌ FAILURE: Tool was not called");
      console.log("Response text:", responseText);
    }
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the test
testSimpleTool().catch(console.error);
