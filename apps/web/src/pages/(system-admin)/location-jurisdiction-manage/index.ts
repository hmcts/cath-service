import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getLocationJurisdictionDetails } from "../../jurisdiction-management/jurisdiction-management-service.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect(`/location-jurisdiction-search${langSuffix}`);
  }

  const { locationId, locationName } = session.locationJurisdiction;
  const locationData = await getLocationJurisdictionDetails(locationId);

  const tableRows =
    locationData?.locationSubJurisdictions?.map((lsj: any) => [
      { text: locationName },
      { text: lsj.subJurisdiction?.jurisdiction?.name || "" },
      { text: lsj.subJurisdiction?.name || "" }
    ]) || [];

  res.render("location-jurisdiction-manage/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    locationName,
    tableRows,
    updateHref: `/location-jurisdiction-update${langSuffix}`,
    deleteHref: `/location-jurisdiction-delete${langSuffix}`
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
