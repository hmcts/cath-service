import type { UserProfile } from "@hmcts/auth";
import type { ListType } from "@hmcts/list-types-common";
import { mockListTypes } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres";
import { en as errorEn, cy as errorCy } from "@hmcts/web-core/errors";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Artefact } from "../repository/model.js";
import { canAccessPublication, canAccessPublicationData } from "./service.js";

type AccessCheck = (user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined) => boolean;

/**
 * Creates middleware to check publication access
 * @param checkAccess - Function to check if user can access the publication
 * @param useCustom403Message - Whether to use the custom publication data access denied message
 * @returns Express middleware function
 */
function createPublicationAccessMiddleware(checkAccess: AccessCheck, useCustom403Message = false): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const publicationId = req.params.id;
    const locale = res.locals.locale || "en";

    if (!publicationId) {
      return res.status(400).render("errors/400", {
        en: errorEn.error400,
        cy: errorCy.error400,
        t: locale === "cy" ? errorCy.error400 : errorEn.error400
      });
    }

    try {
      const artefact = await prisma.artefact.findUnique({
        where: { artefactId: publicationId }
      });

      if (!artefact) {
        return res.status(404).render("errors/404", {
          en: errorEn.error404,
          cy: errorCy.error404,
          t: locale === "cy" ? errorCy.error404 : errorEn.error404
        });
      }

      const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);

      if (!checkAccess(req.user, artefact, listType)) {
        if (useCustom403Message) {
          return res.status(403).render("errors/403", {
            en: {
              title: errorEn.error403.title,
              message: errorEn.error403.dataAccessDeniedMessage
            },
            cy: {
              title: errorCy.error403.title,
              message: errorCy.error403.dataAccessDeniedMessage
            },
            t: locale === "cy" ? { ...errorCy.error403, defaultMessage: errorCy.error403.dataAccessDeniedMessage } : { ...errorEn.error403, defaultMessage: errorEn.error403.dataAccessDeniedMessage },
            title: locale === "cy" ? errorCy.error403.title : errorEn.error403.title,
            message: locale === "cy" ? errorCy.error403.dataAccessDeniedMessage : errorEn.error403.dataAccessDeniedMessage
          });
        }
        return res.status(403).render("errors/403", {
          en: errorEn.error403,
          cy: errorCy.error403,
          t: locale === "cy" ? errorCy.error403 : errorEn.error403
        });
      }

      next();
    } catch (error) {
      console.error("Error checking publication access:", error);
      return res.status(500).render("errors/500", {
        en: errorEn.error500,
        cy: errorCy.error500,
        t: locale === "cy" ? errorCy.error500 : errorEn.error500
      });
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
  return createPublicationAccessMiddleware(canAccessPublicationData, true);
}
