import { seedJurisdictions, seedRegions, seedSubJurisdictions } from "./test-support-api.js";

const JURISDICTIONS = [
  { jurisdictionId: 1, name: "Civil", welshName: "Sifil" },
  { jurisdictionId: 2, name: "Family", welshName: "Teulu" },
  { jurisdictionId: 3, name: "Crime", welshName: "Trosedd" },
  { jurisdictionId: 4, name: "Tribunal", welshName: "Tribiwnlys" }
];

const SUB_JURISDICTIONS = [
  { subJurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 },
  { subJurisdictionId: 2, name: "Family Court", welshName: "Llys Teulu", jurisdictionId: 2 },
  { subJurisdictionId: 3, name: "Employment Tribunal", welshName: "Tribiwnlys Cyflogaeth", jurisdictionId: 4 },
  { subJurisdictionId: 4, name: "Crown Court", welshName: "Llys y Goron", jurisdictionId: 1 },
  { subJurisdictionId: 5, name: "Court of Appeal", welshName: "Llys Apêl", jurisdictionId: 1 },
  { subJurisdictionId: 6, name: "Immigration and Asylum Tribunal", welshName: "Tribiwnlys Mewnfudo a Lloches", jurisdictionId: 4 },
  { subJurisdictionId: 7, name: "Magistrates Court", welshName: "Llys Ynadon", jurisdictionId: 3 },
  { subJurisdictionId: 8, name: "Social Security and Child Support", welshName: "Nawdd Cymdeithasol a Chynhaliaeth Plant", jurisdictionId: 4 }
];

const REGIONS = [
  { regionId: 1, name: "London", welshName: "Llundain" },
  { regionId: 2, name: "Midlands", welshName: "Canolbarth Lloegr" },
  { regionId: 3, name: "South East", welshName: "De Ddwyrain" },
  { regionId: 4, name: "North", welshName: "Gogledd" },
  { regionId: 5, name: "Wales", welshName: "Cymru" },
  { regionId: 6, name: "Yorkshire", welshName: "Swydd Efrog" }
];

export async function seedAllReferenceData(): Promise<void> {
  try {
    const jurisdictionsResult = await seedJurisdictions(JURISDICTIONS);
    console.log(`Seeded ${jurisdictionsResult.seeded} jurisdictions`);

    const subJurisdictionsResult = await seedSubJurisdictions(SUB_JURISDICTIONS);
    console.log(`Seeded ${subJurisdictionsResult.seeded} sub-jurisdictions`);

    const regionsResult = await seedRegions(REGIONS);
    console.log(`Seeded ${regionsResult.seeded} regions`);

    console.log("All reference data seeded successfully");
  } catch (error) {
    console.error("Error seeding reference data:", error);
    throw error;
  }
}
