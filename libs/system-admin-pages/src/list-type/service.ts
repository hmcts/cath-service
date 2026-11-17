import { createListType, findListTypeById, findListTypeByName, updateListType, updateListTypeVisibility } from "./queries.js";

export async function saveListType(data: SaveListTypeData, existingId?: number) {
  const existingListType = await findListTypeByName(data.name);

  if (existingListType && existingListType.id !== existingId) {
    throw new Error("A list type with this name already exists");
  }

  if (existingId) {
    return updateListType(existingId, {
      name: data.name,
      friendlyName: data.friendlyName,
      welshFriendlyName: data.welshFriendlyName,
      shortenedFriendlyName: data.shortenedFriendlyName,
      url: data.url,
      caseNumberJsonFieldName: data.caseNumberJsonFieldName,
      caseNameJsonFieldName: data.caseNameJsonFieldName,
      defaultSensitivity: data.defaultSensitivity,
      allowedProvenance: data.allowedProvenance,
      isNonStrategic: data.isNonStrategic,
      subJurisdictionIds: data.subJurisdictionIds
    });
  }

  return createListType({
    name: data.name,
    friendlyName: data.friendlyName,
    welshFriendlyName: data.welshFriendlyName,
    shortenedFriendlyName: data.shortenedFriendlyName,
    url: data.url,
    caseNumberJsonFieldName: data.caseNumberJsonFieldName,
    caseNameJsonFieldName: data.caseNameJsonFieldName,
    defaultSensitivity: data.defaultSensitivity,
    allowedProvenance: data.allowedProvenance,
    isNonStrategic: data.isNonStrategic,
    subJurisdictionIds: data.subJurisdictionIds
  });
}

export async function setListTypeVisibility(id: number, isHidden: boolean): Promise<ListTypeVisibilityResult> {
  const listType = await findListTypeById(id);

  if (!listType || listType.deletedAt) {
    return "NOT_FOUND";
  }

  const updatedCount = await updateListTypeVisibility(id, isHidden);
  return updatedCount > 0 ? "UPDATED" : "ALREADY_IN_STATE";
}

export type ListTypeVisibilityResult = "UPDATED" | "NOT_FOUND" | "ALREADY_IN_STATE";

interface SaveListTypeData {
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  shortenedFriendlyName: string;
  url: string;
  caseNumberJsonFieldName?: string | null;
  caseNameJsonFieldName?: string | null;
  defaultSensitivity: string;
  allowedProvenance: string[];
  isNonStrategic: boolean;
  subJurisdictionIds: number[];
}
