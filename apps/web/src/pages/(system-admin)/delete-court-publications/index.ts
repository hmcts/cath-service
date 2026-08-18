import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationWithDetails, type LocationDetails } from "@hmcts/location";
import { AuditLogAction, performLocationPublicationsDeletion, validateDeleteCourtRadioSelection as validateRadioSelection } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface DeleteCourtSession {
  deleteCourt?: {
    locationId: number;
    name: string;
    welshName: string;
  };
}

type Language = "en" | "cy";
type Content = typeof en | typeof cy;

function buildRedirectUrl(path: string, language: Language): string {
  return `${path}${language === "cy" ? "?lng=cy" : ""}`;
}

function getLocalizedLocationName(location: LocationDetails, language: Language): string {
  return language === "cy" ? location.welshName : location.name;
}

function getLocalizedRegions(location: LocationDetails, language: Language): string {
  return location.regions.map((r) => (language === "cy" ? r.welshName : r.name)).join(", ");
}

function getLocalizedJurisdictions(location: LocationDetails, language: Language): string {
  return location.subJurisdictions.map((sj) => (language === "cy" ? sj.jurisdictionWelshName : sj.jurisdictionName)).join(", ");
}

function renderConfirmationPage(
  res: Response,
  content: Content,
  location: LocationDetails,
  language: Language,
  errors?: Array<{ text: string; href?: string }>
) {
  res.render("delete-court-publications/index", {
    ...content,
    locationName: getLocalizedLocationName(location, language),
    locationType: "Court",
    jurisdiction: getLocalizedJurisdictions(location, language) || "N/A",
    region: getLocalizedRegions(location, language) || "N/A",
    errors
  });
}

const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  const location = await getLocationWithDetails(session.deleteCourt.locationId);
  if (!location) {
    delete session.deleteCourt;
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  renderConfirmationPage(res, content, location, language);
};

const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;
  const validationError = validateRadioSelection(confirmDelete);

  if (validationError) {
    const location = await getLocationWithDetails(session.deleteCourt.locationId);
    if (!location) {
      delete session.deleteCourt;
      return res.redirect(buildRedirectUrl("/delete-court", language));
    }
    return renderConfirmationPage(res, content, location, language, [{ ...validationError, text: content.noRadioSelected }]);
  }

  if (confirmDelete === "no") {
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  await performLocationPublicationsDeletion(session.deleteCourt.locationId, session.deleteCourt.name, req.user?.email ?? "unknown");

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.DELETE_COURT_PUBLICATIONS,
    entityInfo: `Name: ${session.deleteCourt.name}, Location ID: ${session.deleteCourt.locationId}`
  };

  res.redirect(buildRedirectUrl("/delete-court-publications-success", language));
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
