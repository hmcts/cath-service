import { prisma } from "@hmcts/postgres";
import type { UpdateUserInput, User } from "./model.js";

export async function createUser(input: User) {
  return await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      surname: input.surname,
      userProvenance: input.userProvenance,
      userProvenanceId: input.userProvenanceId,
      role: input.role,
      lastSignedInDate: new Date()
    }
  });
}

export async function findUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { userId }
  });
}

export async function findUserByProvenanceId(userProvenanceId: string) {
  return await prisma.user.findUnique({
    where: { userProvenanceId }
  });
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findFirst({
    where: { email }
  });
}

export async function updateUser(userProvenanceId: string, input: UpdateUserInput) {
  return await prisma.user.update({
    where: { userProvenanceId },
    data: {
      ...(input.role && { role: input.role }),
      ...(input.lastSignedInDate && { lastSignedInDate: input.lastSignedInDate })
    }
  });
}

export async function createOrUpdateUser(input: User) {
  const existingUser = await findUserByProvenanceId(input.userProvenanceId);

  if (existingUser) {
    // Update existing user
    return await updateUser(input.userProvenanceId, {
      role: input.role,
      lastSignedInDate: new Date()
    });
  }

  // Create new user
  return await createUser(input);
}
