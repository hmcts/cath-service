import { mockListTypes } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { canAccessPublication, canAccessPublicationData } from "./service.js";

/**
 * Middleware to require publication access based on sensitivity level
 * Checks if the user can access the publication based on their role and provenance
 * Redirects to 403 if access is denied
 * @returns Express middleware function
 */
export function requirePublicationAccess(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const publicationId = req.params.id;

    if (!publicationId) {
      return res.status(400).render("errors/400");
    }

    try {
      const artefact = await prisma.artefact.findUnique({
        where: { artefactId: publicationId }
      });

      if (!artefact) {
        return res.status(404).render("errors/404");
      }

      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const user = req.user;

      if (!canAccessPublication(user, artefact, listType)) {
        return res.status(403).render("errors/403");
      }

      next();
    } catch (error) {
      console.error("Error checking publication access:", error);
      return res.status(500).render("errors/500");
    }
  };
}

/**
 * Middleware to require publication data access (not just metadata)
 * Local and CTSC admins can only view metadata, not the actual list data
 * Redirects to 403 if data access is denied
 * @returns Express middleware function
 */
export function requirePublicationDataAccess(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const publicationId = req.params.id;

    if (!publicationId) {
      return res.status(400).render("errors/400");
    }

    try {
      const artefact = await prisma.artefact.findUnique({
        where: { artefactId: publicationId }
      });

      if (!artefact) {
        return res.status(404).render("errors/404");
      }

      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
      const user = req.user;

      if (!canAccessPublicationData(user, artefact, listType)) {
        return res.status(403).render("errors/403", {
          en: {
            title: "Access Denied",
            message: "You do not have permission to view the data for this publication. You can view metadata only."
          },
          cy: {
            title: "Mynediad wedi'i Wrthod",
            message: "Nid oes gennych ganiatâd i weld y data ar gyfer y cyhoeddiad hwn. Gallwch weld metadata yn unig."
          }
        });
      }

      next();
    } catch (error) {
      console.error("Error checking publication data access:", error);
      return res.status(500).render("errors/500");
    }
  };
}
