import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import {
  buildJurisdictionItems,
  buildRegionItems,
  buildSubJurisdictionItemsByJurisdiction,
  getAllJurisdictions,
  getAllRegions,
  getAllSubJurisdictions,
  getLocationsGroupedByLetter,
  getSubJurisdictionsForJurisdiction,
  type Location
} from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface ListTypeSubscriptionSession {
  selectedLocationIds?: number[];
  selectedListTypeIds?: number[];
  language?: string;
}

declare module "express-session" {
  interface SessionData {
    listTypeSubscription?: ListTypeSubscriptionSession;
  }
}

interface TableRow {
  letter: string;
  location: Location;
  isFirst: boolean;
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;

  const jurisdictionParam = req.query.jurisdiction;
  const regionParam = req.query.region;
  const subJurisdictionParam = req.query.subJurisdiction;

  const selectedJurisdictions = Array.isArray(jurisdictionParam)
    ? jurisdictionParam.map(Number).filter(Number.isFinite)
    : jurisdictionParam && Number.isFinite(Number(jurisdictionParam))
      ? [Number(jurisdictionParam)]
      : [];

  const selectedRegions = Array.isArray(regionParam)
    ? regionParam.map(Number).filter(Number.isFinite)
    : regionParam && Number.isFinite(Number(regionParam))
      ? [Number(regionParam)]
      : [];

  const selectedSubJurisdictions = Array.isArray(subJurisdictionParam)
    ? subJurisdictionParam.map(Number).filter(Number.isFinite)
    : subJurisdictionParam && Number.isFinite(Number(subJurisdictionParam))
      ? [Number(subJurisdictionParam)]
      : [];

  const allJurisdictions = await getAllJurisdictions();
  const allRegions = await getAllRegions();
  const allSubJurisdictions = await getAllSubJurisdictions();

  // If jurisdictions are selected but no sub-jurisdictions, include all sub-jurisdictions from selected jurisdictions
  const effectiveSubJurisdictions = [...selectedSubJurisdictions];
  if (selectedJurisdictions.length > 0 && selectedSubJurisdictions.length === 0) {
    for (const jurisdictionId of selectedJurisdictions) {
      const subJuris = await getSubJurisdictionsForJurisdiction(jurisdictionId);
      effectiveSubJurisdictions.push(...subJuris);
    }
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  // Recalculate grouped locations with effective filters
  const filteredGroupedLocations: Record<string, Location[]> = await getLocationsGroupedByLetter(locale, {
    regions: selectedRegions.length > 0 ? selectedRegions : undefined,
    subJurisdictions: effectiveSubJurisdictions.length > 0 ? effectiveSubJurisdictions : undefined
  });

  // Build jurisdiction items
  const jurisdictionItems = await buildJurisdictionItems(selectedJurisdictions, locale, content.subJurisdictionLabels);

  // Build region items
  const regionItems = await buildRegionItems(selectedRegions, locale);

  // Build sub-jurisdiction items grouped by jurisdiction
  const subJurisdictionItemsByJurisdiction = await buildSubJurisdictionItemsByJurisdiction(selectedSubJurisdictions, locale);

  // Build display name maps
  const jurisdictionMap: Record<number, string> = {};
  allJurisdictions.forEach((j) => {
    jurisdictionMap[j.jurisdictionId] = locale === "cy" ? j.welshName : j.name;
  });

  const regionMap: Record<number, string> = {};
  allRegions.forEach((r) => {
    regionMap[r.regionId] = locale === "cy" ? r.welshName : r.name;
  });

  const subJurisdictionMap: Record<number, string> = {};
  const subJurisdictionToJurisdiction: Record<number, number> = {};
  allSubJurisdictions.forEach((s) => {
    subJurisdictionMap[s.subJurisdictionId] = locale === "cy" ? s.welshName : s.name;
    subJurisdictionToJurisdiction[s.subJurisdictionId] = s.jurisdictionId;
  });

  // Map selected values to display names
  const selectedJurisdictionsDisplay = selectedJurisdictions.map((j) => jurisdictionMap[j] || j.toString());
  const selectedRegionsDisplay = selectedRegions.map((r) => regionMap[r] || r.toString());
  const selectedSubJurisdictionsDisplay = selectedSubJurisdictions.map((s) => subJurisdictionMap[s] || s.toString());

  // Build remove URLs for each filter
  const buildRemoveUrl = (type: string, index: number) => {
    const params = new URLSearchParams();

    let removedJurisdiction: number | null = null;

    if (type === "jurisdiction") {
      selectedJurisdictions.forEach((j, i) => {
        if (i !== index) {
          params.append("jurisdiction", j.toString());
        } else {
          removedJurisdiction = j;
        }
      });
    } else {
      selectedJurisdictions.forEach((j) => {
        params.append("jurisdiction", j.toString());
      });
    }

    if (type === "subJurisdiction") {
      selectedSubJurisdictions.forEach((s, i) => {
        if (i !== index) {
          params.append("subJurisdiction", s.toString());
        }
      });
    } else {
      selectedSubJurisdictions.forEach((s) => {
        // If we're removing a jurisdiction, also remove its associated sub-jurisdictions
        if (removedJurisdiction && subJurisdictionToJurisdiction[s] === removedJurisdiction) {
          return;
        }
        params.append("subJurisdiction", s.toString());
      });
    }

    if (type === "region") {
      selectedRegions.forEach((r, i) => {
        if (i !== index) {
          params.append("region", r.toString());
        }
      });
    } else {
      selectedRegions.forEach((r) => {
        params.append("region", r.toString());
      });
    }

    const queryString = params.toString();
    return `/subscription-by-location${queryString ? `?${queryString}` : ""}`;
  };

  const jurisdictionRemoveUrls = selectedJurisdictions.map((_, i) => buildRemoveUrl("jurisdiction", i));
  const subJurisdictionRemoveUrls = selectedSubJurisdictions.map((_, i) => buildRemoveUrl("subJurisdiction", i));
  const regionRemoveUrls = selectedRegions.map((_, i) => buildRemoveUrl("region", i));

  // Get available letters
  const availableLetters = Object.keys(filteredGroupedLocations);

  // Build table rows for location listings
  const tableRows: TableRow[] = [];
  Object.entries(filteredGroupedLocations).forEach(([letter, locations]: [string, Location[]]) => {
    locations.forEach((location: Location, index: number) => {
      tableRows.push({
        letter: index === 0 ? letter : "",
        location,
        isFirst: index === 0
      });
    });
  });

  // Get previously selected location IDs from session
  const previouslySelectedIds = req.session.listTypeSubscription?.selectedLocationIds || [];

  res.render("subscription-by-location/index", {
    ...content,
    locale,
    selectedJurisdictions,
    selectedRegions,
    selectedSubJurisdictions,
    selectedJurisdictionsDisplay,
    selectedRegionsDisplay,
    selectedSubJurisdictionsDisplay,
    jurisdictionRemoveUrls,
    subJurisdictionRemoveUrls,
    regionRemoveUrls,
    jurisdictionItems,
    regionItems,
    subJurisdictionItemsByJurisdiction,
    availableLetters,
    tableRows,
    previouslySelectedIds,
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locationIds = req.body.locationIds;

  // Handle both single and multiple selections
  const selectedLocationIds = Array.isArray(locationIds)
    ? locationIds.map(Number).filter(Number.isFinite)
    : locationIds && Number.isFinite(Number(locationIds))
      ? [Number(locationIds)]
      : [];

  if (!req.session.listTypeSubscription) {
    req.session.listTypeSubscription = {};
  }

  // Get existing selected locations from session
  const existingLocationIds = req.session.listTypeSubscription.selectedLocationIds || [];

  // Merge new selections with existing ones and remove duplicates
  const mergedLocationIds = [...new Set([...existingLocationIds, ...selectedLocationIds])];

  // Store merged location IDs (empty array is valid - no validation required)
  req.session.listTypeSubscription.selectedLocationIds = mergedLocationIds;

  // Save session before redirect to ensure data persists
  req.session.save((err: Error | null) => {
    if (err) {
      console.error("Error saving session", { errorMessage: err.message });
      return res.redirect("/subscription-by-location");
    }
    res.redirect("/subscription-locations-review");
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
