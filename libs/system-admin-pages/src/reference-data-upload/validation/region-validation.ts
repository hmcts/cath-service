import type { ValidationError } from "../model.js";
import { checkRegionExists } from "../repository/region-repository.js";

const HTML_TAG_REGEX = /<[^<>]*>/;

export interface RegionFormData {
  name: string | undefined;
  welshName: string | undefined;
}

export async function validateRegionData(data: RegionFormData): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      text: "Enter region name in English",
      href: "#name"
    });
  }

  if (!data.welshName || data.welshName.trim().length === 0) {
    errors.push({
      text: "Enter region name in Welsh",
      href: "#welshName"
    });
  }

  // If both fields are empty, return early
  if (errors.length === 2) {
    return errors;
  }

  // Check for HTML tags
  if (data.name && HTML_TAG_REGEX.test(data.name)) {
    errors.push({
      text: "Region name (English) contains HTML tags which are not allowed",
      href: "#name"
    });
  }

  if (data.welshName && HTML_TAG_REGEX.test(data.welshName)) {
    errors.push({
      text: "Region name (Welsh) contains HTML tags which are not allowed",
      href: "#welshName"
    });
  }

  // Check for duplicates
  if (data.name && data.welshName) {
    const { nameExists, welshNameExists } = await checkRegionExists(data.name.trim(), data.welshName.trim());

    if (nameExists) {
      errors.push({
        text: `Region '${data.name.trim()}' already exists in the database`,
        href: "#name"
      });
    }

    if (welshNameExists) {
      errors.push({
        text: `Welsh region name '${data.welshName.trim()}' already exists in the database`,
        href: "#welshName"
      });
    }
  }

  return errors;
}
