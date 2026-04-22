import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  // Create test artefacts for locationId 9 (used in E2E tests)
  // Using fixed UUIDs so they're consistent across runs and won't be deleted by teardown
  const testArtefacts = [
    {
      artefactId: "11111111-1111-1111-1111-111111111111",
      locationId: "9",
      listTypeId: 6, // Crown Daily List (CRIME_IDAM) - Changed from 8 to avoid conflict with E2E test data
      contentDate: new Date("2025-01-15"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      lastReceivedDate: new Date("2025-01-15T10:00:00Z"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: false,
      type: "LIST"
    },
    {
      artefactId: "22222222-2222-2222-2222-222222222222",
      locationId: "9",
      listTypeId: 1, // Single Justice Procedure
      contentDate: new Date("2025-01-16"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      lastReceivedDate: new Date("2025-01-16T10:00:00Z"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: true,
      type: "LIST"
    },
    {
      artefactId: "33333333-3333-3333-3333-333333333333",
      locationId: "9",
      listTypeId: 2, // Crown Daily List
      contentDate: new Date("2025-01-17"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      lastReceivedDate: new Date("2025-01-17T10:00:00Z"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: true,
      type: "LIST"
    }
  ];

  for (const artefact of testArtefacts) {
    // Check if artefact already exists by ID to avoid duplicates
    const existing = await prisma.artefact.findUnique({
      where: {
        artefactId: artefact.artefactId
      }
    });

    if (!existing) {
      await prisma.artefact.create({ data: artefact });
      console.log(`Created artefact: ${artefact.artefactId} for locationId ${artefact.locationId}`);
    } else {
      console.log(`Artefact ${artefact.artefactId} already exists for locationId ${artefact.locationId}`);
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
