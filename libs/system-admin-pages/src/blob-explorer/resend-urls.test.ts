import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({ RESEND_ACTIONS: ["resubmit", "courtel", "third-party", "email"] }));

const { buildPublicationPageUrl, buildResendButtons, buildResendConfirmUrl, buildResendSuccessUrl } = await import("./resend-urls.js");

const LABELS = {
  resubmit: "Re-submit subscription",
  courtel: "Send to Courtel",
  "third-party": "Send to third party subscribers",
  email: "Send subscription email"
};

describe("resend-urls", () => {
  describe("buildResendButtons", () => {
    it("should build the four buttons in order with the first as primary", () => {
      // Act
      const buttons = buildResendButtons("abc-123", "en", LABELS);

      // Assert
      expect(buttons).toEqual([
        { text: "Re-submit subscription", href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=resubmit", classes: "govuk-button" },
        {
          text: "Send to Courtel",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=courtel",
          classes: "govuk-button govuk-button--secondary"
        },
        {
          text: "Send to third party subscribers",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=third-party",
          classes: "govuk-button govuk-button--secondary"
        },
        {
          text: "Send subscription email",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=email",
          classes: "govuk-button govuk-button--secondary"
        }
      ]);
    });

    it("should keep lng=cy on every href", () => {
      // Act
      const buttons = buildResendButtons("abc-123", "cy", LABELS);

      // Assert
      for (const button of buttons) {
        expect(button.href).toContain("&lng=cy");
      }
    });
  });

  describe("buildResendConfirmUrl", () => {
    it("should encode the artefact ID", () => {
      expect(buildResendConfirmUrl("a&b c", "email", "en")).toBe("/blob-explorer-confirm-resubmission?artefactId=a%26b+c&action=email");
    });
  });

  describe("buildResendSuccessUrl", () => {
    it.each([
      ["en", "/blob-explorer-resubmission-success?action=courtel"],
      ["cy", "/blob-explorer-resubmission-success?action=courtel&lng=cy"]
    ])("should build the success URL for %s", (locale, expected) => {
      expect(buildResendSuccessUrl("courtel", locale)).toBe(expected);
    });
  });

  describe("buildPublicationPageUrl", () => {
    it.each([
      ["json", "en", "/blob-explorer-json-file?artefactId=abc-123"],
      ["flat-file", "en", "/blob-explorer-flat-file?artefactId=abc-123"],
      ["json", "cy", "/blob-explorer-json-file?artefactId=abc-123&lng=cy"]
    ] as const)("should build the %s page URL for %s", (type, locale, expected) => {
      expect(buildPublicationPageUrl("abc-123", type, locale)).toBe(expected);
    });
  });
});
