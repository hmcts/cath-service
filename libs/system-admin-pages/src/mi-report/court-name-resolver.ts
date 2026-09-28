import { prisma } from "@hmcts/postgres-prisma";

export async function buildCourtNameResolver(): Promise<CourtNameResolver> {
  const locations = await prisma.location.findMany({
    select: { locationId: true, name: true }
  });

  const nameByLocationId = new Map<string, string>();
  for (const location of locations) {
    nameByLocationId.set(String(location.locationId), location.name);
  }

  return (locationId: string | null | undefined) => {
    if (locationId === null || locationId === undefined) {
      return "";
    }
    return nameByLocationId.get(String(locationId)) ?? "";
  };
}

export type CourtNameResolver = (locationId: string | null | undefined) => string;
