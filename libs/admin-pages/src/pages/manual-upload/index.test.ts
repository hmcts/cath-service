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
  getAllLocations: vi.fn(() =>
    Promise.resolve([
      { locationId: 1, name: "Test Court", welshName: "Test Court CY" },
      { locationId: 2, name: "Another Court", welshName: "Another Court CY" }
    ])
  ),
  getLocationById: vi.fn((id: number) => {
    if (id === 1) return Promise.resolve({ locationId: 1, name: "Test Court", welshName: "Test Court CY" });
    if (id === 2) return Promise.resolve({ locationId: 2, name: "Another Court", welshName: "Another Court CY" });
    return Promise.resolve(null);
  })
}));

vi.mock("@hmcts/list-type-config", () => ({
  findStrategicListTypes: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: "CIVIL_DAILY_CAUSE_LIST",
        friendlyName: "Civil Daily Cause List",
        shortenedFriendlyName: "Civil Daily Cause List",
        welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
        isNonStrategic: false
      },
      {
        id: 2,
        name: "FAMILY_DAILY_CAUSE_LIST",
        friendlyName: "Family Daily Cause List",
        shortenedFriendlyName: "Family Daily Cause List",
        welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
        isNonStrategic: false
      },
      {
        id: 6,
        name: "CROWN_DAILY_LIST",
        friendlyName: "Crown Daily List",
        shortenedFriendlyName: "Crown Daily List",
        welshFriendlyName: "Rhestr Ddyddiol y Goron",
        isNonStrategic: false
      }
    ])
  )
}));

vi.mock("../../manual-upload/validation.js", () => ({
  validateManualUploadForm: vi.fn(() => [])
}));

vi.mock("../../manual-upload/storage.js", () => ({
  storeManualUpload: vi.fn(() => Promise.resolve("test-upload-id-123"))
}));

import { storeManualUpload } from "../../manual-upload/storage.js";
import { validateManualUploadForm } from "../../manual-upload/validation.js";

describe("manual-upload page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render manual-upload page with English content", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

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

    it("should clear uploadConfirmed flag when starting new upload", async () => {
      const session = {
        uploadConfirmed: true
      };

      const req = {
        session,
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(req.session.uploadConfirmed).toBeUndefined();
    });

    it("should include list type options", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.listTypes).toBeDefined();
      expect(Array.isArray(renderData.listTypes)).toBe(true);
      expect(renderData.listTypes.length).toBeGreaterThan(0);
    });

    it("should include sensitivity options", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.sensitivityOptions).toBeDefined();
      expect(Array.isArray(renderData.sensitivityOptions)).toBe(true);
    });

    it("should include language options", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.languageOptions).toBeDefined();
      expect(Array.isArray(renderData.languageOptions)).toBe(true);
    });

    it("should include all location data", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.locations).toBeDefined();
      expect(Array.isArray(renderData.locations)).toBe(true);
    });

    it("should set hideLanguageToggle to true", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.hideLanguageToggle).toBe(true);
    });

    it("should pre-populate form data from session when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            locationId: "1",
            listType: "CIVIL_DAILY_CAUSE_LIST",
            hearingStartDate: { day: "15", month: "06", year: "2025" },
            sensitivity: "PUBLIC",
            language: "ENGLISH",
            displayFrom: { day: "10", month: "06", year: "2025" },
            displayTo: { day: "20", month: "06", year: "2025" }
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

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

    it("should pre-select list type from session when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            listType: "6"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      const selectedListType = renderData.listTypes.find((lt: any) => lt.selected);
      expect(selectedListType?.value).toBe("6");
    });

    it("should pre-select sensitivity from session when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            sensitivity: "PRIVATE"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      const selectedSensitivity = renderData.sensitivityOptions.find((opt: any) => opt.selected);
      expect(selectedSensitivity?.value).toBe("PRIVATE");
    });

    it("should pre-select language from session when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            language: "WELSH"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      const selectedLanguage = renderData.languageOptions.find((opt: any) => opt.selected);
      expect(selectedLanguage?.value).toBe("WELSH");
    });

    it("should handle invalid location ID from session when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            locationId: "invalid",
            locationName: "Invalid Court"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.data.locationName).toBe("Invalid Court");
    });

    it("should default to English language when no session data", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      const selectedLanguage = renderData.languageOptions.find((opt: any) => opt.selected);
      expect(selectedLanguage?.value).toBe("ENGLISH");
    });

    it("should display errors from session and clear them", async () => {
      const mockErrors = [
        { text: "Please provide a file", href: "#file" },
        { text: "Court name too short", href: "#court" }
      ];

      const req = {
        session: {
          manualUploadErrors: mockErrors
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.errors).toEqual(mockErrors);
      expect(req.session.manualUploadErrors).toBeUndefined();
    });

    it("should not display errors when session has no errors", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.errors).toBeUndefined();
    });

    it("should pre-fill locationId from query parameter", async () => {
      const req = {
        session: {},
        query: { locationId: "1" }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.data.locationId).toBe("1");
      expect(renderData.data.locationName).toBe("Test Court");
    });

    it("should not override session locationId with query parameter when successfully submitted", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            locationId: "2"
          }
        },
        query: { locationId: "1" }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      // Session data should take precedence
      expect(renderData.data.locationId).toBe("2");
    });

    it("should persist form data from session on refresh after successful submission", async () => {
      const req = {
        session: {
          manualUploadSubmitted: true,
          manualUploadForm: {
            locationId: "1",
            listType: "CIVIL_DAILY_CAUSE_LIST"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      // Form data should remain in session (submitted flag is set)
      expect(req.session.manualUploadForm).toBeDefined();
      expect(req.session.manualUploadForm?.locationId).toBe("1");

      // Rendered data should include form data
      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;
      expect(renderData.data.locationId).toBe("1");
      expect(renderData.data.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
    });

    it("should clear form data from session on refresh before successful submission", async () => {
      const req = {
        session: {
          manualUploadForm: {
            locationId: "1",
            listType: "CIVIL_DAILY_CAUSE_LIST"
          }
        },
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      // Form data should be cleared from session (no submitted flag)
      expect(req.session.manualUploadForm).toBeUndefined();

      // But rendered data should still include form data for this render
      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;
      expect(renderData.data.locationId).toBe("1");
      expect(renderData.data.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
    });

    it("should allow query parameter to pre-fill when no session data", async () => {
      const req = {
        session: {},
        query: { locationId: "2" }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.data.locationId).toBe("2");
      expect(renderData.data.locationName).toBe("Another Court");
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

      vi.mocked(validateManualUploadForm).mockResolvedValue([]);
      vi.mocked(storeManualUpload).mockResolvedValue("test-upload-id-123");

      await callHandler(POST, req, res);

      expect(validateManualUploadForm).toHaveBeenCalled();
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

      vi.mocked(validateManualUploadForm).mockResolvedValue([]);

      await callHandler(POST, req, res);

      expect(req.session).toHaveProperty("manualUploadForm");
      expect(req.session.manualUploadForm).toEqual(
        expect.objectContaining({
          locationId: "1",
          listType: "CIVIL_DAILY_CAUSE_LIST",
          sensitivity: "PUBLIC",
          language: "ENGLISH"
        })
      );
      expect(req.session.manualUploadSubmitted).toBe(true);
      expect(session.save).toHaveBeenCalled();
    });

    it("should redirect to GET with errors on validation failure", async () => {
      const mockErrors = [
        { text: "Please provide a file", href: "#file" },
        { text: "Court name too short", href: "#court" }
      ];

      const session = {
        save: vi.fn((cb) => cb())
      };

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
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateManualUploadForm).mockReturnValue(mockErrors);

      await callHandler(POST, req, res);

      expect(validateManualUploadForm).toHaveBeenCalled();
      expect(req.session.manualUploadErrors).toEqual(mockErrors);
      expect(session.save).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
      expect(res.render).not.toHaveBeenCalled();
    });

    it("should handle file size error from multer", async () => {
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
        fileUploadError: { code: "LIMIT_FILE_SIZE" },
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateManualUploadForm).mockReturnValue([{ text: "File is required", href: "#file" }]);

      await callHandler(POST, req, res);

      expect(req.session.manualUploadErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining("File too large")
          })
        ])
      );
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
    });

    it("should preserve form data when validation fails", async () => {
      const mockErrors = [{ text: "Some error", href: "#field" }];

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
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateManualUploadForm).mockReturnValue(mockErrors);

      await callHandler(POST, req, res);

      expect(req.session.manualUploadForm).toBeDefined();
      expect(req.session.manualUploadForm?.locationId).toBe("1");
      expect(req.session.manualUploadForm?.listType).toBe("CIVIL_DAILY_CAUSE_LIST");
      expect(req.session.manualUploadForm?.sensitivity).toBe("PUBLIC");
      expect(req.session.manualUploadForm?.language).toBe("ENGLISH");
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
    });

    it("should store location name in session for valid location ID", async () => {
      const mockErrors = [{ text: "Some error", href: "#field" }];

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
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateManualUploadForm).mockReturnValue(mockErrors);

      await callHandler(POST, req, res);

      expect(req.session.manualUploadForm?.locationName).toBe("Test Court");
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
    });

    it("should preserve invalid court name when location ID is invalid", async () => {
      const mockErrors = [{ text: "Please enter and select a valid court", href: "#court" }];

      const session = {
        save: vi.fn((cb) => cb())
      };

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
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      vi.mocked(validateManualUploadForm).mockReturnValue(mockErrors);

      await callHandler(POST, req, res);

      expect(req.session.manualUploadForm?.locationName).toBe("Invalid Court Name");
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
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

      vi.mocked(validateManualUploadForm).mockReturnValue(mockErrors);

      await callHandler(POST, req, res);

      expect(req.session.manualUploadForm).toBeDefined();
      expect(req.session.manualUploadErrors).toEqual(mockErrors);
      expect(session.save).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
    });
  });
});
