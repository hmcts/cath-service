import multer from "multer";

const DEFAULT_ALLOWED_EXTENSIONS = /\.(csv|doc|docx|htm|html|json|pdf)$/i;
const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface FileUploadOptions {
  allowedExtensions?: RegExp;
  maxFileSize?: number;
}

export function createFileUpload(options: FileUploadOptions = {}) {
  const allowedExtensions = options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  const storage = multer.memoryStorage();

  const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSize }
  });
}
