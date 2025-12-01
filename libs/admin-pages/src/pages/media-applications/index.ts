import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getPendingApplications } from "../../media-application/queries.js";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en; 

  try {
    const applications = await getPendingApplications();

    res.render("media-applications/index", {
      pageTitle: lang.pageTitle,
      tableHeaders: lang.tableHeaders,
      viewLink: lang.viewLink,
      noApplications: lang.noApplications,
      applications,
      hideLanguageToggle: true
    });
  } catch (_error) {
    res.render("media-applications/index", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      applications: [],
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
