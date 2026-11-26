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

vi.mock("@hmcts/system-admin-pages", () => ({
  findStrategicListTypes: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: "CIVIL_DAILY_CAUSE_LIST",
        friendlyName: "Civil Daily Cause List",
        shortenedFriendlyName: "Civil Daily Cause List",
        welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
        isNonStrategic: false,
        defaultSensitivity: "PUBLIC"
      },
      {
        id: 2,
        name: "FAMILY_DAILY_CAUSE_LIST",
        friendlyName: "Family Daily Cause List",
        shortenedFriendlyName: "Family Daily Cause List",
        welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
        isNonStrategic: false,
        defaultSensitivity: "PRIVATE"
      },
      {
        id: 6,
        name: "CROWN_DAILY_PDDA_LIST",
        friendlyName: "Crown Daily List",
        shortenedFriendlyName: "Crown Daily List",
        welshFriendlyName: "Rhestr Ddyddiol y Goron",
        isNonStrategic: false,
        defaultSensitivity: "PUBLIC"
      }
    ])
  )
}));

const mockRedisClient = vi.hoisted(() => ({
  setEx: vi.fn(),
  get: vi.fn(),
  del: vi.fn()
}));

vi.mock("@hmcts/redis", () => ({
  getRedisClient: vi.fn(async () => mockRedisClient)
}));

vi.mock("@hmcts/admin-pages", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/admin-pages")>("@hmcts/admin-pages");
  return {
    ...actual,
    validateManualUploadForm: vi.fn(() => []),
    storeManualUpload: vi.fn(() => Promise.resolve("test-upload-id-123"))
  };
});

import { storeManualUpload, validateManualUploadForm } from "@hmcts/admin-pages";

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

    it("should include list type sensitivity mapping as JSON", async () => {
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

      expect(renderData.listTypeSensitivityMap).toBeDefined();
      const parsedMap = JSON.parse(renderData.listTypeSensitivityMap);
      expect(parsedMap["1"]).toBe("PUBLIC");
      expect(parsedMap["2"]).toBe("PRIVATE");
      expect(parsedMap["6"]).toBe("PUBLIC");
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

describe("manual-upload page keeps a valid uploaded file across validation errors", () => {
  const validBody = {
    locationId: "1",
    listType: "1",
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
  };
  const uploadedFile = {
    buffer: Buffer.from("file content"),
    originalname: "hearing-list.pdf",
    mimetype: "application/pdf",
    size: 12
  } as Express.Multer.File;
  const keptReference = { id: "kept-id", fileName: "kept.pdf" };
  const fieldErrors = [{ text: "Please select a list type", href: "#listType" }];

  function buildSession(overrides: Record<string, unknown> = {}) {
    return { save: vi.fn((cb: (err?: unknown) => void) => cb()), ...overrides } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient.setEx.mockResolvedValue("OK");
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.get.mockResolvedValue(null);
  });

  it("should keep a valid file when only other fields have errors", async () => {
    // Arrange
    const session = buildSession();
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(expect.stringMatching(/^manual-upload-pending:/), 3600, expect.any(String));
    expect(session.manualUploadPendingFile).toEqual({ id: expect.any(String), fileName: "hearing-list.pdf" });
    expect(res.redirect).toHaveBeenCalledWith("/manual-upload");
  });

  it("should not keep a file that failed its own validation", async () => {
    // Arrange
    const session = buildSession();
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue([{ text: "Invalid file", href: "#file" }, ...fieldErrors]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    expect(session.manualUploadPendingFile).toBeUndefined();
  });

  it("should not store anything and drop the kept file when the new file is too large", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, session, fileUploadError: { code: "LIMIT_FILE_SIZE" } } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateManualUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("manual-upload-pending:kept-id");
    expect(session.manualUploadPendingFile).toBeUndefined();
  });

  it("should require a file again when the file input is submitted empty", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateManualUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("manual-upload-pending:kept-id");
    expect(session.manualUploadPendingFile).toBeUndefined();
  });

  it("should use the submitted file and clean up the kept file on success", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue([]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(storeManualUpload).toHaveBeenCalledWith(expect.objectContaining({ file: uploadedFile.buffer, fileName: uploadedFile.originalname }));
    expect(mockRedisClient.del).toHaveBeenCalledWith("manual-upload-pending:kept-id");
    expect(session.manualUploadPendingFile).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith("/manual-upload-summary?uploadId=test-upload-id-123");
  });

  it("should keep the existing reference when resubmitting with errors and no new file", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ fileName: "kept.pdf", fileType: "application/pdf", fileBase64: "" }));
    vi.mocked(validateManualUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(session.manualUploadPendingFile).toEqual(keptReference);
    expect(mockRedisClient.del).not.toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });

  it("should replace the kept file when a new file is chosen", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateManualUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("manual-upload-pending:kept-id");
    expect(session.manualUploadPendingFile).toEqual({ id: expect.any(String), fileName: "hearing-list.pdf" });
  });

  it("should treat an expired kept file as no file", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    mockRedisClient.get.mockResolvedValue(null);
    vi.mocked(validateManualUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateManualUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(session.manualUploadPendingFile).toBeUndefined();
    expect(session.manualUploadErrors).toEqual([{ text: "Please provide a file", href: "#file" }]);
  });

  it("should pass the kept file to the page so it can be put back into the file input", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference, manualUploadErrors: fieldErrors, manualUploadForm: { listType: "1" } });
    const req = { session, query: {} } as unknown as Request;
    const res = { render: vi.fn() } as unknown as Response;

    // Act
    await callHandler(GET, req, res);

    // Assert
    const renderData = vi.mocked(res.render).mock.calls[0][1] as any;
    expect(renderData.pendingFileName).toBe("kept.pdf");
    expect(renderData.pendingFileUrl).toBe("/manual-upload/pending-file");
    expect(renderData.data).toEqual(expect.objectContaining({ listType: "1" }));
    expect(session.manualUploadPendingFile).toEqual(keptReference);
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });

  it("should drop the kept file on refresh or when arriving from the summary Change link", async () => {
    // Arrange
    const session = buildSession({ manualUploadPendingFile: keptReference, manualUploadSubmitted: true, manualUploadForm: { listType: "1" } });
    const req = { session, query: {} } as unknown as Request;
    const res = { render: vi.fn() } as unknown as Response;

    // Act
    await callHandler(GET, req, res);

    // Assert
    const renderData = vi.mocked(res.render).mock.calls[0][1] as any;
    expect(renderData.pendingFileName).toBeUndefined();
    expect(mockRedisClient.del).toHaveBeenCalledWith("manual-upload-pending:kept-id");
    expect(session.manualUploadPendingFile).toBeUndefined();
  });
});
