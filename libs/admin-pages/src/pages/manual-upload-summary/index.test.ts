import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

// Mock the modules
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
    formatDateRange: vi.fn((from, to) => `${from.day} Month ${from.year} to ${to.day} Month ${to.year}`)
  };
});

vi.mock("../../manual-upload/storage.js", () => ({
  getManualUpload: vi.fn()
}));

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
        listType: "CROWN_DAILY_LIST",
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

      await GET(req, res);

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
        listType: "CROWN_DAILY_LIST",
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

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "File upload summary",
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
        listType: "CROWN_DAILY_LIST",
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

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload-summary/index",
        expect.objectContaining({
          pageTitle: "Crynodeb lanlwytho ffeil",
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

      await GET(req, res);

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

      await GET(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Upload not found");
    });

    it("should format dates using formatDate function", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.pdf",
        fileType: "application/pdf",
        locationId: "1",
        listType: "CROWN_DAILY_LIST",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET(req, res);

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
        listType: "CROWN_DAILY_LIST",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET(req, res);

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
        listType: "CROWN_DAILY_LIST",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id", lng: "cy" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET(req, res);

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
        listType: "CROWN_DAILY_LIST",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = { render: vi.fn() } as unknown as Response;

      await GET(req, res);

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
          listType: "CROWN_DAILY_LIST",
          hearingStartDate: { day: "23", month: "10", year: "2025" },
          sensitivity: sensitivities[i],
          language: "ENGLISH",
          displayFrom: { day: "20", month: "10", year: "2025" },
          displayTo: { day: "30", month: "10", year: "2025" }
        };

        vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

        const req = { query: { uploadId: "test-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await GET(req, res);

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
          listType: "CROWN_DAILY_LIST",
          hearingStartDate: { day: "23", month: "10", year: "2025" },
          sensitivity: "PUBLIC",
          language: languages[i],
          displayFrom: { day: "20", month: "10", year: "2025" },
          displayTo: { day: "30", month: "10", year: "2025" }
        };

        vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);

        const req = { query: { uploadId: "test-id" } } as unknown as Request;
        const res = { render: vi.fn() } as unknown as Response;

        await GET(req, res);

        const renderCall = res.render.mock.calls[0];
        const renderData = renderCall[1];

        expect(renderData.data.language).toBe(expectedLabels[i]);
      }
    });
  });

  describe("POST", () => {
    it("should redirect to manual-upload-success", async () => {
      const req = {
        session: {}
      } as unknown as Request;

      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await POST(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
    });

    it("should clear session data on confirmation", async () => {
      const session = {
        manualUploadForm: {
          locationId: "1",
          listType: "CROWN_DAILY_LIST"
        },
        manualUploadSubmitted: true
      };

      const req = {
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await POST(req, res);

      expect(req.session.manualUploadForm).toBeUndefined();
      expect(req.session.manualUploadSubmitted).toBeUndefined();
    });
  });
});
