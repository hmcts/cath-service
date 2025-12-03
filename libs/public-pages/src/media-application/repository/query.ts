import { prisma } from "@hmcts/postgres";
import type { MediaApplicationCreateData } from "./model.js";

export async function createMediaApplication(data: MediaApplicationCreateData): Promise<string> {
  const application = await prisma.mediaApplication.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      employer: data.employer,
      status: "PENDING",
      appliedDate: new Date()
    }
  });
  return application.id;
}

export async function updateProofOfIdPath(applicationId: string, filePath: string, originalName: string): Promise<void> {
  await prisma.mediaApplication.update({
    where: { id: applicationId },
    data: {
      proofOfIdPath: filePath,
      proofOfIdOriginalName: originalName
    }
  });
}
