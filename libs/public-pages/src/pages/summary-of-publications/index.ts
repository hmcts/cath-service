import path from "node:path";
import { getLocationById } from "@hmcts/location";
import { getArtefactsByLocationId, getUploadedFile, mockListTypes } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Validate locationId presence
  const locationIdParam = req.query.locationId;
  if (!locationIdParam) {
    return res.redirect("/400");
  }

  // Validate locationId format
  const locationId = Number.parseInt(locationIdParam as string, 10);
  if (Number.isNaN(locationId)) {
    return res.redirect("/400");
  }

  // Fetch location
  const location = getLocationById(locationId);
  if (!location) {
    return res.redirect("/400");
  }

  // Get location name based on locale
  const locationName = locale === "cy" ? location.welshName : location.name;
  const pageTitle = `${t.titlePrefix} ${locationName}${t.titleSuffix}`;

  // Fetch publications from database by location
  const artefacts = await getArtefactsByLocationId(locationId.toString());

  // Map list types, format dates, and fetch file information
  const publicationsWithDetails = await Promise.all(
    artefacts.map(async (artefact) => {
      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";

      // Get language label based on publication language
      const languageLabel = artefact.language === "ENGLISH" ? t.languageEnglish : t.languageWelsh;

      // Fetch file information to determine file type
      const file = await getUploadedFile(artefact.artefactId);
      const fileExtension = file ? path.extname(file.fileName).toLowerCase() : "";
      const isPdf = fileExtension === ".pdf";

      return {
        id: artefact.artefactId,
        listTypeName,
        listTypeId: artefact.listTypeId,
        contentDate: artefact.contentDate,
        language: artefact.language,
        formattedDate: formatDateAndLocale(artefact.contentDate.toISOString(), locale),
        languageLabel,
        isPdf
      };
    })
  );

  // Sort by list name, then by content date descending, then by language
  publicationsWithDetails.sort((a, b) => {
    // First sort by list name
    if (a.listTypeName !== b.listTypeName) {
      return a.listTypeName.localeCompare(b.listTypeName);
    }
    // Then by date descending (newest first)
    const dateComparison = new Date(b.contentDate).getTime() - new Date(a.contentDate).getTime();
    if (dateComparison !== 0) {
      return dateComparison;
    }
    // Finally by language
    return a.language.localeCompare(b.language);
  });

  res.render("summary-of-publications/index", {
    en,
    cy,
    title: pageTitle,
    noPublicationsMessage: t.noPublicationsMessage,
    opensInNewWindow: t.opensInNewWindow,
    instructionText: t.instructionText,
    publications: publicationsWithDetails
  });
};
