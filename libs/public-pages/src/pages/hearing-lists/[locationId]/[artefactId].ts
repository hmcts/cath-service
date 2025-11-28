import type { Request, Response } from "express";
import { getFlatFileForDisplay } from "../../../flat-file/flat-file-service.js";
import { cy } from "../cy.js";
import { en } from "../en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { locationId, artefactId } = req.params;

  if (!locationId || !artefactId) {
    return res.status(400).render("hearing-lists/[locationId]/[artefactId]", {
      en,
      cy,
      locale,
      isError: true,
      error: t.errorInvalidRequest,
      title: t.errorTitle,
      backMessage: t.backMessage,
      backButton: t.backButton
    });
  }

  const result = await getFlatFileForDisplay(artefactId, locationId, locale);

  if ("error" in result) {
    let statusCode = 404;
    let errorMessage = t.errorNotFound;

    if (result.error === "NOT_FOUND" || result.error === "LOCATION_MISMATCH") {
      statusCode = 404;
      errorMessage = t.errorNotFound;
    } else if (result.error === "EXPIRED") {
      statusCode = 410;
      errorMessage = t.errorExpired;
    } else if (result.error === "FILE_NOT_FOUND") {
      statusCode = 404;
      errorMessage = t.errorFileNotFound;
    } else if (result.error === "NOT_FLAT_FILE") {
      statusCode = 400;
      errorMessage = t.errorNotFlatFile;
    }

    return res.status(statusCode).render("hearing-lists/[locationId]/[artefactId]", {
      en,
      cy,
      locale,
      isError: true,
      error: errorMessage,
      title: t.errorTitle,
      backMessage: t.backMessage,
      backButton: t.backButton
    });
  }

  const pageTitle = `${result.listTypeName} - ${result.courtName}`;
  const downloadUrl = `/api/flat-file/${result.artefactId}/download`;

  return res.render("hearing-lists/[locationId]/[artefactId]", {
    en,
    cy,
    locale,
    isError: false,
    pageTitle,
    courtName: result.courtName,
    listTypeName: result.listTypeName,
    contentDate: result.contentDate,
    downloadUrl,
    artefactId: result.artefactId,
    pdfNotSupportedMessage: t.pdfNotSupportedMessage,
    downloadLinkText: t.downloadLinkText
  });
};
