import { prisma } from "@hmcts/postgres";
import type { MediaApplicationCreateData } from "./model.js";

export async function createMediaApplication(data: MediaApplicationCreateData): Promise<string> {
  const application = await prisma.mediaApplication.create({
    data: {
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      employer: data.employer,
      status: "PENDING",
      requestDate: new Date(),
      statusDate: new Date()
    }
  });
  return application.id;
}
