import type { Request, Response } from "express";
import { createMediaApplication } from "../../media-application/database.js";
import type { MulterRequest } from "../../media-application/model.js";
import { saveIdProofFile } from "../../media-application/storage.js";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { validateForm } from "./validation.js";

function saveSession(session: any): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng as string) || "en";
  const content = locale === "cy" ? cy : en;

  const wasSubmitted = req.session.mediaApplicationSubmitted || false;
  const formData = req.session.mediaApplicationForm || {};
  const errors = req.session.mediaApplicationErrors || [];

  delete req.session.mediaApplicationErrors;

  if (!wasSubmitted) {
    delete req.session.mediaApplicationForm;
  }

  delete req.session.mediaApplicationSubmitted;

  res.render("create-media-account/index", {
    ...content,
    errors: errors.length > 0 ? errors : undefined,
    data: formData,
    locale
  });
};

export const POST = async (req: MulterRequest, res: Response) => {
  const locale = (req.query.lng as string) || "en";
  const content = locale === "cy" ? cy : en;

  const fullName = req.body.fullName as string | undefined;
  const email = req.body.email as string | undefined;
  const employer = req.body.employer as string | undefined;
  const termsAccepted = req.body.termsAccepted as string | undefined;
  const file = req.file;
  const fileUploadError = req.fileUploadError;

  const errors = validateForm(fullName, email, employer, termsAccepted, file, fileUploadError, content);

  if (errors.length > 0) {
    req.session.mediaApplicationErrors = errors;
    req.session.mediaApplicationForm = {
      fullName: fullName || "",
      email: email || "",
      employer: employer || "",
      termsAccepted: termsAccepted === "on"
    };
    await saveSession(req.session);
    return res.redirect(`/create-media-account?lng=${locale}`);
  }

  try {
    const applicationId = await createMediaApplication({
      fullName: fullName!.trim(),
      email: email!.trim(),
      employer: employer!.trim()
    });

    if (file) {
      await saveIdProofFile(applicationId, file.originalname, file.buffer);
    }

    req.session.mediaApplicationSubmitted = true;
    delete req.session.mediaApplicationForm;
    delete req.session.mediaApplicationErrors;
    await saveSession(req.session);

    res.redirect(`/account-request-submitted?lng=${locale}`);
  } catch (error) {
    console.error("Error creating media application:", error);
    res.status(500).render("errors/500", { locale });
  }
};
