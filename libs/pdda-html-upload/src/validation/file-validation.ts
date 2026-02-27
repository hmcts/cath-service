import path from "node:path";
import type { FileValidationResult } from "../types.js";

export function validatePddaHtmlUpload(artefactType: unknown, file: Express.Multer.File | undefined): FileValidationResult {
  if (artefactType !== "LCSU") {
    return {
      valid: false,
      error: "ArtefactType must be LCSU for HTM/HTML uploads"
    };
  }

  if (!file) {
    return {
      valid: false,
      error: "Select an HTM or HTML file to upload"
    };
  }

  const allowedExtensions = [".htm", ".html"];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: "The uploaded file must be an HTM or HTML file"
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
