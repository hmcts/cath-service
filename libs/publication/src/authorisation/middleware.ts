import type { UserProfile } from "@hmcts/auth";
import type { ListType } from "@hmcts/list-types-common";
import { mockListTypes } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Artefact } from "../repository/model.js";
import { canAccessPublication, canAccessPublicationData } from "./service.js";

type AccessCheck = (user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined) => boolean;

interface CustomErrorMessage {
  en: { title: string; message: string };
  cy: { title: string; message: string };
}

/**
 * Creates middleware to check publication access
 * @param checkAccess - Function to check if user can access the publication
 * @param customErrorMessage - Optional custom error message for 403 response
 * @returns Express middleware function
 */
function createPublicationAccessMiddleware(checkAccess: AccessCheck, customErrorMessage?: CustomErrorMessage): RequestHandler {
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

      if (!checkAccess(req.user, artefact, listType)) {
        return customErrorMessage ? res.status(403).render("errors/403", customErrorMessage) : res.status(403).render("errors/403");
      }

      next();
    } catch (error) {
      console.error("Error checking publication access:", error);
      return res.status(500).render("errors/500");
    }
  };
}

/**
 * Middleware to require publication access based on sensitivity level
 * Checks if the user can access the publication based on their role and provenance
 * Redirects to 403 if access is denied
 * @returns Express middleware function
 */
export function requirePublicationAccess(): RequestHandler {
  return createPublicationAccessMiddleware(canAccessPublication);
}

/**
 * Middleware to require publication data access (not just metadata)
 * Local and CTSC admins can only view metadata, not the actual list data
 * Redirects to 403 if data access is denied
 * @returns Express middleware function
 */
export function requirePublicationDataAccess(): RequestHandler {
  return createPublicationAccessMiddleware(canAccessPublicationData, {
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
