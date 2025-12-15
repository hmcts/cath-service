const SENSITIVITY_OPTIONS = ["Public", "Private", "Classified"] as const;
const PROVENANCE_OPTIONS = ["CFT_IDAM", "B2C", "COMMON_PLATFORM"] as const;

export function validateListTypeDetails(data: ListTypeDetailsInput) {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim() === "") {
    errors.push({
      field: "name",
      message: "Enter a value for name",
      href: "#name"
    });
  } else if (data.name.length > 1000) {
    errors.push({
      field: "name",
      message: "Name must be 1000 characters or less",
      href: "#name"
    });
  }

  if (!data.friendlyName || data.friendlyName.trim() === "") {
    errors.push({
      field: "friendlyName",
      message: "Enter a value for friendly name",
      href: "#friendlyName"
    });
  } else if (data.friendlyName.length > 1000) {
    errors.push({
      field: "friendlyName",
      message: "Friendly name must be 1000 characters or less",
      href: "#friendlyName"
    });
  }

  if (!data.welshFriendlyName || data.welshFriendlyName.trim() === "") {
    errors.push({
      field: "welshFriendlyName",
      message: "Enter a value for Welsh friendly name",
      href: "#welshFriendlyName"
    });
  } else if (data.welshFriendlyName.length > 255) {
    errors.push({
      field: "welshFriendlyName",
      message: "Welsh friendly name must be 255 characters or less",
      href: "#welshFriendlyName"
    });
  }

  if (!data.shortenedFriendlyName || data.shortenedFriendlyName.trim() === "") {
    errors.push({
      field: "shortenedFriendlyName",
      message: "Enter a value for shortened friendly name",
      href: "#shortenedFriendlyName"
    });
  } else if (data.shortenedFriendlyName.length > 255) {
    errors.push({
      field: "shortenedFriendlyName",
      message: "Shortened friendly name must be 255 characters or less",
      href: "#shortenedFriendlyName"
    });
  }

  if (!data.url || data.url.trim() === "") {
    errors.push({
      field: "url",
      message: "Enter a value for URL",
      href: "#url"
    });
  } else if (data.url.length > 255) {
    errors.push({
      field: "url",
      message: "URL must be 255 characters or less",
      href: "#url"
    });
  }

  if (!data.defaultSensitivity || data.defaultSensitivity.trim() === "") {
    errors.push({
      field: "defaultSensitivity",
      message: "Select a default sensitivity",
      href: "#defaultSensitivity"
    });
  } else if (!SENSITIVITY_OPTIONS.includes(data.defaultSensitivity as never)) {
    errors.push({
      field: "defaultSensitivity",
      message: "Select a valid default sensitivity",
      href: "#defaultSensitivity"
    });
  }

  if (!data.allowedProvenance || data.allowedProvenance.length === 0) {
    errors.push({
      field: "allowedProvenance",
      message: "Select at least one allowed provenance",
      href: "#allowedProvenance"
    });
  } else {
    for (const provenance of data.allowedProvenance) {
      if (!PROVENANCE_OPTIONS.includes(provenance as never)) {
        errors.push({
          field: "allowedProvenance",
          message: "Select valid provenance options",
          href: "#allowedProvenance"
        });
        break;
      }
    }
  }

  if (data.isNonStrategic === undefined || data.isNonStrategic === null) {
    errors.push({
      field: "isNonStrategic",
      message: "Select whether this list type is non-strategic",
      href: "#isNonStrategic"
    });
  }

  return errors;
}

export function validateSubJurisdictions(subJurisdictionIds: number[]) {
  const errors: ValidationError[] = [];

  if (!subJurisdictionIds || subJurisdictionIds.length === 0) {
    errors.push({
      field: "subJurisdictions",
      message: "Select at least one sub-jurisdiction",
      href: "#subJurisdictions"
    });
  }

  return errors;
}

export interface ListTypeDetailsInput {
  name: string;
  friendlyName: string;
  welshFriendlyName: string;
  shortenedFriendlyName: string;
  url: string;
  defaultSensitivity: string;
  allowedProvenance: string[];
  isNonStrategic: boolean | undefined | null;
}

export interface ValidationError {
  field: string;
  message: string;
  href: string;
}
