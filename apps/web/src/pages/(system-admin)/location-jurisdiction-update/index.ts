import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  getLocationJurisdictionDetails,
  type JurisdictionDataSession,
  listJurisdictionsWithSubJurisdictions,
  listRegions,
  updateLocationJurisdictionData
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LOCATION_JURISDICTION_UPDATE_VARIANT: "dropdowns" | "accordions" = "dropdowns";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
  }

  const { locationId, locationName } = session.locationJurisdiction;
  const [jurisdictionsWithSubs, regions, locationData] = await Promise.all([
    listJurisdictionsWithSubJurisdictions(),
    listRegions(),
    getLocationJurisdictionDetails(locationId)
  ]);

  const currentSubJurisdictionIds = locationData?.locationSubJurisdictions?.map((lsj: any) => lsj.subJurisdiction?.subJurisdictionId) || [];
  const currentRegionIds = locationData?.locationRegions?.map((lr: any) => lr.region?.regionId) || [];

  const jurisdictionLabelMap: Record<string, string> = {
    Civil: t.civilCourtLabel,
    Crime: t.criminalCourtLabel,
    Family: t.familyCourtLabel,
    Tribunal: t.tribunalLabel
  };

  const subJurisdictionGroups = jurisdictionsWithSubs
    .filter((j) => j.subJurisdictions.length > 0)
    .map((j) => ({
      heading: jurisdictionLabelMap[j.name] || j.name,
      items: j.subJurisdictions.map((s) => ({
        value: s.subJurisdictionId.toString(),
        text: s.name,
        checked: currentSubJurisdictionIds.includes(s.subJurisdictionId)
      }))
    }));

  const regionCheckboxes = regions.map((r) => ({
    value: r.regionId.toString(),
    text: r.name,
    checked: currentRegionIds.includes(r.regionId)
  }));

  const template =
    LOCATION_JURISDICTION_UPDATE_VARIANT === "dropdowns" ? "location-jurisdiction-update/index-dropdowns" : "location-jurisdiction-update/index-accordions";

  res.render(template, {
    en,
    cy,
    t,
    locationName,
    subJurisdictionGroups,
    regionCheckboxes,
    cancelHref: t.cancelHref
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
  }

  const { locationId } = session.locationJurisdiction;
  const user = {
    userId: req.user?.id || "unknown",
    userEmail: req.user?.email || "unknown",
    userRole: req.user?.role || "SYSTEM_ADMIN",
    userProvenance: req.user?.provenance || "azure-ad"
  };

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

  await updateLocationJurisdictionData(locationId, { subJurisdictionIds, regionIds }, user);

  res.redirect("/location-jurisdiction-update-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
