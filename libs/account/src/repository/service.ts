import { createUser, findUserByProvenanceId, updateUser } from "./query.js";

const MEDIA_USER_PROVENANCE = "PI_AAD";

export function splitName(fullName: string): { givenName: string; surname: string } {
  const trimmed = fullName.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(" ");

  if (lastSpaceIndex === -1) {
    return { givenName: trimmed, surname: "" };
  }

  return {
    givenName: trimmed.substring(0, lastSpaceIndex),
    surname: trimmed.substring(lastSpaceIndex + 1)
  };
}

export async function createLocalMediaUser(email: string, name: string, azureAdUserId: string): Promise<void> {
  const { givenName, surname } = splitName(name);

  await createUser({
    email,
    firstName: givenName,
    surname,
    userProvenance: MEDIA_USER_PROVENANCE,
    userProvenanceId: azureAdUserId,
    role: "VERIFIED"
  });
}

export async function updateLocalMediaUser(email: string, azureAdUserId: string, firstName: string, surname: string): Promise<void> {
  const existing = await findUserByProvenanceId(azureAdUserId);

  if (existing) {
    await updateUser(azureAdUserId, { firstName, surname });
  } else {
    await createUser({
      email,
      firstName,
      surname,
      userProvenance: MEDIA_USER_PROVENANCE,
      userProvenanceId: azureAdUserId,
      role: "VERIFIED"
    });
  }
}
