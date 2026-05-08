import { createUser, updateUser } from "./query.js";

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
    userProvenance: "B2C_IDAM",
    userProvenanceId: azureAdUserId,
    role: "VERIFIED"
  });
}

export async function updateLocalMediaUser(azureAdUserId: string, firstName: string, surname: string): Promise<void> {
  await updateUser(azureAdUserId, { firstName, surname });
}
