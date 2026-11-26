import { canAccessPublicationData, getArtefactById, resolveListType } from "@hmcts/publication";
import { cy as errorCy, en as errorEn } from "@hmcts/web-core/errors";
import type { Request, Response } from "express";

const NO_STORE = "private, max-age=0, no-cache, no-store, must-revalidate";

export enum AccessReason {
  NOT_FOUND = "NOT_FOUND",
  ACCESS_DENIED = "ACCESS_DENIED"
}

/**
 * Resolves an artefact and tests the requesting user against its sensitivity.
 *
 * The artefact's `sensitivity` column is the only authority on who may read its
 * data — a list type, URL or payload shape is not an authorisation decision.
 */
export async function checkArtefactDataAccess(user: Request["user"], artefactId: string | undefined): Promise<ArtefactAccess> {
  if (!artefactId) {
    return { allowed: false, reason: AccessReason.NOT_FOUND };
  }

  const artefact = await getArtefactById(artefactId);
  if (!artefact) {
    return { allowed: false, reason: AccessReason.NOT_FOUND };
  }

  if (!canAccessPublicationData(user, artefact, await resolveListType(artefact.listTypeId))) {
    return { allowed: false, reason: AccessReason.ACCESS_DENIED };
  }

  return { allowed: true };
}

export function renderAccessDenied(res: Response, locale: string): void {
  const en = errorEn.error403;
  const cy = errorCy.error403;

  res.setHeader("Cache-Control", NO_STORE);
  res.status(403).render("errors/403", { en, cy, t: locale === "cy" ? cy : en });
}

export function renderNotFound(res: Response, locale: string, content: LocaleContent): void {
  res.status(404).render("errors/404", { ...content, locale });
}

export function sendAccessDenied(res: Response): Response {
  res.setHeader("Cache-Control", NO_STORE);
  return res.status(403).json({ error: "Access denied" });
}

export function sendFileNotFound(res: Response): Response {
  return res.status(404).json({ error: "File not found" });
}

export type ArtefactAccess = { allowed: true; reason?: undefined } | { allowed: false; reason: AccessReason };

type LocaleContent = { en: object; cy: object };
