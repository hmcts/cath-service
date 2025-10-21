import { getAllJurisdictions, getAllRegions, getAllSubJurisdictions, getLocationsGroupedByLetter } from "@hmcts/location";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;

  const jurisdictionParam = req.query.jurisdiction;
  const regionParam = req.query.region;
  const subJurisdictionParam = req.query.subJurisdiction;

  const selectedJurisdictions = Array.isArray(jurisdictionParam) ? jurisdictionParam.map(Number) : jurisdictionParam ? [Number(jurisdictionParam)] : [];

  const selectedRegions = Array.isArray(regionParam) ? regionParam.map(Number) : regionParam ? [Number(regionParam)] : [];

  const selectedSubJurisdictions = Array.isArray(subJurisdictionParam) ? subJurisdictionParam.map(Number) : subJurisdictionParam ? [Number(subJurisdictionParam)] : [];

  const allJurisdictions = getAllJurisdictions();
  const allRegions = getAllRegions();
  const allSubJurisdictions = getAllSubJurisdictions();

  // If jurisdictions are selected but no sub-jurisdictions, include all sub-jurisdictions from selected jurisdictions
  let effectiveSubJurisdictions = [...selectedSubJurisdictions];
  if (selectedJurisdictions.length > 0 && selectedSubJurisdictions.length === 0) {
    selectedJurisdictions.forEach((jurisdictionId) => {
      const subJuris = allSubJurisdictions
        .filter((sub) => sub.jurisdictionId === jurisdictionId)
        .map((sub) => sub.subJurisdictionId);
      effectiveSubJurisdictions.push(...subJuris);
    });
  }

  // Recalculate grouped locations with effective filters
  const filteredGroupedLocations = getLocationsGroupedByLetter(locale, {
    regions: selectedRegions.length > 0 ? selectedRegions : undefined,
    subJurisdictions: effectiveSubJurisdictions.length > 0 ? effectiveSubJurisdictions : undefined
  });

  // Build jurisdiction items
  const jurisdictionItems = allJurisdictions
    .map((jurisdiction) => ({
      value: jurisdiction.jurisdictionId.toString(),
      text: locale === "cy" ? jurisdiction.welshName : jurisdiction.name,
      checked: selectedJurisdictions.includes(jurisdiction.jurisdictionId),
      jurisdictionId: jurisdiction.jurisdictionId,
      subJurisdictionLabel: content.subJurisdictionLabels[jurisdiction.jurisdictionId as keyof typeof content.subJurisdictionLabels],
      attributes: {
        "data-jurisdiction": jurisdiction.jurisdictionId.toString()
      }
    }))
    .sort((a, b) => a.text.localeCompare(b.text));

  // Build region items
  const regionItems = allRegions
    .map((region) => ({
      value: region.regionId.toString(),
      text: locale === "cy" ? region.welshName : region.name,
      checked: selectedRegions.includes(region.regionId)
    }))
    .sort((a, b) => a.text.localeCompare(b.text));

  // Build sub-jurisdiction items grouped by jurisdiction
  const subJurisdictionItemsByJurisdiction: Record<number, any[]> = {};
  allJurisdictions.forEach((jurisdiction) => {
    const subJurisdictionsForJurisdiction = allSubJurisdictions.filter((sub) => sub.jurisdictionId === jurisdiction.jurisdictionId);
    subJurisdictionItemsByJurisdiction[jurisdiction.jurisdictionId] = subJurisdictionsForJurisdiction
      .map((sub) => ({
        value: sub.subJurisdictionId.toString(),
        text: locale === "cy" ? sub.welshName : sub.name,
        checked: selectedSubJurisdictions.includes(sub.subJurisdictionId)
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  });

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
    return `/courts-tribunals-list${queryString ? `?${queryString}` : ""}`;
  };

  const jurisdictionRemoveUrls = selectedJurisdictions.map((_, i) => buildRemoveUrl("jurisdiction", i));
  const subJurisdictionRemoveUrls = selectedSubJurisdictions.map((_, i) => buildRemoveUrl("subJurisdiction", i));
  const regionRemoveUrls = selectedRegions.map((_, i) => buildRemoveUrl("region", i));

  // Get available letters
  const availableLetters = Object.keys(filteredGroupedLocations);

  // Build table rows for court listings
  const tableRows: any[] = [];
  Object.entries(filteredGroupedLocations).forEach(([letter, locations]) => {
    locations.forEach((location: any, index: number) => {
      tableRows.push({
        letter: index === 0 ? letter : "",
        location,
        isFirst: index === 0
      });
    });
  });

  res.render("courts-tribunals-list/index", {
    en,
    cy,
    groupedLocations: filteredGroupedLocations,
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
    tableRows
  });
};
