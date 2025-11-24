import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";
import type { ValidationError } from "./validation.js";
import { validateForm } from "./validation.js";

const REPO_ROOT = path.join(process.cwd(), "../..");
const UPLOAD_DIR = path.join(REPO_ROOT, "apps/web/storage/temp/uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Ignore error if directory already exists
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

export const GET = async (_req: Request, res: Response) => {
  res.render("create-media-account/index", {
    en,
    cy,
    data: {},
    errors: null
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals?.locale || "en";
  const t = locale === "cy" ? cy : en;

  const formData = {
    fullName: req.body.fullName?.trim() || "",
    email: req.body.email?.trim().toLowerCase() || "",
    employer: req.body.employer?.trim() || "",
    termsAccepted: req.body.termsAccepted === "on" || req.body.termsAccepted === true
  };

  // Check for file upload errors from multer
  const fileUploadError = (req as any).fileUploadError;
  let fileForValidation = req.file;

  // Map multer error codes to user-friendly messages
  if (fileUploadError) {
    fileForValidation = undefined; // Treat any multer error as no file uploaded for validation

    const multerErrorMap: Record<string, string> = {
      LIMIT_FILE_SIZE: t.errorFileSize,
      LIMIT_FILE_COUNT: t.errorFileTooMany,
      LIMIT_FIELD_SIZE: t.errorFileUploadFailed,
      LIMIT_UNEXPECTED_FILE: t.errorFileUploadFailed
    };

    // Log the original error if it's an unexpected type
    if (!multerErrorMap[fileUploadError.code]) {
      console.error("Unhandled multer error in create-media-account:", {
        code: fileUploadError.code,
        message: fileUploadError.message,
        field: fileUploadError.field
      });
    }
  }

  let errors = validateForm(formData, fileForValidation, {
    fullName: t.errorFullNameRequired,
    email: t.errorEmailRequired,
    employer: t.errorEmployerRequired,
    fileRequired: t.errorFileRequired,
    fileType: t.errorFileType,
    fileSize: t.errorFileSize,
    terms: t.errorTermsRequired
  });

  // If multer reported an error, replace any generic file error with the specific multer error
  if (fileUploadError) {
    const multerErrorMap: Record<string, string> = {
      LIMIT_FILE_SIZE: t.errorFileSize,
      LIMIT_FILE_COUNT: t.errorFileTooMany,
      LIMIT_FIELD_SIZE: t.errorFileUploadFailed,
      LIMIT_UNEXPECTED_FILE: t.errorFileUploadFailed
    };

    const errorMessage = multerErrorMap[fileUploadError.code] || t.errorFileUploadFailed;

    // Remove any existing idProof errors to avoid duplicates
    errors = errors.filter((error) => error.field !== "idProof");

    // Add the specific multer error
    errors.push({
      field: "idProof",
      message: errorMessage,
      href: "#idProof"
    });
  }

  if (errors.length > 0) {
    const errorMap: Record<string, string> = {};
    for (const error of errors) {
      errorMap[error.field] = error.message;
    }

    return res.render("create-media-account/index", {
      en,
      cy,
      data: formData,
      errors: errors.map((error: ValidationError) => ({
        text: error.message,
        href: error.href
      })),
      errorFullName: errorMap.fullName,
      errorEmail: errorMap.email,
      errorEmployer: errorMap.employer,
      errorIdProof: errorMap.idProof,
      errorTermsAccepted: errorMap.termsAccepted
    });
  }

  // Defensive check: file should exist at this point (validated above)
  if (!req.file) {
    console.error("Unexpected missing file after validation passed");
    return res.status(400).render("create-media-account/index", {
      en,
      cy,
      data: formData,
      errors: [{ text: t.errorFileRequired, href: "#idProof" }],
      errorIdProof: t.errorFileRequired
    });
  }

  try {
    const fileExtension = path.extname(req.file.originalname);

    const mediaApplication = await prisma.mediaApplication.create({
      data: {
        fullName: formData.fullName,
        email: formData.email,
        employer: formData.employer,
        fileName: "",
        status: "PENDING"
      }
    });

    const fileName = `${mediaApplication.id}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Update DB with fileName before writing file to avoid orphaned files
    await prisma.mediaApplication.update({
      where: { id: mediaApplication.id },
      data: { fileName }
    });

    try {
      // Ensure upload directory exists
      await ensureUploadDir();
      await writeFile(filePath, req.file.buffer);
    } catch (fileError) {
      // File write failed - clear the fileName in DB to maintain consistency
      console.error("File write failed, clearing fileName from database:", fileError);
      await prisma.mediaApplication.update({
        where: { id: mediaApplication.id },
        data: { fileName: "" }
      });
      throw fileError; // Re-throw to be caught by outer catch
    }

    const redirectUrl = locale === "cy" ? "/account-request-submitted?lng=cy" : "/account-request-submitted";
    return res.redirect(303, redirectUrl);
  } catch (error) {
    console.error("Error creating media application:", error);
    return res.status(500).render("errors/500", {
      en: { title: "Server Error" },
      cy: { title: "Gwall Gweinydd" }
    });
  }
};
