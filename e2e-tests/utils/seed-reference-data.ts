import { prisma } from "@hmcts/postgres";

export async function seedJurisdictions(): Promise<void> {
  const jurisdictions = [
    { jurisdictionId: 1, name: "Civil", welshName: "Sifil" },
    { jurisdictionId: 2, name: "Family", welshName: "Teulu" },
    { jurisdictionId: 3, name: "Crime", welshName: "Trosedd" },
    { jurisdictionId: 4, name: "Tribunal", welshName: "Tribiwnlys" }
  ];

  for (const jurisdiction of jurisdictions) {
    await (prisma as any).jurisdiction.create({
      data: jurisdiction
    });
  }

  console.log(`Seeded ${jurisdictions.length} jurisdictions`);
}

export async function seedSubJurisdictions(): Promise<void> {
  const subJurisdictions = [
    { subJurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 },
    { subJurisdictionId: 2, name: "Family Court", welshName: "Llys Teulu", jurisdictionId: 2 },
    { subJurisdictionId: 3, name: "Employment Tribunal", welshName: "Tribiwnlys Cyflogaeth", jurisdictionId: 4 },
    { subJurisdictionId: 4, name: "Crown Court", welshName: "Llys y Goron", jurisdictionId: 1 },
    { subJurisdictionId: 5, name: "Court of Appeal", welshName: "Llys Apêl", jurisdictionId: 1 },
    { subJurisdictionId: 6, name: "Immigration and Asylum Tribunal", welshName: "Tribiwnlys Mewnfudo a Lloches", jurisdictionId: 4 },
    { subJurisdictionId: 7, name: "Magistrates Court", welshName: "Llys Ynadon", jurisdictionId: 3 },
    { subJurisdictionId: 8, name: "Social Security and Child Support", welshName: "Nawdd Cymdeithasol a Chynhaliaeth Plant", jurisdictionId: 4 }
  ];

  for (const subJurisdiction of subJurisdictions) {
    await (prisma as any).subJurisdiction.create({
      data: subJurisdiction
    });
  }

  console.log(`Seeded ${subJurisdictions.length} sub-jurisdictions`);
}

export async function seedRegions(): Promise<void> {
  const regions = [
    { regionId: 1, name: "London", welshName: "Llundain" },
    { regionId: 2, name: "Midlands", welshName: "Canolbarth Lloegr" },
    { regionId: 3, name: "South East", welshName: "De Ddwyrain" },
    { regionId: 4, name: "North", welshName: "Gogledd" },
    { regionId: 5, name: "Wales", welshName: "Cymru" },
    { regionId: 6, name: "Yorkshire", welshName: "Swydd Efrog" }
  ];

  for (const region of regions) {
    await (prisma as any).region.create({
      data: region
    });
  }

  console.log(`Seeded ${regions.length} regions`);
}

export async function seedAllReferenceData(): Promise<void> {
  try {
    // Delete location relationships first to avoid foreign key constraints
    await (prisma as any).locationRegion.deleteMany({});
    await (prisma as any).locationSubJurisdiction.deleteMany({});

    // Now delete reference data
    await (prisma as any).region.deleteMany({});
    await (prisma as any).subJurisdiction.deleteMany({});
    await (prisma as any).jurisdiction.deleteMany({});

    await seedJurisdictions();
    await seedSubJurisdictions();
    await seedRegions();
    console.log("All reference data seeded successfully");
  } catch (error) {
    console.error("Error seeding reference data:", error);
    throw error;
  }
}
