import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationWithDetails } from "@hmcts/location";
import type { JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const isEmpty = (value: string | undefined) => !value || value.trim() === "";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  const errors = session.locationJurisdictionSearchErrors;
  delete session.locationJurisdictionSearchErrors;

  res.render("location-jurisdiction-search/index", { en, cy, t, errors });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  const locationIdStr = req.body.locationId as string | undefined;
  const displayValue = req.body["location-search-display"] as string | undefined;

  const redirectWithError = (errorText: string) => {
    session.locationJurisdictionSearchErrors = [{ text: errorText, href: "#location-search" }];
    return res.redirect("/location-jurisdiction-search");
  };

  const userTypedButDidNotSelect = displayValue && displayValue.trim().length >= 3 && isEmpty(locationIdStr);
  if (userTypedButDidNotSelect) {
    return redirectWithError(t.locationNotFound);
  }

  if (isEmpty(locationIdStr)) {
    return redirectWithError(t.locationNameRequired);
  }

  const locationId = Number.parseInt(locationIdStr!, 10);
  if (Number.isNaN(locationId)) {
    return redirectWithError(t.locationNotFound);
  }

  const location = await getLocationWithDetails(locationId);
  if (!location) {
    return redirectWithError(t.locationNotFound);
  }

  session.locationJurisdiction = {
    locationId: location.locationId,
    locationName: location.name,
    locationWelshName: location.welshName
  };

  res.redirect("/location-jurisdiction-manage");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
