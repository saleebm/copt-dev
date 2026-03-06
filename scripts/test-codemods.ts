import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { runCodemods } from "./run-codemods.js";

type TestFile = {
  path: string;
  content: string;
  description: string;
};

type TestExpectation = {
  shouldExist: boolean;
  expectedPath?: string;
  contentChecks?: {
    shouldNotStartWithBlankLine?: boolean;
    shouldHaveContent?: string;
  };
};

type TestCase = {
  name: string;
  files: TestFile[];
  expectations: Record<string, TestExpectation>;
};

const TEST_DIR = "posts/findings/__test__";

const testCases: TestCase[] = [
  {
    name: "Remove blank first line and rename .md to .mdx",
    files: [
      {
        path: `${TEST_DIR}/blank-first-line.md`,
        content: `
---
title: "Test with blank first line"
---

# Content
This file has a blank first line.`,
        description: ".md file with blank first line",
      },
    ],
    expectations: {
      [`${TEST_DIR}/blank-first-line.md`]: {
        shouldExist: false,
      },
      [`${TEST_DIR}/blank-first-line.mdx`]: {
        shouldExist: true,
        contentChecks: {
          shouldNotStartWithBlankLine: true,
          shouldHaveContent: '---\ntitle: "Test with blank first line"',
        },
      },
    },
  },
  {
    name: "Rename .md to .mdx without blank line",
    files: [
      {
        path: `${TEST_DIR}/no-blank-line.md`,
        content: `---
title: "Test without blank first line"
---

# Content
This file has no blank first line.`,
        description: ".md file without blank first line",
      },
    ],
    expectations: {
      [`${TEST_DIR}/no-blank-line.md`]: {
        shouldExist: false,
      },
      [`${TEST_DIR}/no-blank-line.mdx`]: {
        shouldExist: true,
        contentChecks: {
          shouldNotStartWithBlankLine: true,
          shouldHaveContent: '---\ntitle: "Test without blank first line"',
        },
      },
    },
  },
  {
    name: "Leave .mdx files unchanged",
    files: [
      {
        path: `${TEST_DIR}/already-mdx.mdx`,
        content: `---
title: "Already MDX file"
---

# Content
This file is already .mdx.`,
        description: "Existing .mdx file",
      },
    ],
    expectations: {
      [`${TEST_DIR}/already-mdx.mdx`]: {
        shouldExist: true,
        contentChecks: {
          shouldHaveContent: '---\ntitle: "Already MDX file"',
        },
      },
    },
  },
  {
    name: "Remove blank line from .mdx file",
    files: [
      {
        path: `${TEST_DIR}/mdx-with-blank.mdx`,
        content: `
---
title: "MDX with blank first line"
---

# Content
This MDX file has a blank first line.`,
        description: ".mdx file with blank first line",
      },
    ],
    expectations: {
      [`${TEST_DIR}/mdx-with-blank.mdx`]: {
        shouldExist: true,
        contentChecks: {
          shouldNotStartWithBlankLine: true,
          shouldHaveContent: '---\ntitle: "MDX with blank first line"',
        },
      },
    },
  },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createTestFiles(testCase: TestCase): Promise<void> {
  console.log(`Setting up test case: ${testCase.name}`);

  // Ensure test directory exists
  try {
    await mkdir(TEST_DIR, { recursive: true });
  } catch (_error) {
    // Directory might already exist, that's fine
  }

  for (const file of testCase.files) {
    // Ensure parent directory exists
    const dir = dirname(file.path);
    await mkdir(dir, { recursive: true });

    await writeFile(file.path, file.content);
    console.log(`  Created: ${file.path} (${file.description})`);
  }
}

async function cleanupTestFiles(testCase: TestCase): Promise<void> {
  const allPaths = [
    ...testCase.files.map((f) => f.path),
    ...Object.keys(testCase.expectations),
  ];

  for (const path of allPaths) {
    try {
      if (await fileExists(path)) {
        await unlink(path);
        console.log(`  Cleaned up: ${path}`);
      }
    } catch (error) {
      console.warn(`  Failed to cleanup ${path}:`, error);
    }
  }
}

async function verifyExpectations(testCase: TestCase): Promise<boolean> {
  let allPassed = true;

  console.log(`Verifying expectations for: ${testCase.name}`);

  for (const [path, expectation] of Object.entries(testCase.expectations)) {
    const exists = await fileExists(path);

    if (expectation.shouldExist && !exists) {
      console.error(`  ❌ Expected ${path} to exist, but it doesn't`);
      allPassed = false;
      continue;
    }

    if (!expectation.shouldExist && exists) {
      console.error(`  ❌ Expected ${path} to NOT exist, but it does`);
      allPassed = false;
      continue;
    }

    if (expectation.shouldExist && exists) {
      console.log(`  ✅ ${path} exists as expected`);

      // Check content if specified
      if (expectation.contentChecks) {
        try {
          const content = await readFile(path, "utf-8");

          if (expectation.contentChecks.shouldNotStartWithBlankLine) {
            if (content.startsWith("\n") || content.startsWith("\r\n")) {
              console.error(`  ❌ ${path} should not start with blank line`);
              allPassed = false;
            } else {
              console.log(`  ✅ ${path} does not start with blank line`);
            }
          }

          if (expectation.contentChecks.shouldHaveContent) {
            if (content.includes(expectation.contentChecks.shouldHaveContent)) {
              console.log(`  ✅ ${path} contains expected content`);
            } else {
              console.error(`  ❌ ${path} does not contain expected content`);
              console.error(
                `    Expected: ${expectation.contentChecks.shouldHaveContent}`
              );
              console.error(`    Got: ${content.substring(0, 100)}...`);
              allPassed = false;
            }
          }
        } catch (error) {
          console.error(
            `  ❌ Failed to read ${path} for content verification:`,
            error
          );
          allPassed = false;
        }
      }
    } else if (!expectation.shouldExist) {
      console.log(`  ✅ ${path} does not exist as expected`);
    }
  }

  return allPassed;
}

async function runTestCase(testCase: TestCase): Promise<boolean> {
  console.log(`\n🧪 Running test case: ${testCase.name}`);
  console.log("━".repeat(50));

  try {
    // Setup
    await createTestFiles(testCase);

    // Run codemods
    console.log("Running codemods...");
    await runCodemods({
      directory: TEST_DIR,
      verbose: false,
      dryRun: false,
    });

    // Verify
    const passed = await verifyExpectations(testCase);

    // Cleanup
    await cleanupTestFiles(testCase);

    if (passed) {
      console.log(`✅ Test case passed: ${testCase.name}`);
    } else {
      console.log(`❌ Test case failed: ${testCase.name}`);
    }

    return passed;
  } catch (error) {
    console.error(`💥 Test case errored: ${testCase.name}`, error);

    // Cleanup on error
    await cleanupTestFiles(testCase);

    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log("🚀 Starting codemod tests...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("\n📊 Test Results");
  console.log("━".repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${passed + failed}`);

  if (failed > 0) {
    console.log("\n💡 Some tests failed. Check the output above for details.");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
  }
}

// CLI interface
if (import.meta.main) {
  await runAllTests();
}
