import type { UserProfile } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres";
import { cy as errorCy, en as errorEn } from "@hmcts/web-core/errors";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Artefact } from "../repository/model.js";
import { canAccessPublication, canAccessPublicationData, type ListType } from "./service.js";

type AccessCheck = (user: UserProfile | undefined, artefact: Artefact, listType: ListType | undefined) => boolean;

type ErrorData = { title?: string; message?: string; [key: string]: unknown };

function getLocaleData(locale: string, enData: ErrorData, cyData: ErrorData): ErrorData {
  return locale === "cy" ? cyData : enData;
}

function renderError(res: Response, status: number, locale: string): void {
  const enError = errorEn[`error${status}` as keyof typeof errorEn];
  const cyError = errorCy[`error${status}` as keyof typeof errorCy];

  res.status(status).render(`errors/${status}`, {
    en: enError,
    cy: cyError,
    t: getLocaleData(locale, enError, cyError)
  });
}

function render403WithCustomMessage(res: Response, locale: string): void {
  const enError = {
    title: errorEn.error403.title,
    message: errorEn.error403.dataAccessDeniedMessage
  };
  const cyError = {
    title: errorCy.error403.title,
    message: errorCy.error403.dataAccessDeniedMessage
  };

  res.status(403).render("errors/403", {
    en: enError,
    cy: cyError,
    t: {
      ...(locale === "cy" ? errorCy.error403 : errorEn.error403),
      defaultMessage: locale === "cy" ? errorCy.error403.dataAccessDeniedMessage : errorEn.error403.dataAccessDeniedMessage
    },
    title: locale === "cy" ? cyError.title : enError.title,
    message: locale === "cy" ? cyError.message : enError.message
  });
}

function handleAccessDenied(res: Response, locale: string, useCustomMessage: boolean): void {
  if (useCustomMessage) {
    render403WithCustomMessage(res, locale);
    return;
  }
  renderError(res, 403, locale);
}

async function fetchArtefact(publicationId: string): Promise<Artefact | null> {
  return prisma.artefact.findUnique({
    where: { artefactId: publicationId }
  });
}

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
      return renderError(res, 400, locale);
    }

    try {
      const artefact = await fetchArtefact(publicationId);

      if (!artefact) {
        return renderError(res, 404, locale);
      }

      const dbListType = await prisma.listType.findUnique({
        where: { id: artefact.listTypeId }
      });

      const listType: ListType | undefined = dbListType
        ? {
            id: dbListType.id,
            provenance: dbListType.allowedProvenance,
            isNonStrategic: dbListType.isNonStrategic
          }
        : undefined;

      if (!checkAccess(req.user, artefact, listType)) {
        return handleAccessDenied(res, locale, useCustom403Message);
      }

      next();
    } catch (error) {
      console.error("Error checking publication access:", error);
      renderError(res, 500, locale);
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
