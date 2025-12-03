import { prisma } from "@hmcts/postgres";
import { APPLICATION_STATUS, type MediaApplicationDetails, type PendingApplicationSummary } from "./model.js";

export async function getPendingApplications(): Promise<PendingApplicationSummary[]> {
  const applications = await prisma.mediaApplication.findMany({
    where: {
      status: APPLICATION_STATUS.PENDING
    },
    select: {
      id: true,
      name: true,
      employer: true,
      appliedDate: true
    },
    orderBy: {
      appliedDate: "desc"
    }
  });

  return applications;
}

export async function getApplicationById(id: string): Promise<MediaApplicationDetails | null> {
  const application = await prisma.mediaApplication.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      employer: true,
      proofOfIdPath: true,
      proofOfIdOriginalName: true,
      status: true,
      appliedDate: true
    }
  });

  return application as MediaApplicationDetails | null;
}

export async function updateApplicationStatus(id: string, status: string): Promise<MediaApplicationDetails> {
  const application = await prisma.mediaApplication.update({
    where: { id },
    data: {
      status
    },
    select: {
      id: true,
      name: true,
      email: true,
      employer: true,
      proofOfIdPath: true,
      proofOfIdOriginalName: true,
      status: true,
      appliedDate: true
    }
  });

  return application as MediaApplicationDetails;
}

export async function getPendingCount(): Promise<number> {
  const count = await prisma.mediaApplication.count({
    where: {
      status: APPLICATION_STATUS.PENDING
    }
  });

  return count;
}
