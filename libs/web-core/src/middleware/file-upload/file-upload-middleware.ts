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
    limits: {
      fileSize: maxFileSize,
      fields: 10, // Allow up to 10 non-file fields
      fieldSize: 1024 * 1024, // 1MB per field
      parts: 20 // Total number of parts (files + fields)
    }
  });
}
