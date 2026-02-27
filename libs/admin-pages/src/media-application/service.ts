import fs from "node:fs/promises";
import path from "node:path";
import { createUser } from "@hmcts/account/repository/query";
import { checkUserExists, createMediaUser } from "@hmcts/auth";
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

  const userExists = await checkUserExists(accessToken, application.email);

  if (!userExists) {
    const { givenName, surname } = splitName(application.name);

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

  return { isNewUser: !userExists };
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

export function splitName(fullName: string): { givenName: string; surname: string } {
  const trimmed = fullName.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    return { givenName: trimmed, surname: trimmed };
  }

  return {
    givenName: trimmed.substring(0, lastSpaceIndex),
    surname: trimmed.substring(lastSpaceIndex + 1)
  };
}

async function createLocalMediaUser(email: string, name: string, azureAdUserId: string): Promise<void> {
  const { givenName, surname } = splitName(name);

  await createUser({
    email,
    firstName: givenName,
    surname,
    userProvenance: "B2C_IDAM",
    userProvenanceId: azureAdUserId,
    role: "VERIFIED"
  });
}
