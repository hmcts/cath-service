import { LANGUAGE_LABELS, SENSITIVITY_LABELS } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { getArtefactsByLocation } from "@hmcts/publication";
import { findAllListTypes } from "@hmcts/system-admin-pages";
import { saveSession } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

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

async function buildArtefactRows(
  locationId: string,
  locale: string,
  sortBy: SortColumn,
  order: SortOrder
): Promise<{ artefactRows: ArtefactRow[]; resultCount: number; courtName: string }> {
  const artefacts = await getArtefactsByLocation(locationId);
  const location = await getLocationById(Number.parseInt(locationId, 10));
  const courtName = location ? (locale === "cy" ? location.welshName : location.name) : locationId;

  const listTypes = await findAllListTypes();
  const listTypeMap = new Map(listTypes.map((lt) => [lt.id, lt]));

  const artefactRows = sortArtefacts(
    artefacts.map((artefact) => {
      const listType = listTypeMap.get(artefact.listTypeId);
      let listTypeName = String(artefact.listTypeId);
      if (listType) {
        if (locale === "cy") {
          listTypeName = listType.welshFriendlyName || listType.friendlyName || String(artefact.listTypeId);
        } else {
          listTypeName = listType.friendlyName || String(artefact.listTypeId);
        }
      }

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
    }),
    sortBy,
    order
  );

  return { artefactRows, resultCount: artefacts.length, courtName };
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId) {
    const lng = locale === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const sortBy = (req.query.sort as SortColumn) || "contentDate";
  const order = (req.query.order as SortOrder) || "desc";

  const { artefactRows, resultCount } = await buildArtefactRows(sessionData.locationId, locale, sortBy, order);

  res.render("remove-list-search-results/index", {
    pageTitle: t.pageTitle,
    heading: t.heading,
    subHeading: t.subHeading,
    showingResults: t.showingResults,
    resultsText: t.resultsText,
    noResults: t.noResults,
    tableHeaders: t.tableHeaders,
    continueButton: t.continueButton,
    artefactRows,
    resultCount,
    sortBy,
    order,
    isDefaultSort: req.query.sort === undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const sessionData = req.session.removalData;
  if (!sessionData || !sessionData.locationId) {
    const lng = locale === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  const selectedArtefacts = Array.isArray(req.body.artefacts) ? req.body.artefacts : req.body.artefacts ? [req.body.artefacts] : [];

  if (selectedArtefacts.length === 0) {
    const sortBy = (req.query.sort as SortColumn) || "contentDate";
    const order = (req.query.order as SortOrder) || "desc";

    const { artefactRows, resultCount } = await buildArtefactRows(sessionData.locationId, locale, sortBy, order);

    return res.render("remove-list-search-results/index", {
      pageTitle: t.pageTitle,
      heading: t.heading,
      subHeading: t.subHeading,
      showingResults: t.showingResults,
      resultsText: t.resultsText,
      noResults: t.noResults,
      tableHeaders: t.tableHeaders,
      continueButton: t.continueButton,
      artefactRows,
      resultCount,
      sortBy,
      order,
      isDefaultSort: req.query.sort === undefined,
      errors: [
        {
          text: t.errorNoSelection,
          href: "#artefacts"
        }
      ],
      errorSummaryTitle: t.errorSummaryTitle
    });
  }

  sessionData.selectedArtefacts = selectedArtefacts;

  await saveSession(req.session);

  const lng = locale === "cy" ? "?lng=cy" : "";
  res.redirect(`/remove-list-confirmation${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
