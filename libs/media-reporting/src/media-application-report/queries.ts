import { prisma } from "@hmcts/postgres-prisma";

export async function getApplicationsForReport(): Promise<ReportApplication[]> {
  return prisma.mediaApplication.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      employer: true,
      status: true,
      appliedDate: true
    },
    orderBy: { appliedDate: "asc" }
  });
}

export async function deleteApplicationsByIds(ids: string[]): Promise<number> {
  const result = await prisma.mediaApplication.deleteMany({
    where: { id: { in: ids } }
  });
  return result.count;
}

export interface ReportApplication {
  id: string;
  name: string;
  email: string;
  employer: string;
  status: string;
  appliedDate: Date;
}
