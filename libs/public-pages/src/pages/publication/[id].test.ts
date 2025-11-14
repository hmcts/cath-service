import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./[id].js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));

describe("publication/[id] page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: {}
    };
    res = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to /400 when publicationId is missing", async () => {
      req.params = {};

      await GET(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/400");
      expect(res.redirect).toHaveBeenCalledTimes(1);
    });

    it("should redirect to /400 when publicationId is undefined", async () => {
      req.params = { id: undefined };

      await GET(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/400");
    });

    it("should redirect to /404 when artefact is not found", async () => {
      req.params = { id: "non-existent-id" };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "non-existent-id" }
      });
      expect(res.redirect).toHaveBeenCalledWith("/404");
      expect(res.redirect).toHaveBeenCalledTimes(1);
    });

    it("should return 501 for listTypeId 8 (civil-and-family list accessed via direct URL now)", async () => {
      req.params = { id: "test-artefact-id" };
      const mockArtefact = {
        artefactId: "test-artefact-id",
        listTypeId: 8,
        locationId: 1,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

      await GET(req as Request, res as Response);

      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "test-artefact-id" }
      });
      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.render).toHaveBeenCalledWith("publication-not-implemented", {
        message: "This publication type is not yet available for viewing."
      });
    });

    it("should return 501 and render not-implemented for unsupported list types", async () => {
      req.params = { id: "unsupported-artefact-id" };
      const mockArtefact = {
        artefactId: "unsupported-artefact-id",
        listTypeId: 999,
        locationId: 1,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "UNKNOWN_TYPE",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.render).toHaveBeenCalledWith("publication-not-implemented", {
        message: "This publication type is not yet available for viewing."
      });
    });

    it("should redirect to /500 on database error", async () => {
      req.params = { id: "error-id" };
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(prisma.artefact.findUnique).mockRejectedValue(new Error("Database connection failed"));

      await GET(req as Request, res as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading publication:", expect.any(Error));
      expect(res.redirect).toHaveBeenCalledWith("/500");
      expect(res.redirect).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it("should call findUnique with correct artefactId", async () => {
      req.params = { id: "specific-id-123" };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "specific-id-123" }
      });
    });

    it("should handle artefact with different listTypeId correctly", async () => {
      req.params = { id: "another-type-id" };
      const mockArtefact = {
        artefactId: "another-type-id",
        listTypeId: 5,
        locationId: 2,
        contentDate: new Date("2025-01-13"),
        language: "ENGLISH",
        listType: "SOME_OTHER_TYPE",
        provenance: "MANUAL_UPLOAD",
        sourceArtefactId: null,
        displayFrom: new Date("2025-01-13"),
        displayTo: new Date("2025-01-20"),
        search: {},
        payload: "{}",
        isFlatFile: false
      };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(mockArtefact);

      await GET(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.render).toHaveBeenCalledTimes(1);
    });

    it("should not call render when redirecting on missing id", async () => {
      req.params = {};

      await GET(req as Request, res as Response);

      expect(res.render).not.toHaveBeenCalled();
    });

    it("should not call render when redirecting on not found", async () => {
      req.params = { id: "not-found" };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await GET(req as Request, res as Response);

      expect(res.render).not.toHaveBeenCalled();
    });
  });
});
