import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFlooredDateFilter, exactDayCondition, onOrBeforeCondition } from "./date-boundaries.js";
import {
  findAdminUsersForDeletion,
  findIdamUsersForDeletion,
  findIdamUsersForSignInNotification,
  findMediaUsersForDeletion,
  findMediaUsersForVerification
} from "./queries.js";
import type { InactivitySettings } from "./settings.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: { user: { findMany: vi.fn() } }
}));

const RUN_DATE = new Date("2026-11-19T08:01:00.000Z");
const SETTINGS: InactivitySettings = {
  mediaVerificationEmailDays: 350,
  mediaDeletionDays: 365,
  aadAdminDeletionDays: 91,
  ssoAdminDeletionDays: 92,
  cftSignInNotificationDays: 118,
  cftDeletionDays: 132,
  crimeSignInNotificationDays: 180,
  crimeDeletionDays: 208,
  startDate: new Date("2026-06-01T00:00:00.000Z")
};

function lastFindManyArgs() {
  return vi.mocked(prisma.user.findMany).mock.calls.at(-1)?.[0] as any;
}

const signedIn = (condition: ReturnType<typeof exactDayCondition>) => buildFlooredDateFilter("lastSignedInDate", condition, SETTINGS.startDate);

describe("inactive account queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  });

  it.each([
    {
      name: "findMediaUsersForVerification",
      run: findMediaUsersForVerification,
      where: {
        AND: [{ userProvenance: "PI_AAD", role: "VERIFIED" }, buildFlooredDateFilter("lastVerifiedDate", exactDayCondition(350, RUN_DATE), SETTINGS.startDate)]
      },
      select: { userId: true, email: true, firstName: true }
    },
    {
      name: "findMediaUsersForDeletion",
      run: findMediaUsersForDeletion,
      where: {
        AND: [
          { userProvenance: "PI_AAD", role: "VERIFIED" },
          buildFlooredDateFilter("lastVerifiedDate", onOrBeforeCondition(365, RUN_DATE), SETTINGS.startDate)
        ]
      },
      select: { userId: true, email: true, firstName: true, lastVerifiedDate: true }
    },
    {
      name: "findAdminUsersForDeletion",
      run: findAdminUsersForDeletion,
      where: {
        OR: [
          { AND: [{ userProvenance: "PI_AAD", role: { not: "VERIFIED" } }, signedIn(onOrBeforeCondition(91, RUN_DATE))] },
          { AND: [{ userProvenance: "SSO" }, signedIn(onOrBeforeCondition(92, RUN_DATE))] }
        ]
      },
      select: { userId: true }
    },
    {
      name: "findIdamUsersForSignInNotification",
      run: findIdamUsersForSignInNotification,
      where: {
        OR: [
          { AND: [{ userProvenance: "CFT_IDAM" }, signedIn(exactDayCondition(118, RUN_DATE))] },
          { AND: [{ userProvenance: "CRIME_IDAM" }, signedIn(exactDayCondition(180, RUN_DATE))] }
        ]
      },
      select: { userId: true, email: true, firstName: true, surname: true, userProvenance: true, lastSignedInDate: true }
    },
    {
      name: "findIdamUsersForDeletion",
      run: findIdamUsersForDeletion,
      where: {
        OR: [
          { AND: [{ userProvenance: "CFT_IDAM" }, signedIn(onOrBeforeCondition(132, RUN_DATE))] },
          { AND: [{ userProvenance: "CRIME_IDAM" }, signedIn(onOrBeforeCondition(208, RUN_DATE))] }
        ]
      },
      select: { userId: true }
    }
  ])("$name should build PIP's condition with the go-live floor and read the first batch of 100", async ({ run, where, select }) => {
    // Act
    await run(SETTINGS, RUN_DATE);

    // Assert
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where, select, orderBy: { userId: "asc" }, take: 100 });
  });

  it.each([
    ["findMediaUsersForVerification", findMediaUsersForVerification],
    ["findMediaUsersForDeletion", findMediaUsersForDeletion],
    ["findAdminUsersForDeletion", findAdminUsersForDeletion],
    ["findIdamUsersForSignInNotification", findIdamUsersForSignInNotification],
    ["findIdamUsersForDeletion", findIdamUsersForDeletion]
  ])("%s should read the next batch after the given user ID", async (_name, run) => {
    // Act
    await run(SETTINGS, RUN_DATE);
    const firstWhere = lastFindManyArgs().where;
    await run(SETTINGS, RUN_DATE, "user-100");

    // Assert
    expect(lastFindManyArgs()).toMatchObject({
      where: { AND: [firstWhere, { userId: { gt: "user-100" } }] },
      orderBy: { userId: "asc" },
      take: 100
    });
  });

  it("should apply the floor branch only when go-live itself falls on the threshold", async () => {
    // Arrange
    const startDate = new Date(Date.UTC(2026, 10, 19) - 118 * 86_400_000);

    // Act
    await findIdamUsersForSignInNotification({ ...SETTINGS, startDate }, RUN_DATE);

    // Assert
    const [cftBranch, crimeBranch] = lastFindManyArgs().where.OR;
    expect(cftBranch.AND[1].OR).toContainEqual({ lastSignedInDate: { lt: startDate } });
    expect(crimeBranch.AND[1].OR).toHaveLength(1);
  });

  it("should return the rows from Prisma", async () => {
    // Arrange
    const rows = [{ userId: "user-1" }];
    vi.mocked(prisma.user.findMany).mockResolvedValue(rows as never);

    // Act
    const result = await findAdminUsersForDeletion(SETTINGS, RUN_DATE);

    // Assert
    expect(result).toBe(rows);
  });
});
