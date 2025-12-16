import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getLocationWithDetails } from "../../delete-court/queries.js";
import { performLocationDeletion, validateLocationForDeletion } from "../../delete-court/service.js";
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

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(`/delete-court${language === "cy" ? "?lng=cy" : ""}`);
  }

  const location = await getLocationWithDetails(session.deleteCourt.locationId);
  if (!location) {
    delete session.deleteCourt;
    return res.redirect(`/delete-court${language === "cy" ? "?lng=cy" : ""}`);
  }

  const locationName = language === "cy" ? location.welshName : location.name;
  const regions = location.regions.map((r) => (language === "cy" ? r.welshName : r.name)).join(", ");
  const jurisdictions = location.subJurisdictions.map((sj) => (language === "cy" ? sj.jurisdictionWelshName : sj.jurisdictionName)).join(", ");

  res.render("delete-court-confirm/index", {
    ...content,
    locationName,
    locationType: "Court",
    jurisdiction: jurisdictions || "N/A",
    region: regions || "N/A",
    errors: undefined
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(`/delete-court${language === "cy" ? "?lng=cy" : ""}`);
  }

  const confirmDelete = req.body.confirmDelete as string | undefined;
  const validationError = validateRadioSelection(confirmDelete);

  if (validationError) {
    const location = await getLocationWithDetails(session.deleteCourt.locationId);
    if (!location) {
      delete session.deleteCourt;
      return res.redirect(`/delete-court${language === "cy" ? "?lng=cy" : ""}`);
    }

    const locationName = language === "cy" ? location.welshName : location.name;
    const regions = location.regions.map((r) => (language === "cy" ? r.welshName : r.name)).join(", ");
    const jurisdictions = location.subJurisdictions.map((sj) => (language === "cy" ? sj.jurisdictionWelshName : sj.jurisdictionName)).join(", ");

    return res.render("delete-court-confirm/index", {
      ...content,
      locationName,
      locationType: "Court",
      jurisdiction: jurisdictions || "N/A",
      region: regions || "N/A",
      errors: [{ ...validationError, text: content.noRadioSelected }]
    });
  }

  if (confirmDelete === "no") {
    delete session.deleteCourt;
    return res.redirect(`/system-admin-dashboard${language === "cy" ? "?lng=cy" : ""}`);
  }

  const validationResult = await validateLocationForDeletion(session.deleteCourt.locationId);

  if (!validationResult.isValid) {
    const location = validationResult.location;
    if (!location) {
      delete session.deleteCourt;
      return res.redirect(`/delete-court${language === "cy" ? "?lng=cy" : ""}`);
    }

    const locationName = language === "cy" ? location.welshName : location.name;
    const regions = location.regions.map((r) => (language === "cy" ? r.welshName : r.name)).join(", ");
    const jurisdictions = location.subJurisdictions.map((sj) => (language === "cy" ? sj.jurisdictionWelshName : sj.jurisdictionName)).join(", ");

    const errorText =
      validationResult.error === "There are active subscriptions for the given location."
        ? content.activeSubscriptions
        : validationResult.error === "There are active artefacts for the given location."
          ? content.activeArtefacts
          : validationResult.error || content.locationNotFound;

    return res.render("delete-court-confirm/index", {
      ...content,
      locationName,
      locationType: "Court",
      jurisdiction: jurisdictions || "N/A",
      region: regions || "N/A",
      errors: [{ text: errorText }]
    });
  }

  await performLocationDeletion(session.deleteCourt.locationId);

  res.redirect(`/delete-court-success${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
