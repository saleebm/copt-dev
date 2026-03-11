/**
 * Post template generation system
 */

import type { PostTemplateConfig } from "./scaffold-types";

/**
 * Create a complete post template based on configuration
 */
export function createPostTemplate(config: PostTemplateConfig): string {
  const frontmatter = createFrontmatter(config);
  const content = createContentTemplate(config);

  return `---
${frontmatter}---

${content}`;
}

/**
 * Generate frontmatter YAML
 */
function createFrontmatter(config: PostTemplateConfig): string {
  const fm: any = {
    title: config.title,
    status: config.status,
    published: config.published,
    date: config.date,
  };

  // Add tags if provided
  if (config.tags.length > 0) {
    fm.tags = config.tags;
  }

  // Add categories if provided
  if (config.category) {
    fm.categories = [config.category];
  }

  // Add excerpt if provided
  if (config.excerpt) {
    fm.excerpt = config.excerpt;
  }

  // Add original_url for FINDING posts
  if (config.originalUrl) {
    fm.original_url = config.originalUrl;
  }

  // Add author if provided
  if (config.author) {
    fm.author = config.author;
  }

  // Add priority if provided
  if (config.priority) {
    fm.priority = config.priority;
  }

  // Convert to YAML format
  return Object.entries(fm)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return "";
        }
        const items = value.map((item) => `  - "${item}"`).join("\n");
        return `${key}:\n${items}`;
      }
      if (typeof value === "boolean") {
        return `${key}: ${value}`;
      }
      return `${key}: "${value}"`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Create content template based on post type
 */
function createContentTemplate(config: PostTemplateConfig): string {
  switch (config.type) {
    case "CONCRETE":
      return createConcreteTemplate(config);
    case "BLOG":
      return createBlogTemplate(config);
    case "FINDING":
      return createFindingTemplate(config);
    case "SIGHT":
      return createSightTemplate(config);
    default:
      return createDefaultTemplate(config);
  }
}

/**
 * CONCRETE post template
 */
function createConcreteTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Overview

*Provide a concise overview of this foundational concept.*

## Core Principles

*Outline the key principles that define this concept.*

### Principle 1

*Detail the first core principle.*

### Principle 2

*Detail the second core principle.*

## Implementation

*Explain how to implement or apply these principles.*

## Examples

*Provide concrete examples that illustrate the concepts.*

## Related Concepts

*Link to other foundational concepts that relate to this one.*

## References

*Include any sources, influences, or further reading.*

---

*This is a CONCRETE post - foundational content that serves as a reference. Keep it comprehensive, well-structured, and timeless.*`;
}

/**
 * BLOG post template
 */
function createBlogTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Introduction

*Set the stage for your thoughts or experience.*

## The Story

*Share your main narrative, insight, or experience.*

## Reflection

*What did you learn? How did this change your perspective?*

## Takeaways

*What are the key points readers should remember?*

---

*This is a BLOG post - personal and conversational content. Let your voice shine through.*`;
}

/**
 * FINDING post template
 */
function createFindingTemplate(config: PostTemplateConfig): string {
  const sourceSection = config.originalUrl
    ? `## Source

Original: [${config.originalUrl}](${config.originalUrl})

`
    : `## Source

*Add the original source URL or citation here.*

`;

  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

${sourceSection}## Summary

*Provide a concise summary of the key finding or discovery.*

## Key Insights

*Break down the most important insights from this finding.*

### Insight 1

*Detail the first key insight.*

### Insight 2

*Detail the second key insight.*

## Analysis

*Your analysis of why this finding is significant.*

## Implications

*What does this mean for the broader context or field?*

## Related Findings

*Link to other related research or discoveries.*

## Personal Notes

*Your personal thoughts, reactions, or applications.*

---

*This is a FINDING post - analytical content focused on research and discoveries.*`;
}

/**
 * SIGHT post template
 */
function createSightTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Image

*Insert your image or visual content here.*

## Context

*Briefly describe what this image captures and why it matters.*

## Observations

*What stands out? What details are worth noting?*

---

*This is a SIGHT post — visual content with concise commentary.*`;
}

/**
 * Default template fallback
 */
function createDefaultTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Introduction

*Introduce your topic here.*

## Main Content

*Your main content goes here.*

## Conclusion

*Wrap up your thoughts.*

---

*Template generated for ${config.type} post type.*`;
}

/**
 * Template variations for different contexts
 */
export const TEMPLATE_VARIATIONS = {
  minimal: {
    name: "Minimal",
    description: "Basic structure with minimal sections",
    generator: createMinimalTemplate,
  },
  detailed: {
    name: "Detailed",
    description: "Comprehensive structure with multiple sections",
    generator: createDetailedTemplate,
  },
  academic: {
    name: "Academic",
    description: "Academic-style with methodology and references",
    generator: createAcademicTemplate,
  },
  tutorial: {
    name: "Tutorial",
    description: "Step-by-step tutorial format",
    generator: createTutorialTemplate,
  },
};

/**
 * Minimal template variation
 */
function createMinimalTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

*Start writing your ${config.type.toLowerCase()} post here.*

---

*Minimal template for quick starts.*`;
}

/**
 * Detailed template variation
 */
function createDetailedTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Abstract

*Brief summary of the entire post.*

## Table of Contents

*Will be auto-generated based on your headers.*

## Introduction

### Background
### Motivation
### Objectives

## Main Content

### Section 1
### Section 2
### Section 3

## Methodology

*If applicable, describe your approach.*

## Results

*Present your findings or outcomes.*

## Discussion

### Implications
### Limitations
### Future Work

## Conclusion

*Summarize key points and takeaways.*

## Acknowledgments

*Credit sources, collaborators, or influences.*

## References

*List all sources and further reading.*

---

*Detailed template for comprehensive content.*`;
}

/**
 * Academic template variation
 */
function createAcademicTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Abstract

*Provide a concise summary of your research or findings.*

## Keywords

*List relevant keywords for discoverability.*

## Introduction

### Problem Statement
### Research Questions
### Hypotheses (if applicable)

## Literature Review

*Review existing work related to your topic.*

## Methodology

### Approach
### Data Collection
### Analysis Methods

## Results

### Findings
### Analysis
### Statistical Significance (if applicable)

## Discussion

### Interpretation
### Implications
### Limitations

## Conclusion

### Summary
### Contributions
### Future Research

## References

*Academic citations and sources.*

---

*Academic template for research-focused content.*`;
}

/**
 * Tutorial template variation
 */
function createTutorialTemplate(config: PostTemplateConfig): string {
  return `# ${config.title}

<!-- AI-generated outline will be inserted here -->

## Overview

*What will readers learn from this tutorial?*

## Prerequisites

*What knowledge or tools are needed before starting?*

## Learning Objectives

*What specific skills or knowledge will readers gain?*

## Getting Started

### Step 1: Setup
### Step 2: Basic Configuration
### Step 3: First Implementation

## Advanced Topics

### Advanced Step 1
### Advanced Step 2
### Advanced Step 3

## Troubleshooting

*Common issues and their solutions.*

## Best Practices

*Tips for success and avoiding common mistakes.*

## Next Steps

*What should readers do after completing this tutorial?*

## Resources

*Additional learning materials and references.*

---

*Tutorial template for educational content.*`;
}

/**
 * Get available template variations
 */
export function getTemplateVariations() {
  return Object.entries(TEMPLATE_VARIATIONS).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description,
  }));
}

/**
 * Create template using a specific variation
 */
export function createTemplateVariation(
  config: PostTemplateConfig,
  variation: keyof typeof TEMPLATE_VARIATIONS = "minimal"
): string {
  const frontmatter = createFrontmatter(config);
  const template = TEMPLATE_VARIATIONS[variation];

  if (!template) {
    throw new Error(`Unknown template variation: ${variation}`);
  }

  const content = template.generator(config);

  return `---
${frontmatter}---

${content}`;
}
