import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactSummariesByLocation, getArtefactType } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { escapeHtml, formatDateTime } from "../../services/formatting.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);
  const locationId = req.query.locationId as string;

  if (!locationId) {
    return res.redirect("/blob-explorer-locations");
  }

  try {
    const publications = await getArtefactSummariesByLocation(locationId);

    const tableRows = await Promise.all(
      publications.map(async (pub) => {
        const type = await getArtefactType(pub.artefactId);
        const path = type === "flat-file" ? "flat-file" : "json-file";
        const encodedArtefactId = encodeURIComponent(pub.artefactId);
        const link = `/blob-explorer-${path}?artefactId=${encodedArtefactId}`;
        const escapedArtefactId = escapeHtml(pub.artefactId);

        return [
          {
            html: `<a href="${link}" class="govuk-link">${escapedArtefactId}</a>`
          },
          {
            text: pub.listType
          },
          {
            text: formatDateTime(pub.displayFrom)
          },
          {
            text: formatDateTime(pub.displayTo)
          }
        ];
      })
    );

    res.render("blob-explorer-publications/index", {
      ...t,
      tableRows,
      locationId,
      locale
    });
  } catch (error) {
    console.error("Error loading publications:", error);
    res.render("blob-explorer-publications/index", {
      ...t,
      error: t.publicationsError,
      tableRows: [],
      locationId,
      locale
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
