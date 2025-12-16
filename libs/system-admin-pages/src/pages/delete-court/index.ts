import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getLocationWithDetails } from "../../delete-court/queries.js";
import { validateLocationSelected } from "../../delete-court/validation.js";
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

  res.render("delete-court/index", {
    ...content,
    errors: undefined
  });
};

export const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const locationIdStr = req.body.locationId as string | undefined;

  const validationError = validateLocationSelected(locationIdStr);
  if (validationError) {
    return res.render("delete-court/index", {
      ...content,
      errors: [{ ...validationError, text: content.courtNameRequired }]
    });
  }

  const locationId = Number.parseInt(locationIdStr!, 10);
  if (Number.isNaN(locationId)) {
    return res.render("delete-court/index", {
      ...content,
      errors: [{ text: content.courtNotFound, href: "#court-search" }]
    });
  }

  const location = await getLocationWithDetails(locationId);
  if (!location) {
    return res.render("delete-court/index", {
      ...content,
      errors: [{ text: content.courtNotFound, href: "#court-search" }]
    });
  }

  const session = req.session as DeleteCourtSession;
  session.deleteCourt = {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName
  };

  res.redirect(`/delete-court-confirm${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
