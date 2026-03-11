# Codemods System

An extensible system for applying automated code transformations to markdown files.

## Usage

### Basic Usage
```bash
bun run scripts/run-codemods.ts
```

This will run the default codemods on the `posts/findings` directory:
- Remove blank first lines
- Rename `.md` files to `.mdx`

### Options

#### Dry Run
Preview changes without applying them:
```bash
bun run scripts/run-codemods.ts --dry-run
```

#### Verbose Output
See detailed information about each transformation:
```bash
bun run scripts/run-codemods.ts --verbose
```

#### Custom Directory
Process a different directory:
```bash
bun run scripts/run-codemods.ts --dir posts/blog
```

#### Specific Codemods
Run only specific codemods:
```bash
bun run scripts/run-codemods.ts --codemods remove-blank-first-line
bun run scripts/run-codemods.ts --codemods remove-blank-first-line,rename-md-to-mdc
```

#### Combined Options
```bash
bun run scripts/run-codemods.ts --dir posts/blog --codemods remove-blank-first-line --dry-run --verbose
```

## Creating New Codemods

### 1. Create a New Codemod File

Create a new file in `scripts/codemods/` following this pattern:

```typescript
// scripts/codemods/my-new-codemod.ts
import type { CodemodDefinition } from './types';

export const myNewCodemod: CodemodDefinition = {
  name: 'my-new-codemod',
  description: 'Description of what this codemod does',
  transform: (context) => {
    // Your transformation logic here
    const { filePath, content, extension } = context;
    
    // Example: Add a timestamp to the end of the file
    if (content.includes('# Title')) {
      const newContent = content + '\n\n_Last updated: ' + new Date().toISOString() + '_';
      return {
        content: newContent,
        modified: true,
        message: 'Added timestamp'
      };
    }
    
    return {
      modified: false,
      message: 'No changes needed'
    };
  }
};
```

### 2. Register the Codemod

Add your codemod to `scripts/codemods/index.ts`:

```typescript
// Add to imports
export { myNewCodemod } from './my-new-codemod';
import { myNewCodemod } from './my-new-codemod';

// Add to allCodemods registry
export const allCodemods: Record<string, CodemodDefinition> = {
  // ... existing codemods
  'my-new-codemod': myNewCodemod,
};

// Optionally add to defaultCodemods if it should run by default
export const defaultCodemods: CodemodDefinition[] = [
  // ... existing defaults
  myNewCodemod,
];
```

### 3. Use Your Codemod

```bash
bun run scripts/run-codemods.ts --codemods my-new-codemod
```

## Available Codemods

### `consolidate-categories`

**Purpose**: Consolidates duplicate categories in the `posts/finding` directory using AI embeddings for semantic similarity analysis.

**How it works**:
1. Scans all category directories in `posts/finding`
2. Generates embeddings for each category name and context using Google's GenAI API
3. Calculates cosine similarity between embeddings to find duplicates (>85% similarity threshold)
4. Creates a consolidation plan showing which categories should be merged
5. Generates a detailed analysis report

**Usage**:
```bash
# Dry run analysis (recommended first)
bun run consolidate:categories

# Execute the consolidation
bun run consolidate:categories:execute
```

**Prerequisites**:
- Set `GEMINI_API_KEY` environment variable (see `.env.example`)
- `@google/genai` package installed

**Output**:
- Analysis report saved to `.analysis/category-consolidation-report.md`
- Shows duplicate groups with similarity scores
- Lists planned file moves and directory deletions
- Includes raw category data in JSON format

**Configuration**:
- Similarity threshold: 85% (adjustable in code)
- Embedding model configured via `EMBEDDING_MODEL` env var (default: `gemini-embedding-001`)
- Optimized for clustering tasks

### `remove-blank-first-line`
Removes blank first lines from files (empty or whitespace-only).

### `rename-md-to-mdx`
Renames `.md` files to `.mdx` extension (excludes files already with `.mdx` extension).

## Codemod API

### CodemodContext
```typescript
interface CodemodContext {
  filePath: string;    // Full path to the file being processed
  content: string;     // Current file content
  extension: string;   // File extension (.md, .mdx, etc.)
}
```

### CodemodResult
```typescript
interface CodemodResult {
  content?: string;      // New file content (if modified)
  newFilePath?: string;  // New file path (for renaming)
  shouldDelete?: boolean; // Whether to delete the file
  modified: boolean;     // Whether any changes were made
  message?: string;      // Optional message about the transformation
}
```

## Tips for Writing Codemods

1. **Always return `modified: false`** if no changes are made
2. **Use meaningful messages** to help with debugging and verbose output
3. **Handle edge cases** like empty files, files without the expected content, etc.
4. **Test with `--dry-run`** before applying changes
5. **Make transformations idempotent** - running the same codemod twice should be safe
6. **Consider file extensions** - some codemods may only apply to specific file types 