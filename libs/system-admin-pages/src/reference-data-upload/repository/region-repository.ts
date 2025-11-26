import { prisma } from "@hmcts/postgres";

export async function getMaxRegionId(): Promise<number> {
  const result = await prisma.region.findFirst({
    orderBy: {
      regionId: "desc"
    },
    select: {
      regionId: true
    }
  });

  return result?.regionId ?? 0;
}

export async function checkRegionExists(name: string, welshName: string): Promise<{ nameExists: boolean; welshNameExists: boolean }> {
  const [nameExists, welshNameExists] = await Promise.all([
    prisma.region.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive"
        }
      }
    }),
    prisma.region.findFirst({
      where: {
        welshName: {
          equals: welshName,
          mode: "insensitive"
        }
      }
    })
  ]);

  return {
    nameExists: nameExists !== null,
    welshNameExists: welshNameExists !== null
  };
}

export async function createRegion(name: string, welshName: string): Promise<void> {
  const maxId = await getMaxRegionId();
  const newId = maxId + 1;

  await prisma.region.create({
    data: {
      regionId: newId,
      name: name.trim(),
      welshName: welshName.trim()
    }
  });
}
