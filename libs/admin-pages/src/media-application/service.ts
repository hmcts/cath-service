import fs from "node:fs/promises";
import path from "node:path";
import { createLocalMediaUser, splitName, updateLocalMediaUser } from "@hmcts/account/repository/service";
import { createMediaUser, findUserByEmail, updateMediaUser } from "@hmcts/auth";
import { APPLICATION_STATUS } from "./model.js";
import { getApplicationById, updateApplicationStatus } from "./queries.js";

export async function approveApplication(id: string, accessToken: string): Promise<{ isNewUser: boolean }> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  const existingUserId = await findUserByEmail(accessToken, application.email);
  const { givenName, surname } = splitName(application.name);

  if (existingUserId) {
    await updateMediaUser(accessToken, existingUserId, {
      displayName: application.name,
      givenName,
      surname
    });
    await updateLocalMediaUser(existingUserId, givenName, surname);
  } else {
    const { azureAdUserId } = await createMediaUser(accessToken, {
      email: application.email,
      displayName: application.name,
      givenName,
      surname
    });

    await createLocalMediaUser(application.email, application.name, azureAdUserId);
  }

  await updateApplicationStatus(id, APPLICATION_STATUS.APPROVED);

  if (application.proofOfIdPath) {
    await deleteProofOfIdFile(application.proofOfIdPath);
  }

  return { isNewUser: !existingUserId };
}

export async function rejectApplication(id: string): Promise<void> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  await updateApplicationStatus(id, APPLICATION_STATUS.REJECTED);

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
