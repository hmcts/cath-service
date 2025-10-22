import { getLocationsGroupedByLetter } from "@hmcts/location";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const groupedLocations = getLocationsGroupedByLetter(locale);

  res.render("courts-tribunals-list/index", {
    en,
    cy,
    backLink: "/search",
    groupedLocations
  });
};
