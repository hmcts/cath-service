const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
