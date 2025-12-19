/**
 * Official UK postcode regex based on GOV.UK standards
 * Covers all valid UK postcode formats including:
 * - Standard formats (e.g., SW1A 1AA, M1 1AE, B33 8TH)
 * - Special case: GIR 0AA (Girobank)
 * - Allowed letter combinations per position
 * - Disallowed letters: Q, V, X in first position; I, J, Z in second position
 *
 * References:
 * - https://ideal-postcodes.co.uk/guides/uk-postcode-format
 * - https://www.gov.uk/government/publications/bulk-data-transfer-specification
 */
const UK_POSTCODE_REGEX = /^(GIR\s?0AA|[A-PR-UWYZ](\d{1,2}|([A-HK-Y]\d[\dABEHMNPRV-Y]?)|\d[A-HJKPS-UW])\s?\d[ABD-HJLNP-UW-Z]{2})$/i;

export interface PostcodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateUkPostcode(postcode: string | undefined): PostcodeValidationResult {
  if (!postcode || postcode.trim().length === 0) {
    return { isValid: true };
  }

  // Normalize: remove extra whitespace and convert to uppercase for testing
  const normalized = postcode.trim().toUpperCase().replaceAll(/\s+/g, " ");

  if (!UK_POSTCODE_REGEX.test(normalized)) {
    return { isValid: false, errorMessage: "Enter a valid postcode" };
  }

  return { isValid: true };
}
