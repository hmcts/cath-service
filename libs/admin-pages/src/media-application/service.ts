import path from "node:path";
import { createLocalMediaUser, splitName, updateLocalMediaUser } from "@hmcts/account/repository/service";
import { createMediaUser, findUserByEmail, updateMediaUser } from "@hmcts/auth";
import { CONTAINER, deleteBlob } from "@hmcts/azure-blob";
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
    await updateLocalMediaUser(application.email, existingUserId, givenName, surname);
  } else {
    const { azureAdUserId } = await createMediaUser(accessToken, {
      email: application.email,
      displayName: application.name,
      givenName,
      surname
    });

    await createLocalMediaUser(application.email, application.name, azureAdUserId);
  }

  await Promise.all([
    updateApplicationStatus(id, APPLICATION_STATUS.APPROVED),
    application.proofOfIdPath ? deleteBlob(path.basename(application.proofOfIdPath), CONTAINER.FILES) : Promise.resolve()
  ]);

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

  await Promise.all([
    updateApplicationStatus(id, APPLICATION_STATUS.REJECTED),
    application.proofOfIdPath ? deleteBlob(path.basename(application.proofOfIdPath), CONTAINER.FILES) : Promise.resolve()
  ]);
}
