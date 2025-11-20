import { getArtefactById, getUploadedFile, mockListTypes } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";

  if (!artefactId) {
    return res.redirect("/400");
  }

  const file = await getUploadedFile(artefactId);

  if (!file) {
    return res.redirect("/artefact-not-found");
  }

  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    return res.redirect("/artefact-not-found");
  }

  const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
  const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";
  const formattedDate = formatDateAndLocale(artefact.contentDate.toISOString(), locale);
  const languageLabel = artefact.language === "ENGLISH" ? "English (Saesneg)" : "Welsh (Cymraeg)";

  const pageTitle = `${listTypeName} ${formattedDate} - ${languageLabel}`;

  res.render("file-publication/index", {
    artefactId,
    fileName: pageTitle
  });
};
