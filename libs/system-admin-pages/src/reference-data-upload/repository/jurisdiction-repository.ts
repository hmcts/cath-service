import { prisma } from "@hmcts/postgres";

export async function getMaxJurisdictionId(): Promise<number> {
  const result = await prisma.jurisdiction.findFirst({
    orderBy: {
      jurisdictionId: "desc"
    },
    select: {
      jurisdictionId: true
    }
  });

  return result?.jurisdictionId ?? 0;
}

export async function checkJurisdictionExists(name: string, welshName: string): Promise<{ nameExists: boolean; welshNameExists: boolean }> {
  const [nameExists, welshNameExists] = await Promise.all([
    prisma.jurisdiction.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive"
        }
      }
    }),
    prisma.jurisdiction.findFirst({
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

export async function createJurisdiction(name: string, welshName: string): Promise<void> {
  const maxId = await getMaxJurisdictionId();
  const newId = maxId + 1;

  await prisma.jurisdiction.create({
    data: {
      jurisdictionId: newId,
      name: name.trim(),
      welshName: welshName.trim()
    }
  });
}
