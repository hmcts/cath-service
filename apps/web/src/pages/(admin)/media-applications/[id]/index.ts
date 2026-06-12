import { APPLICATION_STATUS, getApplicationById } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getParam } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const id = getParam(req.params, "id");

  if (!id) {
    return res.status(400).render("errors/400");
  }

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
        application: null
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
      proofOfIdFilename: application.proofOfIdOriginalName
    });
  } catch (_error) {
    res.render("media-applications/[id]/index", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
