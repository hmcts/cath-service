import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import type { CreateLocationInput } from "../../types.js";

const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";
const LOCATION_ID_COLUMN = "location_id";
const MAX_GENERATED_ID_ATTEMPTS = 5;

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
async function createLocationWithGeneratedId(input: CreateLocationInput) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.location.create({ data: buildLocationCreateData(generateLocationId(), input) });
    } catch (error) {
      if (!isLocationIdClash(error) || attempt >= MAX_GENERATED_ID_ATTEMPTS) {
        throw error;
      }
    }
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
    }
  };
}

function defaultEmail(input: CreateLocationInput): string {
  return input.email || `${input.name.toLowerCase().replaceAll(/\s+/g, "-")}@test.hmcts.net`;
}

function generateLocationId(): number {
  // NOSONAR: Math.random() is safe here - test-only code, no security requirement, just needs unique ID
  return 90000 + Math.floor(Math.random() * 9000) + (Date.now() % 1000);
}

// name and welsh_name are unique too; a clash on those will not be fixed by a new id, so only location_id is retried
function isLocationIdClash(error: unknown): boolean {
  if (typeof error !== "object" || error === null || (error as PrismaKnownError).code !== PRISMA_UNIQUE_CONSTRAINT_CODE) {
    return false;
  }

  const { meta } = error as PrismaKnownError;
  // The pg driver adapter reports the columns under driverAdapterError; the native engine uses target
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target ?? [];
  return fields.includes(LOCATION_ID_COLUMN);
}

interface PrismaKnownError {
  code?: unknown;
  meta?: {
    target?: string[];
    driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
  };
}
