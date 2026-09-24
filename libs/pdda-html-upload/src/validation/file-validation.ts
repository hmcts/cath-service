import path from "node:path";
import type { FileValidationResult } from "../types.js";

const ALLOWED_EXTENSIONS = [".htm", ".html"];
const UNSUPPORTED_FORMAT_MESSAGE = "File format is not supported for LCSU.";

/**
 * Mirrors the incumbent's `validateLcsuUploadFile`: HTM/HTML only, case-insensitive.
 * The artefact type is decided by the `x-type` header before this is called, so it
 * is deliberately not a parameter.
 */
export function validatePddaHtmlUpload(file: Express.Multer.File | undefined): FileValidationResult {
  if (!file) {
    return {
      valid: false,
      error: "Select an HTM or HTML file to upload"
    };
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      valid: false,
      error: UNSUPPORTED_FORMAT_MESSAGE
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "Select an HTM or HTML file to upload"
    };
  }

  const maxFileSize = Number.parseInt(process.env.PDDA_HTML_MAX_FILE_SIZE || "10485760", 10);
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: "The uploaded file is too large"
    };
  }

  if (file.originalname.includes("../") || file.originalname.includes("..\\")) {
    return {
      valid: false,
      error: "Invalid filename"
    };
  }

  return { valid: true };
}
