import { z } from "zod";
import type { PostType } from "@/lib/generated/prisma";

/**
 * Centralized validation schemas for navigation-related server actions
 *
 * Following DRY principles by creating reusable schemas that can be composed
 * and imported across different parts of the application.
 */

// Base primitive validators
export const SlugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(200, "Slug too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const CategoryNameSchema = z
  .string()
  .min(1, "Category name cannot be empty")
  .max(100, "Category name too long")
  // Allow kebab-case with unicode characters (for special symbols like runes)
  .regex(
    /^[a-z0-9\u00A0-\uFFFF]+(?:-[a-z0-9\u00A0-\uFFFF]+)*$/i,
    "Category name must be valid format"
  );

export const TagNameSchema = z
  .string()
  .min(1, "Tag name cannot be empty")
  .max(50, "Tag name too long")
  .refine(
    (name) => !name.match(/^(findings|sights)-\d{4}-\d{2}-\d{2}$/),
    "Auto-generated date tags are not allowed"
  );

export const CategoryPathSegmentSchema = z
  .string()
  .min(1, "Path segment cannot be empty")
  .max(50, "Path segment too long")
  // Allow kebab-case with unicode characters (for special symbols like runes)
  .regex(
    /^[a-z0-9\u00A0-\uFFFF]+(?:-[a-z0-9\u00A0-\uFFFF]+)*$/i,
    "Path segment must be valid format"
  );

export const CategoryPathSchema = z
  .array(CategoryPathSegmentSchema)
  .min(1, "Category path cannot be empty")
  .max(10, "Category path too deep");

// Post type validation with strict enum checking
export const PostTypeSchema = z.enum([
  "CONCRETE",
  "BLOG",
  "FINDING",
  "SIGHT",
] as const);

// Search and filtering schemas
export const SearchQuerySchema = z
  .string()
  .max(200, "Search query too long")
  .optional()
  .default("");

export const SortOptionSchema = z.enum([
  "date-desc",
  "date-asc",
  "title-asc",
  "title-desc",
  "relevance",
] as const);

export const NavigationTabSchema = z.enum([
  "rabbithole",
  "categories",
  "tags",
  "timeline",
] as const);

// Complex object schemas
export const NavigationFiltersSchema = z.object({
  postTypes: z.array(PostTypeSchema).optional().default([]),
  categories: z.array(SlugSchema).optional().default([]),
  tags: z.array(SlugSchema).optional().default([]),
  tagMode: z.enum(["AND", "OR"]).optional().default("OR"),
  searchQuery: SearchQuerySchema,
  sortBy: SortOptionSchema.optional().default("date-desc"),
});

export const DateRangeSchema = z
  .object({
    start: z.date().nullable().optional(),
    end: z.date().nullable().optional(),
  })
  .refine((data) => {
    if (data.start && data.end) {
      return data.start <= data.end;
    }
    return true;
  }, "Start date must be before end date");

// Server action input schemas
export const GetPostsByTagNameInputSchema = z.object({
  tagName: TagNameSchema,
});

export const GetPostsByTypeInputSchema = z.object({
  type: PostTypeSchema,
});

export const GetPostsByCategoryNameInputSchema = z.object({
  categoryName: CategoryNameSchema,
});

export const GetCategoryPostsInputSchema = z.object({
  categoryPath: CategoryPathSchema,
});

export const GetPostsWithFiltersInputSchema = z.object({
  filters: NavigationFiltersSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

// Timeline specific schemas
export const TimelinePeriodSchema = z.enum([
  "day",
  "week",
  "month",
  "year",
] as const);

export const TimelineGroupInputSchema = z
  .object({
    period: TimelinePeriodSchema.optional().default("month"),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine((data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  }, "Start date must be before end date");

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

// Export type inference helpers for TypeScript
export type SlugInput = z.infer<typeof SlugSchema>;
export type CategoryNameInput = z.infer<typeof CategoryNameSchema>;
export type TagNameInput = z.infer<typeof TagNameSchema>;
export type PostTypeInput = z.infer<typeof PostTypeSchema>;
export type CategoryPathInput = z.infer<typeof CategoryPathSchema>;
export type NavigationFiltersInput = z.infer<typeof NavigationFiltersSchema>;
export type DateRangeInput = z.infer<typeof DateRangeSchema>;
export type SortOptionInput = z.infer<typeof SortOptionSchema>;
export type NavigationTabInput = z.infer<typeof NavigationTabSchema>;
export type TimelinePeriodInput = z.infer<typeof TimelinePeriodSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// Server action input types
export type GetPostsByTagNameInput = z.infer<
  typeof GetPostsByTagNameInputSchema
>;
export type GetPostsByTypeInput = z.infer<typeof GetPostsByTypeInputSchema>;
export type GetPostsByCategoryNameInput = z.infer<
  typeof GetPostsByCategoryNameInputSchema
>;
export type GetCategoryPostsInput = z.infer<typeof GetCategoryPostsInputSchema>;
export type GetPostsWithFiltersInput = z.infer<
  typeof GetPostsWithFiltersInputSchema
>;
export type TimelineGroupInput = z.infer<typeof TimelineGroupInputSchema>;

/**
 * Validation helper functions for common patterns
 */

// Validates and sanitizes user input with detailed error messages
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      details: z.ZodIssue[];
    } {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.issues[0];
  const friendlyMessage = firstError?.message || "Invalid input";

  return {
    success: false,
    error: friendlyMessage,
    details: result.error.issues,
  };
}

// Validates multiple inputs at once
export function validateMultipleInputs<T extends Record<string, unknown>>(
  schemas: { [K in keyof T]: z.ZodSchema<T[K]> },
  inputs: { [K in keyof T]: unknown }
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: Partial<Record<keyof T, string>>;
      details: Partial<Record<keyof T, z.ZodIssue[]>>;
    } {
  const data = {} as T;
  const errors = {} as Partial<Record<keyof T, string>>;
  const details = {} as Partial<Record<keyof T, z.ZodIssue[]>>;
  let hasErrors = false;

  for (const key in schemas) {
    if (Object.hasOwn(schemas, key)) {
      const schema = schemas[key];
      const input = inputs[key];
      const result = validateInput(schema, input);

      if (result.success) {
        data[key] = result.data;
      } else {
        errors[key] = result.error;
        details[key] = result.details;
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    return { success: false, errors, details };
  }

  return { success: true, data };
}

// Type guard helpers
export function isValidPostType(value: unknown): value is PostType {
  return PostTypeSchema.safeParse(value).success;
}

export function isValidSlug(value: unknown): value is string {
  return SlugSchema.safeParse(value).success;
}

export function isValidCategoryPath(value: unknown): value is string[] {
  return CategoryPathSchema.safeParse(value).success;
}
