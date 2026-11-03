import type { UserRole } from "../roles.js";

export interface User {
  email: string;
  firstName?: string;
  surname?: string;
  userProvenance: "SSO" | "CFT_IDAM" | "CRIME_IDAM" | "PI_AAD";
  userProvenanceId: string;
  role: UserRole;
}

export interface UpdateUserInput {
  role?: UserRole;
  lastSignedInDate?: Date;
  firstName?: string;
  surname?: string;
}
