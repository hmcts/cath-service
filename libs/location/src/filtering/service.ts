import { getAllJurisdictions, getAllRegions, getAllSubJurisdictions } from "../repository/queries.js";

export interface JurisdictionItem {
  value: string;
  text: string;
  checked: boolean;
  jurisdictionId: number;
  subJurisdictionLabel?: string;
  attributes: {
    "data-jurisdiction": string;
  };
}

export interface RegionItem {
  value: string;
  text: string;
  checked: boolean;
}

export interface SubJurisdictionItem {
  value: string;
  text: string;
  checked: boolean;
}

export function buildJurisdictionItems(
  selectedJurisdictions: number[],
  locale: "en" | "cy",
  subJurisdictionLabels?: Record<number, string>
): JurisdictionItem[] {
  const allJurisdictions = getAllJurisdictions();

  return allJurisdictions
    .map((jurisdiction) => ({
      value: jurisdiction.jurisdictionId.toString(),
      text: locale === "cy" ? jurisdiction.welshName : jurisdiction.name,
      checked: selectedJurisdictions.includes(jurisdiction.jurisdictionId),
      jurisdictionId: jurisdiction.jurisdictionId,
      subJurisdictionLabel: subJurisdictionLabels?.[jurisdiction.jurisdictionId],
      attributes: {
        "data-jurisdiction": jurisdiction.jurisdictionId.toString()
      }
    }))
    .sort((a, b) => a.text.localeCompare(b.text));
}

export function buildRegionItems(
  selectedRegions: number[],
  locale: "en" | "cy"
): RegionItem[] {
  const allRegions = getAllRegions();

  return allRegions
    .map((region) => ({
      value: region.regionId.toString(),
      text: locale === "cy" ? region.welshName : region.name,
      checked: selectedRegions.includes(region.regionId)
    }))
    .sort((a, b) => a.text.localeCompare(b.text));
}

export function buildSubJurisdictionItemsByJurisdiction(
  selectedSubJurisdictions: number[],
  locale: "en" | "cy"
): Record<number, SubJurisdictionItem[]> {
  const allJurisdictions = getAllJurisdictions();
  const allSubJurisdictions = getAllSubJurisdictions();

  const subJurisdictionItemsByJurisdiction: Record<number, SubJurisdictionItem[]> = {};

  allJurisdictions.forEach((jurisdiction) => {
    const subJurisdictionsForJurisdiction = allSubJurisdictions.filter(
      (sub) => sub.jurisdictionId === jurisdiction.jurisdictionId
    );

    subJurisdictionItemsByJurisdiction[jurisdiction.jurisdictionId] = subJurisdictionsForJurisdiction
      .map((sub) => ({
        value: sub.subJurisdictionId.toString(),
        text: locale === "cy" ? sub.welshName : sub.name,
        checked: selectedSubJurisdictions.includes(sub.subJurisdictionId)
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  });

  return subJurisdictionItemsByJurisdiction;
}

export function getSubJurisdictionsForJurisdiction(jurisdictionId: number): number[] {
  return getAllSubJurisdictions()
    .filter((sub) => sub.jurisdictionId === jurisdictionId)
    .map((sub) => sub.subJurisdictionId);
}
