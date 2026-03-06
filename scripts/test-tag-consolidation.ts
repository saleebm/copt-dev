#!/usr/bin/env bun

/**
 * Quick test for tag consolidation with a subset of tags
 */

import { GoogleGenAI } from "@google/genai";

// Test with a small subset of common duplicate tags
const testTags = [
  { name: "open source", count: 68 },
  { name: "open-source", count: 49 },
  { name: "ai agents", count: 61 },
  { name: "ai-agents", count: 5 },
  { name: "developer tools", count: 39 },
  { name: "developer-tools", count: 8 },
  { name: "llm", count: 25 },
  { name: "large language models", count: 10 },
  { name: "web development", count: 15 },
  { name: "web-development", count: 7 },
];

async function testEmbeddings() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GOOGLE_GENAI_API_KEY or GEMINI_API_KEY required");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log("Testing tag similarity with embeddings...\n");

  const embeddings: Map<string, number[]> = new Map();

  // Generate embeddings
  for (const tag of testTags) {
    const description = tag.name.replace(/[-_]/g, " ");
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: description,
    });
    if (result.embeddings?.[0]?.values) {
      embeddings.set(tag.name, result.embeddings[0].values);
      console.log(`✓ Generated embedding for: ${tag.name}`);
    }
  }

  // Calculate similarities
  console.log("\n=== Similarity Analysis ===\n");

  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  const pairs = [
    ["open source", "open-source"],
    ["ai agents", "ai-agents"],
    ["developer tools", "developer-tools"],
    ["llm", "large language models"],
    ["web development", "web-development"],
  ];

  for (const [tag1, tag2] of pairs) {
    const emb1 = embeddings.get(tag1);
    const emb2 = embeddings.get(tag2);
    if (emb1 && emb2) {
      const similarity = cosineSimilarity(emb1, emb2);
      console.log(
        `"${tag1}" vs "${tag2}": ${(similarity * 100).toFixed(1)}% similarity`
      );
      if (similarity > 0.8) {
        console.log(
          `  → Would consolidate to: "${tag1}" (${testTags.find((t) => t.name === tag1)?.count} posts)`
        );
      }
    }
  }

  console.log("\n✅ Test completed successfully");
}

testEmbeddings().catch(console.error);
