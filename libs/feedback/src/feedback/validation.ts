import type { ValidationError } from "@hmcts/web-core";

export function validateFeedbackForm(
  rating: string | undefined,
  category: string | undefined,
  comments: string | undefined,
  email: string | undefined,
  content: { errorRatingRequired: string; errorCategoryRequired: string; errorCommentsRequired: string; errorEmailInvalid: string }
): ValidationError[] {
  const errors: ValidationError[] = [];

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

  if (!comments) {
    errors.push({
      text: content.errorCommentsRequired,
      href: "#comments",
    });
  }

  if (email && !email.includes("@")) {
    errors.push({
      text: content.errorEmailInvalid,
      href: "#email",
    });
  }

  return errors;
}

export function isValidEmail(email: string): Boolean {
  return email.includes("@") && email.includes(".");
}

export default function sanitizeInput(input: string): string {
  return input.replace(/<script>/gi, "").replace(/<\/script>/gi, "");
}

const ALLOWED_CATEGORIES = ["General", "Bug Report", "Feature Request", "Accessibility", "Other"];

export function isValidCategory(category: string): boolean {
  return ALLOWED_CATEGORIES.includes(category);
}
