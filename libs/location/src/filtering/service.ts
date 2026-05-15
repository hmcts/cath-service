import { getAllJurisdictions, getAllRegions, getSubJurisdictionsByJurisdiction } from "../repository/queries.js";

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

export async function buildJurisdictionItems(
  selectedJurisdictions: number[],
  locale: "en" | "cy",
  subJurisdictionLabels?: Record<number, string>
): Promise<JurisdictionItem[]> {
  const allJurisdictions = await getAllJurisdictions();

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

export async function buildRegionItems(selectedRegions: number[], locale: "en" | "cy"): Promise<RegionItem[]> {
  const allRegions = await getAllRegions();

  return allRegions
    .map((region) => ({
      value: region.regionId.toString(),
      text: locale === "cy" ? region.welshName : region.name,
      checked: selectedRegions.includes(region.regionId)
    }))
    .sort((a, b) => a.text.localeCompare(b.text));
}

export async function buildSubJurisdictionItemsByJurisdiction(
  selectedSubJurisdictions: number[],
  locale: "en" | "cy"
): Promise<Record<number, SubJurisdictionItem[]>> {
  const allJurisdictions = await getAllJurisdictions();

  const subJurisdictionItemsByJurisdiction: Record<number, SubJurisdictionItem[]> = {};

  for (const jurisdiction of allJurisdictions) {
    const subJurisdictionsForJurisdiction = await getSubJurisdictionsByJurisdiction(jurisdiction.jurisdictionId);

    subJurisdictionItemsByJurisdiction[jurisdiction.jurisdictionId] = subJurisdictionsForJurisdiction
      .map((sub) => ({
        value: sub.subJurisdictionId.toString(),
        text: locale === "cy" ? sub.welshName : sub.name,
        checked: selectedSubJurisdictions.includes(sub.subJurisdictionId)
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }

  return subJurisdictionItemsByJurisdiction;
}

export async function getSubJurisdictionsForJurisdiction(jurisdictionId: number): Promise<number[]> {
  const subJurisdictions = await getSubJurisdictionsByJurisdiction(jurisdictionId);
  return subJurisdictions.map((sub) => sub.subJurisdictionId);
}
