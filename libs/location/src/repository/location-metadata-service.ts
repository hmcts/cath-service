import { validateLocationMetadataInput } from "../validation/location-metadata-validation.js";
import {
  createLocationMetadataRecord,
  deleteLocationMetadataRecord,
  findLocationMetadataByLocationId,
  updateLocationMetadataRecord
} from "./location-metadata-queries.js";
import type { CreateLocationMetadataInput, UpdateLocationMetadataInput } from "./model.js";

export async function getLocationMetadataByLocationId(locationId: number) {
  return findLocationMetadataByLocationId(locationId);
}

export async function createLocationMetadata(data: CreateLocationMetadataInput) {
  const validation = validateLocationMetadataInput(data);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const existingMetadata = await findLocationMetadataByLocationId(data.locationId);
  if (existingMetadata) {
    throw new Error("Location metadata already exists");
  }

  return createLocationMetadataRecord(data);
}

export async function updateLocationMetadata(locationId: number, data: UpdateLocationMetadataInput) {
  const validation = validateLocationMetadataInput(data);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const existingMetadata = await findLocationMetadataByLocationId(locationId);
  if (!existingMetadata) {
    throw new Error("Location metadata not found");
  }

  return updateLocationMetadataRecord(locationId, data);
}

export async function deleteLocationMetadata(locationId: number) {
  const existingMetadata = await findLocationMetadataByLocationId(locationId);
  if (!existingMetadata) {
    throw new Error("Location metadata not found");
  }

  return deleteLocationMetadataRecord(locationId);
}
