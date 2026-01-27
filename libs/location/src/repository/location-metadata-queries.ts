import { prisma } from "@hmcts/postgres";
import type { CreateLocationMetadataInput, UpdateLocationMetadataInput } from "./model.js";

export async function findLocationMetadataByLocationId(locationId: number) {
  return prisma.locationMetadata.findUnique({
    where: { locationId }
  });
}

export async function createLocationMetadataRecord(data: CreateLocationMetadataInput) {
  const { locationId, cautionMessage, welshCautionMessage, noListMessage, welshNoListMessage } = data;

  return prisma.locationMetadata.create({
    data: {
      locationId,
      cautionMessage: cautionMessage?.trim() || null,
      welshCautionMessage: welshCautionMessage?.trim() || null,
      noListMessage: noListMessage?.trim() || null,
      welshNoListMessage: welshNoListMessage?.trim() || null
    }
  });
}

export async function updateLocationMetadataRecord(locationId: number, data: UpdateLocationMetadataInput) {
  const { cautionMessage, welshCautionMessage, noListMessage, welshNoListMessage } = data;

  return prisma.locationMetadata.update({
    where: { locationId },
    data: {
      cautionMessage: cautionMessage?.trim() || null,
      welshCautionMessage: welshCautionMessage?.trim() || null,
      noListMessage: noListMessage?.trim() || null,
      welshNoListMessage: welshNoListMessage?.trim() || null
    }
  });
}

export async function deleteLocationMetadataRecord(locationId: number) {
  return prisma.locationMetadata.delete({
    where: { locationId }
  });
}
