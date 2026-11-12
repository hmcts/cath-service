import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./cleanup.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    location: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    artefact: {
      deleteMany: vi.fn()
    },
    user: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    subscription: {
      deleteMany: vi.fn()
    },
    listType: {
      deleteMany: vi.fn()
    },
    mediaApplication: {
      deleteMany: vi.fn()
    },
    thirdPartyUser: {
      deleteMany: vi.fn()
    },
    subJurisdiction: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    jurisdiction: {
      deleteMany: vi.fn()
    },
    region: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    locationSubJurisdiction: {
      deleteMany: vi.fn()
    },
    listTypeSubJurisdiction: {
      deleteMany: vi.fn()
    },
    locationRegion: {
      deleteMany: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("cleanup routes", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      body: {}
    };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.jurisdiction.deleteMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(prisma.region.findMany).mockResolvedValue([]);
  });

  describe("DELETE", () => {
    it("should return 400 when prefix is missing", async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "prefix is required" });
    });

    it("should return 400 when prefix is not a string", async () => {
      // Arrange
      mockRequest.body = { prefix: 123 };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "prefix is required" });
    });

    it("should return 400 when prefix is less than 5 characters", async () => {
      // Arrange
      mockRequest.body = { prefix: "test" };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "prefix must be at least 5 characters to prevent accidental deletion"
      });
    });

    it("should cleanup test data with valid prefix", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 1 }, { locationId: 2 }] as any);
      vi.mocked(prisma.artefact.deleteMany)
        .mockResolvedValueOnce({ count: 3 } as any) // artefacts at prefixed locations
        .mockResolvedValueOnce({ count: 2 } as any); // artefacts referencing prefixed list types
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ userId: "user1" }] as any);
      vi.mocked(prisma.subscription.deleteMany)
        .mockResolvedValueOnce({ count: 2 } as any) // user subscriptions
        .mockResolvedValueOnce({ count: 1 } as any) // subscriptions by searchValue prefix
        .mockResolvedValueOnce({ count: 1 } as any); // subscriptions by LOCATION_ID
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        prefix: "test_",
        deleted: 15,
        details: {
          artefacts: 5,
          subscriptions: 4,
          users: 1,
          locations: 2,
          listTypes: 1,
          mediaApplications: 1,
          thirdPartyUsers: 1,
          subJurisdictions: 0,
          jurisdictions: 0,
          regions: 0
        }
      });
    });

    it("should delete artefacts referencing prefixed list types before deleting the list types", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_1_" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 4 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
        where: { listType: { name: { startsWith: "E2E_1_" } } }
      });
      expect(vi.mocked(prisma.artefact.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.listType.deleteMany).mock.invocationCallOrder[0]);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ artefacts: 4, listTypes: 1 })
        })
      );
    });

    it("should handle empty test locations", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert - only the list-type-scoped delete runs; there are no locations to scope by
      expect(prisma.artefact.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.artefact.deleteMany).toHaveBeenCalledWith({
        where: { listType: { name: { startsWith: "test_prefix" } } }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        prefix: "test_prefix",
        deleted: 0,
        details: {
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
        }
      });
    });

    it("should handle empty test users", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            subscriptions: 0,
            thirdPartyUsers: 0
          })
        })
      );
    });

    it("should cleanup third party users with both underscore and hyphenated prefixes", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_123_" };

      vi.mocked(prisma.location.findMany).mockResolvedValue([]);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert - verify deleteMany was called with OR clause for both underscore and hyphen prefixes
      expect(prisma.thirdPartyUser.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ name: { startsWith: "E2E_123_" } }, { name: { startsWith: "E2E-123-" } }]
        }
      });
    });

    it("should delete users and their subscriptions by prefixed email or prefixed provenance id", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_123_" };
      mockEmptyCleanup();
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ userId: "notify-user" }] as any);
      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      const prefixedUserWhere = { OR: [{ email: { startsWith: "E2E_123_" } }, { userProvenanceId: { startsWith: "E2E_123_" } }] };
      expect(prisma.user.findMany).toHaveBeenCalledWith({ where: prefixedUserWhere, select: { userId: true } });
      expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ["notify-user"] } } });
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: prefixedUserWhere });
    });

    it("should delete prefixed sub-jurisdictions after their link rows, then childless prefixed jurisdictions, then prefixed regions", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_123_" };
      mockEmptyCleanup();
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ subJurisdictionId: 80001 }] as any);
      vi.mocked(prisma.locationSubJurisdiction.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.listTypeSubJurisdiction.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.subJurisdiction.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.jurisdiction.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.region.findMany).mockResolvedValue([{ regionId: 80002 }] as any);
      vi.mocked(prisma.locationRegion.deleteMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.region.deleteMany).mockResolvedValue({ count: 1 } as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.subJurisdiction.findMany).toHaveBeenCalledWith({ where: { name: { startsWith: "E2E_123_" } }, select: { subJurisdictionId: true } });
      expect(prisma.locationSubJurisdiction.deleteMany).toHaveBeenCalledWith({ where: { subJurisdictionId: { in: [80001] } } });
      expect(prisma.listTypeSubJurisdiction.deleteMany).toHaveBeenCalledWith({ where: { subJurisdictionId: { in: [80001] } } });
      expect(prisma.subJurisdiction.deleteMany).toHaveBeenCalledWith({ where: { subJurisdictionId: { in: [80001] } } });
      expect(prisma.jurisdiction.deleteMany).toHaveBeenCalledWith({ where: { name: { startsWith: "E2E_123_" }, subJurisdictions: { none: {} } } });
      expect(prisma.region.findMany).toHaveBeenCalledWith({ where: { name: { startsWith: "E2E_123_" } }, select: { regionId: true } });
      expect(prisma.locationRegion.deleteMany).toHaveBeenCalledWith({ where: { regionId: { in: [80002] } } });
      expect(prisma.region.deleteMany).toHaveBeenCalledWith({ where: { regionId: { in: [80002] } } });

      const subJurisdictionDeleteOrder = vi.mocked(prisma.subJurisdiction.deleteMany).mock.invocationCallOrder[0];
      expect(vi.mocked(prisma.locationSubJurisdiction.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(subJurisdictionDeleteOrder);
      expect(vi.mocked(prisma.listTypeSubJurisdiction.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(subJurisdictionDeleteOrder);
      expect(subJurisdictionDeleteOrder).toBeLessThan(vi.mocked(prisma.jurisdiction.deleteMany).mock.invocationCallOrder[0]);
      expect(vi.mocked(prisma.locationRegion.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(prisma.region.deleteMany).mock.invocationCallOrder[0]
      );
      expect(vi.mocked(prisma.location.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(subJurisdictionDeleteOrder);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ details: expect.objectContaining({ subJurisdictions: 1, jurisdictions: 1, regions: 1 }) })
      );
    });

    it("should skip reference-data link deletion when nothing is prefixed", async () => {
      // Arrange
      mockRequest.body = { prefix: "E2E_123_" };
      mockEmptyCleanup();

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.locationSubJurisdiction.deleteMany).not.toHaveBeenCalled();
      expect(prisma.listTypeSubJurisdiction.deleteMany).not.toHaveBeenCalled();
      expect(prisma.subJurisdiction.deleteMany).not.toHaveBeenCalled();
      expect(prisma.locationRegion.deleteMany).not.toHaveBeenCalled();
      expect(prisma.region.deleteMany).not.toHaveBeenCalled();
    });

    it("should only ever select or delete rows by the prefix or by ids found through the prefix", async () => {
      // Arrange
      const prefix = "E2E_123_";
      mockRequest.body = { prefix };
      mockEmptyCleanup();
      vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 90001 }] as any);
      vi.mocked(prisma.artefact.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ userId: "prefixed-user" }] as any);
      vi.mocked(prisma.subJurisdiction.findMany).mockResolvedValue([{ subJurisdictionId: 80001 }] as any);
      vi.mocked(prisma.locationSubJurisdiction.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.listTypeSubJurisdiction.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.subJurisdiction.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.region.findMany).mockResolvedValue([{ regionId: 80002 }] as any);
      vi.mocked(prisma.locationRegion.deleteMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.region.deleteMany).mockResolvedValue({ count: 0 } as any);
      const idsFoundThroughPrefix = ["90001", "prefixed-user", "80001", "80002"];

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      const models = prisma as unknown as Record<string, Record<string, { mock: { calls: unknown[][] } }>>;
      const queries = Object.values(models).flatMap((model) =>
        ["findMany", "deleteMany"].flatMap((method) => model[method]?.mock.calls.map(([args]) => JSON.stringify(args)) ?? [])
      );
      expect(queries.length).toBeGreaterThan(0);
      for (const query of queries) {
        const isScopedToRun =
          query.includes(`"startsWith":"${prefix}"`) || query.includes(`"startsWith":"E2E-123-"`) || idsFoundThroughPrefix.some((id) => query.includes(id));
        expect(isScopedToRun, `unscoped cleanup query ${query}`).toBe(true);
      }
    });

    it("should return 500 on database error", async () => {
      // Arrange
      mockRequest.body = { prefix: "test_prefix" };
      vi.mocked(prisma.location.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to cleanup test data" });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

function mockEmptyCleanup() {
  vi.mocked(prisma.location.findMany).mockResolvedValue([]);
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.location.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.listType.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.mediaApplication.deleteMany).mockResolvedValue({ count: 0 } as any);
  vi.mocked(prisma.thirdPartyUser.deleteMany).mockResolvedValue({ count: 0 } as any);
}
