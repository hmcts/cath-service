/**
 * Common validation patterns and validators for list type conversions
 */

// Matches h:mma, h.mma (e.g., 9:30am, 10.15pm) or ha (e.g., 9am, 2pm)
// Allows optional space before am/pm and trailing spaces
export const TIME_PATTERN = /^(\d{1,2})([:.]\d{2})?\s*[ap]m\s*$/i;

// Matches dd/MM/yyyy date format
export const DD_MM_YYYY_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

/**
 * Validates time format with hour validation (1-12)
 * Format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)
 */
export function validateTimeFormat(value: string, rowNumber: number): void {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }

  const hour = Number.parseInt(match[1], 10);
  if (hour < 1 || hour > 12) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }
}

/**
 * Validates time format without hour range validation
 * Format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)
 */
export function validateTimeFormatSimple(value: string, rowNumber: number): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }
}
