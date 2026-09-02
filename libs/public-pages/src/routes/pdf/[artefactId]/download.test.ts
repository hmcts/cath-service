import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadFile } = vi.hoisted(() => {
  return { mockReadFile: vi.fn() };
});

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: mockReadFile
  }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactById: vi.fn()
}));

import { getArtefactById } from "@hmcts/publication";
import type { Request, Response } from "express";
import { GET } from "./download.js";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

function buildRequest(artefactId: string | string[] | undefined): Partial<Request> {
  return {
    params: { artefactId: artefactId as string }
  };
}

function buildResponse(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
    locals: {}
  };
}

function buildArtefact(displayFrom: Date, displayTo: Date) {
  return { id: VALID_UUID, displayFrom, displayTo };
}

describe("GET /pdf/:artefactId/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("artefactId validation", () => {
    it("should return 400 when artefactId is undefined", async () => {
      // Arrange
      const req = buildRequest(undefined);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
    });

    it("should return 400 when artefactId fails UUID regex", async () => {
      // Arrange
      const req = buildRequest("not-a-uuid");
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
    });

    it("should normalise an array artefactId and proceed with the first element", async () => {
      // Arrange
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact(past, future));
      mockReadFile.mockResolvedValue(Buffer.from("%PDF"));

      const req = { params: { artefactId: [VALID_UUID] as unknown as string } };
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(getArtefactById).toHaveBeenCalledWith(VALID_UUID);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("artefact lookup", () => {
    it("should return 404 when artefact is not found", async () => {
      // Arrange
      vi.mocked(getArtefactById).mockResolvedValue(null);
      const req = buildRequest(VALID_UUID);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Artefact not found" });
    });
  });

  describe("date window validation", () => {
    it("should return 410 when current date is before displayFrom", async () => {
      // Arrange
      const displayFrom = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      const displayTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // next week
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact(displayFrom, displayTo));
      const req = buildRequest(VALID_UUID);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({ error: "File has expired" });
    });

    it("should return 410 when current date is after displayTo", async () => {
      // Arrange
      const displayFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last week
      const displayTo = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact(displayFrom, displayTo));
      const req = buildRequest(VALID_UUID);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith({ error: "File has expired" });
    });
  });

  describe("file serving", () => {
    it("should return the PDF with correct headers when the file exists and dates are valid", async () => {
      // Arrange
      const displayFrom = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      const displayTo = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact(displayFrom, displayTo));
      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      mockReadFile.mockResolvedValue(pdfBuffer);
      const req = buildRequest(VALID_UUID);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", `inline; filename="${VALID_UUID}.pdf"`);
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.send).toHaveBeenCalledWith(pdfBuffer);
    });

    it("should return 404 when the PDF file is not found on disk", async () => {
      // Arrange
      const displayFrom = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      const displayTo = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      vi.mocked(getArtefactById).mockResolvedValue(buildArtefact(displayFrom, displayTo));
      mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      const req = buildRequest(VALID_UUID);
      const res = buildResponse();

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "PDF not found" });
    });
  });
});
