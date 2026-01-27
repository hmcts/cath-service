import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationWithDetails } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface LocationMetadataSession {
  locationMetadata?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
  };
  locationMetadataSearchErrors?: Array<{ text: string; href: string }>;
}

export const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as LocationMetadataSession;

  const errors = session.locationMetadataSearchErrors;
  delete session.locationMetadataSearchErrors;

  res.render("location-metadata-search/index", {
    ...content,
    errors
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const locationIdStr = req.body.locationId as string | undefined;
  const displayValue = req.body["location-search-display"] as string | undefined;
  const session = req.session as LocationMetadataSession;

  // Check if user typed something but didn't select from autocomplete
  if (displayValue && displayValue.trim().length >= 3 && (!locationIdStr || locationIdStr.trim() === "")) {
    // User typed text but no location was selected
    session.locationMetadataSearchErrors = [{ text: content.locationNotFound, href: "#location-search" }];
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  // Check if field is empty or too short
  if (!locationIdStr || locationIdStr.trim() === "") {
    session.locationMetadataSearchErrors = [{ text: content.locationNameRequired, href: "#location-search" }];
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  // Try to parse as location ID
  const locationId = Number.parseInt(locationIdStr.trim(), 10);
  if (Number.isNaN(locationId)) {
    // Invalid location ID format
    session.locationMetadataSearchErrors = [{ text: content.locationNotFound, href: "#location-search" }];
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  // Check if location exists
  const location = await getLocationWithDetails(locationId);
  if (!location) {
    session.locationMetadataSearchErrors = [{ text: content.locationNotFound, href: "#location-search" }];
    return res.redirect(`/location-metadata-search${language === "cy" ? "?lng=cy" : ""}`);
  }

  session.locationMetadata = {
    locationId: location.locationId,
    locationName: location.name,
    locationWelshName: location.welshName
  };

  res.redirect(`/location-metadata-manage${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
