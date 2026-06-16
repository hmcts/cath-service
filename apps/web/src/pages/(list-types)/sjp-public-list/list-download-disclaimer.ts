import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireVerified: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "VERIFIED") return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/sign-in");
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;

  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    return res.status(400).render("errors/400", { en, cy, locale });
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

export const GET: RequestHandler[] = [requireVerified, getHandler];
export const POST: RequestHandler[] = [requireVerified, postHandler];
