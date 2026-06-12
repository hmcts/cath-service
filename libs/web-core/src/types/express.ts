import type { MulterError } from "multer";

declare global {
  namespace Express {
    interface Request {
      fileUploadError?: MulterError;

      auditMetadata?: {
        shouldLog?: boolean;
        action?: string;
        entityInfo?: string;
        [key: string]: string | number | boolean | undefined;
      };

      csrfToken?: () => string;
    }
  }
}
