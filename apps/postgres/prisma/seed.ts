import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create test artefacts for locationId 9 (used in E2E tests)
  const testArtefacts = [
    {
      artefactId: randomUUID(),
      locationId: "9",
      listTypeId: 8, // Civil and Family Daily Cause List
      contentDate: new Date("2025-01-15"),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: false
    },
    {
      artefactId: randomUUID(),
      locationId: "9",
      listTypeId: 8, // Civil and Family Daily Cause List
      contentDate: new Date("2025-01-16"),
      sensitivity: "PUBLIC",
      language: "WELSH",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: false
    },
    {
      artefactId: randomUUID(),
      locationId: "9",
      listTypeId: 8, // Civil and Family Daily Cause List
      contentDate: new Date("2025-01-17"),
      sensitivity: "PUBLIC",
      language: "BILINGUAL",
      displayFrom: new Date("2025-01-01"),
      displayTo: new Date("2026-01-01"),
      provenance: "MANUAL_UPLOAD",
      isFlatFile: false
    }
  ];

  for (const artefact of testArtefacts) {
    // Check if artefact already exists to avoid duplicates
    const existing = await prisma.artefact.findFirst({
      where: {
        locationId: artefact.locationId,
        listTypeId: artefact.listTypeId,
        contentDate: artefact.contentDate,
        language: artefact.language
      }
    });

    if (!existing) {
      await prisma.artefact.create({ data: artefact });
      console.log(`Created artefact: ${artefact.artefactId} for locationId ${artefact.locationId}`);
    } else {
      console.log(`Artefact already exists for locationId ${artefact.locationId}, contentDate ${artefact.contentDate}, language ${artefact.language}`);
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
