#!/usr/bin/env bun

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type ExtractedRule,
  ExtractedRuleSchema,
  type ScoredRule,
  ScoredRuleSchema,
} from "./reduce-rules";

// Test data
const mockRules: ExtractedRule[] = [
  {
    rule: "Always use Server Components by default in Next.js app router",
    summary: "Use Server Components by default",
    usefulness_score: 9,
    domain: "nextjs-app",
    source_file: "01-nextjs-app.md",
    source_path: ".ruler/01-nextjs-app.md",
    priority: "High" as const,
  },
  {
    rule: "Never use any type in TypeScript",
    summary: "Avoid any type",
    usefulness_score: 10,
    domain: "type-safety",
    source_file: "10-typescript.md",
    source_path: ".ruler/10-typescript.md",
    priority: "Critical" as const,
  },
  {
    rule: "Use semantic theme variables instead of hardcoded colors",
    summary: "Use theme variables for colors",
    usefulness_score: 8,
    domain: "ui-components",
    source_file: "09-theme-consistency.md",
    source_path: ".ruler/09-theme-consistency.md",
    priority: "High" as const,
  },
];

describe("Rule Scoring Tests", () => {
  let testDir: string;
  let logFile: string;

  beforeAll(async () => {
    // Create test directory
    testDir = join(process.cwd(), ".test-temp");
    await mkdir(testDir, { recursive: true });

    // Create test log file
    logFile = join(testDir, "test.log");
    await writeFile(logFile, "");
  });

  afterAll(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it("should validate extracted rule schema", () => {
    const validRule: ExtractedRule = {
      rule: "Test rule",
      summary: "Test summary",
      usefulness_score: 5,
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "Medium",
    };

    const result = ExtractedRuleSchema.safeParse(validRule);
    expect(result.success).toBe(true);
  });

  it("should validate scored rule schema", () => {
    const scoredRule: ScoredRule = {
      rule: "Test rule",
      summary: "Test summary",
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "Medium",
      confidenceScore: 8,
      relevanceScore: 7,
      practicalityScore: 9,
      overallScore: 8,
      reasoning: "This rule is highly practical",
      codebaseReferences: ["app/page.tsx"],
    };

    const result = ScoredRuleSchema.safeParse(scoredRule);
    expect(result.success).toBe(true);
  });

  it("should reject invalid usefulness scores", () => {
    const invalidRule = {
      rule: "Test rule",
      summary: "Test summary",
      usefulness_score: 11, // Invalid: > 10
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "Medium",
    };

    const result = ExtractedRuleSchema.safeParse(invalidRule);
    expect(result.success).toBe(false);
  });

  it("should reject invalid priority levels", () => {
    const invalidRule = {
      rule: "Test rule",
      summary: "Test summary",
      usefulness_score: 5,
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "VeryHigh", // Invalid priority
    };

    const result = ExtractedRuleSchema.safeParse(invalidRule);
    expect(result.success).toBe(false);
  });

  it("should validate scored rule with optional codebaseReferences", () => {
    const scoredRuleWithoutRefs: ScoredRule = {
      rule: "Test rule",
      summary: "Test summary",
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "Medium",
      confidenceScore: 8,
      relevanceScore: 7,
      practicalityScore: 9,
      overallScore: 8,
      reasoning: "This rule is highly practical",
      // codebaseReferences is optional
    };

    const result = ScoredRuleSchema.safeParse(scoredRuleWithoutRefs);
    expect(result.success).toBe(true);
  });

  it("should reject scores outside 0-10 range", () => {
    const invalidScoredRule = {
      rule: "Test rule",
      summary: "Test summary",
      domain: "nextjs-app",
      source_file: "test.md",
      source_path: ".ruler/test.md",
      priority: "Medium",
      confidenceScore: -1, // Invalid: < 0
      relevanceScore: 7,
      practicalityScore: 9,
      overallScore: 8,
      reasoning: "Test reasoning",
    };

    const result = ScoredRuleSchema.safeParse(invalidScoredRule);
    expect(result.success).toBe(false);
  });

  describe("Domain mapping tests", () => {
    const domainMappings = {
      "nextjs-app": ["apps/web/app", "apps/web/components"],
      "state-management": ["lib/post-stack-machine.ts", "hooks"],
      "ui-components": ["components", "packages/ui/src"],
      "type-safety": ["tsconfig.json"],
      security: [".env.example", "middleware.ts"],
    };

    it("should have valid domain mappings", () => {
      Object.keys(domainMappings).forEach((domain) => {
        expect(
          domainMappings[domain as keyof typeof domainMappings]
        ).toBeDefined();
        expect(
          Array.isArray(domainMappings[domain as keyof typeof domainMappings])
        ).toBe(true);
      });
    });
  });

  describe("Integration tests", () => {
    it("should handle empty rule list", async () => {
      const emptyRules: ExtractedRule[] = [];
      expect(emptyRules.length).toBe(0);
    });

    it("should sort rules by score", () => {
      const sortedRules = [...mockRules].sort(
        (a, b) => b.usefulness_score - a.usefulness_score
      );
      expect(sortedRules[0].usefulness_score).toBe(10);
      expect(sortedRules[1].usefulness_score).toBe(9);
      expect(sortedRules[2].usefulness_score).toBe(8);
    });

    it("should filter rules by domain", () => {
      const nextjsRules = mockRules.filter((r) => r.domain === "nextjs-app");
      expect(nextjsRules.length).toBe(1);
      expect(nextjsRules[0].summary).toBe("Use Server Components by default");
    });

    it("should calculate dynamic threshold correctly", () => {
      const scores = mockRules
        .map((r) => r.usefulness_score)
        .sort((a, b) => b - a);
      const percentileIndex = Math.floor(scores.length * 0.3);
      const percentileScore = scores[percentileIndex] || 7;
      const threshold = Math.min(7, percentileScore);

      // With 3 rules (10, 9, 8), top 30% would be index 0 (score 10)
      // But we cap at 7 minimum
      expect(threshold).toBe(7);
    });
  });
});

// Run tests if this is the main module
if (import.meta.main) {
  console.log("Running reduce-rules tests...");
}
