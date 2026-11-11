import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { prefix } = req.body;

    if (!prefix || typeof prefix !== "string") {
      return res.status(400).json({ error: "prefix is required" });
    }

    if (prefix.length < 5) {
      return res.status(400).json({ error: "prefix must be at least 5 characters to prevent accidental deletion" });
    }

    const results = {
      artefacts: 0,
      subscriptions: 0,
      users: 0,
      locations: 0,
      listTypes: 0,
      mediaApplications: 0,
      thirdPartyUsers: 0,
      subJurisdictions: 0,
      jurisdictions: 0,
      regions: 0
    };

    // Notification subscribers share the real CFT test account email, so they are only recognisable by their prefixed provenance id
    const prefixedUserWhere = { OR: [{ email: { startsWith: prefix } }, { userProvenanceId: { startsWith: prefix } }] };

    // Delete artefacts at locations with the prefix
    const testLocations = await prisma.location.findMany({
      where: { name: { startsWith: prefix } },
      select: { locationId: true }
    });
    const testLocationIds = testLocations.map((l) => l.locationId.toString());

    if (testLocationIds.length > 0) {
      const artefactResult = await prisma.artefact.deleteMany({
        where: { locationId: { in: testLocationIds } }
      });
      results.artefacts = artefactResult.count;
    }

    // Delete subscriptions for users with the prefix email or provenance id
    const testUsers = await prisma.user.findMany({
      where: prefixedUserWhere,
      select: { userId: true }
    });
    const testUserIds = testUsers.map((u) => u.userId);

    if (testUserIds.length > 0) {
      const subscriptionResult = await prisma.subscription.deleteMany({
        where: { userId: { in: testUserIds } }
      });
      results.subscriptions = subscriptionResult.count;
    }

    // Delete subscriptions with prefix in searchValue
    const subscriptionByValueResult = await prisma.subscription.deleteMany({
      where: { searchValue: { startsWith: prefix } }
    });
    results.subscriptions += subscriptionByValueResult.count;

    // Delete subscriptions by LOCATION_ID where locationId is a prefixed location
    if (testLocationIds.length > 0) {
      const subscriptionByLocationResult = await prisma.subscription.deleteMany({
        where: {
          searchType: "LOCATION_ID",
          searchValue: { in: testLocationIds }
        }
      });
      results.subscriptions += subscriptionByLocationResult.count;
    }

    // Delete users with prefix email or provenance id
    const userResult = await prisma.user.deleteMany({
      where: prefixedUserWhere
    });
    results.users = userResult.count;

    // Delete locations with prefix name (CASCADE handles junction tables)
    const locationResult = await prisma.location.deleteMany({
      where: { name: { startsWith: prefix } }
    });
    results.locations = locationResult.count;

    // Delete list types with prefix name
    const listTypeResult = await prisma.listType.deleteMany({
      where: { name: { startsWith: prefix } }
    });
    results.listTypes = listTypeResult.count;

    // Reference data goes after locations and list types so their link rows are already gone where they cascade
    results.subJurisdictions = await deletePrefixedSubJurisdictions(prefix);
    results.jurisdictions = await deletePrefixedJurisdictions(prefix);
    results.regions = await deletePrefixedRegions(prefix);

    // Delete media applications with prefix in name or email
    const mediaAppResult = await prisma.mediaApplication.deleteMany({
      where: {
        OR: [{ name: { startsWith: prefix } }, { email: { startsWith: prefix } }]
      }
    });
    results.mediaApplications = mediaAppResult.count;

    // Delete third party users with prefix in name
    // Also delete users with hyphenated prefix (used for UI-created users where underscores aren't valid)
    const hyphenatedPrefix = prefix.replace(/_/g, "-");
    const thirdPartyUserResult = await prisma.thirdPartyUser.deleteMany({
      where: {
        OR: [{ name: { startsWith: prefix } }, { name: { startsWith: hyphenatedPrefix } }]
      }
    });
    results.thirdPartyUsers = thirdPartyUserResult.count;

    const totalDeleted = Object.values(results).reduce((a, b) => a + b, 0);

    return res.json({
      prefix,
      deleted: totalDeleted,
      details: results
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return res.status(500).json({ error: "Failed to cleanup test data" });
  }
};

// The link tables cascade from location and list type but not from sub-jurisdiction, so links to unprefixed rows are removed first
async function deletePrefixedSubJurisdictions(prefix: string): Promise<number> {
  const subJurisdictions = await prisma.subJurisdiction.findMany({
    where: { name: { startsWith: prefix } },
    select: { subJurisdictionId: true }
  });
  const subJurisdictionIds = subJurisdictions.map((s) => s.subJurisdictionId);

  if (subJurisdictionIds.length === 0) {
    return 0;
  }

  await prisma.locationSubJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  await prisma.listTypeSubJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  const result = await prisma.subJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  return result.count;
}

// A prefixed jurisdiction still holding an unprefixed sub-jurisdiction is left alone rather than deleting real data with it
async function deletePrefixedJurisdictions(prefix: string): Promise<number> {
  const result = await prisma.jurisdiction.deleteMany({
    where: { name: { startsWith: prefix }, subJurisdictions: { none: {} } }
  });
  return result.count;
}

async function deletePrefixedRegions(prefix: string): Promise<number> {
  const regions = await prisma.region.findMany({
    where: { name: { startsWith: prefix } },
    select: { regionId: true }
  });
  const regionIds = regions.map((r) => r.regionId);

  if (regionIds.length === 0) {
    return 0;
  }

  await prisma.locationRegion.deleteMany({ where: { regionId: { in: regionIds } } });
  const result = await prisma.region.deleteMany({ where: { regionId: { in: regionIds } } });
  return result.count;
}
