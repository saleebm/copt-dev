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
 * Build a UTC-midnight Date from numeric Y/M/D, returning null if invalid
 * (e.g. month 13, day 32, day 31 for a 30-day month).
 */
function utcDateFromYMD(year: number, month: number, day: number): Date | null {
  if (
    !(Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day))
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Guard against rollover (e.g. Feb 30 → Mar 2)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

/**
 * Expand a 2-digit year using the same pivot POSIX strptime %y uses:
 * 00-69 → 2000-2069, 70-99 → 1970-1999.
 */
function expandTwoDigitYear(yy: number): number {
  return yy <= 69 ? 2000 + yy : 1900 + yy;
}

/**
 * Parse a date string into a Date object at UTC midnight.
 *
 * Recognized formats (tried in order):
 *   - YYYY-MM-DD                    e.g. 2025-07-20
 *   - YYYY/MM/DD                    e.g. 2025/07/20
 *   - YYYYMMDD                      e.g. 20250720
 *   - MMDDYYYY                      e.g. 07202025  (used by some filenames)
 *   - MM-DD-YYYY  /  MM/DD/YYYY     e.g. 07/20/2025
 *   - M-D-YY      /  M/D/YY         e.g. 7/20/25  →  2025-07-20
 *   - ISO 8601 timestamps with T or Z (delegated to the engine)
 *
 * Engine-level Date parsing is intentionally restricted to ISO timestamps
 * so locale-ambiguous strings like "7/20/25" never silently fall through.
 *
 * @param dateString - The date string to parse
 * @param _context - Context for error messages (unused; kept for API stability)
 * @returns Date object at UTC midnight, or null if parsing fails
 */
export function parsePostDate(
  dateString: string | undefined,
  _context: string
): Date | null {
  if (!dateString) {
    return null;
  }
  const s = dateString.trim();
  if (!s) {
    return null;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    return utcDateFromYMD(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // YYYYMMDD (8 digits, year first)
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const ymd = utcDateFromYMD(y, mo, d);
    if (ymd) {
      return ymd;
    }
    // Fall through to MMDDYYYY interpretation if YMD is invalid
  }

  // MMDDYYYY (8 digits, year last) — distinguished from YYYYMMDD only when
  // the YMD interpretation was rejected above. Try this only as a separate
  // explicit pattern for filenames like 05122026.
  m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = Number(m[3]);
    const mdy = utcDateFromYMD(y, mo, d);
    if (mdy) {
      return mdy;
    }
  }

  // MM-DD-YYYY or MM/DD/YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    return utcDateFromYMD(Number(m[3]), Number(m[1]), Number(m[2]));
  }

  // M-D-YY or M/D/YY (2-digit year)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    return utcDateFromYMD(
      expandTwoDigitYear(Number(m[3])),
      Number(m[1]),
      Number(m[2])
    );
  }

  // ISO 8601 with time/zone — only accept if it actually looks like a
  // timestamp (contains T or Z). This prevents locale-ambiguous fallthrough.
  if (/[TZ]/.test(s)) {
    const date = new Date(s);
    if (!Number.isNaN(date.getTime())) {
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
    }
  }

  return null;
}

/**
 * Scan the start of a post body for the first recognizable date token and
 * return it as a UTC-midnight Date. Used as a last-resort source for
 * `originalDate` when frontmatter and filename both fail to provide a date.
 *
 * Only the first ~2000 characters are scanned to avoid picking up dates
 * from later prose (e.g. citations, footnotes). Returns the *earliest
 * occurring* match in that window, not the chronologically earliest date.
 */
export function extractDateFromBody(
  body: string | undefined | null
): Date | null {
  if (!body) {
    return null;
  }
  const window = body.slice(0, 2000);

  // Order matters: longest/most-specific patterns first so that
  // "2025-07-20" doesn't get partially matched by the "M/D/YY" regex.
  const patterns: RegExp[] = [
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2}\b/,
  ];

  let earliestIdx = -1;
  let earliestMatch: string | null = null;
  for (const re of patterns) {
    const match = window.match(re);
    if (
      match &&
      match.index !== undefined &&
      (earliestIdx === -1 || match.index < earliestIdx)
    ) {
      earliestIdx = match.index;
      earliestMatch = match[0];
    }
  }
  if (!earliestMatch) {
    return null;
  }
  return parsePostDate(earliestMatch, "body");
}
