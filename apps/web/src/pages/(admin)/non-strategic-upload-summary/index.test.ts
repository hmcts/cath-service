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
    if (id === 7)
      return Promise.resolve({
        id: 7,
        name: "CIC_WEEKLY_HEARING_LIST",
        friendlyName: "CIC Weekly Hearing List",
        welshFriendlyName: "Rhestr Wythnosol CIC",
        isNonStrategic: true
      });
    return Promise.resolve(null);
  }),
  AuditLogAction: {
    NON_STRATEGIC_UPLOAD: "Non strategic upload"
  }
}));

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    hasConverterForListTypeName: vi.fn(() => true),
    convertExcelForListTypeName: vi.fn(() => Promise.resolve({ cases: [] }))
  };
});

vi.mock("@hmcts/web-core", async () => {
  const actual = await vi.importActual("@hmcts/web-core");
  return {
    ...actual,
    formatDate: vi.fn((date) => `${date.day} Month ${date.year}`),
    formatDateRange: vi.fn((from, to) => `${from.day} Month ${from.year} to ${to.day} Month ${to.year}`),
    parseDate: vi.fn((date) => new Date(Number.parseInt(date.year, 10), Number.parseInt(date.month, 10) - 1, Number.parseInt(date.day, 10)))
  };
});

vi.mock("@hmcts/admin-pages", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/admin-pages")>("@hmcts/admin-pages");
  return {
    ...actual,
    getNonStrategicUpload: vi.fn(),
    saveUploadedFile: vi.fn(() => Promise.resolve(".xlsx"))
  };
});

vi.mock("@hmcts/publication", () => ({
  createArtefact: vi.fn(() => Promise.resolve({ artefactId: "artefact-id-123", isUpdate: false })),
  processPublication: vi.fn(() => Promise.resolve({})),
  updateSourceArtefactId: vi.fn(() => Promise.resolve()),
  extractAndStoreArtefactSearch: vi.fn(() => Promise.resolve()),
  Provenance: { MANUAL_UPLOAD: "MANUAL_UPLOAD" },
  Sensitivity: { PUBLIC: "PUBLIC", PRIVATE: "PRIVATE", CLASSIFIED: "CLASSIFIED" },
  Language: { ENGLISH: "ENGLISH", WELSH: "WELSH", BILINGUAL: "BILINGUAL" }
}));

import { getNonStrategicUpload, saveUploadedFile } from "@hmcts/admin-pages";
import { createArtefact, extractAndStoreArtefactSearch, processPublication, updateSourceArtefactId } from "@hmcts/publication";
import { findListTypeById } from "@hmcts/system-admin-pages";

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
          confirmButton: "Confirm"
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

    it("should use shortenedFriendlyName when list type has it set", async () => {
      // Arrange
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "1",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(findListTypeById).mockResolvedValueOnce({
        id: 1,
        friendlyName: "Test List Type",
        welshFriendlyName: "Test List Type CY",
        shortenedFriendlyName: "Short Name"
      } as any);

      const req = { query: { uploadId: "test-upload-id" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      // Act
      await callHandler(GET, req, res);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          data: expect.objectContaining({
            listType: "Short Name"
          })
        })
      );
    });

    it("should use Welsh display names when locale is cy", async () => {
      // Arrange
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "WELSH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };
      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);

      const req = { query: { uploadId: "test-upload-id", lng: "cy" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      } as unknown as Response;

      // Act
      await callHandler(GET, req, res);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          data: expect.objectContaining({
            courtName: "Test Crown Court CY",
            listType: "Rhestr Ddyddiol y Goron"
          })
        })
      );
    });

    it("should fall back to uploadData.listType when list type is not found", async () => {
      // Arrange
      const mockUploadData = {
        file: Buffer.from("test"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "99",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(findListTypeById).mockResolvedValueOnce(null);

      const req = { query: { uploadId: "test-upload-id" } } as unknown as Request;
      const res = {
        render: vi.fn(),
        locals: { locale: "en" }
      } as unknown as Response;

      // Act
      await callHandler(GET, req, res);

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "non-strategic-upload-summary/index",
        expect.objectContaining({
          data: expect.objectContaining({
            listType: "99"
          })
        })
      );
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
      // Non-Excel JSON path: file saved directly to blob storage
      expect(saveUploadedFile).toHaveBeenCalledWith("artefact-id-123", "test.xlsx", mockUploadData.file);
      expect(processPublication).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: "artefact-id-123",
          locationId: "123",
          listTypeId: 6,
          locale: "en",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          provenance: "MANUAL_UPLOAD",
          logPrefix: "[Non-Strategic Upload]"
        })
      );
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-success");
    });

    it("should call processPublication with Welsh locale when language is WELSH", async () => {
      const mockUploadData = {
        file: Buffer.from("test file content"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "6",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "WELSH",
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
        redirect: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(processPublication).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: "cy",
          sensitivity: "PUBLIC",
          language: "WELSH"
        })
      );
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

      const session: {
        nonStrategicUploadForm?: { some: string };
        nonStrategicUploadSubmitted?: boolean;
        nonStrategicUploadConfirmed?: boolean;
        save: (callback: (err?: unknown) => void) => void;
      } = {
        nonStrategicUploadForm: { some: "data" },
        nonStrategicUploadSubmitted: true,
        save: (callback: (err?: unknown) => void) => callback()
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
      expect((session as any).nonStrategicUploadConfirmed).toBe(true);
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

    it("should convert Excel file and call extractAndStoreArtefactSearch for non-strategic list type", async () => {
      const { hasConverterForListTypeName, convertExcelForListTypeName } = await import("@hmcts/list-types-common");

      const mockUploadData = {
        file: Buffer.from("excel content"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "7",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "artefact-id-123", isUpdate: false });
      vi.mocked(hasConverterForListTypeName).mockReturnValue(true);
      vi.mocked(convertExcelForListTypeName).mockResolvedValue({ cases: [] });
      vi.mocked(extractAndStoreArtefactSearch).mockResolvedValue(undefined);

      const session = { save: (callback: (err?: any) => void) => callback() };
      const req = { query: { uploadId: "test-upload-id" }, session } as unknown as Request;
      const res = { redirect: vi.fn(), render: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(extractAndStoreArtefactSearch).toHaveBeenCalledWith("artefact-id-123", 7, { cases: [] });
      // Excel is NOT saved to blob — only the converted JSON is (blob name has no extension)
      expect(saveUploadedFile).toHaveBeenCalledWith("artefact-id-123", "artefact-id-123", expect.any(Buffer));
      expect(saveUploadedFile).not.toHaveBeenCalledWith("artefact-id-123", "test.xlsx", expect.anything());
      // source_artefact_id stores the original Excel file name, not the synthetic JSON blob name
      expect(updateSourceArtefactId).toHaveBeenCalledWith("artefact-id-123", "test.xlsx");
      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-success");
    });

    it("should continue upload when extractAndStoreArtefactSearch throws after Excel conversion", async () => {
      const { hasConverterForListTypeName, convertExcelForListTypeName } = await import("@hmcts/list-types-common");

      const mockUploadData = {
        file: Buffer.from("excel content"),
        fileName: "test.xlsx",
        fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        locationId: "123",
        listType: "7",
        hearingStartDate: { day: "23", month: "10", year: "2025" },
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: { day: "20", month: "10", year: "2025" },
        displayTo: { day: "30", month: "10", year: "2025" }
      };

      vi.mocked(getNonStrategicUpload).mockResolvedValue(mockUploadData);
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "artefact-id-123", isUpdate: false });
      vi.mocked(hasConverterForListTypeName).mockReturnValue(true);
      vi.mocked(convertExcelForListTypeName).mockResolvedValue({ cases: [] });
      vi.mocked(extractAndStoreArtefactSearch).mockRejectedValue(new Error("Search extraction failed"));

      const session = { save: (callback: (err?: any) => void) => callback() };
      const req = { query: { uploadId: "test-upload-id" }, session } as unknown as Request;
      const res = { redirect: vi.fn(), render: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/non-strategic-upload-success");
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
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "artefact-id-123", isUpdate: false });

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
