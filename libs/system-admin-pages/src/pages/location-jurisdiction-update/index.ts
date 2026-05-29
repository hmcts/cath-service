import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { listAllJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-queries.js";
import { getLocationJurisdictionDetails, updateLocationJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LOCATION_JURISDICTION_UPDATE_VARIANT: "dropdowns" | "accordions" = "dropdowns";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect(`/location-jurisdiction-search${langSuffix}`);
  }

  const { locationId, locationName } = session.locationJurisdiction;
  const allData = await listAllJurisdictionData();
  const locationData = await getLocationJurisdictionDetails(locationId);

  const currentSubJurisdictionIds = locationData?.locationSubJurisdictions?.map((lsj: any) => lsj.subJurisdiction?.subJurisdictionId) || [];
  const currentRegionIds = locationData?.locationRegions?.map((lr: any) => lr.region?.regionId) || [];

  const template =
    LOCATION_JURISDICTION_UPDATE_VARIANT === "dropdowns" ? "location-jurisdiction-update/index-dropdowns" : "location-jurisdiction-update/index-accordions";

  res.render(template, {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    locationName,
    allData,
    currentSubJurisdictionIds,
    currentRegionIds,
    cancelHref: `${content.cancelHref}${langSuffix}`
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect(`/location-jurisdiction-search${langSuffix}`);
  }

  const { locationId } = session.locationJurisdiction;
  const performedBy = (req as any).user?.email || "unknown";

  const subJurisdictionIds = Array.isArray(req.body.subJurisdictionIds)
    ? req.body.subJurisdictionIds.map(Number).filter((n: number) => !Number.isNaN(n))
    : req.body.subJurisdictionIds
      ? [Number(req.body.subJurisdictionIds)].filter((n) => !Number.isNaN(n))
      : [];

  const regionIds = Array.isArray(req.body.regionIds)
    ? req.body.regionIds.map(Number).filter((n: number) => !Number.isNaN(n))
    : req.body.regionIds
      ? [Number(req.body.regionIds)].filter((n) => !Number.isNaN(n))
      : [];

  await updateLocationJurisdictionData(locationId, { subJurisdictionIds, regionIds }, performedBy);

  res.redirect(`/location-jurisdiction-update-success${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
