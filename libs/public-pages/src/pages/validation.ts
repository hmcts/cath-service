import type { ValidationError } from "../media-application/repository/model.js";
import type { cy } from "./create-media-account/cy.js";
import type { en } from "./create-media-account/en.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_REGEX = /^[a-zA-Z\s\-',.]+$/;
const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".pdf", ".png"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function validateForm(
  fullName: string | undefined,
  email: string | undefined,
  employer: string | undefined,
  termsAccepted: string | undefined,
  file: Express.Multer.File | undefined,
  fileUploadError: any | undefined,
  content: typeof en | typeof cy
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!fullName || fullName.trim().length === 0) {
    errors.push({
      text: content.errorFullNameRequired,
      href: "#fullName"
    });
  } else if (fullName.trim().length > 100) {
    errors.push({
      text: content.errorFullNameRequired,
      href: "#fullName"
    });
  } else if (!FULL_NAME_REGEX.test(fullName.trim())) {
    errors.push({
      text: content.errorFullNameRequired,
      href: "#fullName"
    });
  }

  if (!email || email.trim().length === 0 || !EMAIL_REGEX.test(email.trim())) {
    errors.push({
      text: content.errorEmailInvalid,
      href: "#email"
    });
  }

  if (!employer || employer.trim().length === 0) {
    errors.push({
      text: content.errorEmployerRequired,
      href: "#employer"
    });
  } else if (employer.trim().length > 120) {
    errors.push({
      text: content.errorEmployerRequired,
      href: "#employer"
    });
  }

  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors.push({
      text: content.errorFileSize,
      href: "#idProof"
    });
  } else if (!file) {
    errors.push({
      text: content.errorFileRequired,
      href: "#idProof"
    });
  } else {
    const fileExtension = file.originalname.substring(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      errors.push({
        text: content.errorFileRequired,
        href: "#idProof"
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        text: content.errorFileSize,
        href: "#idProof"
      });
    }
  }

  if (!termsAccepted || termsAccepted !== "on") {
    errors.push({
      text: content.errorTermsRequired,
      href: "#termsAccepted"
    });
  }

  return errors;
}
