import { requireRole, USER_ROLES } from "@hmcts/auth";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { getApplicationById } from "../../../media-application/queries.js";
import rejectReasonsCy from "./reject-reasons-cy.js";
import rejectReasonsEn from "./reject-reasons-en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectReasonsCy : rejectReasonsEn;
  const { id } = req.params;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    // Get any previously selected reasons from session
    const selectedReasons = req.session?.rejectionReasons || {};

    res.render("media-applications/[id]/reject-reasons", {
      pageTitle: lang.pageTitle,
      selectAllText: lang.selectAllText,
      checkboxLegend: lang.checkboxLegend,
      reasons: lang.reasons,
      continueButton: lang.continueButton,
      id,
      selectedReasons,
      hideLanguageToggle: true
    });
  } catch (_error) {
    res.render("media-applications/[id]/reject-reasons", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      hideLanguageToggle: true
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectReasonsCy : rejectReasonsEn;
  const { id } = req.params;

  // Collect selected reasons
  const selectedReasons: string[] = [];
  if (req.body.notAccredited) selectedReasons.push("notAccredited");
  if (req.body.invalidId) selectedReasons.push("invalidId");
  if (req.body.detailsMismatch) selectedReasons.push("detailsMismatch");

  // Validate that at least one reason is selected
  if (selectedReasons.length === 0) {
    return res.render("media-applications/[id]/reject-reasons", {
      pageTitle: lang.pageTitle,
      selectAllText: lang.selectAllText,
      checkboxLegend: lang.checkboxLegend,
      reasons: lang.reasons,
      continueButton: lang.continueButton,
      id,
      selectedReasons: req.body,
      errors: [{ text: lang.errorMessages.selectAtLeast, href: "#notAccredited" }],
      hideLanguageToggle: true
    });
  }

  // Store reasons in session for the confirmation page
  req.session.rejectionReasons = {
    notAccredited: req.body.notAccredited,
    invalidId: req.body.invalidId,
    detailsMismatch: req.body.detailsMismatch,
    selectedReasons
  };

  // Redirect to confirmation page
  res.redirect(`/media-applications/${id}/reject?lng=${req.query.lng || "en"}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), postHandler];
