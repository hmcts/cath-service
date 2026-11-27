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
        id: 9,
        name: "CST_WEEKLY_HEARING_LIST",
        friendlyName: "Care Standards Tribunal Weekly Hearing List",
        shortenedFriendlyName: "CST Weekly Hearing List",
        welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
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
        id: 3,
        name: "SJP_PUBLIC_LIST",
        friendlyName: "SJP Public List",
        shortenedFriendlyName: "SJP Public List",
        welshFriendlyName: "Rhestr Gyhoeddus SJP",
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
        name: "CST_WEEKLY_HEARING_LIST",
        friendlyName: "Care Standards Tribunal Weekly Hearing List",
        shortenedFriendlyName: "CST Weekly Hearing List",
        welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
        isNonStrategic: true,
        url: "/care-standards-tribunal-weekly-hearing-list"
      });
    return Promise.resolve(null);
  })
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
    validateNonStrategicUploadForm: vi.fn(() => []),
    storeNonStrategicUpload: vi.fn(() => Promise.resolve("test-upload-id-123"))
  };
});

import { storeNonStrategicUpload, validateNonStrategicUploadForm } from "@hmcts/admin-pages";

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
          pageTitle: "Upload excel file - Excel file upload",
          warningTitle: "Warning",
          continueButton: "Continue",
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

    it("should display list types in alphabetical order", async () => {
      const req = {
        session: {},
        query: {}
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalled();
      const renderCall = vi.mocked(res.render).mock.calls[0]!;
      const listTypes = (renderCall[1] as any).listTypes as Array<{ value: string; text: string }>;

      // Filter out the placeholder option
      const listTypeOptions = listTypes.filter((lt) => lt.value !== "");

      // Verify list types are sorted alphabetically by text
      const sortedListTypes = [...listTypeOptions].sort((a, b) => a.text.localeCompare(b.text));
      expect(listTypeOptions).toEqual(sortedListTypes);
    });

    it("should pre-fill locationId from query parameter when not in session form data", async () => {
      const req = {
        session: {},
        query: { locationId: "2" }
      } as unknown as Request;
      const res = {
        render: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload/index",
        expect.objectContaining({
          data: expect.objectContaining({
            locationId: "2"
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

      expect((session as any).nonStrategicUploadErrors).toEqual(errors);
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

      const savedErrors = (session as any).nonStrategicUploadErrors as any[];
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

      expect((session as any).nonStrategicUploadForm).toMatchObject({
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

      expect((session as any).nonStrategicUploadSubmitted).toBe(true);
    });

    it("should validate Excel file for Care Standards Tribunal (listType 9) and reject invalid file", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      // Mock the dynamic import
      vi.doMock("@hmcts/list-types-common", () => ({
        convertExcelForListTypeName: vi.fn().mockRejectedValue(new Error("Missing required field 'hearing length' in row 3")),
        hasConverterForListTypeName: vi.fn().mockReturnValue(true)
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

      expect((session as any).nonStrategicUploadErrors).toBeDefined();
      expect((session as any).nonStrategicUploadErrors[0].text).toContain("Missing required field");
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");

      vi.doUnmock("@hmcts/list-types-common");
    });

    it("should validate Excel file for Care Standards Tribunal (listType 9) and accept valid file", async () => {
      vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

      // Mock successful Excel validation
      vi.doMock("@hmcts/list-types-common", () => ({
        convertExcelForListTypeName: vi.fn().mockResolvedValue([
          {
            date: "01/01/2025",
            caseName: "Test Case",
            hearingLength: "1 hour",
            hearingType: "Hearing",
            venue: "Test Venue",
            additionalInformation: "Test Info"
          }
        ]),
        hasConverterForListTypeName: vi.fn().mockReturnValue(true)
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
      expect((session as any).nonStrategicUploadSubmitted).toBe(true);

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

describe("non-strategic-upload page keeps a valid uploaded file across validation errors", () => {
  const validBody = {
    locationId: "1",
    listType: "3",
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
    originalname: "hearing-list.xlsx",
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 12
  } as Express.Multer.File;
  const keptReference = { id: "kept-id", fileName: "kept.xlsx" };
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
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(expect.stringMatching(/^non-strategic-upload-pending:/), 3600, expect.any(String));
    expect(session.nonStrategicUploadPendingFile).toEqual({ id: expect.any(String), fileName: "hearing-list.xlsx" });
    expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload");
  });

  it("should not keep a file that failed its own validation", async () => {
    // Arrange
    const session = buildSession();
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([{ text: "Invalid file", href: "#file" }, ...fieldErrors]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
  });

  it("should not store anything and drop the kept file when the new file is too large", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, session, fileUploadError: { code: "LIMIT_FILE_SIZE" } } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateNonStrategicUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("non-strategic-upload-pending:kept-id");
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
  });

  it("should require a file again when the file input is submitted empty", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateNonStrategicUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("non-strategic-upload-pending:kept-id");
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
  });

  it("should use the submitted file and clean up the kept file on success", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(storeNonStrategicUpload).toHaveBeenCalledWith(expect.objectContaining({ file: uploadedFile.buffer, fileName: uploadedFile.originalname }));
    expect(mockRedisClient.del).toHaveBeenCalledWith("non-strategic-upload-pending:kept-id");
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
    expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-summary?uploadId=test-upload-id-123");
  });

  it("should keep the existing reference when resubmitting with errors and no new file", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({ fileName: "kept.xlsx", fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBase64: "" })
    );
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(session.nonStrategicUploadPendingFile).toEqual(keptReference);
    expect(mockRedisClient.del).not.toHaveBeenCalled();
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });

  it("should replace the kept file when a new file is chosen", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, file: uploadedFile, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue(fieldErrors);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(mockRedisClient.get).not.toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith("non-strategic-upload-pending:kept-id");
    expect(session.nonStrategicUploadPendingFile).toEqual({ id: expect.any(String), fileName: "hearing-list.xlsx" });
  });

  it("should treat an expired kept file as no file", async () => {
    // Arrange
    const session = buildSession({ nonStrategicUploadPendingFile: keptReference });
    const req = { body: validBody, session } as unknown as Request;
    const res = { redirect: vi.fn() } as unknown as Response;
    mockRedisClient.get.mockResolvedValue(null);
    vi.mocked(validateNonStrategicUploadForm).mockResolvedValue([{ text: "Please provide a file", href: "#file" }]);

    // Act
    await callHandler(POST, req, res);

    // Assert
    expect(vi.mocked(validateNonStrategicUploadForm).mock.calls[0][1]).toBeUndefined();
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
    expect(session.nonStrategicUploadErrors).toEqual([{ text: "Please provide a file", href: "#file" }]);
  });

  it("should pass the kept file to the page so it can be put back into the file input", async () => {
    // Arrange
    const session = buildSession({
      nonStrategicUploadPendingFile: keptReference,
      nonStrategicUploadErrors: fieldErrors,
      nonStrategicUploadForm: { listType: "1" }
    });
    const req = { session, query: {} } as unknown as Request;
    const res = { render: vi.fn() } as unknown as Response;

    // Act
    await callHandler(GET, req, res);

    // Assert
    const renderData = vi.mocked(res.render).mock.calls[0][1] as any;
    expect(renderData.pendingFileName).toBe("kept.xlsx");
    expect(renderData.pendingFileUrl).toBe("/non-strategic-upload/pending-file");
    expect(renderData.data).toEqual(expect.objectContaining({ listType: "1" }));
    expect(session.nonStrategicUploadPendingFile).toEqual(keptReference);
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });

  it("should drop the kept file on refresh or when arriving from the summary Change link", async () => {
    // Arrange
    const session = buildSession({
      nonStrategicUploadPendingFile: keptReference,
      nonStrategicUploadSubmitted: true,
      nonStrategicUploadForm: { listType: "1" }
    });
    const req = { session, query: {} } as unknown as Request;
    const res = { render: vi.fn() } as unknown as Response;

    // Act
    await callHandler(GET, req, res);

    // Assert
    const renderData = vi.mocked(res.render).mock.calls[0][1] as any;
    expect(renderData.pendingFileName).toBeUndefined();
    expect(mockRedisClient.del).toHaveBeenCalledWith("non-strategic-upload-pending:kept-id");
    expect(session.nonStrategicUploadPendingFile).toBeUndefined();
  });
});
