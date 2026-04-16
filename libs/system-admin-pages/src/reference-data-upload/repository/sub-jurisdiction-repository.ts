import type { PrismaClient } from "@hmcts/postgres";
import { prisma } from "@hmcts/postgres";

export interface JurisdictionOption {
  jurisdictionId: number;
  displayName: string;
}

export async function getMaxSubJurisdictionId(): Promise<number> {
  const result = await prisma.subJurisdiction.findFirst({
    orderBy: {
      subJurisdictionId: "desc"
    },
    select: {
      subJurisdictionId: true
    }
  });

  return result?.subJurisdictionId ?? 0;
}

export async function getAllJurisdictions(): Promise<JurisdictionOption[]> {
  const jurisdictions = await prisma.jurisdiction.findMany({
    select: {
      jurisdictionId: true,
      name: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return jurisdictions.map((j: { jurisdictionId: number; name: string }) => ({
    jurisdictionId: j.jurisdictionId,
    displayName: j.name
  }));
}

export async function checkSubJurisdictionExistsInJurisdiction(
  jurisdictionId: number,
  name: string,
  welshName: string
): Promise<{ nameExists: boolean; welshNameExists: boolean }> {
  const [nameExists, welshNameExists] = await Promise.all([
    prisma.subJurisdiction.findFirst({
      where: {
        jurisdictionId,
        name: {
          equals: name,
          mode: "insensitive"
        }
      }
    }),
    prisma.subJurisdiction.findFirst({
      where: {
        jurisdictionId,
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

export async function createSubJurisdiction(jurisdictionId: number, name: string, welshName: string): Promise<void> {
  await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
    // Lock the table to prevent race conditions
    await tx.$executeRaw`LOCK TABLE sub_jurisdiction IN EXCLUSIVE MODE`;

    const maxIdResult = await tx.$queryRaw<Array<{ max: number | null }>>`
      SELECT COALESCE(MAX(sub_jurisdiction_id), 0) as max
      FROM sub_jurisdiction
    `;
    const maxId = maxIdResult[0]?.max ?? 0;
    const newId = maxId + 1;

    await tx.subJurisdiction.create({
      data: {
        subJurisdictionId: newId,
        jurisdictionId,
        name: name.trim(),
        welshName: welshName.trim()
      }
    });
  });
}
