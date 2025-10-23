import { getLocationById } from "@hmcts/location";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface SearchError {
  text: string;
  href: string;
}

export const GET = async (req: Request, res: Response) => {
  const locationId = req.query.locationId ? Number.parseInt(req.query.locationId as string, 10) : undefined;
  const locale = res.locals.locale || "en";

  let preselectedLocation: { id: number; name: string; welshName: string } | undefined;

  if (locationId) {
    const location = getLocationById(locationId);
    if (location) {
      preselectedLocation = {
        id: location.locationId,
        name: location.name,
        welshName: location.welshName
      };
    }
  }

  res.render("search/index", {
    en,
    cy,
    backLink: "/view-option",
    preselectedLocation,
    locale
  });
};

export const POST = async (req: Request, res: Response) => {
  const selectedLocationId = req.body?.locationId;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!selectedLocationId) {
    const errors: SearchError[] = [
      {
        text: t.errorMessage,
        href: "#location"
      }
    ];

    return res.render("search/index", {
      en,
      cy,
      errors,
      backLink: "/view-option",
      locale
    });
  }

  const locationIdNum = Number.parseInt(selectedLocationId, 10);

  if (Number.isNaN(locationIdNum) || !getLocationById(locationIdNum)) {
    const errors: SearchError[] = [
      {
        text: t.errorMessage,
        href: "#location"
      }
    ];

    return res.render("search/index", {
      en,
      cy,
      errors,
      backLink: "/view-option",
      locale
    });
  }

  res.redirect(`/summary-of-publications?locationId=${locationIdNum}`);
};
