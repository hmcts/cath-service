import * as publication from "@hmcts/publication";
import * as systemAdmin from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn((roles: string[]) => Object.assign(vi.fn(), { roles })),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/publication", () => ({
  getArtefactMetadata: vi.fn(),
  getArtefactType: vi.fn(),
  resendPublication: vi.fn(),
  parseResendAction: (value: unknown) => (typeof value === "string" && ["resubmit", "courtel", "third-party", "email"].includes(value) ? value : null)
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@hmcts/system-admin-pages");
  return {
    buildPublicationPageUrl: actual.buildPublicationPageUrl,
    buildResendSuccessUrl: actual.buildResendSuccessUrl,
    recordBlobExplorerResend: vi.fn(),
    formatDateTime: vi.fn((date: string) => date)
  };
});

const { GET, POST } = await import("./index.js");

const TEMPLATE = "blob-explorer-confirm-resubmission/index";
const ARTEFACT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const METADATA = {
  artefactId: ARTEFACT_ID,
  locationId: "1",
  locationName: "Test Court",
  publicationType: "JSON",
  listType: "Civil Daily Cause List",
  provenance: "Manual Upload",
  language: "ENGLISH",
  sensitivity: "PUBLIC",
  contentDate: "2024-01-01T00:00:00Z",
  displayFrom: "2024-01-01T00:00:00Z",
  displayTo: "2024-01-02T00:00:00Z"
};
const USER = { id: "user-1", email: "admin@example.com", role: "SYSTEM_ADMIN", provenance: "SSO" };

const getHandler = GET[GET.length - 1];
const postHandler = POST[POST.length - 1];

function renderedOptions(mockResponse: Partial<Response>) {
  return vi.mocked(mockResponse.render).mock.calls[0][1] as unknown as Record<string, unknown>;
}

describe("blob-explorer-confirm-resubmission page", () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockRequest = {
      query: { artefactId: ARTEFACT_ID, action: "courtel" },
      session: {},
      user: USER,
      auditMetadata: undefined
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };

    vi.mocked(publication.getArtefactMetadata).mockResolvedValue(METADATA);
    vi.mocked(publication.getArtefactType).mockResolvedValue("json");
  });

  describe("role guard", () => {
    it("should require the System Admin role on GET and POST", () => {
      expect((GET[0] as unknown as { roles: string[] }).roles).toEqual(["SYSTEM_ADMIN"]);
      expect((POST[0] as unknown as { roles: string[] }).roles).toEqual(["SYSTEM_ADMIN"]);
    });
  });

  describe("GET", () => {
    it.each([
      ["artefactId is missing", { action: "courtel" }],
      ["action is missing", { artefactId: ARTEFACT_ID }],
      ["action is unknown", { artefactId: ARTEFACT_ID, action: "delete" }],
      ["artefactId is not a UUID", { artefactId: "not-a-uuid", action: "courtel" }]
    ])("should redirect to blob-explorer-locations when %s", async (_label, query) => {
      // Arrange
      mockRequest.query = query;

      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
      expect(mockResponse.render).not.toHaveBeenCalled();
    });

    it.each([
      ["resubmit", en.actions.resubmit.header],
      ["courtel", en.actions.courtel.header],
      ["third-party", en.actions["third-party"].header],
      ["email", en.actions.email.header]
    ])("should render the %s heading and title", async (action, header) => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action };

      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ header, title: header, metadata: METADATA, error: undefined }));
    });

    it("should point Cancel at the JSON file page", async () => {
      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(renderedOptions(mockResponse).cancelHref).toBe(`/blob-explorer-json-file?artefactId=${ARTEFACT_ID}`);
    });

    it("should point Cancel at the flat file page and keep lng=cy", async () => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action: "email", lng: "cy" };
      vi.mocked(publication.getArtefactType).mockResolvedValue("flat-file");

      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.cancelHref).toBe(`/blob-explorer-flat-file?artefactId=${ARTEFACT_ID}&lng=cy`);
      expect(options.header).toBe(cy.actions.email.header);
      expect(options.locale).toBe("cy");
    });

    it("should show the re-submit error and point Cancel at Locations when the publication does not exist", async () => {
      // Arrange
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(null);

      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe(en.actions.resubmit.error);
      expect(options.metadata).toBeUndefined();
      expect(options.cancelHref).toBe("/blob-explorer-locations");
      expect(options.title).toBe(`Error: ${en.actions.courtel.title}`);
    });

    it("should show the re-submit error when loading fails", async () => {
      // Arrange
      vi.mocked(publication.getArtefactMetadata).mockRejectedValue(new Error("Database error"));

      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(renderedOptions(mockResponse).error).toBe(en.actions.resubmit.error);
    });

    it("should not send anything", async () => {
      // Act
      await getHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(publication.resendPublication).not.toHaveBeenCalled();
      expect(systemAdmin.recordBlobExplorerResend).not.toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("should redirect to blob-explorer-locations without sending when the action is unknown", async () => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action: "nope" };

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
      expect(publication.resendPublication).not.toHaveBeenCalled();
      expect(systemAdmin.recordBlobExplorerResend).not.toHaveBeenCalled();
    });

    it.each(["resubmit", "courtel", "third-party", "email"])("should send %s and redirect to its success page", async (action) => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action };
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "sent", channels: {} });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(publication.resendPublication).toHaveBeenCalledWith(ARTEFACT_ID, action);
      expect(mockResponse.redirect).toHaveBeenCalledWith(`/blob-explorer-resubmission-success?action=${action}`);
    });

    it("should keep lng=cy on the success redirect", async () => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action: "email", lng: "cy" };
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "sent", channels: { email: "sent" } });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-resubmission-success?action=email&lng=cy");
    });

    it.each([
      ["courtel", en.actions.courtel.noRecipientsError],
      ["third-party", en.actions["third-party"].noRecipientsError],
      ["email", en.actions.email.noRecipientsError],
      ["resubmit", en.actions.resubmit.error]
    ] as const)("should re-render %s with its no-recipients message and the metadata", async (action, message) => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action };
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "no-recipients", channels: {} });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).not.toHaveBeenCalled();
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe(message);
      expect(options.metadata).toEqual(METADATA);
      expect(options.cancelHref).toBe(`/blob-explorer-json-file?artefactId=${ARTEFACT_ID}`);
      expect(options.title).toBe(`Error: ${en.actions[action].title}`);
    });

    it.each(["resubmit", "courtel", "third-party", "email"] as const)("should re-render %s with its failure message and the metadata", async (action) => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action };
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "failed", channels: {} });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe(en.actions[action].error);
      expect(options.metadata).toEqual(METADATA);
    });

    it("should use the Welsh messages and Gwall prefix when lng=cy", async () => {
      // Arrange
      mockRequest.query = { artefactId: ARTEFACT_ID, action: "courtel", lng: "cy" };
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "no-recipients", channels: {} });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe(cy.actions.courtel.noRecipientsError);
      expect(options.title).toBe(`Gwall: ${cy.actions.courtel.title}`);
    });

    it("should show the Validation message without the table when the publication no longer exists", async () => {
      // Arrange
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "not-found" });

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe("We could not re-submit this publication. Try again later.");
      expect(options.metadata).toBeUndefined();
      expect(options.cancelHref).toBe("/blob-explorer-locations");
      expect(publication.getArtefactMetadata).not.toHaveBeenCalled();
    });

    it("should treat a thrown error as failed and still audit it", async () => {
      // Arrange
      vi.mocked(publication.resendPublication).mockRejectedValue(new Error("boom"));

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(renderedOptions(mockResponse).error).toBe(en.actions.courtel.error);
      expect(systemAdmin.recordBlobExplorerResend).toHaveBeenCalledWith(USER, ARTEFACT_ID, "courtel", { status: "failed", channels: {} });
    });

    it("should still re-render with the error when reloading the metadata fails", async () => {
      // Arrange
      vi.mocked(publication.resendPublication).mockResolvedValue({ status: "failed", channels: {} });
      vi.mocked(publication.getArtefactMetadata).mockRejectedValue(new Error("Database error"));

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = renderedOptions(mockResponse);
      expect(options.error).toBe(en.actions.courtel.error);
      expect(options.metadata).toBeUndefined();
    });

    it.each([
      ["sent", { status: "sent", channels: { courtel: "sent" } }],
      ["no-recipients", { status: "no-recipients", channels: { courtel: "no-recipients" } }],
      ["failed", { status: "failed", channels: { courtel: "failed" } }],
      ["not-found", { status: "not-found" }]
    ] as const)("should write exactly one audit entry and opt out of the middleware when %s", async (_label, result) => {
      // Arrange
      vi.mocked(publication.resendPublication).mockResolvedValue(result as publication.ResendResult);

      // Act
      await postHandler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(systemAdmin.recordBlobExplorerResend).toHaveBeenCalledTimes(1);
      expect(systemAdmin.recordBlobExplorerResend).toHaveBeenCalledWith(USER, ARTEFACT_ID, "courtel", result);
      expect(mockRequest.auditMetadata).toEqual({ shouldLog: false });
    });
  });
});
