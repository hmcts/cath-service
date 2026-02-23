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
  getLocationById: vi.fn((id: number) => {
    if (id === 123) return Promise.resolve({ locationId: 123, name: "Test Crown Court", welshName: "Test Crown Court CY" });
    if (id === 456) return Promise.resolve({ locationId: 456, name: "Another Court", welshName: "Another Court CY" });
    return Promise.resolve(null);
  })
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  findListTypeById: vi.fn((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, friendlyName: "Test List Type", welshFriendlyName: "Test List Type CY" });
    if (id === 5) return Promise.resolve({ id: 5, friendlyName: "Magistrates Public List", welshFriendlyName: "Rhestr Gyhoeddus Ynadon" });
    if (id === 6) return Promise.resolve({ id: 6, friendlyName: "Crown Daily List", welshFriendlyName: "Rhestr Ddyddiol y Goron" });
    return Promise.resolve(null);
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
  getNonStrategicUpload: vi.fn()
}));

vi.mock("../../manual-upload/file-storage.js", () => ({
  saveUploadedFile: vi.fn()
}));

vi.mock("@hmcts/publication", async () => {
  const actual = await vi.importActual("@hmcts/publication");
  return {
    ...actual,
    createArtefact: vi.fn(() => Promise.resolve("artefact-id-123"))
  };
});

import { createArtefact } from "@hmcts/publication";
import { saveUploadedFile } from "../../manual-upload/file-storage.js";
import { getNonStrategicUpload } from "../../manual-upload/storage.js";

describe("non-strategic-upload-summary page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should retrieve and display upload data", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test-hearing-list.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-upload-id" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(getNonStrategicUpload).toHaveBeenCalledWith("test-upload-id");
      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          data: expect.objectContaining({
            courtName: "Test Crown Court",
            file: "test-hearing-list.xlsx",
            listType: "Crown Daily List"
          })
        })
      );
    });

    it("should render summary page with English content", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-id" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          heading: "File upload summary",
          confirmButton: "Confirm",
          hideLanguageToggle: true
        })
      );
    });

    it("should return 400 if uploadId is missing", async () => {
      const req = { query: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing uploadId");
    });

    it("should return 404 if upload data not found", async () => {
      vi.mocked(getNonStrategicUpload).mockResolvedValue(null);

      const req = { query: { uploadId: "non-existent-id" } } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(GET, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Upload not found");
    });
  });

  describe("POST", () => {
    it("should create artefact and save file on successful submission", async () => {
      const mockUploadData = {
        file: Buffer.from("test file content"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        query: { uploadId: "test-upload-id" },
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(createArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: "123",
          listTypeId: 6,
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          isFlatFile: false,
          provenance: "MANUAL_UPLOAD"
        })
      );
      expect(saveUploadedFile).toHaveBeenCalledWith("artefact-id-123", "test.xlsx", mockUploadData.file);
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-success");
    });

    it("should clear session data after successful submission", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);

      const session = {
        nonStrategicUploadForm: { some: "data" },
        nonStrategicUploadSubmitted: true,
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        query: { uploadId: "test-upload-id" },
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(session.nonStrategicUploadForm).toBeUndefined();
      expect(session.nonStrategicUploadSubmitted).toBeUndefined();
      expect(session.nonStrategicUploadConfirmed).toBe(true);
    });

    it("should return 400 if uploadId is missing", async () => {
      const req = { query: {}, session: {} } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing uploadId");
    });

    it("should return 404 if upload data not found", async () => {
      vi.mocked(getNonStrategicUpload).mockResolvedValue(null);

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

    it("should handle errors and display error message", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

      const req = {
        query: { uploadId: "test-upload-id" },
        session: {}
      } as unknown as Request;
      const res = {
        render: vi.fn(),
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: "Database error" })])
        })
      );
    });

    it("should redirect with language parameter when lng=cy", async () => {
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(createArtefact).mockResolvedValue("artefact-id-123");

      const session = {
        save: (callback: (err?: any) => void) => callback()
      };

      const req = {
        query: { uploadId: "test-upload-id", lng: "cy" },
        session
      } as unknown as Request;
      const res = {
        redirect: vi.fn(),
        render: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-success?lng=cy");
    });
  });
});
