import { listTypeData, locationData } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";

async function seedReferenceData() {
  // Skip seeding in production only — STG and other non-prod environments should be seeded.
  // Use ENVIRONMENT (set via Helm to the cluster environment name e.g. "stg", "prod")
  // rather than NODE_ENV, which is always "production" for any deployed Node.js server.
  if (process.env.ENVIRONMENT === "prod") {
    console.log("Skipping reference data seed: ENVIRONMENT is prod");
    return;
  }

  if (process.env.CI === "true") {
    console.log("Skipping reference data seed: Running in CI environment");
    return;
  }

  const regionCount = await prisma.region.count();
  const jurisdictionCount = await prisma.jurisdiction.count();
  const locationCount = await prisma.location.count();
  const tablesEmpty = regionCount === 0 && jurisdictionCount === 0 && locationCount === 0;

  if (tablesEmpty) {
    console.log("Seeding regions...");
    for (const region of locationData.regions) {
      await prisma.region.upsert({
        where: { regionId: region.regionId },
        create: { regionId: region.regionId, name: region.name, welshName: region.welshName },
        update: { name: region.name, welshName: region.welshName }
      });
    }
    console.log(`Seeded ${locationData.regions.length} regions`);

    console.log("Seeding jurisdictions...");
    for (const jurisdiction of locationData.jurisdictions) {
      await prisma.jurisdiction.upsert({
        where: { jurisdictionId: jurisdiction.jurisdictionId },
        create: { jurisdictionId: jurisdiction.jurisdictionId, name: jurisdiction.name, welshName: jurisdiction.welshName },
        update: { name: jurisdiction.name, welshName: jurisdiction.welshName }
      });
    }
    console.log(`Seeded ${locationData.jurisdictions.length} jurisdictions`);
  } else {
    console.log("Skipping location seed: tables already contain data");
  }

  // Always upsert sub-jurisdictions to pick up new entries
  console.log("Seeding sub-jurisdictions...");
  for (const subJurisdiction of locationData.subJurisdictions) {
    await prisma.subJurisdiction.upsert({
      where: { subJurisdictionId: subJurisdiction.subJurisdictionId },
      create: {
        subJurisdictionId: subJurisdiction.subJurisdictionId,
        name: subJurisdiction.name,
        welshName: subJurisdiction.welshName,
        jurisdictionId: subJurisdiction.jurisdictionId
      },
      update: { name: subJurisdiction.name, welshName: subJurisdiction.welshName, jurisdictionId: subJurisdiction.jurisdictionId }
    });
  }
  console.log(`Seeded ${locationData.subJurisdictions.length} sub-jurisdictions`);

  // Always run list type seeding to pick up new entries
  console.log("Seeding list types...");
  const allSubJurisdictions = await prisma.subJurisdiction.findMany();

  if (allSubJurisdictions.length === 0) {
    throw new Error("No sub-jurisdictions found — seed locations first");
  }

  for (const listType of listTypeData) {
    const relevantSubJurisdictions = allSubJurisdictions.filter((sj) => listType.subJurisdictionIds.includes(sj.subJurisdictionId));

    if (relevantSubJurisdictions.length === 0) {
      throw new Error(`No sub-jurisdictions resolved for list type "${listType.name}"`);
    }

    const upserted = await prisma.listType.upsert({
      where: { name: listType.name },
      create: {
        name: listType.name,
        friendlyName: listType.englishFriendlyName,
        welshFriendlyName: listType.welshFriendlyName,
        shortenedFriendlyName: listType.shortenedFriendlyName ?? listType.englishFriendlyName,
        url: listType.urlPath || "",
        defaultSensitivity: listType.defaultSensitivity,
        allowedProvenance: listType.provenance,
        isNonStrategic: listType.isNonStrategic
      },
      update: {
        friendlyName: listType.englishFriendlyName,
        welshFriendlyName: listType.welshFriendlyName,
        shortenedFriendlyName: listType.shortenedFriendlyName ?? listType.englishFriendlyName,
        url: listType.urlPath || "",
        defaultSensitivity: listType.defaultSensitivity,
        allowedProvenance: listType.provenance,
        isNonStrategic: listType.isNonStrategic
      }
    });

    for (const sj of relevantSubJurisdictions) {
      await prisma.listTypeSubJurisdiction.upsert({
        where: { listTypeId_subJurisdictionId: { listTypeId: upserted.id, subJurisdictionId: sj.subJurisdictionId } },
        create: { listTypeId: upserted.id, subJurisdictionId: sj.subJurisdictionId },
        update: {}
      });
    }
  }
  console.log(`Seeded ${listTypeData.length} list types`);

  if (tablesEmpty) {
    console.log("Seeding locations...");
    for (const location of locationData.locations) {
      await prisma.location.upsert({
        where: { locationId: location.locationId },
        create: { locationId: location.locationId, name: location.name, welshName: location.welshName, email: null, contactNo: null },
        update: { name: location.name, welshName: location.welshName }
      });

      await prisma.locationRegion.deleteMany({ where: { locationId: location.locationId } });
      await prisma.locationSubJurisdiction.deleteMany({ where: { locationId: location.locationId } });

      if (location.regions.length > 0) {
        await prisma.locationRegion.createMany({
          data: location.regions.map((regionId) => ({ locationId: location.locationId, regionId }))
        });
      }

      if (location.subJurisdictions.length > 0) {
        await prisma.locationSubJurisdiction.createMany({
          data: location.subJurisdictions.map((subJurisdictionId) => ({ locationId: location.locationId, subJurisdictionId }))
        });
      }

      await prisma.locationReference.deleteMany({
        where: { locationId: location.locationId }
      });

      await prisma.locationReference.create({
        data: {
          locationId: location.locationId,
          provenance: "SNL",
          provenanceLocationId: String(location.locationId + 100),
          provenanceLocationType: "VENUE"
        }
      });
    }
    console.log(`Seeded ${locationData.locations.length} locations`);
  }
}

async function seedTestData() {
  // Seed test list types with specific IDs required by test artefacts (FK constraint)
  await prisma.$executeRaw`
    INSERT INTO list_types (id, name, friendly_name, allowed_provenance, updated_at)
    VALUES
      (1, 'TEST_LIST_TYPE_1', 'Test List Type 1', 'MANUAL_UPLOAD', NOW()),
      (2, 'TEST_LIST_TYPE_2', 'Test List Type 2', 'MANUAL_UPLOAD', NOW()),
      (6, 'TEST_LIST_TYPE_6', 'Test List Type 6', 'MANUAL_UPLOAD', NOW())
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
  `;
  await prisma.$executeRaw`SELECT setval('list_types_id_seq', (SELECT MAX(id) FROM list_types))`;

  // Create test artefacts for locationId 9 (used in E2E tests)
  // Using fixed UUIDs so they're consistent across runs and won't be deleted by teardown
  const testArtefacts = [
    {
      artefactId: "11111111-1111-1111-1111-111111111111",
      locationId: "9",
      listTypeId: 6,
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
      listTypeId: 1,
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
      listTypeId: 2,
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
    const existing = await prisma.artefact.findUnique({ where: { artefactId: artefact.artefactId } });
    if (!existing) {
      await prisma.artefact.create({ data: artefact });
      console.log(`Created artefact: ${artefact.artefactId}`);
    } else {
      console.log(`Artefact ${artefact.artefactId} already exists`);
    }
  }
}

async function main() {
  console.log("Starting seed...");
  await seedReferenceData();
  await seedTestData();

  const listSearchConfigsByName = [
    { name: "UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST", caseNumberFieldName: "caseReference", caseNameFieldName: "caseName" },
    { name: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST", caseNumberFieldName: "caseReference", caseNameFieldName: "caseName" },
    { name: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST", caseNumberFieldName: "caseReferenceNumber", caseNameFieldName: "caseName" }
  ];

  for (const config of listSearchConfigsByName) {
    const listType = await prisma.listType.findUnique({ where: { name: config.name } });
    if (!listType) {
      throw new Error(`List type not found for ListSearchConfig: "${config.name}"`);
    }
    await prisma.listSearchConfig.upsert({
      where: { listTypeId: listType.id },
      create: { listTypeId: listType.id, caseNumberFieldName: config.caseNumberFieldName, caseNameFieldName: config.caseNameFieldName },
      update: {}
    });
    console.log(`Upserted ListSearchConfig for ${config.name}`);
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
