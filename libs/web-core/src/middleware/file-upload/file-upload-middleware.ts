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
