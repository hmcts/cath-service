import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import "../../types/session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface LocationRow {
  locationId: number;
  name: string;
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Handle remove action via query parameter
  const removeId = req.query.remove;
  if (removeId) {
    const locationIdToRemove = Number(removeId);
    if (Number.isFinite(locationIdToRemove) && req.session.listTypeSubscription?.selectedLocationIds) {
      req.session.listTypeSubscription.selectedLocationIds = req.session.listTypeSubscription.selectedLocationIds.filter(
        (id: number) => id !== locationIdToRemove
      );
      // Save session and redirect to remove query parameter
      return req.session.save((err: Error | null) => {
        if (err) {
          console.error("Error saving session", { errorMessage: err.message });
        }
        res.redirect("/subscription-locations-review");
      });
    }
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  // Get selected location IDs from session
  const selectedLocationIds = req.session.listTypeSubscription?.selectedLocationIds || [];

  // Fetch location details for each selected location
  const locationRows: LocationRow[] = [];
  for (const locationId of selectedLocationIds) {
    const location = await getLocationById(locationId);
    if (location) {
      locationRows.push({
        locationId: location.locationId,
        name: locale === "cy" ? location.welshName : location.name
      });
    }
  }

  // Sort locations alphabetically by name
  locationRows.sort((a, b) => a.name.localeCompare(b.name));

  res.render("subscription-locations-review/index", {
    ...t,
    locale,
    locationRows,
    hasLocations: locationRows.length > 0
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
