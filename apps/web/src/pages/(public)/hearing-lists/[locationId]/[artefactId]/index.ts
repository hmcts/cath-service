import { getFlatFileForDisplay } from "@hmcts/public-pages";
import { getParam } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "../../cy.js";
import { en } from "../../en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const locationId = getParam(req.params, "locationId");
  const artefactId = getParam(req.params, "artefactId");

  if (!locationId || !artefactId) {
    return res.status(400).render("hearing-lists/[locationId]/[artefactId]/index", {
      en,
      cy,
      locale,
      isError: true,
      error: t.errorInvalidRequest,
      title: t.errorTitle,
      backMessage: t.backMessage,
      backButton: t.backButton,
      locationId
    });
  }

  const result = await getFlatFileForDisplay(artefactId, locationId, locale, req.user);

  if ("error" in result) {
    if (result.error === "ACCESS_DENIED") {
      res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      return res.status(403).render("errors/403", {
        en: { title: en.error403Title, message: en.error403Message },
        cy: { title: cy.error403Title, message: cy.error403Message }
      });
    }

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

    return res.status(statusCode).render("hearing-lists/[locationId]/[artefactId]/index", {
      en,
      cy,
      locale,
      isError: true,
      error: errorMessage,
      title: t.errorTitle,
      backMessage: t.backMessage,
      backButton: t.backButton,
      locationId
    });
  }

  const downloadUrl = `/api/flat-file/${result.artefactId}/download`;
  const fileExtension = result.fileExtension || ".pdf";
  const isPdf = fileExtension.toLowerCase() === ".pdf";

  if (!isPdf) {
    return res.redirect(downloadUrl);
  }

  const pageTitle = `${result.listTypeName} - ${result.courtName}`;
  const contentType = "application/pdf";

  return res.render("hearing-lists/[locationId]/[artefactId]/index", {
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
    contentType,
    pdfNotSupportedMessage: t.pdfNotSupportedMessage,
    downloadLinkText: t.downloadLinkText
  });
};
