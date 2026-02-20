import { getLatestSjpLists } from "@hmcts/list-types-common";
import { getLocationById, getLocationMetadataByLocationId } from "@hmcts/location";
import { prisma } from "@hmcts/postgres";
import { filterPublicationsForSummary, mockListTypes, SJP_PUBLIC_LIST_ID } from "@hmcts/publication";
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
  const location = await getLocationById(locationId);
  if (!location) {
    return res.redirect("/400");
  }

  // Get location name based on locale
  const locationName = locale === "cy" ? location.welshName : location.name;
  const pageTitle = `${t.titlePrefix} ${locationName}${t.titleSuffix}`;

  // Query real artefacts from database, ordered by lastReceivedDate desc to get latest first
  const allArtefacts = await prisma.artefact.findMany({
    where: {
      locationId: locationId.toString(),
      displayFrom: { lte: new Date() },
      displayTo: { gte: new Date() }
    },
    orderBy: [{ lastReceivedDate: "desc" }]
  });

  // Filter artefacts based on user metadata access rights
  // System admins see all publications; CTSC/Local admins see only PUBLIC; verified users see based on provenance
  const artefacts = filterPublicationsForSummary(req.user, allArtefacts, mockListTypes);

  // Map list types and format dates
  const publicationsWithDetails = artefacts.map((artefact: (typeof artefacts)[number]) => {
    const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
    const listTypeName = locale === "cy" ? listType?.welshFriendlyName || "Unknown" : listType?.englishFriendlyName || "Unknown";

    // Get language label based on publication language
    const languageLabel = artefact.language === "ENGLISH" ? t.languageEnglish : t.languageWelsh;

    return {
      id: artefact.artefactId,
      listTypeName,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      language: artefact.language,
      formattedDate: formatDateAndLocale(artefact.contentDate.toISOString(), locale),
      languageLabel,
      urlPath: listType?.urlPath,
      isFlatFile: artefact.isFlatFile,
      locationId: artefact.locationId
    };
  });

  // Deduplicate: keep only the latest publication for each unique combination of list type, content date, and language
  const seen = new Set<string>();
  const uniquePublications = publicationsWithDetails.filter((pub: (typeof publicationsWithDetails)[number]) => {
    const key = `${pub.listTypeId}-${pub.contentDate.toISOString()}-${pub.language}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Fetch SJP lists for this location
  const sjpLists = await getLatestSjpLists();
  const sjpListsForLocation = sjpLists.filter((list) => list.locationId === locationId && list.listType === "public");

  // Add SJP lists to publications
  const sjpPublications = sjpListsForLocation.map((sjpList) => ({
    id: sjpList.artefactId,
    listTypeName: "Single Justice Procedure",
    listTypeId: SJP_PUBLIC_LIST_ID,
    contentDate: sjpList.contentDate,
    language: "ENGLISH",
    formattedDate: formatDateAndLocale(sjpList.contentDate.toISOString(), locale),
    languageLabel: t.languageEnglish,
    urlPath: "sjp-public-list",
    isSjp: true
  }));

  // Combine regular publications with SJP publications
  const allPublications = [...uniquePublications, ...sjpPublications];

  // Sort by list name, then by content date descending, then by language
  allPublications.sort((a: (typeof allPublications)[number], b: (typeof allPublications)[number]) => {
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

  // Fetch location metadata for caution and no-list messages
  const locationMetadata = await getLocationMetadataByLocationId(locationId);

  // Determine which messages to display based on locale
  const cautionMessage = locale === "cy" ? locationMetadata?.welshCautionMessage : locationMetadata?.cautionMessage;
  const noListMessage = locale === "cy" ? locationMetadata?.welshNoListMessage : locationMetadata?.noListMessage;

  res.render("summary-of-publications/index", {
    en,
    cy,
    title: pageTitle,
    noPublicationsMessage: t.noPublicationsMessage,
    selectListMessage: t.selectListMessage,
    publications: allPublications,
    cautionMessage,
    noListMessage,
    factLinkText: t.factLinkText,
    factLinkUrl: t.factLinkUrl,
    factAdditionalText: t.factAdditionalText
  });
};
