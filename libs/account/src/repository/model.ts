export interface User {
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
