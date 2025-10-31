import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

// Mock the modules
vi.mock("@hmcts/location", () => ({
  getAllLocations: vi.fn(() => [
    { locationId: 1, name: "Test Court", welshName: "Test Court CY" },
    { locationId: 2, name: "Another Court", welshName: "Another Court CY" }
  ]),
  getLocationById: vi.fn((id: number) => {
    if (id === 1) return { locationId: 1, name: "Test Court", welshName: "Test Court CY" };
    if (id === 2) return { locationId: 2, name: "Another Court", welshName: "Another Court CY" };
    return null;
  })
}));

vi.mock("../../manual-upload/validation.js", () => ({
  validateForm: vi.fn(() => [])
}));

vi.mock("../../manual-upload/storage.js", () => ({
  storeManualUpload: vi.fn(() => Promise.resolve("test-upload-id-123"))
}));

import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateForm } from "../../manual-upload/validation.js";

describe("manual-upload page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render manual-upload page with English content", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload/index",
        expect.objectContaining({
          title: "Manual upload",
          pageTitle: "Upload - Manual upload",
          warningTitle: "Warning",
          continueButton: "Continue",
          hideLanguageToggle: true,
          locale: "en"
        })
      );
    });

    it("should include list type options", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.listTypes).toBeDefined();
      expect(Array.isArray(renderData.listTypes)).toBe(true);
      expect(renderData.listTypes.length).toBeGreaterThan(0);
    });

    it("should include sensitivity options", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.sensitivityOptions).toBeDefined();
      expect(Array.isArray(renderData.sensitivityOptions)).toBe(true);
    });

    it("should include language options", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.languageOptions).toBeDefined();
      expect(Array.isArray(renderData.languageOptions)).toBe(true);
    });

    it("should include all location data", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.locations).toBeDefined();
      expect(Array.isArray(renderData.locations)).toBe(true);
    });

    it("should set hideLanguageToggle to true", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.hideLanguageToggle).toBe(true);
    });

    it("should pre-populate form data from session", async () => {
      const req = {
        session: {
          manualUploadForm: {
            locationId: "1",
            listType: "CIVIL_DAILY_CAUSE_LIST",
            hearingStartDate: { day: "15", month: "06", year: "2025" },
            sensitivity: "PUBLIC",
            language: "ENGLISH",
            displayFrom: { day: "10", month: "06", year: "2025" },
            displayTo: { day: "20", month: "06", year: "2025" }
          }
        }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data).toEqual(
        expect.objectContaining({
          locationId: "1",
          locationName: "Test Court",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          sensitivity: "PUBLIC",
          language: "ENGLISH"
        })
      );
    });

    it("should pre-select list type from session", async () => {
      const req = {
        session: {
          manualUploadForm: {
            listType: "CROWN_DAILY_LIST"
          }
        }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      const selectedListType = renderData.listTypes.find((lt: any) => lt.selected);
      expect(selectedListType?.value).toBe("CROWN_DAILY_LIST");
    });

    it("should pre-select sensitivity from session", async () => {
      const req = {
        session: {
          manualUploadForm: {
            sensitivity: "PRIVATE"
          }
        }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      const selectedSensitivity = renderData.sensitivityOptions.find((opt: any) => opt.selected);
      expect(selectedSensitivity?.value).toBe("PRIVATE");
    });

    it("should pre-select language from session", async () => {
      const req = {
        session: {
          manualUploadForm: {
            language: "WELSH"
          }
        }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      const selectedLanguage = renderData.languageOptions.find((opt: any) => opt.selected);
      expect(selectedLanguage?.value).toBe("WELSH");
    });

    it("should handle invalid location ID from session", async () => {
      const req = {
        session: {
          manualUploadForm: {
            locationId: "invalid",
            locationName: "Invalid Court"
          }
        }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.locationName).toBe("Invalid Court");
    });

    it("should default to English language when no session data", async () => {
      const req = {
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await GET(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      const selectedLanguage = renderData.languageOptions.find((opt: any) => opt.selected);
      expect(selectedLanguage?.value).toBe("ENGLISH");
    });
  });

  describe("POST", () => {
    it("should redirect to manual-upload-summary with uploadId on successful validation", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024
      } as Express.Multer.File;

      const req = {
        body: {
          locationId: "1",
          "court-display": "Test Court",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        file: mockFile,
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue([]);
      vi.mocked(storeManualUpload).mockResolvedValue("test-upload-id-123");

      await POST(req, res);

      expect(validateForm).toHaveBeenCalled();
      expect(storeManualUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file: mockFile.buffer,
          locationId: "1",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          fileName: "test.pdf",
          fileType: "application/pdf",
          sensitivity: "PUBLIC",
          language: "ENGLISH"
        })
      );
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-summary?uploadId=test-upload-id-123");
    });

    it("should save form data to session on successful submission", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: vi.fn((cb) => cb())
      };

      const req = {
        body: {
          locationId: "1",
          "court-display": "Test Court",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        file: mockFile,
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue([]);

      await POST(req, res);

      expect(req.session).toHaveProperty("manualUploadForm");
      expect(req.session.manualUploadForm).toEqual(
        expect.objectContaining({
          locationId: "1",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          sensitivity: "PUBLIC",
          language: "ENGLISH"
        })
      );
      expect(session.save).toHaveBeenCalled();
    });

    it("should re-render form with errors on validation failure", async () => {
      const mockErrors = [
        { text: "Please provide a file", href: "#file" },
        { text: "Court name too short", href: "#court" }
      ];

      const req = {
        body: {
          locationId: "",
          listType: "",
          "hearingStartDate-day": "",
          "hearingStartDate-month": "",
          "hearingStartDate-year": "",
          sensitivity: "",
          language: "",
          "displayFrom-day": "",
          "displayFrom-month": "",
          "displayFrom-year": "",
          "displayTo-day": "",
          "displayTo-month": "",
          "displayTo-year": ""
        },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(req, res);

      expect(validateForm).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        "manual-upload/index",
        expect.objectContaining({
          errors: mockErrors,
          errorSummaryTitle: "There is a problem"
        })
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should handle file size error from multer", async () => {
      const req = {
        body: {
          locationId: "1",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        fileUploadError: { code: "LIMIT_FILE_SIZE" },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue([{ text: "File is required", href: "#file" }]);

      await POST(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "manual-upload/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("File too large")
            })
          ])
        })
      );
    });

    it("should preserve form data when validation fails", async () => {
      const mockErrors = [{ text: "Some error", href: "#field" }];

      const req = {
        body: {
          locationId: "1",
          "court-display": "Test Court",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data).toBeDefined();
      expect(renderData.data.locationId).toBe("1");
      expect(renderData.data.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
      expect(renderData.data.sensitivity).toBe("PUBLIC");
      expect(renderData.data.language).toBe("ENGLISH");
    });

    it("should show location name for valid location ID", async () => {
      const mockErrors = [{ text: "Some error", href: "#field" }];

      const req = {
        body: {
          locationId: "1",
          "court-display": "Test Court",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.locationName).toBe("Test Court");
    });

    it("should preserve invalid court name when location ID is invalid", async () => {
      const mockErrors = [{ text: "Please enter and select a valid court", href: "#court" }];

      const req = {
        body: {
          locationId: "invalid",
          "court-display": "Invalid Court Name",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        session: {
          save: vi.fn((cb) => cb())
        }
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(req, res);

      const renderCall = res.render.mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.data.locationName).toBe("Invalid Court Name");
    });

    it("should store form data in session on validation failure", async () => {
      const mockErrors = [{ text: "Some error", href: "#field" }];
      const session = {
        save: vi.fn((cb) => cb())
      };

      const req = {
        body: {
          locationId: "1",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          "hearingStartDate-day": "15",
          "hearingStartDate-month": "06",
          "hearingStartDate-year": "2025",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          "displayFrom-day": "10",
          "displayFrom-month": "06",
          "displayFrom-year": "2025",
          "displayTo-day": "20",
          "displayTo-month": "06",
          "displayTo-year": "2025"
        },
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateForm).mockReturnValue(mockErrors);

      await POST(req, res);

      expect(req.session).toHaveProperty("manualUploadForm");
    });
  });
});
