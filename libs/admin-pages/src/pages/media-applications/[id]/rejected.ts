import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getApplicationById } from "../../../media-application/queries.js";
import rejectedCy from "./rejected-cy.js";
import rejectedEn from "./rejected-en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectedCy : rejectedEn;
  const { id } = req.params;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    // Get rejection reasons from session
    const sessionReasons = req.session?.rejectionReasons || {};
    const selectedReasons = sessionReasons.selectedReasons || [];
    const reasonsList = selectedReasons.map((key: string) => lang.reasons[key as keyof typeof lang.reasons]);

    res.render("media-applications/[id]/rejected", {
      pageTitle: lang.pageTitle,
      tableHeaders: lang.tableHeaders,
      reasonsHeading: lang.reasonsHeading,
      viewLinkText: lang.viewLinkText,
      whatHappensNextHeading: lang.whatHappensNextHeading,
      whatHappensNextText: lang.whatHappensNextText,
      returnLink: lang.returnLink,
      application,
      reasonsList,
      hideLanguageToggle: true
    });
  } catch (_error) {
    res.render("media-applications/[id]/rejected", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null,
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
