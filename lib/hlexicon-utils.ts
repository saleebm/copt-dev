import type { HlexiconEntry } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

// Type for Hlexicon term definition
export interface HlexiconTerm {
  definition: string;
  term: string;
}

// Regex pattern to detect Hlexicon terms in content
// Looks for patterns like {{term:definition}} or {{term|definition}}
const HLEXICON_PATTERN = /\{\{([^:|}]+)[:||]([^}]+)\}\}/g;

/**
 * Extract Hlexicon terms from MDX content
 */
export function extractHlexiconTerms(content: string): HlexiconTerm[] {
  const terms: HlexiconTerm[] = [];
  const matches = content.matchAll(HLEXICON_PATTERN);

  for (const match of matches) {
    const term = match[1]?.trim();
    const definition = match[2]?.trim();

    if (term && definition) {
      // Check if we already have this term to avoid duplicates
      const existingTerm = terms.find(
        (t) => t.term.toLowerCase() === term.toLowerCase()
      );
      if (!existingTerm) {
        terms.push({ term, definition });
      }
    }
  }

  return terms;
}

/**
 * Transform content by replacing Hlexicon patterns with React components
 */
export function transformHlexiconInContent(content: string): string {
  return content.replace(HLEXICON_PATTERN, (match, term, definition) => {
    const cleanTerm = term?.trim();
    const cleanDefinition = definition?.trim();

    if (cleanTerm && cleanDefinition) {
      // Return JSX component string that will be processed by MDX
      return `<Hlexicon term="${cleanTerm}" definition="${cleanDefinition}" />`;
    }

    return match;
  });
}

/**
 * Create or update a Hlexicon entry in the database
 */
export async function upsertHlexiconEntry(
  term: string,
  definition: string
): Promise<HlexiconEntry> {
  // First, try to find an existing entry with the exact term
  let existingEntry = await prisma.hlexiconEntry.findUnique({
    where: { term },
  });

  // If not found, try to find one with case-insensitive matching
  if (!existingEntry) {
    const entries = await prisma.hlexiconEntry.findMany({
      where: {
        term: {
          equals: term,
          mode: "insensitive",
        },
      },
    });
    existingEntry = entries[0]; // Use first match if any
  }

  if (existingEntry) {
    // Update existing entry, preserving original term casing
    return await prisma.hlexiconEntry.update({
      where: { id: existingEntry.id },
      data: { definition },
    });
  }
  // Create new entry
  return await prisma.hlexiconEntry.create({
    data: { term, definition },
  });
}

/**
 * Create multiple Hlexicon entries and associate them with a post
 */
export async function syncHlexiconEntries(
  postId: string,
  terms: HlexiconTerm[]
): Promise<HlexiconEntry[]> {
  const entries: HlexiconEntry[] = [];

  for (const { term, definition } of terms) {
    const entry = await upsertHlexiconEntry(term, definition);
    entries.push(entry);
  }

  // Update the post to connect to these Hlexicon entries
  if (entries.length > 0) {
    await prisma.post.update({
      where: { id: postId },
      data: {
        hlexiconEntries: {
          set: entries.map((entry) => ({ id: entry.id })),
        },
      },
    });
  }

  return entries;
}

/**
 * Get all Hlexicon entries for a specific post
 */
export async function getHlexiconEntriesForPost(
  postId: string
): Promise<HlexiconEntry[]> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      hlexiconEntries: true,
    },
  });

  return post?.hlexiconEntries || [];
}

/**
 * Get all unique Hlexicon entries from the database
 */
export async function getAllHlexiconEntries(): Promise<HlexiconEntry[]> {
  return await prisma.hlexiconEntry.findMany({
    orderBy: { term: "asc" },
  });
}

/**
 * Search for Hlexicon entries by term
 */
export async function searchHlexiconEntries(
  searchTerm: string
): Promise<HlexiconEntry[]> {
  // For PostgreSQL, use case-insensitive search
  return await prisma.hlexiconEntry.findMany({
    where: {
      OR: [
        { term: { contains: searchTerm, mode: "insensitive" } },
        { definition: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    orderBy: { term: "asc" },
  });
}

/**
 * Get posts that use a specific Hlexicon term
 */
export async function getPostsUsingHlexiconTerm(termId: string) {
  return await prisma.hlexiconEntry.findUnique({
    where: { id: termId },
    include: {
      posts: {
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Delete a Hlexicon entry (will also remove associations with posts)
 */
export async function deleteHlexiconEntry(termId: string): Promise<void> {
  await prisma.hlexiconEntry.delete({
    where: { id: termId },
  });
}

/**
 * Validate and clean Hlexicon term and definition
 */
export function validateHlexiconTerm(
  term: string,
  definition: string
): {
  isValid: boolean;
  cleanTerm?: string;
  cleanDefinition?: string;
  error?: string;
} {
  const cleanTerm = term?.trim();
  const cleanDefinition = definition?.trim();

  if (!cleanTerm) {
    return { isValid: false, error: "Term cannot be empty" };
  }

  if (!cleanDefinition) {
    return { isValid: false, error: "Definition cannot be empty" };
  }

  if (cleanTerm.length > 100) {
    return { isValid: false, error: "Term must be 100 characters or less" };
  }

  if (cleanDefinition.length > 1000) {
    return {
      isValid: false,
      error: "Definition must be 1000 characters or less",
    };
  }

  // Check for invalid characters that might break JSX
  if (
    cleanTerm.includes('"') ||
    cleanTerm.includes("'") ||
    cleanTerm.includes("<") ||
    cleanTerm.includes(">")
  ) {
    return { isValid: false, error: "Term contains invalid characters" };
  }

  return {
    isValid: true,
    cleanTerm,
    cleanDefinition,
  };
}
