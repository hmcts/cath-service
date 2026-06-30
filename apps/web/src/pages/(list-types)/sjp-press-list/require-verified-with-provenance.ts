import { prisma } from "@hmcts/postgres-prisma";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createRequireVerifiedWithProvenance(opts: { allowSystemAdmin?: boolean; readBodyArtefactId?: boolean } = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (opts.allowSystemAdmin && req.user?.role === "SYSTEM_ADMIN") {
      return next();
    }

    if (req.user?.role !== "VERIFIED" || !req.user.provenance) {
      req.session.returnTo = req.originalUrl;
      return res.redirect("/sign-in");
    }

    const artefactId = (opts.readBodyArtefactId ? req.query.artefactId || req.body?.artefactId : req.query.artefactId) as string;
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
}

export const requireVerifiedWithProvenance = createRequireVerifiedWithProvenance();
