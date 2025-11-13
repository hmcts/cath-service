import { getUploadedFile } from "@hmcts/admin-pages";
import { getArtefactById, mockListTypes } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  console.log("[file-publication] Received request for artefactId:", artefactId);

  if (!artefactId) {
    console.log("[file-publication] Missing artefactId, redirecting to 400");
    return res.redirect("/400");
  }

  const file = await getUploadedFile(artefactId);

  if (!file) {
    console.log("[file-publication] File not found for artefactId:", artefactId, "rendering error page");
    return res.status(404).render("file-publication/artefact-not-found", t);
  }

  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    console.log("[file-publication] Artefact metadata not found for artefactId:", artefactId);
    return res.status(404).render("file-publication/artefact-not-found", t);
  }

  const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
  const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";
  const formattedDate = formatDateAndLocale(artefact.contentDate.toISOString(), locale);
  const languageLabel = artefact.language === "ENGLISH" ? "English (Saesneg)" : "Welsh (Cymraeg)";

  const pageTitle = `${listTypeName} ${formattedDate} - ${languageLabel}`;

  console.log("[file-publication] Rendering template with title:", pageTitle);

  res.render("file-publication/index", {
    artefactId,
    fileName: pageTitle
  });
};
