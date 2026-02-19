// Safe email regex - uses specific character sets to avoid ReDoS
// Allows alphanumeric, dots, underscores, percent, plus, and hyphens in local part
// Allows alphanumeric, dots, and hyphens in domain part
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

export interface PublicationEvent {
  publicationId: string;
  locationId: string;
  locationName: string;
  hearingListName: string;
  publicationDate: Date;
  listTypeId?: number;
  language?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePublicationEvent(event: PublicationEvent): ValidationResult {
  const errors: string[] = [];

  if (!event.publicationId) {
    errors.push("Publication ID is required");
  }

  if (!event.locationId) {
    errors.push("Location ID is required");
  }

  if (!event.locationName) {
    errors.push("Location name is required");
  }

  if (!event.hearingListName) {
    errors.push("Hearing list name is required");
  }

  if (!event.publicationDate) {
    errors.push("Publication date is required");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
