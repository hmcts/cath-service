import fs from "node:fs/promises";
import path from "node:path";
import { APPLICATION_STATUS } from "./model.js";
import { getApplicationById, updateApplicationStatus } from "./queries.js";

export async function approveApplication(id: string): Promise<void> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  await updateApplicationStatus(id, APPLICATION_STATUS.APPROVED);

  if (application.proofOfIdPath) {
    await deleteProofOfIdFile(application.proofOfIdPath);
  }
}

export async function deleteProofOfIdFile(filePath: string): Promise<void> {
  if (filePath.includes("..")) {
    throw new Error("Invalid file path");
  }

  try {
    const sanitizedPath = path.normalize(filePath);
    await fs.unlink(sanitizedPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
