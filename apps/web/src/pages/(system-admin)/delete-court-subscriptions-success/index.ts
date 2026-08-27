import { requireRole, USER_ROLES } from "@hmcts/auth";
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

function buildRedirectUrl(path: string, language: Language): string {
  return `${path}${language === "cy" ? "?lng=cy" : ""}`;
}

const getHandler = async (req: Request, res: Response) => {
  const language: Language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as DeleteCourtSession;

  if (!session.deleteCourt) {
    return res.redirect(buildRedirectUrl("/delete-court", language));
  }

  const locationName = language === "cy" ? session.deleteCourt.welshName : session.deleteCourt.name;

  res.render("delete-court-subscriptions-success/index", {
    ...content,
    locationName
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
