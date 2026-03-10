const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVENANCE_ID_REGEX = /^[a-zA-Z0-9\-_@.]+$/;

const VALID_ROLES = ["VERIFIED", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL", "SYSTEM_ADMIN"];
const VALID_PROVENANCES = ["CFT_IDAM", "SSO", "B2C_IDAM", "CRIME_IDAM"];

export interface ValidationError {
  text: string;
  href: string;
}

export function validateEmail(email: string | undefined): ValidationError | null {
  if (!email) {
    return null; // Email is optional for search
  }

  if (email.length > 254) {
    return {
      text: "Email address must be 254 characters or less",
      href: "#email"
    };
  }

  // No format validation - allow partial matching for search
  return null;
}

export function validateUserId(userId: string | undefined): ValidationError | null {
  if (!userId) {
    return null; // User ID is optional for search
  }

  if (userId.length > 50) {
    return {
      text: "User ID must be 50 characters or less",
      href: "#userId"
    };
  }

  if (!UUID_REGEX.test(userId)) {
    return {
      text: "User ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)",
      href: "#userId"
    };
  }

  return null;
}

export function validateUserProvenanceId(userProvenanceId: string | undefined): ValidationError | null {
  if (!userProvenanceId) {
    return null; // User Provenance ID is optional for search
  }

  if (userProvenanceId.length > 100) {
    return {
      text: "User Provenance ID must be 100 characters or less",
      href: "#userProvenanceId"
    };
  }

  if (!PROVENANCE_ID_REGEX.test(userProvenanceId)) {
    return {
      text: "User Provenance ID must contain only letters, numbers, hyphens, underscores, @ and periods",
      href: "#userProvenanceId"
    };
  }

  return null;
}

export function validateRoles(roles: string[] | undefined): ValidationError | null {
  if (!roles || roles.length === 0) {
    return null; // Roles are optional for search
  }

  const invalidRoles = roles.filter((role) => !VALID_ROLES.includes(role));

  if (invalidRoles.length > 0) {
    return {
      text: "Invalid role selection",
      href: "#roles"
    };
  }

  return null;
}

export function validateProvenances(provenances: string[] | undefined): ValidationError | null {
  if (!provenances || provenances.length === 0) {
    return null; // Provenances are optional for search
  }

  const invalidProvenances = provenances.filter((prov) => !VALID_PROVENANCES.includes(prov));

  if (invalidProvenances.length > 0) {
    return {
      text: "Invalid provenance selection",
      href: "#provenances"
    };
  }

  return null;
}

export function validateSearchFilters(filters: {
  email?: string;
  userId?: string;
  userProvenanceId?: string;
  roles?: string[];
  provenances?: string[];
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(filters.email);
  if (emailError) errors.push(emailError);

  const userIdError = validateUserId(filters.userId);
  if (userIdError) errors.push(userIdError);

  const userProvenanceIdError = validateUserProvenanceId(filters.userProvenanceId);
  if (userProvenanceIdError) errors.push(userProvenanceIdError);

  const rolesError = validateRoles(filters.roles);
  if (rolesError) errors.push(rolesError);

  const provenancesError = validateProvenances(filters.provenances);
  if (provenancesError) errors.push(provenancesError);

  return errors;
}

export function validateDeleteConfirmation(confirmation: string | undefined): ValidationError | null {
  if (!confirmation) {
    return {
      text: "Select yes or no to continue",
      href: "#confirmation"
    };
  }

  if (confirmation !== "yes" && confirmation !== "no") {
    return {
      text: "Select yes or no to continue",
      href: "#confirmation"
    };
  }

  return null;
}
