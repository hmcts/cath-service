import { prisma } from "@hmcts/postgres";

export interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    jurisdictions: number;
    subJurisdictions: number;
    regions: number;
    locations: number;
    artefacts: number;
  };
}

export async function verifySeedData(): Promise<VerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log("\n=== Verifying Seed Data ===");

  try {
    // Check jurisdictions
    const jurisdictions = await (prisma as any).jurisdiction.findMany();
    console.log(`✓ Found ${jurisdictions.length} jurisdictions`);

    if (jurisdictions.length < 4) {
      errors.push(`Expected at least 4 jurisdictions, found ${jurisdictions.length}`);
    }

    // Check sub-jurisdictions
    const subJurisdictions = await (prisma as any).subJurisdiction.findMany();
    console.log(`✓ Found ${subJurisdictions.length} sub-jurisdictions`);

    if (subJurisdictions.length < 8) {
      errors.push(`Expected at least 8 sub-jurisdictions, found ${subJurisdictions.length}`);
    }

    // Check regions
    const regions = await (prisma as any).region.findMany();
    console.log(`✓ Found ${regions.length} regions`);

    if (regions.length < 6) {
      errors.push(`Expected at least 6 regions, found ${regions.length}`);
    }

    // Check locations
    const locations = await (prisma as any).location.findMany({
      include: {
        locationRegions: true,
        locationSubJurisdictions: true,
      },
    });
    console.log(`✓ Found ${locations.length} locations`);

    if (locations.length < 10) {
      errors.push(`Expected at least 10 locations, found ${locations.length}`);
    }

    // Verify specific test locations exist
    const requiredLocationIds = [9001, 9];
    for (const locationId of requiredLocationIds) {
      const location = locations.find((l: any) => l.locationId === locationId);
      if (!location) {
        errors.push(`Required location ${locationId} not found`);
      } else {
        console.log(`  ✓ Location ${locationId} exists: ${location.name}`);

        // Check relationships
        if (location.locationSubJurisdictions.length === 0) {
          warnings.push(`Location ${locationId} has no sub-jurisdiction relationships`);
        }
        if (location.locationRegions.length === 0) {
          warnings.push(`Location ${locationId} has no region relationships`);
        }
      }
    }

    // Check artefacts
    const artefacts = await prisma.artefact.findMany();
    console.log(`✓ Found ${artefacts.length} artefacts`);

    // Verify locationId=9 has artefacts
    const sjpArtefacts = artefacts.filter((a: any) => a.locationId === "9");
    if (sjpArtefacts.length === 0) {
      errors.push("Location 9 (SJP Court) has no artefacts");
    } else {
      console.log(`  ✓ Location 9 has ${sjpArtefacts.length} artefacts`);
    }

    // Verify locationId=9001 has NO artefacts (for "no publications" test)
    const alphaArtefacts = artefacts.filter((a: any) => a.locationId === "9001");
    if (alphaArtefacts.length > 0) {
      warnings.push(`Location 9001 should have NO artefacts but has ${alphaArtefacts.length}`);
    } else {
      console.log(`  ✓ Location 9001 has no artefacts (as expected)`);
    }

    const result: VerificationResult = {
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        jurisdictions: jurisdictions.length,
        subJurisdictions: subJurisdictions.length,
        regions: regions.length,
        locations: locations.length,
        artefacts: artefacts.length,
      },
    };

    if (result.success) {
      console.log("\n✓ All seed data verification checks passed!");
    } else {
      console.error("\n✗ Seed data verification failed:");
      errors.forEach((error) => console.error(`  - ${error}`));
    }

    if (warnings.length > 0) {
      console.warn("\n⚠ Warnings:");
      warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }

    console.log("\nSummary:", result.summary);

    return result;
  } catch (error) {
    console.error("\n✗ Error during seed data verification:", error);
    return {
      success: false,
      errors: [`Verification error: ${error}`],
      warnings: [],
      summary: {
        jurisdictions: 0,
        subJurisdictions: 0,
        regions: 0,
        locations: 0,
        artefacts: 0,
      },
    };
  }
}
