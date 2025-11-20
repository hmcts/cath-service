import { requireRole, USER_ROLES } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  res.render("remove-list-search/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    searchLabel: lang.searchLabel,
    searchHint: lang.searchHint,
    continueButton: lang.continueButton,
    locationId: "",
    locationName: "",
    hideLanguageToggle: true
  });
};

const postHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const locale = req.query.lng === "cy" ? "cy" : "en";
  const locationId = req.body.locationId || "";

  if (!locationId) {
    return res.render("remove-list-search/index", {
      pageTitle: lang.pageTitle,
      heading: lang.heading,
      searchLabel: lang.searchLabel,
      searchHint: lang.searchHint,
      continueButton: lang.continueButton,
      locationId: "",
      locationName: "",
      errors: [
        {
          text: lang.errorLocationRequired,
          href: "#locationId"
        }
      ],
      errorSummaryTitle: lang.errorSummaryTitle,
      locationError: {
        text: lang.errorLocationRequired
      },
      hideLanguageToggle: true
    });
  }

  const location = await getLocationById(Number.parseInt(locationId, 10));
  if (!location) {
    return res.status(400).send("Invalid location");
  }

  req.session.removalData = {
    locationId,
    locationName: locale === "cy" ? location.welshName : location.name,
    selectedArtefacts: []
  };

  await new Promise<void>((resolve, reject) => {
    req.session.save((err: Error | null | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const lng = req.query.lng === "cy" ? "?lng=cy" : "";
  res.redirect(`/remove-list-search-results${lng}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), postHandler];
