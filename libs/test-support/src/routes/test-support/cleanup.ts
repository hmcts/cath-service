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
      thirdPartyUsers: 0
    };

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

    // Delete subscriptions for users with the prefix email
    const testUsers = await prisma.user.findMany({
      where: { email: { startsWith: prefix } },
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

    // Delete users with prefix email
    const userResult = await prisma.user.deleteMany({
      where: { email: { startsWith: prefix } }
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
