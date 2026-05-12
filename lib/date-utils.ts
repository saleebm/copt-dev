/**
 * Date utility functions for consistent date handling across the application
 *
 * CRITICAL: These utilities handle dates WITHOUT timezone conversion
 * to ensure that dates appear consistently regardless of user timezone.
 * This is essential for content dates (like post dates) which represent
 * calendar dates, not timestamps.
 */

/**
 * Formats a date for display WITHOUT timezone conversion.
 * Takes a Date object and formats it as if it were in UTC,
 * preventing the browser from converting to local timezone.
 *
 * @param date - Date object (typically from database)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatDateWithoutTimezone(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  if (!date) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Extract UTC components to prevent timezone conversion
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  // Create a date in the local timezone with the UTC values
  // This ensures the date displays correctly without shifting
  const localDate = new Date(year, month, day);

  return localDate.toLocaleDateString("en-US", options);
}

/**
 * Formats a date in short format without timezone conversion
 * @param date - Date object
 * @returns Formatted date string (e.g., "Sep 28")
 */
export function formatDateShort(
  date: Date | string | null | undefined
): string {
  if (!date) {
    return "";
  }

  return formatDateWithoutTimezone(date, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a date with year only if different from current year
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDateSmart(
  date: Date | string | null | undefined
): string {
  if (!date) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const currentYear = new Date().getFullYear();
  const dateYear = dateObj.getUTCFullYear();

  return formatDateWithoutTimezone(date, {
    month: "short",
    day: "numeric",
    year: dateYear === currentYear ? undefined : "numeric",
  });
}

/**
 * Extracts date string in YYYY-MM-DD format from various inputs
 * @param date - Date object or string
 * @returns Date string in YYYY-MM-DD format
 */
export function extractDateString(
  date: Date | string | null | undefined
): string {
  if (!date) {
    return "";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Use UTC values to prevent timezone shifts
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Creates a Date object at UTC midnight for a given date string
 * This ensures consistent storage in the database
 * @param dateString - Date string (YYYY-MM-DD or other parseable format)
 * @returns Date object at UTC midnight
 */
export function createUTCDate(dateString: string): Date {
  // Parse the date string and set to UTC midnight
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Parse a date string into a Date object for consistent handling
 * Handles various date formats and ensures UTC midnight
 * @param dateString - The date string to parse
 * @param context - Context for error messages
 * @returns Date object or null if parsing fails
 */
export function parsePostDate(
  dateString: string | undefined,
  _context: string
): Date | null {
  if (!dateString) {
    return null;
  }

  try {
    // Try parsing as YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return createUTCDate(dateString);
    }

    // Fall back to general Date parsing
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    // Convert to UTC midnight to ensure consistency
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
  } catch (_error) {
    return null;
  }
}
