import { requireRole } from "@hmcts/auth";
import { getGeneratedFile } from "@hmcts/publication";
import { recordBlobExplorerDownload } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRoleMiddleware } = vi.hoisted(() => ({
  mockRoleMiddleware: vi.fn((_req: unknown, _res: unknown, next: () => void) => next())
}));

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => mockRoleMiddleware),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/publication", () => ({
  GENERATED_FILE_TYPES: {
    pdf: { extension: ".pdf", contentType: "application/pdf" },
    xlsx: { extension: ".xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  },
  isGeneratedFileType: (value: unknown) => value === "pdf" || value === "xlsx",
  getGeneratedFile: vi.fn()
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  recordBlobExplorerDownload: vi.fn()
}));

vi.mock("@hmcts/web-core", () => ({
  errorViewsEn: { error400: { title: "Bad request" }, error404: { title: "Page not found" }, error500: { title: "Sorry" } },
  errorViewsCy: { error400: { title: "Cais gwael" }, error404: { title: "Heb ddod o hyd" }, error500: { title: "Mae'n ddrwg gennym" } }
}));

const { GET } = await import("./download.js");
const requireRoleArgs = vi.mocked(requireRole).mock.calls.map((call) => call[0]);

const ARTEFACT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const handler = GET[GET.length - 1] as RequestHandler;

describe("blob-explorer-json-file download route", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const user = { id: "user-1", email: "admin@example.com", displayName: "Admin", role: "SYSTEM_ADMIN", provenance: "SSO" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockRequest = { method: "GET", query: { artefactId: ARTEFACT_ID, type: "pdf" }, user };
    mockResponse = {
      locals: { locale: "en" },
      status: vi.fn().mockReturnThis(),
      render: vi.fn(),
      setHeader: vi.fn(),
      send: vi.fn(),
      end: vi.fn()
    };
  });

  it("should restrict the route to System Admins", () => {
    // Assert
    expect(requireRoleArgs).toEqual([["SYSTEM_ADMIN"]]);
    expect(GET).toHaveLength(2);
    expect(GET[0]).toBe(mockRoleMiddleware);
  });

  describe("successful downloads", () => {
    it.each([
      ["pdf", "application/pdf", ".pdf"],
      ["xlsx", XLSX_CONTENT_TYPE, ".xlsx"]
    ])("should send the %s file unchanged as an attachment", async (type, contentType, extension) => {
      // Arrange
      const buffer = Buffer.from(`stored ${type} bytes`);
      mockRequest.query = { artefactId: ARTEFACT_ID, type };
      vi.mocked(getGeneratedFile).mockResolvedValue({ buffer, contentType });

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(getGeneratedFile).toHaveBeenCalledWith(ARTEFACT_ID, type);
      expect(recordBlobExplorerDownload).toHaveBeenCalledWith(user, ARTEFACT_ID, type);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", contentType);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Length", buffer.length);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", `attachment; filename="${ARTEFACT_ID}${extension}"`);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
      expect(mockResponse.send).toHaveBeenCalledWith(buffer);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should write the audit entry before sending the file", async () => {
      // Arrange
      const order: string[] = [];
      vi.mocked(getGeneratedFile).mockResolvedValue({ buffer: Buffer.from("x"), contentType: "application/pdf" });
      vi.mocked(recordBlobExplorerDownload).mockImplementation(async () => {
        order.push("audit");
      });
      vi.mocked(mockResponse.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        order.push("send");
        return mockResponse as Response;
      });

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(order).toEqual(["audit", "send"]);
    });
  });

  describe("invalid requests", () => {
    it("should refuse a HEAD request without reading storage or writing an audit entry", async () => {
      // Arrange
      mockRequest.method = "HEAD";

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Allow", "GET");
      expect(mockResponse.end).toHaveBeenCalled();
      expect(getGeneratedFile).not.toHaveBeenCalled();
      expect(recordBlobExplorerDownload).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it.each([
      ["missing artefactId", { type: "pdf" }],
      ["non-UUID artefactId", { artefactId: "abc-123", type: "pdf" }],
      ["traversal in artefactId", { artefactId: `../${ARTEFACT_ID}`, type: "pdf" }],
      ["array artefactId", { artefactId: [ARTEFACT_ID], type: "pdf" }],
      ["missing type", { artefactId: ARTEFACT_ID }],
      ["unknown type", { artefactId: ARTEFACT_ID, type: "json" }],
      ["upper-case type", { artefactId: ARTEFACT_ID, type: "PDF" }],
      ["traversal in type", { artefactId: ARTEFACT_ID, type: "../x" }]
    ])("should return 400 for a %s without calling storage", async (_label, query) => {
      // Arrange
      mockRequest.query = query as Request["query"];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/400", expect.objectContaining({ t: { title: "Bad request" } }));
      expect(getGeneratedFile).not.toHaveBeenCalled();
      expect(recordBlobExplorerDownload).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it("should render the Welsh error page when the locale is cy", async () => {
      // Arrange
      mockRequest.query = { artefactId: "bad", type: "pdf" };
      mockResponse.locals = { locale: "cy" };

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith("errors/400", expect.objectContaining({ t: { title: "Cais gwael" } }));
    });
  });

  describe("missing files", () => {
    it("should return 404 and write no audit entry when the blob does not exist", async () => {
      // Arrange
      vi.mocked(getGeneratedFile).mockResolvedValue(null);

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/404", expect.objectContaining({ t: { title: "Page not found" } }));
      expect(recordBlobExplorerDownload).not.toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });

  describe("failures", () => {
    it("should return 500 when the storage call throws", async () => {
      // Arrange
      vi.mocked(getGeneratedFile).mockRejectedValue(new Error("Storage unavailable"));

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.render).toHaveBeenCalledWith("errors/500", expect.objectContaining({ t: { title: "Sorry" } }));
      expect(recordBlobExplorerDownload).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(`Blob Explorer download failed for artefact ${ARTEFACT_ID} (pdf):`, "Storage unavailable");
    });

    it("should return 500 and send no file when the audit write fails", async () => {
      // Arrange
      vi.mocked(getGeneratedFile).mockResolvedValue({ buffer: Buffer.from("x"), contentType: "application/pdf" });
      vi.mocked(recordBlobExplorerDownload).mockRejectedValue(new Error("Database unavailable"));

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it("should log a generic message when a non-Error value is thrown", async () => {
      // Arrange
      vi.mocked(getGeneratedFile).mockRejectedValue("boom");

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(console.error).toHaveBeenCalledWith(`Blob Explorer download failed for artefact ${ARTEFACT_ID} (pdf):`, "unknown error");
    });
  });
});
