import { randomInt } from "node:crypto";
import { type Location, prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import { isUniqueConstraintClashOn } from "../../prisma-errors.js";
import type { CreateLocationInput, LocationReferenceInput } from "../../types.js";

const LOCATION_ID_COLUMN = "location_id";
const MAX_GENERATED_ID_ATTEMPTS = 5;
const DEFAULT_PROVENANCE_LOCATION_TYPE = "VENUE";

export const GET = async (req: Request, res: Response) => {
  try {
    const { first, includeRelationships } = req.query;

    const include =
      includeRelationships === "true"
        ? {
            locationRegions: true,
            locationSubJurisdictions: true
          }
        : undefined;

    if (first === "true") {
      const location = await prisma.location.findFirst({ include });
      if (!location) {
        return res.status(404).json({ error: "No location found" });
      }
      return res.json(location);
    }

    const locations = await prisma.location.findMany({ include });
    return res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ error: "Failed to fetch locations" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateLocationInput;

    if (!input.name || !input.welshName) {
      return res.status(400).json({
        error: "name and welshName are required"
      });
    }

    if (input.locationReferences !== undefined && !hasValidLocationReferences(input.locationReferences)) {
      return res.status(400).json({
        error: "locationReferences must be an array of objects with a provenance"
      });
    }

    // An explicit id is a fixed fixture the caller wants reset; a generated one must never overwrite another test's location
    const location = input.locationId ? await upsertLocation(input.locationId, input) : await createLocationWithGeneratedId(input);

    return res.status(201).json({
      locationId: location.locationId,
      name: location.name,
      welshName: location.welshName
    });
  } catch (error) {
    console.error("Error creating test location:", error);
    return res.status(500).json({ error: "Failed to create test location" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { locationIds } = req.body;

    if (!locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({ error: "locationIds array is required" });
    }

    const result = await prisma.location.deleteMany({
      where: {
        locationId: { in: locationIds }
      }
    });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting locations:", error);
    return res.status(500).json({ error: "Failed to delete locations" });
  }
};

function upsertLocation(locationId: number, input: CreateLocationInput) {
  return prisma.location.upsert({
    where: { locationId },
    create: buildLocationCreateData(locationId, input),
    update: {
      name: input.name,
      welshName: input.welshName,
      email: defaultEmail(input),
      contactNo: input.contactNo || "01234567890"
    }
  });
}

// Parallel e2e workers draw from the same small id range, so a clash is retried with a fresh id rather than upserted
async function createLocationWithGeneratedId(input: CreateLocationInput, attempt = 1): Promise<Location> {
  try {
    return await prisma.location.create({ data: buildLocationCreateData(generateLocationId(), input) });
  } catch (error) {
    if (!isUniqueConstraintClashOn(error, LOCATION_ID_COLUMN) || attempt >= MAX_GENERATED_ID_ATTEMPTS) {
      throw error;
    }
    return createLocationWithGeneratedId(input, attempt + 1);
  }
}

function buildLocationCreateData(locationId: number, input: CreateLocationInput) {
  return {
    locationId,
    name: input.name,
    welshName: input.welshName,
    email: defaultEmail(input),
    contactNo: input.contactNo || "01234567890",
    locationRegions: {
      create: (input.regionIds || [4]).map((regionId) => ({ regionId }))
    },
    locationSubJurisdictions: {
      create: (input.subJurisdictionIds || [1]).map((subJurisdictionId) => ({ subJurisdictionId }))
    },
    ...(input.locationReferences?.length ? { locationReferences: { create: buildLocationReferences(locationId, input.locationReferences) } } : {})
  };
}

// The provenance id defaults to the location id so a test can send it as x-court-id without knowing it up front
function buildLocationReferences(locationId: number, references: LocationReferenceInput[]) {
  return references.map((reference) => ({
    provenance: reference.provenance,
    provenanceLocationId: reference.provenanceLocationId || String(locationId),
    provenanceLocationType: reference.provenanceLocationType || DEFAULT_PROVENANCE_LOCATION_TYPE
  }));
}

function hasValidLocationReferences(references: unknown): references is LocationReferenceInput[] {
  return (
    Array.isArray(references) &&
    references.every(
      (reference) => typeof reference === "object" && reference !== null && typeof reference.provenance === "string" && reference.provenance !== ""
    )
  );
}

function defaultEmail(input: CreateLocationInput): string {
  return input.email || `${input.name.toLowerCase().replaceAll(/\s+/g, "-")}@test.hmcts.net`;
}

function generateLocationId(): number {
  return randomInt(90000, 100000);
}
