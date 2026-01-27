import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationWithDetails } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import type { LocationMetadataSession } from "../location-metadata-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getLanguage = (req: Request) => (req.query.lng === "cy" ? "cy" : "en");
const getContent = (language: "cy" | "en") => (language === "cy" ? cy : en);
const getLanguageParam = (language: "cy" | "en") => (language === "cy" ? "?lng=cy" : "");

const isEmpty = (value: string | undefined) => !value || value.trim() === "";
const parseLocationId = (value: string) => Number.parseInt(value.trim(), 10);

export const getHandler = async (req: Request, res: Response) => {
  const language = getLanguage(req);
  const content = getContent(language);
  const session = req.session as LocationMetadataSession;

  const errors = session.locationMetadataSearchErrors;
  delete session.locationMetadataSearchErrors;

  res.render("location-metadata-search/index", { ...content, errors });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = getLanguage(req);
  const content = getContent(language);
  const session = req.session as LocationMetadataSession;

  const locationIdStr = req.body.locationId as string | undefined;
  const displayValue = req.body["location-search-display"] as string | undefined;

  const redirectWithError = (errorText: string) => {
    session.locationMetadataSearchErrors = [{ text: errorText, href: "#location-search" }];
    return res.redirect(`/location-metadata-search${getLanguageParam(language)}`);
  };

  const userTypedButDidNotSelect = displayValue && displayValue.trim().length >= 3 && isEmpty(locationIdStr);
  if (userTypedButDidNotSelect) {
    return redirectWithError(content.locationNotFound);
  }

  if (isEmpty(locationIdStr)) {
    return redirectWithError(content.locationNameRequired);
  }

  const locationId = parseLocationId(locationIdStr!);
  if (Number.isNaN(locationId)) {
    return redirectWithError(content.locationNotFound);
  }

  const location = await getLocationWithDetails(locationId);
  if (!location) {
    return redirectWithError(content.locationNotFound);
  }

  session.locationMetadata = {
    locationId: location.locationId,
    locationName: location.name,
    locationWelshName: location.welshName
  };

  res.redirect(`/location-metadata-manage${getLanguageParam(language)}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
