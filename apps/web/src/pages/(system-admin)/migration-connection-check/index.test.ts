import { checkPipConnection, getAllowedPipHosts, isPipConnectionCheckConfigured, validatePipUrl } from "@hmcts/pip-api-client";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/pip-api-client", () => ({
  checkPipConnection: vi.fn(),
  getAllowedPipHosts: vi.fn(),
  isPipConnectionCheckConfigured: vi.fn(),
  validatePipUrl: vi.fn()
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  AuditLogAction: { PIP_CONNECTION_CHECK: "PIP connection check" }
}));

const HOST = "pip-data-management.staging.platform.hmcts.net";
const INPUT = `https://${HOST}/locations/111?caseRef=ABC123`;
const TEMPLATE = "migration-connection-check/index";

describe("migration-connection-check page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const getHandler = GET[GET.length - 1];
  const postHandler = POST[POST.length - 1];

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, query: {} };
    res = { render: vi.fn(), locals: { locale: "en" } };
    vi.mocked(getAllowedPipHosts).mockReturnValue([HOST]);
    vi.mocked(isPipConnectionCheckConfigured).mockReturnValue(true);
    vi.mocked(validatePipUrl).mockImplementation((input) => ({ kind: "valid", url: new URL(String(input)) }));
    vi.mocked(checkPipConnection).mockResolvedValue({ kind: "response", status: 200, durationMs: 42 });
  });

  function renderedOptions() {
    return vi.mocked(res.render!).mock.calls[0][1] as Record<string, any>;
  }

  function resultRows() {
    return Object.fromEntries(renderedOptions().connectionResult.rows.map((row: { key: string; value: string }) => [row.key, row.value]));
  }

  it("should require the system admin role on GET and POST", () => {
    // Assert
    expect(GET).toHaveLength(2);
    expect(POST).toHaveLength(2);
  });

  describe("GET", () => {
    it("should render the form with the allowed hosts", async () => {
      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ pageTitle: en.pageTitle, isConfigured: true, allowedHosts: [HOST], data: { url: "" }, lngParam: "" })
      );
    });

    it("should render Welsh content", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ pageTitle: cy.pageTitle, lngParam: "?lng=cy" }));
    });

    it("should render as not configured when no hosts are allowed", async () => {
      // Arrange
      vi.mocked(getAllowedPipHosts).mockReturnValue([]);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().isConfigured).toBe(false);
    });

    it("should render as not configured when the token settings are missing", async () => {
      // Arrange
      vi.mocked(isPipConnectionCheckConfigured).mockReturnValue(false);

      // Act
      await getHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().isConfigured).toBe(false);
    });
  });

  describe("POST", () => {
    it("should not validate or call anything when not configured", async () => {
      // Arrange
      vi.mocked(isPipConnectionCheckConfigured).mockReturnValue(false);
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(validatePipUrl).not.toHaveBeenCalled();
      expect(checkPipConnection).not.toHaveBeenCalled();
      expect(renderedOptions().isConfigured).toBe(false);
      expect(req.auditMetadata).toEqual({ shouldLog: false });
    });

    it.each([
      ["required", en.errorMessages.required],
      ["too-long", en.errorMessages.tooLong],
      ["invalid-format", en.errorMessages.invalidFormat],
      ["host-not-allowed", en.errorMessages.hostNotAllowed]
    ] as const)("should re-render with the %s error, keep the value and not call PIP", async (error, message) => {
      // Arrange
      vi.mocked(validatePipUrl).mockReturnValue({ kind: "invalid", error });
      req.body = { url: "https://example.com/x" };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(checkPipConnection).not.toHaveBeenCalled();
      expect(renderedOptions().errors).toEqual([{ text: message, href: "#url" }]);
      expect(renderedOptions().data).toEqual({ url: "https://example.com/x" });
      expect(req.auditMetadata).toEqual({ action: "PIP connection check" });
    });

    it("should show Welsh validation errors", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      vi.mocked(validatePipUrl).mockReturnValue({ kind: "invalid", error: "required" });

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().errors).toEqual([{ text: cy.errorMessages.required, href: "#url" }]);
    });

    it("should validate the entered URL against the allowed hosts", async () => {
      // Arrange
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(validatePipUrl).toHaveBeenCalledWith(INPUT, [HOST]);
      expect(checkPipConnection).toHaveBeenCalledWith(new URL(INPUT));
    });

    it("should treat a missing body field as an empty URL", async () => {
      // Arrange
      req.body = undefined;
      vi.mocked(validatePipUrl).mockReturnValue({ kind: "invalid", error: "required" });

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(validatePipUrl).toHaveBeenCalledWith("", [HOST]);
    });

    it("should show a connected result with status, time and token rows", async () => {
      // Arrange
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().connectionResult).toMatchObject({ isSuccess: true, title: en.result.succeededTitle });
      expect(resultRows()).toEqual({
        [en.result.urlTested]: INPUT,
        [en.result.outcome]: en.outcomes.connected,
        [en.result.httpStatus]: "200",
        [en.result.responseTime]: "42 ms",
        [en.result.tokenObtained]: en.result.yes
      });
      expect(renderedOptions().data).toEqual({ url: INPUT });
    });

    it.each([
      [204, en.outcomes.connected, true],
      [302, en.outcomes.redirected, false],
      [401, en.outcomes.unauthorised, false],
      [403, en.outcomes.forbidden, false],
      [404, en.outcomes.notFound, false],
      [429, en.outcomes.rateLimited, false],
      [500, en.outcomes.serverError, false],
      [503, en.outcomes.serverError, false],
      [418, en.outcomes.unexpectedStatus, false],
      [100, en.outcomes.unexpectedStatus, false]
    ])("should map status %i to the right result", async (status, message, isSuccess) => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "response", status, durationMs: 5 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().connectionResult.isSuccess).toBe(isSuccess);
      expect(resultRows()[en.result.outcome]).toBe(message);
    });

    it.each([
      [{ kind: "http-status" as const, status: 401 }, `${en.tokenReasons.httpStatus} 401`],
      [{ kind: "invalid-token-response" as const }, en.tokenReasons.invalidTokenResponse],
      [{ kind: "timeout" as const }, en.tokenReasons.timeout],
      [{ kind: "network-error" as const }, en.tokenReasons.connectionFailed],
      [{ kind: "invalid-url" as const }, en.tokenReasons.connectionFailed]
    ])("should show a token failure with reason %o", async (reason, reasonText) => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "token-failure", reason });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(resultRows()).toEqual({
        [en.result.urlTested]: INPUT,
        [en.result.outcome]: en.outcomes.tokenFailure,
        [en.result.reason]: reasonText,
        [en.result.tokenObtained]: en.result.no
      });
    });

    it("should show the error code when the PIP API cannot be reached", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "network-error", code: "ENOTFOUND", durationMs: 12 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(resultRows()).toEqual({
        [en.result.urlTested]: INPUT,
        [en.result.outcome]: en.outcomes.unreachable,
        [en.result.responseTime]: "12 ms",
        [en.result.errorCode]: "ENOTFOUND",
        [en.result.tokenObtained]: en.result.yes
      });
    });

    it("should leave out the error code row when there is none", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "network-error", durationMs: 12 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(resultRows()).not.toHaveProperty(en.result.errorCode);
    });

    it("should show a timeout", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "timeout", durationMs: 30000 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(resultRows()[en.result.outcome]).toBe(en.outcomes.timeout);
      expect(resultRows()[en.result.responseTime]).toBe("30000 ms");
    });

    it("should show not configured without a token row if the check reports it", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "not-configured" });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(resultRows()).toEqual({ [en.result.urlTested]: INPUT, [en.result.outcome]: en.outcomes.notConfigured });
    });

    it("should show the result in Welsh", async () => {
      // Arrange
      res.locals = { locale: "cy" };
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(renderedOptions().connectionResult.title).toBe(cy.result.succeededTitle);
      expect(resultRows()[cy.result.tokenObtained]).toBe(cy.result.yes);
    });

    it("should audit the host, path, result and status, without the query string", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "response", status: 403, durationMs: 9 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "PIP connection check",
        entityInfo: `Host: ${HOST}; Path: /locations/111; Result: forbidden; Status: 403`
      });
      expect(req.auditMetadata?.entityInfo).not.toContain("ABC123");
    });

    it("should audit a failure without a status", async () => {
      // Arrange
      vi.mocked(checkPipConnection).mockResolvedValue({ kind: "timeout", durationMs: 30000 });
      req.body = { url: INPUT };

      // Act
      await postHandler(req as Request, res as Response, vi.fn());

      // Assert
      expect(req.auditMetadata?.entityInfo).toBe(`Host: ${HOST}; Path: /locations/111; Result: timeout`);
    });
  });
});
