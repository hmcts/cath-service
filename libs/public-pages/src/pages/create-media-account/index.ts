import { writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";
import type { ValidationError } from "./validation.js";
import { validateForm } from "./validation.js";

const REPO_ROOT = path.join(process.cwd(), "../..");
const UPLOAD_DIR = path.join(REPO_ROOT, "apps/web/storage/temp/uploads");

export const GET = async (_req: Request, res: Response) => {
  res.render("create-media-account/index", {
    en,
    cy,
    data: {},
    errors: null
  });
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const formData = {
    fullName: req.body.fullName?.trim() || "",
    email: req.body.email?.trim().toLowerCase() || "",
    employer: req.body.employer?.trim() || "",
    termsAccepted: req.body.termsAccepted === "on" || req.body.termsAccepted === true
  };

  // Check for file upload errors from multer (e.g., file too large)
  const fileUploadError = (req as any).fileUploadError;
  const fileForValidation = fileUploadError?.code === "LIMIT_FILE_SIZE" ? undefined : req.file;

  const errors = validateForm(formData, fileForValidation, {
    fullName: t.errorFullNameRequired,
    email: t.errorEmailRequired,
    employer: t.errorEmployerRequired,
    fileRequired: t.errorFileRequired,
    fileType: t.errorFileType,
    fileSize: t.errorFileSize,
    terms: t.errorTermsRequired
  });

  // If multer rejected due to file size, add our custom error message
  if (fileUploadError?.code === "LIMIT_FILE_SIZE") {
    errors.push({
      field: "idProof",
      message: t.errorFileSize,
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

  try {
    const fileExtension = path.extname(req.file!.originalname);

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

    await writeFile(filePath, req.file!.buffer);

    await prisma.mediaApplication.update({
      where: { id: mediaApplication.id },
      data: { fileName }
    });

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
