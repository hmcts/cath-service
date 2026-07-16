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
    if (id === 1) return Promise.resolve({ locationId: 1, name: "Test Crown Court", welshName: "Test Crown Court CY" });
    if (id === 2) return Promise.resolve({ locationId: 2, name: "Another Court", welshName: "Another Court CY" });
    return Promise.resolve(null);
  })
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  findListTypeById: vi.fn((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, friendlyName: "Test List Type", welshFriendlyName: "Test List Type CY" });
    if (id === 4) return Promise.resolve({ id: 4, friendlyName: "Family Daily List", welshFriendlyName: "Rhestr Ddyddiol Teulu" });
    if (id === 6) return Promise.resolve({ id: 6, friendlyName: "Crown Daily List", welshFriendlyName: "Rhestr Ddyddiol y Goron" });
    return Promise.resolve(null);
  }),
  AuditLogAction: {
    MANUAL_UPLOAD: "Manual upload"
  }
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

vi.mock("@hmcts/admin-pages", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/admin-pages")>("@hmcts/admin-pages");
  return {
    ...actual,
    getManualUpload: vi.fn(),
    saveUploadedFile: vi.fn()
  };
});

vi.mock("@hmcts/publication", () => ({
  createArtefact: vi.fn(),
  processPublication: vi.fn(),
  updateSourceArtefactId: vi.fn(),
  extractAndStoreArtefactSearch: vi.fn(),
  Provenance: { MANUAL_UPLOAD: "MANUAL_UPLOAD" },
  Sensitivity: { PUBLIC: "PUBLIC", PRIVATE: "PRIVATE", CLASSIFIED: "CLASSIFIED" },
  Language: { ENGLISH: "ENGLISH", WELSH: "WELSH", BILINGUAL: "BILINGUAL" }
}));

vi.mock("@hmcts/notifications", () => ({
  sendLocationAndCaseSubscriptionNotifications: vi.fn(),
  sendListTypePublicationNotifications: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn(({ where: { id } }: any) => {
        if (id === 6) return Promise.resolve({ name: "CROWN_DAILY_LIST", friendlyName: "Crown Daily List" });
        return Promise.resolve(null);
      })
    }
  }
}));

import { getManualUpload, saveUploadedFile } from "@hmcts/admin-pages";
import { getLocationById } from "@hmcts/location";
import { sendListTypePublicationNotifications } from "@hmcts/notifications";
import { createArtefact, extractAndStoreArtefactSearch, processPublication } from "@hmcts/publication";

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
          heading: "File Upload Summary",
          subHeading: "Check upload details",
          courtName: "Court name",
          file: "File",
          listType: "List type",
          hearingStartDate: "Hearing start date",
          sensitivity: "Sensitivity",
          language: "Language",
          displayFileDates: "Display file dates",
          change: "Change",
          confirmButton: "Confirm"
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
          confirmButton: "Cadarnhau"
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

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

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

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

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

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

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

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall?.[1] as any;

      expect(renderData.data.courtName).toBe("999");
    });

    it("should format all sensitivity types correctly", async () => {
      const sensitivities = ["PUBLIC", "PRIVATE", "CLASSIFIED"];
      const expectedLabels = ["Public", "Private – all verified users", "Classified"];

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

        const renderCall = vi.mocked(res.render).mock.calls[0];
        const renderData = renderCall?.[1] as any;

        expect(renderData.data.sensitivity).toBe(expectedLabels[i]);
      }
    });

    it("should format all language types correctly", async () => {
      const languages = ["ENGLISH", "WELSH", "BILINGUAL"];
      const expectedLabels = ["English", "Welsh", "Bilingual English/Welsh"];

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

        const renderCall = vi.mocked(res.render).mock.calls[0];
        const renderData = renderCall?.[1] as any;

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
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });

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
      expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id-123", "test-hearing-list.pdf", mockUploadData.file);
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
      vi.mocked(saveUploadedFile).mockResolvedValue("/path/to/saved/file.json");
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

    it("should send notifications on successful upload", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue("/path/to/saved/file.json");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(getLocationById).mockResolvedValue({
        locationId: 1,
        name: "Test Crown Court",
        welshName: "Test Crown Court CY",
        regions: [],
        subJurisdictions: []
      } as any);
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 5,
        sent: 5,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const session = {
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

      // Verify upload succeeded by checking redirect
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("/manual-upload-success"));
    });

    it("should complete upload successfully (notification errors handled internally by processPublication)", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });

      const session = {
        manualUploadForm: { locationId: "1" },
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

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
      expect(processPublication).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: "test-artefact-id-123",
          logPrefix: "[Manual Upload]"
        })
      );
    });

    it("should complete upload and call processPublication with correct parameters", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });

      const session = {
        manualUploadForm: { locationId: "1" },
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

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
      expect(processPublication).toHaveBeenCalledWith(
        expect.objectContaining({
          artefactId: "test-artefact-id-123",
          locationId: "1",
          locale: "en",
          logPrefix: "[Manual Upload]"
        })
      );
    });

    it("should continue upload even if location not found for audit log", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(getLocationById).mockResolvedValue(undefined);
      vi.mocked(processPublication).mockResolvedValue({});

      const session = {
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

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
    });

    it("should still redirect to success when background publication processing fails", async () => {
      // PDF generation + notifications run in the background (fire-and-forget), so a
      // failure there must NOT block or fail the upload — the artefact is already
      // persisted. The handler should redirect to the success page regardless.
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(processPublication).mockRejectedValueOnce(new Error("Publication service down"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const session = {
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

      // Redirected to success even though the background processing rejected
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
      expect(res.render).not.toHaveBeenCalled();

      // Flush the microtask queue so the background .catch runs and logs
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Manual Upload] Background publication processing failed:",
        expect.objectContaining({ artefactId: "test-artefact-id-123" })
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log a stringified reason when background publication rejects with a non-Error value", async () => {
      // The background .catch stringifies non-Error rejection reasons via String(error).
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(processPublication).mockRejectedValueOnce("string failure reason");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const session = {
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

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");

      // Flush the microtask queue so the background .catch runs and logs
      await Promise.resolve();
      await Promise.resolve();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Manual Upload] Background publication processing failed:",
        expect.objectContaining({ artefactId: "test-artefact-id-123", error: "string failure reason" })
      );

      consoleErrorSpy.mockRestore();
    });

    it("should redirect to Welsh success page when lng=cy", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const session = {
        save: vi.fn((callback) => callback())
      };

      const req = {
        query: { uploadId: "test-upload-id", lng: "cy" },
        session
      } as unknown as Request;

      const res = {
        redirect: vi.fn(),
        render: vi.fn()
      } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success?lng=cy");
    });

    it("should handle invalid date format error", async () => {
      const invalidDateUploadData = {
        ...mockUploadData,
        hearingStartDate: { day: "invalid", month: "invalid", year: "invalid" }
      };

      vi.mocked(getManualUpload).mockResolvedValueOnce(invalidDateUploadData).mockResolvedValueOnce(invalidDateUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");

      const session = {};

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
    });

    it("should determine isFlatFile correctly for JSON files", async () => {
      const jsonUploadData = {
        ...mockUploadData,
        fileName: "test-hearing-list.json"
      };

      vi.mocked(getManualUpload).mockResolvedValue(jsonUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const session = {
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

      expect(createArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlatFile: false
        })
      );
    });

    it("should determine isFlatFile correctly for non-JSON files", async () => {
      vi.mocked(getManualUpload).mockResolvedValue(mockUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const session = {
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

      expect(createArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlatFile: true
        })
      );
    });

    it("should call extractAndStoreArtefactSearch when a JSON file is uploaded", async () => {
      const jsonContent = JSON.stringify({ data: "test" });
      const jsonUploadData = {
        ...mockUploadData,
        fileName: "test-hearing-list.json",
        file: Buffer.from(jsonContent)
      };

      vi.mocked(getManualUpload).mockResolvedValue(jsonUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".json");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(extractAndStoreArtefactSearch).mockResolvedValue(undefined);

      const session = { save: vi.fn((callback) => callback()) };
      const req = { query: { uploadId: "test-upload-id" }, session } as unknown as Request;
      const res = { redirect: vi.fn(), render: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(extractAndStoreArtefactSearch).toHaveBeenCalledWith("test-artefact-id-123", 6, { data: "test" });
      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
    });

    it("should continue upload when extractAndStoreArtefactSearch throws", async () => {
      const jsonContent = JSON.stringify({ data: "test" });
      const jsonUploadData = {
        ...mockUploadData,
        fileName: "test-hearing-list.json",
        file: Buffer.from(jsonContent)
      };

      vi.mocked(getManualUpload).mockResolvedValue(jsonUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".json");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(extractAndStoreArtefactSearch).mockRejectedValue(new Error("Search extraction failed"));

      const session = { save: vi.fn((callback) => callback()) };
      const req = { query: { uploadId: "test-upload-id" }, session } as unknown as Request;
      const res = { redirect: vi.fn(), render: vi.fn() } as unknown as Response;

      await callHandler(POST, req, res);

      expect(res.redirect).toHaveBeenCalledWith("/manual-upload-success");
    });

    it("should handle missing fileName gracefully when determining isFlatFile", async () => {
      const noFileNameUploadData = {
        ...mockUploadData,
        fileName: "" as any
      };

      vi.mocked(getManualUpload).mockResolvedValue(noFileNameUploadData);
      vi.mocked(saveUploadedFile).mockResolvedValue(".pdf");
      vi.mocked(processPublication).mockResolvedValue({});
      vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id-123", isUpdate: false });
      vi.mocked(sendListTypePublicationNotifications).mockResolvedValue({
        totalSubscriptions: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        notifiedUserIds: []
      });

      const session = {
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

      expect(createArtefact).toHaveBeenCalledWith(
        expect.objectContaining({
          isFlatFile: true
        })
      );
    });
  });
});
