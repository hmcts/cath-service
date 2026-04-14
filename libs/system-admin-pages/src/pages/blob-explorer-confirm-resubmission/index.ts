import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactMetadata } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { formatDateTime } from "../../services/formatting.js";
import "../../types/session.js";
import { sendPublicationNotifications } from "../../services/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);
  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.redirect("/blob-explorer-locations");
  }

  try {
    const metadata = await getArtefactMetadata(artefactId);

    if (!metadata) {
      return res.render("blob-explorer-confirm-resubmission/index", {
        ...t,
        error: t.confirmError,
        locale
      });
    }

    res.render("blob-explorer-confirm-resubmission/index", {
      ...t,
      metadata,
      artefactId,
      formatDateTime,
      locale
    });
  } catch (error) {
    console.error("Error loading confirmation:", error);
    res.render("blob-explorer-confirm-resubmission/index", {
      ...t,
      error: t.confirmError,
      locale
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.redirect("/blob-explorer-locations");
  }

  try {
    await sendPublicationNotifications(artefactId);

    // Clear session data
    delete req.session.resubmissionArtefactId;

    // Set audit log flag
    req.auditMetadata = {
      shouldLog: true,
      action: "BLOB_EXPLORER_RESUBMISSION",
      entityInfo: `Artefact ID: ${artefactId}`
    };

    return res.redirect("/blob-explorer-resubmission-success");
  } catch (error) {
    console.error("Error triggering resubmission:", error);
    const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
    const t = getTranslations(locale);

    res.render("blob-explorer-confirm-resubmission/index", {
      ...t,
      error: t.confirmError,
      artefactId,
      locale
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
