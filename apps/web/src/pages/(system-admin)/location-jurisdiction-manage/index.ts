import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  locationJurisdictionManageCy as cy,
  locationJurisdictionManageEn as en,
  getLocationJurisdictionDetails,
  type JurisdictionDataSession
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
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
    en,
    cy,
    t,
    locationName,
    tableRows,
    updateHref: "/location-jurisdiction-update",
    deleteHref: "/location-jurisdiction-delete"
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
