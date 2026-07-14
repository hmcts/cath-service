import { LOCATION_REFERENCE_PROVENANCES, LOCATION_REFERENCE_TYPES } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
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

    if (row.locationReferences.length === 0) {
      errors.push({
        text: `Row ${rowNumber}: PROVENANCE, PROVENANCE_LOCATION_ID and PROVENANCE_LOCATION_TYPE are required`,
        href: "#file"
      });
    }

    for (const ref of row.locationReferences) {
      if (!ref.provenance) {
        errors.push({
          text: `Row ${rowNumber}: PROVENANCE is required`,
          href: "#file"
        });
      } else if (!LOCATION_REFERENCE_PROVENANCES.includes(ref.provenance as (typeof LOCATION_REFERENCE_PROVENANCES)[number])) {
        errors.push({
          text: `Row ${rowNumber}: PROVENANCE "${ref.provenance}" is invalid. Allowed values: ${LOCATION_REFERENCE_PROVENANCES.join(", ")}`,
          href: "#file"
        });
      }

      if (!ref.provenanceLocationId) {
        errors.push({
          text: `Row ${rowNumber}: PROVENANCE_LOCATION_ID is required`,
          href: "#file"
        });
      }

      if (!ref.provenanceLocationType) {
        errors.push({
          text: `Row ${rowNumber}: PROVENANCE_LOCATION_TYPE is required`,
          href: "#file"
        });
      } else if (!LOCATION_REFERENCE_TYPES.includes(ref.provenanceLocationType as (typeof LOCATION_REFERENCE_TYPES)[number])) {
        errors.push({
          text: `Row ${rowNumber}: PROVENANCE_LOCATION_TYPE "${ref.provenanceLocationType}" is invalid. Allowed values: ${LOCATION_REFERENCE_TYPES.join(", ")}`,
          href: "#file"
        });
      }
    }
  }

  // Check for duplicates within the file
  const locationNameToIds = new Map<string, Set<number>>();
  const welshLocationNameToIds = new Map<string, Set<number>>();
  const provenanceKeys = new Map<string, number>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    if (row.locationName) {
      const lowerName = row.locationName.toLowerCase();
      const ids = locationNameToIds.get(lowerName) ?? new Set<number>();
      ids.add(row.locationId);
      locationNameToIds.set(lowerName, ids);
    }

    if (row.welshLocationName) {
      const lowerWelshName = row.welshLocationName.toLowerCase();
      const ids = welshLocationNameToIds.get(lowerWelshName) ?? new Set<number>();
      ids.add(row.locationId);
      welshLocationNameToIds.set(lowerWelshName, ids);
    }

    for (const ref of row.locationReferences) {
      if (ref.provenance && ref.provenanceLocationId) {
        const provenanceKey = `${ref.provenance}::${ref.provenanceLocationId}`;
        if (provenanceKeys.has(provenanceKey)) {
          errors.push({
            text: `Duplicate (PROVENANCE, PROVENANCE_LOCATION_ID) combination "${ref.provenance}, ${ref.provenanceLocationId}" in the file (rows ${provenanceKeys.get(provenanceKey)} and ${rowNumber})`,
            href: "#file"
          });
        } else {
          provenanceKeys.set(provenanceKey, rowNumber);
        }
      }
    }
  }

  const inFileDuplicateLocationNames = new Set<string>();
  for (const [lowerName, ids] of locationNameToIds) {
    if (ids.size > 1) {
      const originalName = data.find((r) => r.locationName.toLowerCase() === lowerName)!.locationName;
      errors.push({
        text: `Location name "${originalName}" appears for multiple location IDs in the file`,
        href: "#file"
      });
      inFileDuplicateLocationNames.add(lowerName);
    }
  }

  const inFileDuplicateWelshNames = new Set<string>();
  for (const [lowerWelshName, ids] of welshLocationNameToIds) {
    if (ids.size > 1) {
      const originalName = data.find((r) => r.welshLocationName.toLowerCase() === lowerWelshName)!.welshLocationName;
      errors.push({
        text: `Welsh location name "${originalName}" appears for multiple location IDs in the file`,
        href: "#file"
      });
      inFileDuplicateWelshNames.add(lowerWelshName);
    }
  }

  // Check for duplicates against database (excluding rows where location_id matches).
  // Skip names already flagged as in-file duplicates, and check each unique name only once.
  const checkedLocationNames = new Set<string>();
  const checkedWelshLocationNames = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    if (row.locationName) {
      const lowerName = row.locationName.toLowerCase();
      if (!inFileDuplicateLocationNames.has(lowerName) && !checkedLocationNames.has(lowerName)) {
        checkedLocationNames.add(lowerName);
        const existingLocation = await prisma.location.findFirst({
          where: {
            name: { equals: row.locationName, mode: "insensitive" },
            locationId: { not: row.locationId }
          }
        });

        if (existingLocation) {
          errors.push({
            text: `Row ${rowNumber}: Location name "${row.locationName}" already exists in the database with a different location ID`,
            href: "#file"
          });
        }
      }
    }

    if (row.welshLocationName) {
      const lowerWelshName = row.welshLocationName.toLowerCase();
      if (!inFileDuplicateWelshNames.has(lowerWelshName) && !checkedWelshLocationNames.has(lowerWelshName)) {
        checkedWelshLocationNames.add(lowerWelshName);
        const existingLocation = await prisma.location.findFirst({
          where: {
            welshName: { equals: row.welshLocationName, mode: "insensitive" },
            locationId: { not: row.locationId }
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

    const existingNames = new Set(existingSubJurisdictions.map((sj: any) => sj.name));
    const missingSubJurisdictions = allSubJurisdictionNames.filter((name) => !existingNames.has(name));

    for (const missing of missingSubJurisdictions) {
      const rowsWithMissing = data
        .map((row, idx) => ({ row, idx }))
        .filter(({ row }) => row.subJurisdictionNames.includes(missing))
        .map(({ idx }) => idx + 1);

      errors.push({
        text: `Sub-jurisdiction "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")})`,
        html: `Sub-jurisdiction "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")}). <a href="/jurisdiction-data" class="govuk-link">Click here to manage jurisdiction data</a>`,
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

    const existingNames = new Set(existingRegions.map((r: any) => r.name));
    const missingRegions = allRegionNames.filter((name) => !existingNames.has(name));

    for (const missing of missingRegions) {
      const rowsWithMissing = data
        .map((row, idx) => ({ row, idx }))
        .filter(({ row }) => row.regionNames.includes(missing))
        .map(({ idx }) => idx + 1);

      errors.push({
        text: `Region "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")})`,
        html: `Region "${missing}" not found in reference data (rows: ${rowsWithMissing.join(", ")}). <a href="/region-data-create" class="govuk-link">Click here to add the region</a>`,
        href: "#file"
      });
    }
  }

  return errors;
}
