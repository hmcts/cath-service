import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  if (!req.session.removalSuccess) {
    const lng = req.query.lng === "cy" ? "?lng=cy" : "";
    return res.redirect(`/remove-list-search${lng}`);
  }

  delete req.session.removalSuccess;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err: Error | null | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res.render("remove-list-success/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    message: lang.message,
    nextSteps: lang.nextSteps,
    removeAnotherLink: lang.removeAnotherLink,
    uploadFileLink: lang.uploadFileLink,
    homeLink: lang.homeLink
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
