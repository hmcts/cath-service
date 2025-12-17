import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

async function callHandler(handlers: RequestHandler | RequestHandler[], req: Request, res: Response) {
  if (Array.isArray(handlers)) {
    for (let i = 0; i < handlers.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const handler = handlers[i];
        const next = (err?: any) => {
          if (err) reject(err);
          else resolve();
        };
        const result = handler(req, res, next);
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
  findNonStrategicListTypes: vi.fn(() =>
    Promise.resolve([
      {
        id: 3,
        name: "SJP_PUBLIC_LIST",
        friendlyName: "SJP Public List",
        shortenedFriendlyName: "SJP Public List",
        welshFriendlyName: "Rhestr Gyhoeddus SJP",
        isNonStrategic: true
      },
      {
        id: 4,
        name: "SJP_PRESS_LIST",
        friendlyName: "SJP Press List (Full List)",
        shortenedFriendlyName: "SJP Press List",
        welshFriendlyName: "Rhestr Wasg SJP (Rhestr Lawn)",
        isNonStrategic: true
      },
      {
        id: 9,
        name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
        friendlyName: "Care Standards Tribunal Weekly Hearing List",
        shortenedFriendlyName: "CST Weekly Hearing List",
        welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
        isNonStrategic: true
      }
    ])
  ),
  findListTypeById: vi.fn((id: number) => {
    if (id === 3)
      return Promise.resolve({
        id: 3,
        name: "SJP_PUBLIC_LIST",
        friendlyName: "SJP Public List",
        shortenedFriendlyName: "SJP Public List",
        welshFriendlyName: "Rhestr Gyhoeddus SJP",
        isNonStrategic: true,
        url: "/sjp-public-list"
      });
    if (id === 4)
      return Promise.resolve({
        id: 4,
        name: "SJP_PRESS_LIST",
        friendlyName: "SJP Press List (Full List)",
        shortenedFriendlyName: "SJP Press List",
        welshFriendlyName: "Rhestr Wasg SJP (Rhestr Lawn)",
        isNonStrategic: true,
        url: "/sjp-press-list"
      });
    if (id === 9)
      return Promise.resolve({
        id: 9,
        name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
        friendlyName: "Care Standards Tribunal Weekly Hearing List",
        shortenedFriendlyName: "CST Weekly Hearing List",
        welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
        isNonStrategic: true,
        url: "/care-standards-tribunal-weekly-hearing-list"
      });
    return Promise.resolve(null);
  })
}));

vi.mock("../../manual-upload/validation.js", () => ({
  validateNonStrategicUploadForm: vi.fn(() => [])
}));

vi.mock("../../manual-upload/storage.js", () => ({
  storeNonStrategicUpload: vi.fn(() => Promise.resolve("test-upload-id-123"))
}));

import { storeNonStrategicUpload } from "../../manual-upload/storage.js";
import { validateNonStrategicUploadForm } from "../../manual-upload/validation.js";

describe("non-strategic-upload page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render non-strategic-upload page with English content", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload/index",
        expect.objectContaining({
          title: "Upload Excel file",
          pageTitle: "Upload - Upload Excel file",
          warningTitle: "Warning",
          continueButton: "Continue",
          hideLanguageToggle: true,
          locale: "en"
        })
      );
    });

    it("should clear upload confirmation flags when starting new upload", async () => {
      const session = {
        nonStrategicUploadConfirmed: true,
        nonStrategicSuccessPageViewed: true
      };

      const req = {
        session,
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(session.nonStrategicUploadConfirmed).toBeUndefined();
      expect(session.nonStrategicSuccessPageViewed).toBeUndefined();
    });

    it("should display errors from session and clear them", async () => {
      const errors = [
        { text: "Please provide a file", href: "#file" },
        { text: "Please select a list type", href: "#listType" }
      ];

      const session = {
        nonStrategicUploadErrors: errors
      };

      const req = {
        session,
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith("non-strategic-upload/index", expect.objectContaining({ errors }));
      expect(session.nonStrategicUploadErrors).toBeUndefined();
    });

    it("should preserve form data from session when validation fails", async () => {
      const formData = {
        locationId: "123",
        listType: "1",
        sensitivity: "PUBLIC",
        language: "ENGLISH"
      };

      const session = {
        nonStrategicUploadForm: formData,
        nonStrategicUploadSubmitted: true
      };

      const req = {
        session,
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload/index",
        expect.objectContaining({
          data: expect.objectContaining({
            locationId: "123",
            listType: "1",
            sensitivity: "PUBLIC",
            language: "ENGLISH"
          })
        })
      );
    });

    it("should resolve location name from ID", async () => {
      const session = {
        nonStrategicUploadForm: { locationId: "1" },
        nonStrategicUploadSubmitted: true
      };

      const req = {
        session,
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload/index",
        expect.objectContaining({
          data: expect.objectContaining({
            locationName: "Test Court"
          })
        })
      );
    });
  });

  describe("POST", () => {
    it("should validate form and redirect to summary on success", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      const mockFile = {
        buffer: Buffer.from("test file content"),
        originalname: "test.xlsx",
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
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
        },
        file: mockFile,
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(validateNonStrategicUploadForm).toHaveBeenCalled();
      expect(storeNonStrategicUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          file: mockFile.buffer,
          fileName: "test.xlsx",
          fileType: mockFile.mimetype,
          locationId: "123",
          listType: "1",
          sensitivity: "PUBLIC",
          language: "ENGLISH"
        })
      );
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-summary?uploadId=test-upload-id-123");
    });

    it("should handle validation errors and redirect back to form", async () => {
      const errors = [{ text: "Please provide a file", href: "#file" }];
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue(errors);

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
          listType: ""
        },
        file: undefined,
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.nonStrategicUploadErrors).toEqual(errors);
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
    });

    it("should handle file size error from multer", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {},
        file: undefined,
        fileUploadError: { code: "LIMIT_FILE_SIZE" },
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      const savedErrors = session.nonStrategicUploadErrors as any[];
      expect(savedErrors).toBeDefined();
      expect(savedErrors[0].text).toContain("2MB");
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
    });

    it("should store form data in session on validation failure", async () => {
      const errors = [{ text: "Please provide a file", href: "#file" }];
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue(errors);

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
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
        },
        file: undefined,
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.nonStrategicUploadForm).toMatchObject({
        locationId: "123",
        listType: "1",
        sensitivity: "PUBLIC",
        language: "ENGLISH"
      });
    });

    it("should set nonStrategicUploadSubmitted flag on successful validation", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "test.xlsx",
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
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
        },
        file: mockFile,
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.nonStrategicUploadSubmitted).toBe(true);
    });

    it("should validate Excel file for Care Standards Tribunal (listType 9) and reject invalid file", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      // Mock the dynamic import
      vi.doMock("@hmcts/list-types-common", () => ({
        convertExcelForListType: vi.fn().mockRejectedValue(new Error("Missing required field 'hearing length' in row 3")),
        hasConverterForListType: vi.fn().mockReturnValue(true)
      }));

      const mockFile = {
        buffer: Buffer.from("invalid excel content"),
        originalname: "test.xlsx",
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
          listType: "9", // Care Standards Tribunal
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
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.nonStrategicUploadErrors).toBeDefined();
      expect(session.nonStrategicUploadErrors[0].text).toContain("Missing required field");
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");

      vi.doUnmock("@hmcts/list-types-common");
    });

    it("should validate Excel file for Care Standards Tribunal (listType 9) and accept valid file", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      // Mock successful Excel validation
      vi.doMock("@hmcts/list-types-common", () => ({
        convertExcelForListType: vi.fn().mockResolvedValue([
          {
            date: "01/01/2025",
            caseName: "Test Case",
            hearingLength: "1 hour",
            hearingType: "Hearing",
            venue: "Test Venue",
            additionalInformation: "Test Info"
          }
        ]),
        hasConverterForListType: vi.fn().mockReturnValue(true)
      }));

      const mockFile = {
        buffer: Buffer.from("valid excel content"),
        originalname: "test.xlsx",
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
          listType: "9", // Care Standards Tribunal
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
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-summary?uploadId=test-upload-id-123");
      expect(session.nonStrategicUploadSubmitted).toBe(true);

      vi.doUnmock("@hmcts/list-types-common");
    });

    it("should skip Excel validation for non-CST list types", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      const mockFile = {
        buffer: Buffer.from("test file content"),
        originalname: "test.xlsx",
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
          listType: "1", // Not Care Standards Tribunal
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
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      // Should proceed to summary without Excel validation
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-summary?uploadId=test-upload-id-123");
    });

    it("should skip Excel validation for JSON files", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      const mockFile = {
        buffer: Buffer.from('{"test": "data"}'),
        originalname: "test.json",
        mimetype: "application/json",
        size: 1024
      } as Express.Multer.File;

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        body: {
          locationId: "123",
          listType: "9", // CST but JSON file
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
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      // Should proceed to summary without Excel validation
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-summary?uploadId=test-upload-id-123");
    });
  });
});
