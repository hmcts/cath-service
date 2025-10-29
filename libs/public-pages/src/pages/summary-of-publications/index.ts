import type { Request, Response } from "express";
import { getLocationById } from "@hmcts/location";
// TODO: Re-enable when @hmcts/publication module is implemented
// import { mockListTypes, mockPublications } from "@hmcts/publication";
import { formatDateAndLocale } from "@hmcts/web-core";
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

  // TODO: Re-enable when @hmcts/publication module is implemented
  // Filter publications by location
  // const filteredPublications = mockPublications.filter((pub) => pub.locationId === locationId);
  // Map list types and format dates first
  // const publicationsWithDetails = filteredPublications.map((pub) => {
  //   const listType = mockListTypes.find((lt) => lt.id === pub.listType);
  //   const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";
  //   const languageLabel = pub.language === "ENGLISH" ? t.languageEnglish : t.languageWelsh;
  //   return {
  //     id: pub.id,
  //     listTypeName,
  //     listTypeId: pub.listType,
  //     contentDate: pub.contentDate,
  //     language: pub.language,
  //     formattedDate: formatDateAndLocale(pub.contentDate, locale),
  //     languageLabel
  //   };
  // });
  // Sort by list name, then by content date descending, then by language
  // publicationsWithDetails.sort((a, b) => {
  //   if (a.listTypeName !== b.listTypeName) {
  //     return a.listTypeName.localeCompare(b.listTypeName);
  //   }
  //   const dateComparison = new Date(b.contentDate).getTime() - new Date(a.contentDate).getTime();
  //   if (dateComparison !== 0) {
  //     return dateComparison;
  //   }
  //   return a.language.localeCompare(b.language);
  // });

  const publicationsWithDetails: never[] = [];

  res.render("summary-of-publications/index", {
    en,
    cy,
    title: pageTitle,
    noPublicationsMessage: t.noPublicationsMessage,
    publications: publicationsWithDetails
  });
};
