import { createListType, findListTypeByName, updateListType } from "./queries.js";

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
    defaultSensitivity: data.defaultSensitivity,
    allowedProvenance: data.allowedProvenance,
    isNonStrategic: data.isNonStrategic,
    subJurisdictionIds: data.subJurisdictionIds
  });
}

interface SaveListTypeData {
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  shortenedFriendlyName: string;
  url: string;
  defaultSensitivity: string;
  allowedProvenance: string[];
  isNonStrategic: boolean;
  subJurisdictionIds: number[];
}
