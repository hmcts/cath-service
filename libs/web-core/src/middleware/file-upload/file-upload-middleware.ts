import type { RequestHandler } from "express";
import multer from "multer";

const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface FileUploadOptions {
  maxFileSize?: number;
}

export function createFileUpload(options: FileUploadOptions = {}) {
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: { fileSize: maxFileSize }
  });
}

export function createFileUploadMiddleware(fieldName = "file", options: FileUploadOptions = {}): RequestHandler {
  const upload = createFileUpload(options);

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        req.fileUploadError = err;
      }
      next();
    });
  };
}
