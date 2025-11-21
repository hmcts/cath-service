import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { getArtefactsByLocation, mockListTypes } from "@hmcts/publication";
import type { Request, RequestHandler, Response } from "express";
import { LANGUAGE_LABELS, SENSITIVITY_LABELS } from "../../manual-upload/model.js";
import cy from "./cy.js";
import en from "./en.js";

function formatDateString(date: Date): string {
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateRangeString(from: Date, to: Date): string {
  return `${formatDateString(from)} to ${formatDateString(to)}`;
}

type SortColumn = "listType" | "courtName" | "contentDate" | "language" | "sensitivity";
type SortOrder = "asc" | "desc";

interface ArtefactRow {
  artefactId: string;
  listType: string;
  courtName: string;
  contentDate: string;
  contentDateRaw: Date;
  displayDates: string;
  language: string;
  sensitivity: string;
}

function sortArtefacts(rows: ArtefactRow[], sortBy: SortColumn, order: SortOrder): ArtefactRow[] {
  return [...rows].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "contentDate") {
      comparison = a.contentDateRaw.getTime() - b.contentDateRaw.getTime();
    } else {
      const aValue = a[sortBy].toLowerCase();
      const bValue = b[sortBy].toLowerCase();
      comparison = aValue.localeCompare(bValue);
    }

    return order === "asc" ? comparison : -comparison;
  });
}

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const sortBy = (req.query.sort as SortColumn) || "contentDate";
  const order = (req.query.order as SortOrder) || "desc";

  const artefacts = await getArtefactsByLocation(sessionData.locationId);

  const location = getLocationById(Number.parseInt(sessionData.locationId, 10));
  const courtName = location ? (locale === "cy" ? location.welshName : location.name) : sessionData.locationId;

  let artefactRows: ArtefactRow[] = artefacts.map((artefact) => {
    const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
    const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : String(artefact.listTypeId);

    return {
      artefactId: artefact.artefactId,
      listType: listTypeName,
      courtName,
      contentDate: formatDateString(artefact.contentDate),
      contentDateRaw: artefact.contentDate,
      displayDates: formatDateRangeString(artefact.displayFrom, artefact.displayTo),
      language: LANGUAGE_LABELS[artefact.language] || artefact.language,
      sensitivity: SENSITIVITY_LABELS[artefact.sensitivity] || artefact.sensitivity
    };
  });

  artefactRows = sortArtefacts(artefactRows, sortBy, order);

  res.render("remove-list-search-results/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    subHeading: lang.subHeading,
    showingResults: lang.showingResults,
    resultsText: lang.resultsText,
    noResults: lang.noResults,
    tableHeaders: lang.tableHeaders,
    continueButton: lang.continueButton,
    artefactRows,
    resultCount: artefacts.length,
    sortBy,
    order,
    hideLanguageToggle: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const selectedArtefacts = Array.isArray(req.body.artefacts) ? req.body.artefacts : req.body.artefacts ? [req.body.artefacts] : [];

  if (selectedArtefacts.length === 0) {
    const sortBy = (req.query.sort as SortColumn) || "contentDate";
    const order = (req.query.order as SortOrder) || "desc";

    const artefacts = await getArtefactsByLocation(sessionData.locationId);
    const location = getLocationById(Number.parseInt(sessionData.locationId, 10));
    const courtName = location ? (locale === "cy" ? location.welshName : location.name) : sessionData.locationId;

    let artefactRows: ArtefactRow[] = artefacts.map((artefact) => {
      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const listTypeName = listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : String(artefact.listTypeId);

      return {
        artefactId: artefact.artefactId,
        listType: listTypeName,
        courtName,
        contentDate: formatDateString(artefact.contentDate),
        contentDateRaw: artefact.contentDate,
        displayDates: formatDateRangeString(artefact.displayFrom, artefact.displayTo),
        language: LANGUAGE_LABELS[artefact.language] || artefact.language,
        sensitivity: SENSITIVITY_LABELS[artefact.sensitivity] || artefact.sensitivity
      };
    });

    artefactRows = sortArtefacts(artefactRows, sortBy, order);

    return res.render("remove-list-search-results/index", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      subHeading: lang.subHeading,
      showingResults: lang.showingResults,
      resultsText: lang.resultsText,
      noResults: lang.noResults,
      tableHeaders: lang.tableHeaders,
      continueButton: lang.continueButton,
      artefactRows,
      resultCount: artefacts.length,
      sortBy,
      order,
      errors: [
        {
          text: lang.errorNoSelection,
          href: "#artefacts"
        }
      ],
      errorSummaryTitle: lang.errorSummaryTitle,
      hideLanguageToggle: true
    });
  }

  req.session.removalData.selectedArtefacts = selectedArtefacts;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err: Error | null | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const lng = req.query.lng === "cy" ? "?lng=cy" : "";
  res.redirect(`/remove-list-confirmation${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
