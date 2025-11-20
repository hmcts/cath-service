import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import type { ValidationError } from "../../reference-data-upload/model.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function saveSession(session: any): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);

  const errors = req.session.uploadErrors || [];
  delete req.session.uploadErrors;
  delete req.session.uploadData;

  res.render("reference-data-upload/index", {
    ...t,
    errors: errors.length > 0 ? errors : undefined,
    locale
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);

  const errors: ValidationError[] = [];

  // Check for multer errors (e.g., file too large)
  const fileUploadError = (req as any).fileUploadError;

  if (fileUploadError && fileUploadError.code === "LIMIT_FILE_SIZE") {
    errors.push({ text: t.errorMessages.fileSize, href: "#file" });
  } else if (!req.file) {
    errors.push({ text: t.errorMessages.fileRequired, href: "#file" });
  } else {
    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      errors.push({ text: t.errorMessages.fileType, href: "#file" });
    }
  }

  if (errors.length > 0) {
    req.session.uploadErrors = errors;
    try {
      await saveSession(req.session);
      return res.redirect("/reference-data-upload");
    } catch (error) {
      console.error("Error saving session:", error);
      return res.status(500).render("reference-data-upload/index", {
        ...t,
        errors: [{ text: t.errorMessages.sessionError, href: "#" }],
        locale
      });
    }
  }

  // Store file in session
  req.session.uploadData = {
    fileBuffer: req.file!.buffer,
    fileName: req.file!.originalname,
    mimeType: req.file!.mimetype
  };

  try {
    await saveSession(req.session);
    return res.redirect("/reference-data-upload-summary");
  } catch (error) {
    console.error("Error saving session:", error);
    req.session.uploadErrors = [{ text: t.errorMessages.sessionError, href: "#" }];
    return res.redirect("/reference-data-upload");
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
