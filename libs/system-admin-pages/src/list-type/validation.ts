const SENSITIVITY_OPTIONS = ["Public", "Private", "Classified"] as const;
const PROVENANCE_OPTIONS = ["CFT_IDAM", "PI_AAD", "COMMON_PLATFORM"] as const;

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: "name",
    friendlyName: "friendly name",
    welshFriendlyName: "Welsh friendly name",
    shortenedFriendlyName: "shortened friendly name",
    url: "URL"
  };
  return labels[fieldName] || fieldName;
}

function getFieldLabelCapitalized(fieldName: string): string {
  const labels: Record<string, string> = {
    name: "Name",
    friendlyName: "Friendly name",
    welshFriendlyName: "Welsh friendly name",
    shortenedFriendlyName: "Shortened friendly name",
    url: "URL"
  };
  return labels[fieldName] || fieldName;
}

function validateRequiredField(value: string, fieldName: string, maxLength: number): ValidationError | null {
  if (!value || value.trim() === "") {
    return {
      field: fieldName,
      message: `Enter a value for ${getFieldLabel(fieldName)}`,
      href: `#${fieldName}`
    };
  }

  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `${getFieldLabelCapitalized(fieldName)} must be ${maxLength} characters or less`,
      href: `#${fieldName}`
    };
  }

  return null;
}

function validateSensitivity(sensitivity: string): ValidationError | null {
  if (!sensitivity || sensitivity.trim() === "") {
    return {
      field: "defaultSensitivity",
      message: "Select a default sensitivity",
      href: "#defaultSensitivity"
    };
  }

  if (!SENSITIVITY_OPTIONS.includes(sensitivity as never)) {
    return {
      field: "defaultSensitivity",
      message: "Select a valid default sensitivity",
      href: "#defaultSensitivity"
    };
  }

  return null;
}

function validateProvenance(provenanceList: string[]): ValidationError | null {
  if (!provenanceList || provenanceList.length === 0) {
    return {
      field: "allowedProvenance",
      message: "Select at least one allowed provenance",
      href: "#allowedProvenance"
    };
  }

  for (const provenance of provenanceList) {
    if (!PROVENANCE_OPTIONS.includes(provenance as never)) {
      return {
        field: "allowedProvenance",
        message: "Select valid provenance options",
        href: "#allowedProvenance"
      };
    }
  }

  return null;
}

export function validateListTypeDetails(data: ListTypeDetailsInput) {
  const errors: ValidationError[] = [];

  const nameError = validateRequiredField(data.name, "name", 1000);
  if (nameError) errors.push(nameError);

  const friendlyNameError = validateRequiredField(data.friendlyName, "friendlyName", 1000);
  if (friendlyNameError) errors.push(friendlyNameError);

  const welshFriendlyNameError = validateRequiredField(data.welshFriendlyName, "welshFriendlyName", 255);
  if (welshFriendlyNameError) errors.push(welshFriendlyNameError);

  const shortenedFriendlyNameError = validateRequiredField(data.shortenedFriendlyName, "shortenedFriendlyName", 255);
  if (shortenedFriendlyNameError) errors.push(shortenedFriendlyNameError);

  const urlError = validateRequiredField(data.url, "url", 255);
  if (urlError) errors.push(urlError);

  const sensitivityError = validateSensitivity(data.defaultSensitivity);
  if (sensitivityError) errors.push(sensitivityError);

  const provenanceError = validateProvenance(data.allowedProvenance);
  if (provenanceError) errors.push(provenanceError);

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
