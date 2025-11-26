import type { MulterError } from "multer";

declare global {
  namespace Express {
    interface Request {
      fileUploadError?: MulterError;
    }
  }
}
