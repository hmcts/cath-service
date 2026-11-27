import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactMetadata, getFlatFileUrl } from "@hmcts/publication";
import "@hmcts/web-core";
import { buildResendButtons, formatDateTime } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
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
      resendButtons: buildResendButtons(artefactId, locale, {
        resubmit: t.resubmitButton,
        courtel: t.sendToCourtelButton,
        "third-party": t.sendToThirdPartyButton,
        email: t.sendSubscriptionEmailButton
      }),
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

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
