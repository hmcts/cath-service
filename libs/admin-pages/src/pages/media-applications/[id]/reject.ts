import { requireRole, USER_ROLES } from "@hmcts/auth";
import { sendMediaRejectionEmail } from "@hmcts/notification";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import "../../../media-application/model.js";
import { getApplicationById } from "../../../media-application/queries.js";
import { rejectApplication } from "../../../media-application/service.js";
import rejectCy from "./reject-cy.js";
import rejectEn from "./reject-en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectCy : rejectEn;
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
    const reasonsList = selectedReasons.flatMap((key: string) => lang.reasons[key as keyof typeof lang.reasons]);

    // Extract filename from proofOfIdPath
    const proofOfIdFileName = application.proofOfIdPath ? application.proofOfIdPath.split("/").pop() : null;

    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      subheading: lang.subheading,
      reasonsHeading: lang.reasonsHeading,
      tableHeaders: lang.tableHeaders,
      radioLegend: lang.radioLegend,
      radioOptions: lang.radioOptions,
      continueButton: lang.continueButton,
      application,
      reasonsList,
      proofOfIdFileName,
      hideLanguageToggle: true
    });
  } catch (_error) {
    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null,
      hideLanguageToggle: true
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectCy : rejectEn;
  const { id } = req.params;
  const { confirm } = req.body;

  try {
    const application = await getApplicationById(id);

    if (!application) {
      return res.status(404).render("errors/404", {
        error: lang.errorMessages.notFound
      });
    }

    if (!confirm) {
      // Get rejection reasons from session for re-rendering
      const sessionReasons = req.session?.rejectionReasons || {};
      const selectedReasons = sessionReasons.selectedReasons || [];
      const reasonsList = selectedReasons.flatMap((key: string) => lang.reasons[key as keyof typeof lang.reasons]);

      // Extract filename from proofOfIdPath
      const proofOfIdFileName = application.proofOfIdPath ? application.proofOfIdPath.split("/").pop() : null;

      return res.render("media-applications/[id]/reject", {
        pageTitle: lang.pageTitle,
        subheading: lang.subheading,
        reasonsHeading: lang.reasonsHeading,
        tableHeaders: lang.tableHeaders,
        radioLegend: lang.radioLegend,
        radioOptions: lang.radioOptions,
        continueButton: lang.continueButton,
        application,
        reasonsList,
        proofOfIdFileName,
        errors: [{ text: lang.errorMessages.selectOption, href: "#confirm" }],
        hideLanguageToggle: true
      });
    }

    if (confirm === "no") {
      return res.redirect(`/media-applications/${id}`);
    }

    await rejectApplication(id);

    try {
      const sessionReasons = req.session?.rejectionReasons || {};
      const selectedReasons = sessionReasons.selectedReasons || [];
      const reasonsList = selectedReasons.flatMap((key: string) => lang.reasons[key as keyof typeof lang.reasons]);
      const rejectReasons = reasonsList.join("\n");
      const linkToService = process.env.BASE_URL || "https://localhost:8080";

      await sendMediaRejectionEmail({
        fullName: application.name,
        email: application.email,
        rejectReasons,
        linkToService
      });
    } catch (error) {
      console.error("❌ Failed to send rejection email:", error);
    }

    res.redirect(`/media-applications/${id}/rejected`);
  } catch (_error) {
    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null,
      hideLanguageToggle: true
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), postHandler];
