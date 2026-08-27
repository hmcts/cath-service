import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import type { Request, RequestHandler, Response } from "express";
import { AccessReason, checkArtefactDataAccess, renderAccessDenied, renderNotFound } from "../publication-access.js";
import { createRequireVerifiedWithProvenance } from "./require-verified-with-provenance.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireVerifiedWithProvenance = createRequireVerifiedWithProvenance({ readBodyArtefactId: true });

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;

  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    return res.status(400).render("errors/400", { en, cy, locale });
  }

  const access = await checkArtefactDataAccess(req.user, artefactId);
  if (access.reason === AccessReason.ACCESS_DENIED) {
    return renderAccessDenied(res, locale);
  } else if (!access.allowed) {
    return renderNotFound(res, locale, { en, cy });
  }

  const t = locale === "cy" ? cy.disclaimer : en.disclaimer;

  res.render("list-download-disclaimer", {
    en,
    cy,
    t,
    artefactId,
    locale,
    errors: null
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.body.artefactId as string;
  const agreed = req.body.agreed;

  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    return res.status(400).render("errors/400", { en, cy, locale });
  }

  const access = await checkArtefactDataAccess(req.user, artefactId);
  if (access.reason === AccessReason.ACCESS_DENIED) {
    return renderAccessDenied(res, locale);
  } else if (!access.allowed) {
    return renderNotFound(res, locale, { en, cy });
  }

  const t = locale === "cy" ? cy.disclaimer : en.disclaimer;

  if (!agreed) {
    return res.render("list-download-disclaimer", {
      en,
      cy,
      t,
      artefactId,
      locale,
      errors: [{ text: t.errorCheckbox, href: "#agreed" }]
    });
  }

  const prefix = req.path.replace("/list-download-disclaimer", "");
  res.redirect(`${prefix}/list-download-files?artefactId=${artefactId}`);
};

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
export const POST: RequestHandler[] = [requireVerifiedWithProvenance, postHandler];
