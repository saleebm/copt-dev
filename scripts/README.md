# Post Scaffolding System

A comprehensive interactive CLI tool for creating new posts with AI-powered outlines using Google's Gemini AI.

## Features

- 🤖 **AI-Powered Outlines**: Generate detailed outlines using Gemini 2.0 Flash
- 📂 **Smart Post Types**: Support for CONCRETE, BLOG, and FINDING post types
- 🏷️ **Category Autocomplete**: Browse and select from existing categories
- 🏷️ **Tag Suggestions**: View existing tags and create new ones
- 📄 **Multiple Templates**: Choose from minimal, detailed, academic, or tutorial formats
- ✅ **Input Validation**: Comprehensive validation for all inputs
- 📁 **Smart File Organization**: Automatic directory creation and file naming
- 🔄 **Database Integration**: Seamless integration with your Prisma database

## Quick Start

### 1. Set up Environment

Create a `.env.local` file (or add to your existing one):

```bash
# Get your API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
# OR
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 2. Run the CLI

```bash
# Using npm script (recommended)
bun run scaffold
# or
bun run new-post

# Direct execution
bun run scripts/scaffold-post.ts

# Or make it executable and run directly
./scripts/scaffold-post.ts
```

## Usage Guide

### Interactive Workflow

The CLI will guide you through these steps:

1. **Select Post Type**
   - `CONCRETE`: Foundational, principle-based content
   - `BLOG`: Personal, chronological posts
   - `FINDING`: Research discoveries and external content

2. **Enter Post Title**
   - Validates title length (1-200 characters)
   - Auto-generates filename and URL slug

3. **Choose Category** (optional)
   - Browse existing categories from database
   - Create new categories on the fly
   - Skip for CONCRETE posts (typically no categories)

4. **Add Tags** (optional)
   - View existing tags for inspiration
   - Add comma-separated tags
   - Validates tag format

5. **Select Template**
   - `Minimal`: Basic structure for quick starts
   - `Detailed`: Comprehensive sections and structure
   - `Academic`: Research-focused with methodology
   - `Tutorial`: Step-by-step instructional format

6. **AI Outline Generation**
   - Choose whether to generate an AI outline
   - Uses Gemini 2.0 Flash for intelligent outlines
   - Context-aware based on post type and category

### Post Types

#### CONCRETE Posts
- **Purpose**: Foundational, timeless reference content
- **Location**: `posts/concrete/`
- **Features**: Comprehensive structure, principle-focused
- **Example**: Core principles, philosophy, key concepts

#### BLOG Posts
- **Purpose**: Personal, chronological content
- **Location**: `posts/blog/[category]/`
- **Features**: Date-based naming, conversational tone
- **Example**: Daily thoughts, experiences, insights

#### FINDING Posts
- **Purpose**: Research discoveries and curated content
- **Location**: `posts/finding/[category]/`
- **Features**: Source tracking, analytical structure
- **Example**: Research summaries, interesting discoveries

### Template Variations

#### Minimal Template
```markdown
# Title
*Start writing your post here.*
```

#### Detailed Template
```markdown
# Title
## Abstract
## Introduction
### Background
### Motivation
## Main Content
## Discussion
## Conclusion
## References
```

#### Academic Template
```markdown
# Title
## Abstract
## Keywords
## Introduction
### Problem Statement
### Research Questions
## Literature Review
## Methodology
## Results
## Discussion
## Conclusion
## References
```

#### Tutorial Template
```markdown
# Title
## Overview
## Prerequisites
## Learning Objectives
## Getting Started
## Advanced Topics
## Troubleshooting
## Best Practices
## Next Steps
```

## File Organization

### Generated Files

Posts are created in the following structure:

```
posts/
├── concrete/
│   └── your-post-title.mdx
├── blog/
│   ├── category-name/
│   │   └── 01202025-your-post-title.mdx
│   └── your-post-title.mdx
└── finding/
    ├── category-name/
    │   └── your-post-title.mdx
    └── your-post-title.mdx
```

### Frontmatter Structure

Generated posts include comprehensive frontmatter:

```yaml
---
title: "Your Post Title"
status: "DRAFT"
published: false
date: "2025-01-20"
tags:
  - "tag1"
  - "tag2"
categories:
  - "category"
excerpt: "Optional excerpt"
original_url: "https://example.com"  # For FINDING posts
author: "Your Name"                  # Optional
priority: "medium"                   # Optional
---
```

## AI Outline Generation

### How It Works

The AI outline generation uses Google's Gemini 2.0 Flash model to create intelligent, context-aware outlines:

1. **Context Analysis**: Considers post type, title, and category
2. **Intelligent Prompting**: Creates type-specific prompts for better results
3. **Structured Output**: Generates properly formatted markdown headers
4. **Flexible Integration**: Inserts seamlessly into templates

### Prompt Engineering

The system uses sophisticated prompts tailored to each post type:

- **CONCRETE**: Focuses on comprehensive, principle-based structure
- **BLOG**: Emphasizes personal narrative and conversational flow  
- **FINDING**: Targets analytical and research-oriented content

### Customization

Outline generation can be customized in `scripts/lib/scaffold-helpers.ts`:

```typescript
const response = await model({
  model: 'gemini-2.0-flash-exp',
  contents: prompt,
  generationConfig: {
    temperature: 0.7,        // Creativity level
    maxOutputTokens: 2048,   // Length limit
    topK: 40,               // Diversity
    topP: 0.95,             // Focus
  }
});
```

## Database Integration

### Category Autocomplete

The system integrates with your Prisma database to provide intelligent category suggestions:

```typescript
const existingCategories = await prisma.category.findMany({
  select: { name: true },
  orderBy: { name: 'asc' }
});
```

### Tag Suggestions

Similarly, tags are pulled from the database for consistency:

```typescript
const existingTags = await prisma.tag.findMany({
  select: { name: true },
  orderBy: { name: 'asc' }
});
```

### Sync Integration

After creating posts, run the sync command to update the database:

```bash
bun run db:sync-posts
```

## Advanced Usage

### Command Line Arguments

While the tool is designed to be interactive, you can extend it to support command-line arguments:

```typescript
// Future enhancement - CLI args support
interface CLIOptions {
  type?: PostType;
  title?: string;
  category?: string;
  tags?: string;
  noOutline?: boolean;
  template?: string;
  output?: string;
  verbose?: boolean;
  dryRun?: boolean;
}
```

### Custom Templates

Create custom templates by extending the template system:

```typescript
// Add to TEMPLATE_VARIATIONS in scaffold-templates.ts
export const TEMPLATE_VARIATIONS = {
  // ... existing templates
  custom: {
    name: 'Custom',
    description: 'Your custom template',
    generator: createCustomTemplate,
  },
};

function createCustomTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}
  
  Your custom template structure here...`;
}
```

### Environment Configuration

Configure the system using environment variables:

```bash
# AI Configuration
GEMINI_API_KEY=your_key_here
AI_MODEL=gemini-2.0-flash-exp
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048

# Default Settings
DEFAULT_POST_TYPE=BLOG
DEFAULT_TEMPLATE=minimal
AUTO_GENERATE_OUTLINE=false
```

## Troubleshooting

### Common Issues

#### API Key Not Found
```bash
❌ Missing API key. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.
```
**Solution**: Add your Gemini API key to `.env.local`

#### Database Connection Issues
```bash
❌ database_error: Could not connect to database
```
**Solution**: Ensure your database is running and Prisma is properly configured

#### File Permission Errors
```bash
❌ file_system_error: Permission denied creating directory
```
**Solution**: Check file permissions or run with appropriate privileges

#### AI Generation Failures
```bash
⚠️ Failed to generate AI outline: API rate limit exceeded
```
**Solution**: Wait and retry, or check your API usage/billing

### Debugging

Enable verbose output by modifying the main function:

```typescript
// Add to main function
const DEBUG = process.env.DEBUG === 'true';
if (DEBUG) {
  console.log('Debug mode enabled');
  console.log('Post data:', postData);
}
```

### Error Recovery

The system includes comprehensive error handling:

- **Validation Errors**: Prompts for correction
- **API Failures**: Graceful degradation without outline
- **File System Issues**: Clear error messages and suggestions
- **Database Errors**: Connection retry logic

## Extension Points

### Adding New Post Types

1. Update the Prisma schema
2. Add to `PostType` enum
3. Update `POST_TYPE_CHOICES` in types
4. Create new template in `scaffold-templates.ts`

### Custom AI Models

Replace Gemini with other AI services:

```typescript
// Extend createPostOutline function
export async function createPostOutline(
  aiService: AIService,
  title: string,
  type: PostType,
  category?: string
): Promise<string> {
  // Your custom AI integration
}
```

### Plugin System

The architecture supports a plugin system for extensions:

```typescript
interface ScaffoldPlugin {
  name: string;
  hooks: {
    beforeGeneration?: (data: PostScaffoldData) => Promise<void>;
    afterGeneration?: (content: string) => Promise<string>;
    onError?: (error: Error) => Promise<void>;
  };
}
```

## Performance Considerations

### AI Generation
- Uses streaming responses when available
- Implements timeout handling
- Caches common prompts

### Database Queries
- Optimized queries for category/tag lookup
- Connection pooling through Prisma
- Lazy loading of suggestions

### File Operations
- Batch directory creation
- Atomic file writes
- Concurrent safe operations

## Security

### Input Validation
- Sanitizes all user inputs
- Path traversal protection
- XSS prevention in content

### API Key Management
- Environment variable only
- No hardcoded credentials
- Secure transmission to AI service

### File System Safety
- Controlled directory creation
- Overwrite protection
- Permission validation

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables
4. Run: `bun run scaffold`

### Code Structure

```
scripts/
├── scaffold-post.ts           # Main CLI script
├── lib/
│   ├── scaffold-helpers.ts    # Utility functions
│   ├── scaffold-types.ts      # Type definitions
│   └── scaffold-templates.ts  # Template system
└── README.md                  # This documentation
```

### Testing

```bash
# Test the scaffold system
bun test scripts/

# Test with different inputs
bun run scaffold --dry-run
```

## License

This scaffolding system is part of the larger project and follows the same license terms.