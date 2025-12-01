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
          title: "Upload excel file",
          pageTitle: "Upload - Upload excel file",
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
  });
});
