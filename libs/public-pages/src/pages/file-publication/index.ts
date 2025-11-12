import { getUploadedFile } from "@hmcts/admin-pages";
import { getArtefactById, mockListTypes } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
import type { Request, Response } from "express";

const ERROR_CONTENT = {
  en: {
    pageTitle: "Page not found",
    bodyText: "You have attempted to view a page that no longer exists. This could be because the publication you are trying to view has expired.",
    buttonText: "Find a court or tribunal"
  },
  cy: {
    pageTitle: "Heb ddod o hyd i'r dudalen",
    bodyText: "Rydych wedi ceisio gweld tudalen sydd ddim yn bodoli mwyach. Gallai hyn fod oherwydd bod y cyhoeddiad rydych yn ceisio'i weld wedi dod i ben.",
    buttonText: "Dod o hyd i lys neu dribiwnlys"
  }
};

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const locale = res.locals.locale || "en";

  console.log("[file-publication] Received request for artefactId:", artefactId);

  if (!artefactId) {
    console.log("[file-publication] Missing artefactId, redirecting to 400");
    return res.redirect("/400");
  }

  const file = await getUploadedFile(artefactId);

  if (!file) {
    console.log("[file-publication] File not found for artefactId:", artefactId, "rendering error page");
    const content = locale === "cy" ? ERROR_CONTENT.cy : ERROR_CONTENT.en;
    return res.status(404).render("file-publication/artefact-not-found", content);
  }

  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    console.log("[file-publication] Artefact metadata not found for artefactId:", artefactId);
    const content = locale === "cy" ? ERROR_CONTENT.cy : ERROR_CONTENT.en;
    return res.status(404).render("file-publication/artefact-not-found", content);
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
