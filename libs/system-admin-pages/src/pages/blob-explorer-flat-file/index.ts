import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactMetadata, getFlatFileUrl } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import "../../types/session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);
  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.redirect("/blob-explorer-locations");
  }

  try {
    const metadata = await getArtefactMetadata(artefactId);
    const flatFileUrl = await getFlatFileUrl(artefactId);

    if (!metadata) {
      return res.render("blob-explorer-flat-file/index", {
        ...t,
        error: t.flatFileError,
        locale
      });
    }

    res.render("blob-explorer-flat-file/index", {
      ...t,
      metadata,
      flatFileUrl,
      formatDateTime,
      locale
    });
  } catch (error) {
    console.error("Error loading flat file:", error);
    res.render("blob-explorer-flat-file/index", {
      ...t,
      error: t.flatFileError,
      locale
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.redirect("/blob-explorer-locations");
  }

  // Store artefact ID in session for confirmation page
  req.session.resubmissionArtefactId = artefactId;

  return res.redirect(`/blob-explorer-confirm-resubmission?artefactId=${artefactId}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
