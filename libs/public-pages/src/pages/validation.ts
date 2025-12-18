import type { MulterError } from "multer";
import type { ValidationError } from "../media-application/repository/model.js";
import type { cy } from "./create-media-account/cy.js";
import type { en } from "./create-media-account/en.js";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const FULL_NAME_REGEX = /^[a-zA-Z\s\-',.]+$/;
const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".pdf", ".png"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function isMulterError(error: unknown): error is MulterError {
  return typeof error === "object" && error !== null && "code" in error;
}

function hasDoubleWhiteSpace(value: string): boolean {
  return /\s{2,}/.test(value);
}

function startsWithWhiteSpace(value: string): boolean {
  return /^\s/.test(value);
}

export function validateForm(
  fullName: string | undefined,
  email: string | undefined,
  employer: string | undefined,
  termsAccepted: string | undefined,
  file: Express.Multer.File | undefined,
  fileUploadError: MulterError | Error | undefined,
  content: typeof en | typeof cy
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Full name validation
  if (!fullName || fullName.trim().length === 0) {
    errors.push({
      text: content.errorFullNameBlank,
      href: "#fullName"
    });
  } else if (startsWithWhiteSpace(fullName)) {
    errors.push({
      text: content.errorFullNameWhiteSpace,
      href: "#fullName"
    });
  } else if (hasDoubleWhiteSpace(fullName)) {
    errors.push({
      text: content.errorFullNameDoubleWhiteSpace,
      href: "#fullName"
    });
  } else if (!fullName.trim().includes(" ")) {
    errors.push({
      text: content.errorFullNameWithoutWhiteSpace,
      href: "#fullName"
    });
  } else if (fullName.trim().length > 100 || !FULL_NAME_REGEX.test(fullName.trim())) {
    errors.push({
      text: content.errorFullNameBlank,
      href: "#fullName"
    });
  }

  // Email validation
  if (!email || email.trim().length === 0) {
    errors.push({
      text: content.errorEmailBlank,
      href: "#email"
    });
  } else if (startsWithWhiteSpace(email)) {
    errors.push({
      text: content.errorEmailStartWithWhiteSpace,
      href: "#email"
    });
  } else if (hasDoubleWhiteSpace(email)) {
    errors.push({
      text: content.errorEmailDoubleWhiteSpace,
      href: "#email"
    });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({
      text: content.errorEmailInvalid,
      href: "#email"
    });
  }

  // Employer validation
  if (!employer || employer.trim().length === 0) {
    errors.push({
      text: content.errorEmployerBlank,
      href: "#employer"
    });
  } else if (startsWithWhiteSpace(employer)) {
    errors.push({
      text: content.errorEmployerWhiteSpace,
      href: "#employer"
    });
  } else if (hasDoubleWhiteSpace(employer)) {
    errors.push({
      text: content.errorEmployerDoubleWhiteSpace,
      href: "#employer"
    });
  } else if (employer.trim().length > 120) {
    errors.push({
      text: content.errorEmployerBlank,
      href: "#employer"
    });
  }

  // File validation
  if (fileUploadError && isMulterError(fileUploadError) && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors.push({
      text: content.errorFileSize,
      href: "#idProof"
    });
  } else if (!file) {
    errors.push({
      text: content.errorFileBlank,
      href: "#idProof"
    });
  } else {
    const fileExtension = file.originalname.substring(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      errors.push({
        text: content.errorFileType,
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

  // Terms validation
  if (!termsAccepted || termsAccepted !== "on") {
    errors.push({
      text: content.errorTermsRequired,
      href: "#termsAccepted"
    });
  }

  return errors;
}
