import { getApplicationById, rejectApplication } from "@hmcts/admin-pages";
import { requireRole, USER_ROLES } from "@hmcts/auth";
import { extractNotifyError, sendMediaRejectionEmail } from "@hmcts/notification";
import { getParam } from "@hmcts/web-core";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy as rejectCy } from "./reject-cy.js";
import { en as rejectEn } from "./reject-en.js";

const MAX_REASON_LENGTH = 10000;

function stripHtmlTags(input: string): string {
  if (input.length > MAX_REASON_LENGTH) {
    throw new Error("Input exceeds maximum allowed length");
  }

  let result = "";
  let insideTag = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "<") {
      insideTag = true;
    } else if (char === ">") {
      insideTag = false;
    } else if (!insideTag) {
      result += char;
    }
  }

  return result;
}

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectCy : rejectEn;
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

    // Get rejection reasons from session
    const sessionReasons = req.session?.rejectionReasons || {};
    const selectedReasons = sessionReasons.selectedReasons || [];
    const reasonsList = selectedReasons.map((key: string) => lang.reasons[key as keyof typeof lang.reasons]);

    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      subheading: lang.subheading,
      reasonsHeading: lang.reasonsHeading,
      tableHeaders: lang.tableHeaders,
      viewLinkText: lang.viewLinkText,
      radioLegend: lang.radioLegend,
      radioOptions: lang.radioOptions,
      continueButton: lang.continueButton,
      emailPreview: lang.emailPreview,
      application,
      reasonsList
    });
  } catch (_error) {
    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? rejectCy : rejectEn;
  const id = getParam(req.params, "id");
  const { confirm } = req.body;
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

    if (!confirm) {
      // Get rejection reasons from session for re-rendering
      const sessionReasons = req.session?.rejectionReasons || {};
      const selectedReasons = sessionReasons.selectedReasons || [];
      const reasonsList = selectedReasons.map((key: string) => lang.reasons[key as keyof typeof lang.reasons]);

      return res.render("media-applications/[id]/reject", {
        pageTitle: lang.pageTitle,
        subheading: lang.subheading,
        reasonsHeading: lang.reasonsHeading,
        tableHeaders: lang.tableHeaders,
        viewLinkText: lang.viewLinkText,
        radioLegend: lang.radioLegend,
        radioOptions: lang.radioOptions,
        continueButton: lang.continueButton,
        emailPreview: lang.emailPreview,
        application,
        reasonsList,
        errors: [{ text: lang.errorMessages.selectOption, href: "#confirm" }]
      });
    }

    if (confirm === "no") {
      return res.redirect(`/media-applications/${id}`);
    }

    await rejectApplication(id);

    try {
      const sessionReasons = req.session?.rejectionReasons || {};
      const selectedReasons = sessionReasons.selectedReasons || [];
      const reasonsList = selectedReasons.map((key: string) => lang.reasons[key as keyof typeof lang.reasons]);
      // Strip HTML tags for email and format for GOV.UK Notify numbered list
      // reasonsList contains arrays where first element is the main reason HTML
      const rejectReasons = reasonsList
        .map((r: string | string[], index: number) => {
          const htmlText = Array.isArray(r) ? r[0] : r;
          return `${index + 1}. ${stripHtmlTags(htmlText)}`;
        })
        .join("\n");
      const linkToService = process.env.BASE_URL || "https://localhost:8080";

      await sendMediaRejectionEmail({
        fullName: application.name,
        email: application.email,
        rejectReasons,
        linkToService
      });
    } catch (error) {
      const { status, message } = extractNotifyError(error);
      console.error(`Failed to send rejection email: ${status} ${message}`);
    }

    res.redirect(`/media-applications/${id}/rejected`);
  } catch (_error) {
    res.render("media-applications/[id]/reject", {
      pageTitle: lang.pageTitle,
      error: lang.errorMessages.loadFailed,
      application: null
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]), postHandler];
