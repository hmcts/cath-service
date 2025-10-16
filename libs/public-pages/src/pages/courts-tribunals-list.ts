import { getLocationsGroupedByLetter } from "@hmcts/location";
import type { Request, Response } from "express";
import { cy, en } from "../locales/courts-tribunals-list.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const groupedLocations = getLocationsGroupedByLetter(locale);

  res.render("courts-tribunals-list", {
    en,
    cy,
    backLink: "/search",
    groupedLocations
  });
};
