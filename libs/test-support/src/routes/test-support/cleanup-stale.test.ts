import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./cleanup-stale.js";

vi.mock("@hmcts/postgres-prisma", () => {
  const model = () => ({ findMany: vi.fn(), deleteMany: vi.fn() });
  return {
    prisma: {
      artefact: model(),
      listType: model(),
      location: model(),
      user: model(),
      subscription: model(),
      mediaApplication: model(),
      thirdPartyUser: model(),
      subJurisdiction: model(),
      jurisdiction: model(),
      region: model(),
      locationSubJurisdiction: model(),
      listTypeSubJurisdiction: model(),
      locationRegion: model()
    }
  };
});

import { prisma } from "@hmcts/postgres-prisma";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const THREE_HOURS_AGO = NOW.getTime() - 3 * 60 * 60 * 1000;
const FOUR_HOURS_AGO = NOW.getTime() - 4 * 60 * 60 * 1000;
const TEN_MINUTES_AGO = NOW.getTime() - 10 * 60 * 1000;

const models = prisma as unknown as Record<string, { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> }>;

describe("cleanup-stale route", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const model of Object.values(models)) {
      model.findMany.mockResolvedValue([]);
      model.deleteMany.mockResolvedValue({ count: 0 });
    }
    mockRequest = { body: { olderThanMinutes: 120 } };
    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("DELETE", () => {
    it.each([undefined, 0, -5, 1.5, "120"])("should return 400 when olderThanMinutes is %s", async (olderThanMinutes) => {
      // Arrange
      mockRequest.body = { olderThanMinutes };

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "olderThanMinutes must be a positive integer" });
      expect(prisma.listType.findMany).not.toHaveBeenCalled();
    });

    it("should only look for rows carrying an E2E prefix", async () => {
      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      for (const model of Object.values(models)) {
        for (const [args] of model.findMany.mock.calls) {
          expect(JSON.stringify(args)).toMatch(/"startsWith":"E2E[_-]"/);
        }
      }
    });

    it("should clean up each run older than the cutoff once, wherever its rows were found", async () => {
      // Arrange
      vi.mocked(prisma.listType.findMany).mockResolvedValue([
        { name: `E2E_${THREE_HOURS_AGO}_CROWN_ADVANCED_PDDA_LIST` },
        { name: `E2E_${THREE_HOURS_AGO}_CIVIL_DAILY_CAUSE_LIST` }
      ] as any);
      vi.mocked(prisma.thirdPartyUser.findMany).mockResolvedValue([{ name: `E2E-${FOUR_HOURS_AGO}-Third Party` }] as any);
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([{ email: "cft.user@example.com", userProvenanceId: `E2E_${FOUR_HOURS_AGO}_provenance` }] as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      const cleanedPrefixes = vi.mocked(prisma.listType.deleteMany).mock.calls.map(([args]) => (args as any).where.name.startsWith);
      expect(cleanedPrefixes).toEqual([`E2E_${FOUR_HOURS_AGO}_`, `E2E_${THREE_HOURS_AGO}_`]);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ olderThan: "2026-11-16T10:00:00.000Z", runs: expect.arrayContaining([expect.objectContaining({ failures: [] })]) })
      );
    });

    it("should leave runs newer than the cutoff and names that are not run prefixes alone", async () => {
      // Arrange
      vi.mocked(prisma.listType.findMany).mockResolvedValue([
        { name: `E2E_${TEN_MINUTES_AGO}_CIVIL_DAILY_CAUSE_LIST` },
        { name: "E2E_MANUAL_LIST" },
        { name: "E2E_123_SHORT_TIMESTAMP" }
      ] as any);

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prisma.listType.deleteMany).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ deleted: 0, runs: [] }));
    });

    it("should return 500 with the run details when a stale run cannot be fully cleaned up", async () => {
      // Arrange
      vi.mocked(prisma.listType.findMany).mockResolvedValue([{ name: `E2E_${THREE_HOURS_AGO}_CIVIL_DAILY_CAUSE_LIST` }] as any);
      vi.mocked(prisma.listType.deleteMany).mockRejectedValue(new Error("Foreign key constraint violated"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          runs: [expect.objectContaining({ prefix: `E2E_${THREE_HOURS_AGO}_`, failures: [{ step: "listTypes", error: "Foreign key constraint violated" }] })]
        })
      );
    });

    it("should return 500 when the stale runs cannot be looked up", async () => {
      // Arrange
      vi.mocked(prisma.region.findMany).mockRejectedValue(new Error("DB error"));

      // Act
      await DELETE(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Failed to find stale E2E runs" });
    });
  });
});
