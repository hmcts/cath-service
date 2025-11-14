import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

// Helper to call handler arrays (middleware chain)
async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    // Call middleware chain
    for (let i = 0; i < handlers.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const handler = handlers[i];
        const next = (err?: any) => {
          if (err) reject(err);
          else resolve();
        };
        const result = handler(req, res, next);
        // If handler returns a promise, wait for it
        if (result instanceof Promise) {
          result.then(() => resolve()).catch(reject);
        }
      });
    }
  } else {
    const result = handlers(req, res, () => {});
    if (result instanceof Promise) {
      await result;
    }
  }
}

// Mock the modules
vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => {
    if (id === 1) return { locationId: 1, name: "Test Crown Court", welshName: "Test Crown Court CY" };
    if (id === 2) return { locationId: 2, name: "Another Court", welshName: "Another Court CY" };
    return null;
  })
}));

vi.mock("@hmcts/web-core", async () => {
  const actual = await vi.importActual("@hmcts/web-core");
  return {
    ...actual,
    formatDate: vi.fn((date) => `${date.day} Month ${date.year}`),
    formatDateRange: vi.fn((from, to) => `${from.day} Month ${from.year} to ${to.day} Month ${to.year}`),
    parseDate: vi.fn((date) => new Date(Number.parseInt(date.year, 10), Number.parseInt(date.month, 10) - 1, Number.parseInt(date.day, 10)))
  };
});

vi.mock("../../manual-upload/storage.js", () => ({
  getManualUpload: vi.fn()
}));

vi.mock("../../manual-upload/file-storage.js", () => ({
  saveUploadedFile: vi.fn()
}));

vi.mock("@hmcts/publication", async () => {
  const actual = await vi.importActual("@hmcts/publication");
  return {
    ...actual,
    createArtefact: vi.fn()
  };
});

import { createArtefact } from "@hmcts/publication";
import { saveUploadedFile } from "../../manual-upload/file-storage.js";
import { getManualUpload } from "../../manual-upload/storage.js";

describe("manual-upload-summary page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should retrieve and display upload data", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test-hearing-list.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-upload-id" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(getManualUpload).toHaveBeenCalledWith("test-upload-id");
      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          data: expect.objectContaining({
            courtName: "Test Crown Court",
            file: "test-hearing-list.pdf",
            listType: "Crown Daily List"
          })
        })
      );
    });

    it("should render file upload summary page with English content", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "Manual upload - File upload summary - Court and tribunal hearings - GOV.UK",
          heading: "File upload summary",
          subHeading: "Check upload details",
          courtName: "Court name",
          file: "File",
          listType: "List type",
          hearingStartDate: "Hearing start date",
          sensitivity: "Sensitivity",
          language: "Language",
          displayFileDates: "Display file dates",
          change: "Change",
          confirmButton: "Confirm",
          hideLanguageToggle: true
        })
      );
    });

    it("should render file upload summary page with Welsh content", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "WELSH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { lng: "cy", uploadId: "test-id" } } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: { locale: "cy" }
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "Llwytho i fyny â llaw - Crynodeb lanlwytho ffeil - Gwrandawiadau llys a thribiwnlys - GOV.UK",
          heading: "Crynodeb lanlwytho ffeil",
          subHeading: "Gwirio manylion lanlwytho",
          courtName: "Enw'r llys",
          file: "Ffeil",
          listType: "Math o restr",
          hearingStartDate: "Dyddiad cychwyn y gwrandawiad",
          sensitivity: "Sensitifrwydd",
          language: "Iaith",
          displayFileDates: "Dangos dyddiadau ffeil",
          change: "Newid",
          confirmButton: "Cadarnhau",
          hideLanguageToggle: true
        })
      );
    });

    it("should return 400 when uploadId is missing", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing uploadId");
    });

    it("should return 404 when upload data is not found", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(null);

      const req = { query: { uploadId: "non-existent-id" } } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Upload not found");
    });

    it("should format dates using formatDate function", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.hearingStartDate).toBe("23 Month 2025");
    });

    it("should format date range using formatDateRange function", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.displayFileDates).toBe("20 Month 2025 to 30 Month 2025");
    });

    it("should use Welsh court name when locale is cy", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id", lng: "cy" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.courtName).toBe("Test Crown Court CY");
    });

    it("should fallback to locationId when location is not found", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "999",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.courtName).toBe("999");
    });

    it("should format all sensitivity types correctly", async () => {
      const sensitivities = ["PUBLIC", "PRIVATE", "CLASSIFIED"];
      const expectedLabels = ["Public", "Private", "Classified"];

      for (let i = 0; i < sensitivities.length; i++) {
        const mockUploadData = {
          file: Buffer.from("test"),
          fileName: "test.pdf",
          fileType: "application/pdf",
          locationId: "1",
          listType: "6",
          hearingStartDate: { day: "23", month: "10", year: "2025" },
          sensitivity: sensitivities[i],
          language: "ENGLISH",
          displayFrom: { day: "20", month: "10", year: "2025" },
          displayTo: { day: "30", month: "10", year: "2025" }
        };

        vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

        const req = { query: { uploadId: "test-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await callHandler(GET, req, res);

        const renderCall = res.render.mock.calls[0];
        const renderData = renderCall[1];

        expect(renderData.data.sensitivity).toBe(expectedLabels[i]);
      }
    });

    it("should format all language types correctly", async () => {
      const languages = ["ENGLISH", "WELSH", "BILINGUAL"];
      const expectedLabels = ["English", "Welsh", "Bilingual"];

      for (let i = 0; i < languages.length; i++) {
        const mockUploadData = {
          file: Buffer.from("test"),
          fileName: "test.pdf",
          fileType: "application/pdf",
          locationId: "1",
          listType: "6",
          hearingStartDate: { day: "23", month: "10", year: "2025" },
          sensitivity: "PUBLIC",
          language: languages[i],
          displayFrom: { day: "20", month: "10", year: "2025" },
          displayTo: { day: "30", month: "10", year: "2025" }
        };

        vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

        const req = { query: { uploadId: "test-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await callHandler(GET, req, res);

        const renderCall = res.render.mock.calls[0];
        const renderData = renderCall[1];

        expect(renderData.data.language).toBe(expectedLabels[i]);
      }
    });
  });

  describe("POST", () => {
    const mockUploadData = {
      file: Buffer.from("test file content"),
      fileName: "test-hearing-list.pdf",
      fileType: "application/pdf",
      locationId: "1",
      listType: "6",
      hearingStartDate: { day: "23", month: "10", year: "2025" },
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: { day: "20", month: "10", year: "2025" },
      displayTo: { day: "30", month: "10", year: "2025" }
    };

    it("should save file, create database record, and redirect to success page", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue("/path/to/storage/test-artefact-id-123/test-hearing-list.pdf");
      vi.mocked(createArtefact).mockResolvedValue("test-artefact-id-123");

      const session = {
        manualUploadForm: { locationId: "1" },
        manualUploadSubmitted: true,
        save: vi.fn((callback) => callback())
      };

      const req = {
        query: { uploadId: "test-upload-id" },
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(getManualUpload).toHaveBeenCalledWith("test-upload-id");
      expect(saveUploadedFile).toHaveBeenCalledWith(expect.any(String), "test-hearing-list.pdf", mockUploadData.file);
      expect(createArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: expect.any(String),
          locationId: "1",
          listTypeId: 6
        })
      );
      expect(req.session.manualUploadForm).toBeUndefined();
      expect(req.session.manualUploadSubmitted).toBeUndefined();
      expect(req.session.uploadConfirmed).toBe(true);
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
    });

    it("should return 400 when uploadId is missing", async () => {
      const req = { query: {}, session: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing uploadId");
    });

    it("should return 404 when upload data is not found", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(null);

      const req = {
        query: { uploadId: "non-existent-id" },
        session: {}
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Upload not found");
    });

    it("should render error page when database create fails", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue("/path/to/file");
      vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

      const session = {
        manualUploadForm: { locationId: "1" },
        manualUploadSubmitted: true
      };

      const req = {
        query: { uploadId: "test-upload-id" },
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          errors: [{ text: "We could not process your upload. Please try again.", href: "#" }]
        })
      );
      expect(req.session.manualUploadForm).toEqual({ locationId: "1" });
      expect(req.session.manualUploadSubmitted).toBe(true);
    });

    it("should render error page when file save fails", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockRejectedValue(new Error("File system error"));

      const session = {
        manualUploadForm: { locationId: "1" },
        manualUploadSubmitted: true
      };

      const req = {
        query: { uploadId: "test-upload-id" },
        session
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          errors: [{ text: "We could not process your upload. Please try again.", href: "#" }]
        })
      );
      expect(req.session.manualUploadForm).toEqual({ locationId: "1" });
    });
  });
});
