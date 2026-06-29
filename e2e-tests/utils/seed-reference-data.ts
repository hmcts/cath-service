import { locationData } from "@hmcts/location";
import { seedJurisdictions, seedRegions, seedSubJurisdictions } from "./test-support-api.js";

export async function seedAllReferenceData(): Promise<void> {
  try {
    const jurisdictionsResult = await seedJurisdictions(locationData.jurisdictions);
    console.log(`Seeded ${jurisdictionsResult.seeded} jurisdictions`);

    const subJurisdictionsResult = await seedSubJurisdictions(locationData.subJurisdictions);
    console.log(`Seeded ${subJurisdictionsResult.seeded} sub-jurisdictions`);

    const regionsResult = await seedRegions(locationData.regions);
    console.log(`Seeded ${regionsResult.seeded} regions`);

    console.log("All reference data seeded successfully");
  } catch (error) {
    console.error("Error seeding reference data:", error);
    throw error;
  }
}
