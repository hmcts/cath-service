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
      isError: true,
      error: t.errorInvalidRequest,
      title: t.errorTitle
    });
  }

  const result = await getFlatFileForDisplay(artefactId, locationId, locale);

  if ("error" in result) {
    if (result.error === "NOT_FOUND" || result.error === "LOCATION_MISMATCH" || result.error === "EXPIRED") {
      return res.redirect("/publication-not-found");
    }

    let statusCode = 400;
    let errorMessage = t.errorNotFlatFile;

    if (result.error === "FILE_NOT_FOUND") {
      statusCode = 404;
      errorMessage = t.errorFileNotFound;
    }

    return res.status(statusCode).render("hearing-lists/[locationId]/[artefactId]", {
      en,
      cy,
      isError: true,
      error: errorMessage,
      title: t.errorTitle
    });
  }

  const pageTitle = result.artefactId;
  const downloadUrl = `/api/flat-file/${result.artefactId}/download`;

  return res.render("hearing-lists/[locationId]/[artefactId]", {
    en,
    cy,
    isError: false,
    pageTitle,
    courtName: result.courtName,
    listTypeName: result.listTypeName,
    contentDate: result.contentDate,
    downloadUrl,
    artefactId: result.artefactId
  });
};
