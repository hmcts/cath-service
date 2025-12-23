import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { APPLICATION_STATUS } from "../../../media-application/model.js";
import { getApplicationById } from "../../../media-application/queries.js";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const { id } = req.params;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      return res.render("media-applications/[id]/index", {
        pageTitle: lang.pageTitle,
        error: lang.errorMessages.alreadyReviewed,
        application: null,
        hideLanguageToggle: true
      });
    }

    res.render("media-applications/[id]/index", {
      pageTitle: lang.pageTitle,
      tableHeaders: lang.tableHeaders,
      proofOfIdText: lang.proofOfIdText,
      viewProofOfId: lang.viewProofOfId,
      approveButton: lang.approveButton,
      rejectButton: lang.rejectButton,
      fileNotAvailable: lang.fileNotAvailable,
      application,
      proofOfIdFilename: application.proofOfIdOriginalName,
      hideLanguageToggle: true
    });
  } catch (_error) {
    res.render("media-applications/[id]/index", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null,
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
