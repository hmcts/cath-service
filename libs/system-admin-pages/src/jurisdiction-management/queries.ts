import type { PrismaClient } from "@hmcts/postgres-prisma";
import { prisma } from "@hmcts/postgres-prisma";

export type JurisdictionDataType = "Jurisdiction" | "Sub-Jurisdiction" | "Region";

export interface JurisdictionDataRow {
  id: number;
  name: string;
  welshName: string;
  type: JurisdictionDataType;
}

export async function listAllJurisdictionData(filter?: { jurisdiction?: string; subJurisdiction?: string }): Promise<JurisdictionDataRow[]> {
  const [jurisdictions, subJurisdictions, regions] = await Promise.all([
    prisma.jurisdiction.findMany({
      where: {
        ...(filter?.jurisdiction ? { name: { equals: filter.jurisdiction, mode: "insensitive" as const } } : {})
      },
      orderBy: { name: "asc" }
    }),
    prisma.subJurisdiction.findMany({
      where: {
        ...(filter?.subJurisdiction ? { name: { equals: filter.subJurisdiction, mode: "insensitive" as const } } : {})
      },
      orderBy: { name: "asc" }
    }),
    prisma.region.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  const rows: JurisdictionDataRow[] = [
    ...jurisdictions.map((j) => ({ id: j.jurisdictionId, name: j.name, welshName: j.welshName, type: "Jurisdiction" as const })),
    ...subJurisdictions.map((s) => ({ id: s.subJurisdictionId, name: s.name, welshName: s.welshName, type: "Sub-Jurisdiction" as const })),
    ...regions.map((r) => ({ id: r.regionId, name: r.name, welshName: r.welshName, type: "Region" as const }))
  ];

  if (filter?.jurisdiction && !filter?.subJurisdiction) {
    return rows.filter((r) => r.type === "Jurisdiction");
  }
  if (filter?.subJurisdiction && !filter?.jurisdiction) {
    return rows.filter((r) => r.type === "Sub-Jurisdiction");
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listJurisdictionsWithSubJurisdictions() {
  return prisma.jurisdiction.findMany({
    include: {
      subJurisdictions: {
        orderBy: { name: "asc" }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function listRegions() {
  return prisma.region.findMany({
    orderBy: { name: "asc" }
  });
}

export async function findJurisdictionDataById(id: number, type: JurisdictionDataType) {
  switch (type) {
    case "Jurisdiction":
      return prisma.jurisdiction.findUnique({ where: { jurisdictionId: id } });
    case "Sub-Jurisdiction":
      return prisma.subJurisdiction.findUnique({ where: { subJurisdictionId: id } });
    case "Region":
      return prisma.region.findUnique({ where: { regionId: id } });
  }
}

export async function createJurisdictionRecord(data: { name: string; welshName: string; type: JurisdictionDataType; jurisdictionId?: number }): Promise<void> {
  switch (data.type) {
    case "Jurisdiction": {
      const max = await prisma.jurisdiction.findFirst({ orderBy: { jurisdictionId: "desc" }, select: { jurisdictionId: true } });
      await prisma.jurisdiction.create({
        data: { jurisdictionId: (max?.jurisdictionId ?? 0) + 1, name: data.name.trim(), welshName: data.welshName.trim() }
      });
      break;
    }
    case "Sub-Jurisdiction": {
      await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
        await tx.$executeRaw`LOCK TABLE sub_jurisdiction IN EXCLUSIVE MODE`;
        const maxResult = await tx.$queryRaw<Array<{ max: number | null }>>`
          SELECT COALESCE(MAX(sub_jurisdiction_id), 0) as max FROM sub_jurisdiction
        `;
        const newId = (maxResult[0]?.max ?? 0) + 1;
        await tx.subJurisdiction.create({
          data: {
            subJurisdictionId: newId,
            jurisdictionId: data.jurisdictionId!,
            name: data.name.trim(),
            welshName: data.welshName.trim()
          }
        });
      });
      break;
    }
    case "Region": {
      const max = await prisma.region.findFirst({ orderBy: { regionId: "desc" }, select: { regionId: true } });
      await prisma.region.create({
        data: { regionId: (max?.regionId ?? 0) + 1, name: data.name.trim(), welshName: data.welshName.trim() }
      });
      break;
    }
  }
}

export async function updateJurisdictionRecord(
  id: number,
  type: JurisdictionDataType,
  data: { name?: string; welshName?: string; jurisdictionId?: number }
): Promise<void> {
  switch (type) {
    case "Jurisdiction": {
      const updateData: Record<string, string> = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.welshName !== undefined) updateData.welshName = data.welshName.trim();
      await prisma.jurisdiction.update({ where: { jurisdictionId: id }, data: updateData });
      break;
    }
    case "Sub-Jurisdiction": {
      const updateData: Record<string, string | number> = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.welshName !== undefined) updateData.welshName = data.welshName.trim();
      if (data.jurisdictionId !== undefined) updateData.jurisdictionId = data.jurisdictionId;
      await prisma.subJurisdiction.update({ where: { subJurisdictionId: id }, data: updateData });
      break;
    }
    case "Region": {
      const updateData: Record<string, string> = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.welshName !== undefined) updateData.welshName = data.welshName.trim();
      await prisma.region.update({ where: { regionId: id }, data: updateData });
      break;
    }
  }
}

export async function hardDeleteJurisdictionRecord(id: number, type: JurisdictionDataType): Promise<void> {
  switch (type) {
    case "Jurisdiction":
      await prisma.jurisdiction.delete({ where: { jurisdictionId: id } });
      break;
    case "Sub-Jurisdiction":
      await prisma.subJurisdiction.delete({ where: { subJurisdictionId: id } });
      break;
    case "Region":
      await prisma.region.delete({ where: { regionId: id } });
      break;
  }
}

export async function getLocationJurisdictionData(locationId: number) {
  return prisma.location.findUnique({
    where: { locationId },
    include: {
      locationSubJurisdictions: {
        include: {
          subJurisdiction: {
            include: { jurisdiction: true }
          }
        }
      },
      locationRegions: {
        include: { region: true }
      }
    }
  });
}

export async function updateLocationJurisdictions(locationId: number, subJurisdictionIds: number[], regionIds: number[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.locationSubJurisdiction.deleteMany({ where: { locationId } });
    await tx.locationRegion.deleteMany({ where: { locationId } });

    if (subJurisdictionIds.length > 0) {
      await tx.locationSubJurisdiction.createMany({
        data: subJurisdictionIds.map((subJurisdictionId) => ({ locationId, subJurisdictionId }))
      });
    }

    if (regionIds.length > 0) {
      await tx.locationRegion.createMany({
        data: regionIds.map((regionId) => ({ locationId, regionId }))
      });
    }
  });
}

export async function deleteLocationJurisdictions(locationId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.locationSubJurisdiction.deleteMany({ where: { locationId } });
    await tx.locationRegion.deleteMany({ where: { locationId } });
  });
}

export async function hasDependencies(id: number, type: JurisdictionDataType): Promise<boolean> {
  switch (type) {
    case "Jurisdiction": {
      const count = await prisma.subJurisdiction.count({ where: { jurisdictionId: id } });
      return count > 0;
    }
    case "Sub-Jurisdiction": {
      const [locationCount, listTypeCount] = await Promise.all([
        prisma.locationSubJurisdiction.count({ where: { subJurisdictionId: id } }),
        prisma.listTypeSubJurisdiction.count({ where: { subJurisdictionId: id } })
      ]);
      return locationCount > 0 || listTypeCount > 0;
    }
    case "Region": {
      const count = await prisma.locationRegion.count({ where: { regionId: id } });
      return count > 0;
    }
  }
}
