import type { ErrorObject } from "ajv";

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  hearingTime: "Hearing time",
  caseReferenceNumber: "Case reference number",
  caseName: "Case name",
  venuePlatform: "Venue/Platform",
  judges: "Judge(s)",
  members: "Member(s)",
  additionalInformation: "Additional information"
};

export function formatValidationErrors(errors: ErrorObject[]): string[] {
  return errors.map((error) => {
    const path = error.instancePath || "";
    const pathParts = path.split("/").filter(Boolean);

    const itemIndex = pathParts[0];
    const fieldName = pathParts[1] || error.params.missingProperty;
    const fieldLabel = FIELD_LABELS[fieldName] || fieldName;

    const rowNumber = itemIndex ? Number.parseInt(itemIndex, 10) + 1 : 0;
    const rowPrefix = rowNumber > 0 ? `Row ${rowNumber}: ` : "";

    switch (error.keyword) {
      case "required":
        return `${rowPrefix}${fieldLabel} is required`;
      case "pattern":
        if (fieldName === "date") {
          return `${rowPrefix}${fieldLabel} must be in format dd/MM/yyyy (e.g., 02/01/2025)`;
        }
        if (fieldName === "hearingTime") {
          return `${rowPrefix}${fieldLabel} must be in format like "10:30am" or "2pm"`;
        }
        return `${rowPrefix}${fieldLabel} contains invalid characters (HTML tags not allowed)`;
      case "type":
        return `${rowPrefix}${fieldLabel} must be a ${error.params.type}`;
      default:
        return `${rowPrefix}${fieldLabel}: ${error.message}`;
    }
  });
}
