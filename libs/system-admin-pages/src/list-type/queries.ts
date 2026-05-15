import { prisma } from "@hmcts/postgres-prisma";

export async function findAllListTypes() {
  return prisma.listType.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      friendlyName: true,
      welshFriendlyName: true,
      shortenedFriendlyName: true,
      url: true,
      defaultSensitivity: true,
      allowedProvenance: true,
      isNonStrategic: true,
      deletedAt: true,
      subJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true,
              name: true,
              welshName: true,
              jurisdictionId: true
            }
          }
        }
      }
    }
  });
}

export async function findListTypeById(id: number) {
  return prisma.listType.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      friendlyName: true,
      welshFriendlyName: true,
      shortenedFriendlyName: true,
      url: true,
      defaultSensitivity: true,
      allowedProvenance: true,
      isNonStrategic: true,
      deletedAt: true,
      subJurisdictions: {
        select: {
          subJurisdiction: {
            select: {
              subJurisdictionId: true,
              name: true,
              welshName: true,
              jurisdictionId: true
            }
          }
        }
      }
    }
  });
}

export async function findListTypeByName(name: string) {
  return prisma.listType.findUnique({
    where: { name },
    select: {
      id: true,
      name: true
    }
  });
}

export async function findAllSubJurisdictions() {
  return prisma.subJurisdiction.findMany({
    orderBy: { name: "asc" },
    select: {
      subJurisdictionId: true,
      name: true,
      welshName: true
    }
  });
}

export async function findSubJurisdictionsByIds(ids: number[]) {
  return prisma.subJurisdiction.findMany({
    where: {
      subJurisdictionId: { in: ids }
    },
    orderBy: { name: "asc" },
    select: {
      subJurisdictionId: true,
      name: true,
      welshName: true
    }
  });
}

export async function createListType(data: CreateListTypeData) {
  return prisma.listType.create({
    data: {
      name: data.name,
      friendlyName: data.friendlyName,
      welshFriendlyName: data.welshFriendlyName,
      shortenedFriendlyName: data.shortenedFriendlyName,
      url: data.url,
      defaultSensitivity: data.defaultSensitivity,
      allowedProvenance: data.allowedProvenance.join(","),
      isNonStrategic: data.isNonStrategic,
      subJurisdictions: {
        create: data.subJurisdictionIds.map((subJurisdictionId) => ({
          subJurisdictionId
        }))
      }
    }
  });
}

export async function updateListType(id: number, data: UpdateListTypeData) {
  return prisma.$transaction(async (tx) => {
    await tx.listTypeSubJurisdiction.deleteMany({
      where: { listTypeId: id }
    });

    return tx.listType.update({
      where: { id },
      data: {
        name: data.name,
        friendlyName: data.friendlyName,
        welshFriendlyName: data.welshFriendlyName,
        shortenedFriendlyName: data.shortenedFriendlyName,
        url: data.url,
        defaultSensitivity: data.defaultSensitivity,
        allowedProvenance: data.allowedProvenance.join(","),
        isNonStrategic: data.isNonStrategic,
        subJurisdictions: {
          create: data.subJurisdictionIds.map((subJurisdictionId) => ({
            subJurisdictionId
          }))
        }
      }
    });
  });
}

interface CreateListTypeData {
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

interface UpdateListTypeData {
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

export async function findNonStrategicListTypes() {
  return prisma.listType.findMany({
    where: { isNonStrategic: true, deletedAt: null },
    orderBy: { shortenedFriendlyName: "asc" },
    select: {
      id: true,
      name: true,
      friendlyName: true,
      shortenedFriendlyName: true,
      defaultSensitivity: true
    }
  });
}

export async function findStrategicListTypes() {
  return prisma.listType.findMany({
    where: { isNonStrategic: false, deletedAt: null },
    orderBy: { shortenedFriendlyName: "asc" },
    select: {
      id: true,
      name: true,
      friendlyName: true,
      shortenedFriendlyName: true,
      defaultSensitivity: true
    }
  });
}

export async function softDeleteListType(id: number) {
  return prisma.listType.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

export async function hasArtefactsForListType(listTypeId: number): Promise<boolean> {
  const count = await prisma.artefact.count({
    where: { listTypeId }
  });
  return count > 0;
}
