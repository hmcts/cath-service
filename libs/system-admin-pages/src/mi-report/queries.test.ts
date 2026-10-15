import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAllSubscriptionsSheet,
  buildLocationSubscriptionsSheet,
  buildPublicationsSheet,
  buildUserAccountsSheet,
  DEFAULT_SUBSCRIPTION_CHANNEL
} from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    artefact: { findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
    location: { findMany: vi.fn() }
  }
}));

const CUTOFF = new Date("2026-08-01T00:00:00.000Z");

describe("mi-report queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 100, name: "Test Court" }] as never);
  });

  describe("buildUserAccountsSheet", () => {
    it("should shape user rows and apply the createdDate cutoff when supplied", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          userId: "u1",
          userProvenanceId: "p1",
          userProvenance: "PI_AAD",
          role: "SYSTEM_ADMIN",
          createdDate: new Date("2026-08-10T00:00:00.000Z"),
          lastSignedInDate: null
        }
      ] as never);

      // Act
      const sheet = await buildUserAccountsSheet(CUTOFF);

      // Assert
      expect(sheet.name).toBe("User Accounts");
      expect(sheet.headers).toEqual(["user_id", "provenance_user_id", "user_provenance", "roles", "created_date", "last_signed_in_date"]);
      expect(sheet.rows[0]).toMatchObject({ user_id: "u1", roles: "SYSTEM_ADMIN", last_signed_in_date: "" });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdDate: { gte: CUTOFF } } }));
    });

    it("should omit the where clause entirely when no cutoff is supplied", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      // Act
      await buildUserAccountsSheet(undefined);

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });
  });

  describe("buildPublicationsSheet", () => {
    it("should resolve court_name via the location map and list_type via listType.name", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([
        {
          artefactId: "a1",
          displayFrom: new Date("2026-08-05T00:00:00.000Z"),
          displayTo: new Date("2026-08-06T00:00:00.000Z"),
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          sensitivity: "PUBLIC",
          sourceArtefactId: null,
          supersededCount: 0,
          type: "LIST",
          contentDate: new Date("2026-08-05T00:00:00.000Z"),
          locationId: "100",
          listType: { name: "CIVIL_DAILY_CAUSE_LIST" }
        }
      ] as never);

      // Act
      const sheet = await buildPublicationsSheet(CUTOFF);

      // Assert
      expect(sheet.rows[0]).toMatchObject({
        artefact_id: "a1",
        court_id: "100",
        court_name: "Test Court",
        list_type: "CIVIL_DAILY_CAUSE_LIST",
        source_artefact_id: ""
      });
      expect(prisma.artefact.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { lastReceivedDate: { gte: CUTOFF } } }));
    });

    it("should use an injected resolver without reading the location table", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([
        {
          artefactId: "a1",
          displayFrom: new Date(),
          displayTo: new Date(),
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          sensitivity: "PUBLIC",
          sourceArtefactId: null,
          supersededCount: 0,
          type: "LIST",
          contentDate: new Date(),
          locationId: "100",
          listType: { name: "X" }
        }
      ] as never);
      const injectedResolver = vi.fn(() => "Injected Court");

      // Act
      const sheet = await buildPublicationsSheet(undefined, injectedResolver);

      // Assert
      expect(sheet.rows[0].court_name).toBe("Injected Court");
      expect(injectedResolver).toHaveBeenCalledWith("100");
      expect(prisma.location.findMany).not.toHaveBeenCalled();
    });

    it("should leave court_name empty when the location cannot be resolved", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([
        {
          artefactId: "a1",
          displayFrom: new Date(),
          displayTo: new Date(),
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          sensitivity: "PUBLIC",
          sourceArtefactId: "src",
          supersededCount: 2,
          type: "LIST",
          contentDate: new Date(),
          locationId: "999",
          listType: { name: "X" }
        }
      ] as never);

      // Act
      const sheet = await buildPublicationsSheet(undefined);

      // Assert
      expect(sheet.rows[0].court_name).toBe("");
      expect(sheet.rows[0].source_artefact_id).toBe("src");
    });
  });

  describe("buildLocationSubscriptionsSheet", () => {
    it("should filter to LOCATION_ID subscriptions and resolve court_name from searchValue", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        { subscriptionId: "s1", searchValue: "100", userId: "u1", dateAdded: new Date("2026-08-10T00:00:00.000Z") }
      ] as never);

      // Act
      const sheet = await buildLocationSubscriptionsSheet(CUTOFF);

      // Assert
      expect(sheet.rows[0]).toMatchObject({ id: "s1", channel: DEFAULT_SUBSCRIPTION_CHANNEL, court_name: "Test Court" });
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { searchType: "LOCATION_ID", dateAdded: { gte: CUTOFF } } }));
    });

    it("should query only by searchType when no cutoff is supplied", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);

      // Act
      await buildLocationSubscriptionsSheet(undefined);

      // Assert
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { searchType: "LOCATION_ID" } }));
    });
  });

  describe("buildAllSubscriptionsSheet", () => {
    it("should include search_type and only resolve court_name for LOCATION_ID subscriptions", async () => {
      // Arrange
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        { subscriptionId: "s1", searchType: "LOCATION_ID", searchValue: "100", userId: "u1", dateAdded: new Date() },
        { subscriptionId: "s2", searchType: "CASE_ID", searchValue: "ABC", userId: "u2", dateAdded: new Date() }
      ] as never);

      // Act
      const sheet = await buildAllSubscriptionsSheet(undefined);

      // Assert
      expect(sheet.rows[0]).toMatchObject({ search_type: "LOCATION_ID", court_name: "Test Court" });
      expect(sheet.rows[1]).toMatchObject({ search_type: "CASE_ID", court_name: "" });
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });
  });
});
