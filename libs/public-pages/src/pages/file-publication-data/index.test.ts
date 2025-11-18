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

describe("File Publication Data - GET handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let sendSpy: ReturnType<typeof vi.fn>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let setSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendSpy = vi.fn();
    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    setSpy = vi.fn();

    mockRequest = {
      query: {}
    };
    mockResponse = {
      locals: { locale: "en" },
      send: sendSpy,
      render: renderSpy,
      status: statusSpy,
      set: setSpy
    };

    vi.clearAllMocks();
  });

  describe("Error handling", () => {
    it("should return 400 when artefactId is missing", async () => {
      mockRequest.query = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith("Missing artefactId");
    });

    it("should return 404 when file not found", async () => {
      mockRequest.query = { artefactId: "non-existent" };
      vi.mocked(getUploadedFile).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith(
        "artefact-not-found/index",
        expect.objectContaining({
          pageTitle: "Page not found",
          bodyText: "You have attempted to view a page that no longer exists. This could be because the publication you are trying to view has expired.",
          buttonText: "Find a court or tribunal"
        })
      );
    });

    it("should return 404 when artefact metadata not found", async () => {
      mockRequest.query = { artefactId: "test-artefact" };
      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData: Buffer.from("test"),
        fileName: "test.pdf"
      });
      vi.mocked(getArtefactById).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith(
        "artefact-not-found/index",
        expect.objectContaining({
          pageTitle: "Page not found"
        })
      );
    });

    it("should render Welsh error content when locale is cy", async () => {
      mockRequest.query = { artefactId: "non-existent" };
      mockResponse.locals = { locale: "cy" };
      vi.mocked(getUploadedFile).mockResolvedValue(null);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "artefact-not-found/index",
        expect.objectContaining({
          pageTitle: "Heb ddod o hyd i'r dudalen",
          bodyText:
            "Rydych wedi ceisio gweld tudalen sydd ddim yn bodoli mwyach. Gallai hyn fod oherwydd bod y cyhoeddiad rydych yn ceisio'i weld wedi dod i ben.",
          buttonText: "Dod o hyd i lys neu dribiwnlys"
        })
      );
    });
  });

  describe("PDF file serving", () => {
    it("should serve PDF file with correct headers", async () => {
      const artefactId = "test-artefact-pdf";
      mockRequest.query = { artefactId };

      const fileData = Buffer.from("PDF content");
      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData,
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

      expect(setSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringMatching(/inline; filename="[^"]+"; filename\*=UTF-8''/));
      expect(sendSpy).toHaveBeenCalledWith(fileData);
    });

    it("should include list type and date in PDF filename", async () => {
      const artefactId = "test-artefact";
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

      expect(setSpy).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringMatching(/inline; filename="Magistrates Public List.*23 October 2025.*English.*\.pdf"; filename\*=UTF-8''/)
      );
    });
  });

  describe("JSON file serving", () => {
    it("should serve JSON file with correct headers", async () => {
      const artefactId = "test-artefact-json";
      mockRequest.query = { artefactId };

      const fileData = Buffer.from('{"test": "data"}');
      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData,
        fileName: "test.json"
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

      expect(setSpy).toHaveBeenCalledWith("Content-Type", "application/json");
      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringMatching(/attachment; filename="[^"]+"; filename\*=UTF-8''/));
      expect(sendSpy).toHaveBeenCalledWith(fileData);
    });
  });

  describe("Other file types", () => {
    it("should serve unknown file types with octet-stream", async () => {
      const artefactId = "test-artefact-other";
      mockRequest.query = { artefactId };

      const fileData = Buffer.from("other content");
      vi.mocked(getUploadedFile).mockResolvedValue({
        fileData,
        fileName: "test.docx"
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

      expect(setSpy).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringMatching(/attachment; filename="[^"]+"; filename\*=UTF-8''/));
      expect(sendSpy).toHaveBeenCalledWith(fileData);
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

      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("English (Saesneg)"));
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

      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("Welsh (Cymraeg)"));
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

      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("23 Ebrill 2025"));
    });
  });

  describe("List type handling", () => {
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

      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringMatching(/Magistrates Public List/));
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

      expect(setSpy).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("Unknown"));
    });
  });
});
