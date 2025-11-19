import { prisma } from "@hmcts/postgres";
import type { ParsedLocationData, ValidationError } from "../model.js";

const HTML_TAG_REGEX = /<[^<>]*>/;

export async function validateLocationData(data: ParsedLocationData[]): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Check for required fields and HTML tags
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    if (!row.locationName) {
      errors.push({
        text: `Row ${rowNumber}: LOCATION_NAME is required`,
        href: "#file"
      });
    } else if (HTML_TAG_REGEX.test(row.locationName)) {
      errors.push({
        text: `Row ${rowNumber}: LOCATION_NAME contains HTML tags which are not allowed`,
        href: "#file"
      });
    }

    if (!row.welshLocationName) {
      errors.push({
        text: `Row ${rowNumber}: WELSH_LOCATION_NAME is required`,
        href: "#file"
      });
    } else if (HTML_TAG_REGEX.test(row.welshLocationName)) {
      errors.push({
        text: `Row ${rowNumber}: WELSH_LOCATION_NAME contains HTML tags which are not allowed`,
        href: "#file"
      });
    }

    if (row.email && HTML_TAG_REGEX.test(row.email)) {
      errors.push({
        text: `Row ${rowNumber}: EMAIL contains HTML tags which are not allowed`,
        href: "#file"
      });
    }

    if (row.contactNo && HTML_TAG_REGEX.test(row.contactNo)) {
      errors.push({
        text: `Row ${rowNumber}: CONTACT_NO contains HTML tags which are not allowed`,
        href: "#file"
      });
    }

    if (row.subJurisdictionNames.length === 0) {
      errors.push({
        text: `Row ${rowNumber}: SUB_JURISDICTION_NAME is required`,
        href: "#file"
      });
    }

    if (row.regionNames.length === 0) {
      errors.push({
        text: `Row ${rowNumber}: REGION_NAME is required`,
        href: "#file"
      });
    }
  }

  // Check for duplicates within the file
  const locationNames = new Map<string, number>();
  const welshLocationNames = new Map<string, number>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    if (row.locationName) {
      const lowerName = row.locationName.toLowerCase();
      if (locationNames.has(lowerName)) {
        errors.push({
          text: `Location name "${row.locationName}" appears more than once in the file (rows ${locationNames.get(lowerName)} and ${rowNumber})`,
          href: "#file"
        });
      } else {
        locationNames.set(lowerName, rowNumber);
      }
    }

    if (row.welshLocationName) {
      const lowerWelshName = row.welshLocationName.toLowerCase();
      if (welshLocationNames.has(lowerWelshName)) {
        errors.push({
          text: `Welsh location name "${row.welshLocationName}" appears more than once in the file (rows ${welshLocationNames.get(lowerWelshName)} and ${rowNumber})`,
          href: "#file"
        });
      } else {
        welshLocationNames.set(lowerWelshName, rowNumber);
      }
    }
  }

  // Check for duplicates against database (excluding rows where location_id matches)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    if (row.locationName) {
      const existingLocation = await prisma.location.findFirst({
        where: {
          name: {
            equals: row.locationName,
            mode: "insensitive"
          },
          locationId: {
            not: row.locationId
          }
        }
      });

      if (existingLocation) {
        errors.push({
          text: `Row ${rowNumber}: Location name "${row.locationName}" already exists in the database with a different location ID`,
          href: "#file"
        });
      }
    }

    if (row.welshLocationName) {
      const existingLocation = await prisma.location.findFirst({
        where: {
          welshName: {
            equals: row.welshLocationName,
            mode: "insensitive"
          },
          locationId: {
            not: row.locationId
          }
        }
      });

      if (existingLocation) {
        errors.push({
          text: `Row ${rowNumber}: Welsh location name "${row.welshLocationName}" already exists in the database with a different location ID`,
          href: "#file"
        });
      }
    }
  }

  // Validate sub-jurisdiction names exist in lookup table
  const allSubJurisdictionNames = [...new Set(data.flatMap((row) => row.subJurisdictionNames))];
  if (allSubJurisdictionNames.length > 0) {
    const existingSubJurisdictions = await prisma.subJurisdiction.findMany({
      where: {
        name: {
          in: allSubJurisdictionNames
        }
      },
      select: {
        name: true
      }
    });

    const existingNames = new Set(existingSubJurisdictions.map((sj) => sj.name));
    const missingSubJurisdictions = allSubJurisdictionNames.filter((name) => !existingNames.has(name));

    for (const missing of missingSubJurisdictions) {
      const rowsWithMissing = data
        .map((row, idx) => ({ row, idx }))
        .filter(({ row }) => row.subJurisdictionNames.includes(missing))
        .map(({ idx }) => idx + 1);

      errors.push({
        text: `Sub-jurisdiction "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")})`,
        href: "#file"
      });
    }
  }

  // Validate region names exist in lookup table
  const allRegionNames = [...new Set(data.flatMap((row) => row.regionNames))];
  if (allRegionNames.length > 0) {
    const existingRegions = await prisma.region.findMany({
      where: {
        name: {
          in: allRegionNames
        }
      },
      select: {
        name: true
      }
    });

    const existingNames = new Set(existingRegions.map((r) => r.name));
    const missingRegions = allRegionNames.filter((name) => !existingNames.has(name));

    for (const missing of missingRegions) {
      const rowsWithMissing = data
        .map((row, idx) => ({ row, idx }))
        .filter(({ row }) => row.regionNames.includes(missing))
        .map(({ idx }) => idx + 1);

      errors.push({
        text: `Region "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")})`,
        href: "#file"
      });
    }
  }

  return errors;
}
