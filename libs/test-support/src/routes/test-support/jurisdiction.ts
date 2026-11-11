import { type Jurisdiction, prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import { isUniqueConstraintClashOn } from "../../prisma-errors.js";

const JURISDICTION_ID_COLUMN = "jurisdiction_id";
const MAX_CREATE_ATTEMPTS = 5;

// Creates one jurisdiction with the next id, as the Create Jurisdiction page does, so a test never overwrites
// an existing row (POST /jurisdictions upserts by id) and never pushes later real ids up with an arbitrary high one
export const POST = async (req: Request, res: Response) => {
  try {
    const { name, welshName } = (req.body ?? {}) as { name?: unknown; welshName?: unknown };

    if (typeof name !== "string" || name === "" || typeof welshName !== "string" || welshName === "") {
      return res.status(400).json({ error: "name and welshName are required" });
    }

    const jurisdiction = await createWithNextId(name, welshName);

    return res.status(201).json(jurisdiction);
  } catch (error) {
    console.error("Error creating test jurisdiction:", error);
    return res.status(500).json({ error: "Failed to create test jurisdiction" });
  }
};

// Parallel workers can read the same latest id, so a clash on the id is retried with a fresh read
async function createWithNextId(name: string, welshName: string, attempt = 1): Promise<Jurisdiction> {
  const latest = await prisma.jurisdiction.findFirst({ orderBy: { jurisdictionId: "desc" }, select: { jurisdictionId: true } });

  try {
    return await prisma.jurisdiction.create({ data: { jurisdictionId: (latest?.jurisdictionId ?? 0) + 1, name, welshName } });
  } catch (error) {
    if (!isUniqueConstraintClashOn(error, JURISDICTION_ID_COLUMN) || attempt >= MAX_CREATE_ATTEMPTS) {
      throw error;
    }
    return createWithNextId(name, welshName, attempt + 1);
  }
}
