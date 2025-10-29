import multer from "multer";

const ALLOWED_EXTENSIONS = /\.(csv|doc|docx|htm|html|json|pdf)$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const storage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_EXTENSIONS.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});
