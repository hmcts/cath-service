import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/publication", async () => {
  const actual = await vi.importActual("@hmcts/publication");
  return {
    ...actual,
    getArtefactById: vi.fn(),
    getUploadedFile: vi.fn()
  };
});

import { getArtefactById, getUploadedFile } from "@hmcts/publication";

describe("File Publication - GET handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let redirectSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    renderSpy = vi.fn();
    redirectSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();

    mockRequest = {
      query: {}
    };
    mockResponse = {
      locals: { locale: "en" },
      render: renderSpy,
      redirect: redirectSpy,
      status: statusSpy
    };

    vi.clearAllMocks();
  });

  describe("Error handling", () => {
    it("should redirect to 400 when artefactId is missing", async () => {
      mockRequest.query = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });

    it("should redirect to artefact-not-found when file not found", async () => {
      mockRequest.query = { artefactId: "non-existent" };
      vi.mocked(getUploadedFile).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/artefact-not-found");
    });

    it("should redirect to artefact-not-found when artefact metadata not found", async () => {
      mockRequest.query = { artefactId: "test-artefact" };
      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("test"),
        fileName: "test.pdf"
      });
      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/artefact-not-found");
    });

    it("should redirect to artefact-not-found regardless of locale", async () => {
      mockRequest.query = { artefactId: "non-existent" };
      mockResponse.locals = { locale: "cy" };
      vi.mocked(getUploadedFile).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/artefact-not-found");
    });
  });

  describe("Successful rendering", () => {
    it("should render page with artefact details", async () => {
      const artefactId = "test-artefact";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF content"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          artefactId,
          fileName: expect.stringContaining("Magistrates Public List")
        })
      );
    });

    it("should include formatted date in filename", async () => {
      const artefactId = "test-date-format";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("23 October 2025")
        })
      );
    });

    it("should include language label in filename", async () => {
      const artefactId = "test-language";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("English (Saesneg)")
        })
      );
    });
  });

  describe("Language handling", () => {
    it("should show English language label for English artefact", async () => {
      const artefactId = "test-english";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("English (Saesneg)")
        })
      );
    });

    it("should show Welsh language label for Welsh artefact", async () => {
      const artefactId = "test-welsh";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "WELSH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("Welsh (Cymraeg)")
        })
      );
    });

    it("should format dates in Welsh when locale is cy", async () => {
      const artefactId = "test-cy-locale";
      mockRequest.query = { artefactId };
      mockResponse.locals = { locale: "cy" };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-04-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-04-20"),
        displayTo: new Date("2025-04-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("23 Ebrill 2025")
        })
      );
    });
  });

  describe("List type handling", () => {
    it("should use English list type name when locale is en", async () => {
      const artefactId = "test-english-list";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("Magistrates Public List")
        })
      );
    });

    it("should use Welsh list type name when locale is cy", async () => {
      const artefactId = "test-welsh-list";
      mockRequest.query = { artefactId };
      mockResponse.locals = { locale: "cy" };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("Magistrates Public List")
        })
      );
    });

    it("should show Unknown for invalid list type", async () => {
      const artefactId = "test-unknown-list";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 999,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          fileName: expect.stringContaining("Unknown")
        })
      );
    });
  });

  describe("ArtefactId passed to template", () => {
    it("should pass artefactId to template for data fetching", async () => {
      const artefactId = "test-pass-id";
      mockRequest.query = { artefactId };

      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("PDF"),
        fileName: "test.pdf"
      });

      vi.mocked(getArtefactById).mockResolvedValue({
        artefactId,
        locationId: "1",
        listTypeId: 4,
        contentDate: new Date("2025-10-23"),
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: new Date("2025-10-20"),
        displayTo: new Date("2025-10-30")
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "file-publication/index",
        expect.objectContaining({
          artefactId: "test-pass-id"
        })
      );
    });
  });
});
