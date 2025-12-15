import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactMetadata, getJsonContent, getRenderedTemplateUrl } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { escapeHtml, formatDateTime } from "../../services/formatting.js";
import "../../types/session.js";
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
    const jsonContent = await getJsonContent(artefactId);
    const renderedTemplateUrl = await getRenderedTemplateUrl(artefactId);

    if (!metadata) {
      return res.render("blob-explorer-json-file/index", {
        ...t,
        error: t.jsonFileError,
        locale
      });
    }

    res.render("blob-explorer-json-file/index", {
      ...t,
      metadata,
      jsonContent: jsonContent ? escapeHtml(JSON.stringify(jsonContent, null, 2)) : null,
      renderedTemplateUrl,
      formatDateTime,
      locale
    });
  } catch (error) {
    console.error("Error loading JSON file:", error);
    res.render("blob-explorer-json-file/index", {
      ...t,
      error: t.jsonFileError,
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
