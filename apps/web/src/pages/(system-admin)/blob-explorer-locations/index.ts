import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationsWithPublicationCount } from "@hmcts/publication";
import "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);

  try {
    const locations = await getLocationsWithPublicationCount();

    const tableRows = locations.map((location) => [
      {
        html: `<a href="/blob-explorer-publications?locationId=${location.locationId}" class="govuk-link">${location.locationName}</a>`
      },
      {
        text: location.publicationCount.toString(),
        format: "numeric"
      }
    ]);

    res.render("blob-explorer-locations/index", {
      ...t,
      tableRows,
      locale
    });
  } catch (error) {
    console.error("Error loading locations:", error);
    res.render("blob-explorer-locations/index", {
      ...t,
      error: t.locationsError,
      tableRows: [],
      locale
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
