import { prisma } from "@hmcts/postgres-prisma";
import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireVerifiedWithProvenance: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "VERIFIED" || !req.user.provenance) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefactId = (req.query.artefactId || req.body?.artefactId) as string;
  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
  if (!artefact) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
  if (!dbListType || !dbListType.allowedProvenance.split(",").includes(req.user.provenance)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  next();
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

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
export const POST: RequestHandler[] = [requireVerifiedWithProvenance, postHandler];
