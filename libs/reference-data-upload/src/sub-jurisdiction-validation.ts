import { checkSubJurisdictionExistsInJurisdiction } from "./sub-jurisdiction-repository.js";

export interface ValidationError {
  text: string;
  href: string;
}

export interface SubJurisdictionFormData {
  jurisdictionId: string;
  name: string;
  welshName: string;
}

export async function validateSubJurisdictionData(data: SubJurisdictionFormData): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!data.jurisdictionId || data.jurisdictionId.trim().length === 0) {
    errors.push({
      text: "Select a jurisdiction",
      href: "#jurisdictionId"
    });
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      text: "Enter Sub Jurisdiction Name in English",
      href: "#name"
    });
  }

  if (!data.welshName || data.welshName.trim().length === 0) {
    errors.push({
      text: "Enter Sub Jurisdiction Name in Welsh",
      href: "#welshName"
    });
  }

  // If any required field is empty, return early
  if (errors.length > 0) {
    return errors;
  }

  // Parse jurisdictionId to number
  const jurisdictionIdNum = Number.parseInt(data.jurisdictionId, 10);
  if (Number.isNaN(jurisdictionIdNum)) {
    errors.push({
      text: "Invalid jurisdiction selection",
      href: "#jurisdictionId"
    });
    return errors;
  }

  // Check for duplicates within the selected jurisdiction
  const { nameExists, welshNameExists } = await checkSubJurisdictionExistsInJurisdiction(jurisdictionIdNum, data.name.trim(), data.welshName.trim());

  if (nameExists) {
    errors.push({
      text: `Sub Jurisdiction '${data.name.trim()}' already exists in the selected jurisdiction`,
      href: "#name"
    });
  }

  if (welshNameExists) {
    errors.push({
      text: `Sub Jurisdiction Name '${data.welshName.trim()}' already exists in the selected jurisdiction`,
      href: "#welshName"
    });
  }

  return errors;
}
