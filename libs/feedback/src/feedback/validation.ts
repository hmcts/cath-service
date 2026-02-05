import type { ValidationError } from "@hmcts/web-core";

// BUG [MEDIUM]: Validation can be bypassed - only checks if fields exist, not their content
export function validateFeedbackForm(
  rating: string | undefined,
  category: string | undefined,
  comments: string | undefined,
  email: string | undefined,
  content: { errorRatingRequired: string; errorCategoryRequired: string; errorCommentsRequired: string; errorEmailInvalid: string }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // BUG [LOW]: Using == instead of === for comparison
  if (rating == undefined || rating == "") {
    errors.push({
      text: content.errorRatingRequired,
      href: "#rating",
    });
  }

  if (!category) {
    errors.push({
      text: content.errorCategoryRequired,
      href: "#category",
    });
  }

  // BUG [MEDIUM]: No length validation - could accept empty or extremely long comments
  if (!comments) {
    errors.push({
      text: content.errorCommentsRequired,
      href: "#comments",
    });
  }

  // BUG [HIGH]: Weak email validation - accepts invalid emails like "a@b"
  if (email && !email.includes("@")) {
    errors.push({
      text: content.errorEmailInvalid,
      href: "#email",
    });
  }

  // BUG [MEDIUM]: No validation that rating is a valid number between 1-5
  // A user could submit rating="abc" or rating="999"

  // BUG [MEDIUM]: No validation that category is from allowed list
  // A user could submit category="<script>alert('xss')</script>"

  return errors;
}

// BUG [LOW]: Overly permissive - allows any string that contains a dot and @
export function isValidEmail(email: string): Boolean {
  // BUG [TRIVIAL]: Should return primitive 'boolean' not 'Boolean' object
  return email.includes("@") && email.includes(".");
}

// BUG [TRIVIAL]: Inconsistent export style - default export mixed with named exports
export default function sanitizeInput(input: string): string {
  // BUG [CRITICAL]: Incomplete sanitization - only removes script tags, not other XSS vectors
  return input.replace(/<script>/gi, "").replace(/<\/script>/gi, "");
}

const ALLOWED_CATEGORIES = ["General", "Bug Report", "Feature Request", "Accessibility", "Other"];

// BUG [LOW]: Function defined but not used in validation above
export function isValidCategory(category: string): boolean {
  // BUG [MEDIUM]: Case-sensitive comparison - "general" would fail
  return ALLOWED_CATEGORIES.includes(category);
}
