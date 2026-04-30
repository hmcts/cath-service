import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationWithDetails, type LocationDetails } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { performLocationDeletion, VALIDATION_ERROR_CODES, type ValidationResult, validateLocationForDeletion } from "../../delete-court/service.js";
import { validateRadioSelection } from "../../delete-court/validation.js";
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

function getErrorTextForValidationCode(errorCode: string | undefined, content: Content): string {
  if (errorCode === VALIDATION_ERROR_CODES.ACTIVE_SUBSCRIPTIONS) {
    return content.activeSubscriptions;
  }
  if (errorCode === VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS) {
    return content.activeArtefacts;
  }
  return content.locationNotFound;
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
  res.render("delete-court-confirm/index", {
    ...content,
    locationName: getLocalizedLocationName(location, language),
    locationType: "Court",
    jurisdiction: getLocalizedJurisdictions(location, language) || "N/A",
    region: getLocalizedRegions(location, language) || "N/A",
    errors
  });
}

async function handleRadioValidationError(
  res: Response,
  content: Content,
  session: DeleteCourtSession,
  language: Language,
  validationError: { href: string }
): Promise<void> {
  const location = await getLocationWithDetails(session.deleteCourt!.locationId);
  if (!location) {
    delete session.deleteCourt;
    res.redirect(buildRedirectUrl("/delete-court", language));
    return;
  }

  renderConfirmationPage(res, content, location, language, [{ ...validationError, text: content.noRadioSelected }]);
}

async function handleLocationValidationError(
  res: Response,
  content: Content,
  session: DeleteCourtSession,
  language: Language,
  validationResult: ValidationResult
): Promise<void> {
  const location = validationResult.location;
  if (!location) {
    delete session.deleteCourt;
    res.redirect(buildRedirectUrl("/delete-court", language));
    return;
  }

  const errorText = getErrorTextForValidationCode(validationResult.errorCode, content);
  renderConfirmationPage(res, content, location, language, [{ text: errorText }]);
}

export const getHandler = async (req: Request, res: Response) => {
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

export const postHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;
  const validationError = validateRadioSelection(confirmDelete);

  if (validationError) {
    return await handleRadioValidationError(res, content, session, language, validationError);
  }

  if (confirmDelete === "no") {
    delete session.deleteCourt;
    return res.redirect(buildRedirectUrl("/system-admin-dashboard", language));
  }

  const validationResult = await validateLocationForDeletion(session.deleteCourt.locationId);

  if (!validationResult.isValid) {
    return await handleLocationValidationError(res, content, session, language, validationResult);
  }

  await performLocationDeletion(session.deleteCourt.locationId);

  // Set audit log flag
  req.auditMetadata = {
    shouldLog: true,
    action: "DELETE_COURT",
    entityInfo: `Name: ${session.deleteCourt.name}, Location ID: ${session.deleteCourt.locationId}`
  };

  res.redirect(buildRedirectUrl("/delete-court-success", language));
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
