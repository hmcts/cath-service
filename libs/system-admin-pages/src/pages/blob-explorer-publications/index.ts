import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getArtefactSummariesByLocation, getArtefactType } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

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
