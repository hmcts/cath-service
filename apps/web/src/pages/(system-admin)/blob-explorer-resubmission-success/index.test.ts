import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

vi.mock("@hmcts/publication", () => ({
  parseResendAction: (value: unknown) => (typeof value === "string" && ["resubmit", "courtel", "third-party", "email"].includes(value) ? value : null)
}));

const { GET } = await import("./index.js");

const TEMPLATE = "blob-explorer-resubmission-success/index";

describe("blob-explorer-resubmission-success page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: { action: "resubmit" }
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it.each([
      ["resubmit", "Submission re-submitted"],
      ["courtel", "Publication sent to Courtel"],
      ["third-party", "Publication sent to third party subscribers"],
      ["email", "Subscription email sent"]
    ])("should render the %s panel heading", async (action, header) => {
      // Arrange
      mockRequest.query = { action };

      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(TEMPLATE, expect.objectContaining({ header, title: header, locale: "en" }));
    });

    it("should render Welsh content when lng=cy", async () => {
      // Arrange
      mockRequest.query = { action: "courtel", lng: "cy" };

      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        TEMPLATE,
        expect.objectContaining({ header: cy.actions.courtel.header, successNextSteps: cy.successNextSteps, locale: "cy" })
      );
    });

    it("should not pass the per-action map to the template", async () => {
      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const options = vi.mocked(mockResponse.render).mock.calls[0][1] as unknown as Record<string, unknown>;
      expect(options.actions).toBeUndefined();
      expect(options.successLinkToLocations).toBe(en.successLinkToLocations);
    });

    it.each([
      ["missing", {}],
      ["unknown", { action: "delete" }]
    ])("should redirect to blob-explorer-locations when the action is %s", async (_label, query) => {
      // Arrange
      mockRequest.query = query;

      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
      expect(mockResponse.render).not.toHaveBeenCalled();
    });
  });
});
