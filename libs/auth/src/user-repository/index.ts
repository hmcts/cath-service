import { prisma } from "@hmcts/postgres";

export interface CreateUserInput {
  email: string;
  firstName?: string;
  surname?: string;
  userProvenance: "SSO" | "CFT_IDAM" | "CRIME_IDAM" | "B2C_IDAM";
  userProvenanceId: string;
  role: "VERIFIED" | "LOCAL_ADMIN" | "CTSC_ADMIN" | "SYSTEM_ADMIN";
}

export interface UpdateUserInput {
  role?: "VERIFIED" | "LOCAL_ADMIN" | "CTSC_ADMIN" | "SYSTEM_ADMIN";
  lastSignedInDate?: Date;
}

export async function createUser(input: CreateUserInput) {
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

export async function findUserByProvenanceId(userProvenanceId: string) {
  return await prisma.user.findUnique({
    where: { userProvenanceId }
  });
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
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

export async function createOrUpdateUser(input: CreateUserInput) {
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
