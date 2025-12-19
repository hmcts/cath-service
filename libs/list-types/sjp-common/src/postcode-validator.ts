const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

export interface PostcodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateUkPostcode(postcode: string | undefined): PostcodeValidationResult {
  if (!postcode || postcode.trim().length === 0) {
    return { isValid: true };
  }

  if (!UK_POSTCODE_REGEX.test(postcode.trim())) {
    return { isValid: false, errorMessage: "Enter a valid postcode" };
  }

  return { isValid: true };
}
