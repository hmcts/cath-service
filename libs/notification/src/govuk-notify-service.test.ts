import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variables before importing the module
process.env.GOVUK_NOTIFY_API_KEY = "test-api-key-12345";
process.env.MEDIA_PASSWORD_RESET_LINK = "https://example.com/reset";
process.env.MEDIA_SIGN_IN_LINK = "https://example.com/sign-in";
// Mock the NotifyClient
const mockSendEmail = vi.fn();

class MockNotifyClient {
  sendEmail = mockSendEmail;
}

vi.mock("notifications-node-client", () => ({
  NotifyClient: MockNotifyClient
}));

// Import after mocking
const { sendMediaDuplicateAccountEmail, sendMediaNewAccountEmail, sendMediaRejectionEmail } = await import("./govuk-notify-service.js");

describe("GOV Notify Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMediaRejectionEmail", () => {
    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_API_KEY;
      delete process.env.GOVUK_NOTIFY_API_KEY;

      const testData = {
        fullName: "John Smith",
        email: "john@example.com",
        rejectReasons: "The applicant is not an accredited member of the media.",
        linkToService: "https://example.com"
      };

      // Re-import to pick up the changed environment variable
      vi.resetModules();
      const { sendMediaRejectionEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc(testData)).rejects.toThrow("GOV Notify API key not configured");

      process.env.GOVUK_NOTIFY_API_KEY = originalApiKey;
    });

    it("should send email with correct parameters", async () => {
      mockSendEmail.mockResolvedValue({
        data: {
          id: "test-notification-id",
          reference: "media-rejection-123",
          uri: "https://api.notifications.service.gov.uk/v2/notifications/test-notification-id",
          template: {
            id: "test-template-id-rejection",
            version: 1,
            uri: "https://api.notifications.service.gov.uk/v2/template/test-template-id-rejection"
          },
          content: {
            subject: "Media Account Application Decision",
            body: "Your application has been unsuccessful",
            from_email: "noreply@notifications.service.gov.uk"
          }
        }
      });

      const testData = {
        fullName: "John Smith",
        email: "john@example.com",
        rejectReasons: "The applicant is not an accredited member of the media.\nID provided has expired or is not a Press ID.",
        linkToService: "https://example.com"
      };

      await sendMediaRejectionEmail(testData);

      expect(mockSendEmail).toHaveBeenCalledWith("838be14a-1ca2-408f-a4bc-a8b4d3c7d54d", "john@example.com", {
        personalisation: {
          "full-name": "John Smith",
          "reject-reasons": "The applicant is not an accredited member of the media.\nID provided has expired or is not a Press ID.",
          "link-to-service": "https://example.com"
        },
        reference: expect.stringContaining("media-rejection-")
      });
    });

    it("should rethrow API errors", async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                error: "BadRequestError",
                message: "Missing personalisation: full-name"
              }
            ],
            status_code: 400
          }
        },
        message: "Bad Request"
      };

      mockSendEmail.mockRejectedValue(apiError);

      const testData = {
        fullName: "John Smith",
        email: "john@example.com",
        rejectReasons: "The applicant is not an accredited member of the media.",
        linkToService: "https://example.com"
      };

      await expect(sendMediaRejectionEmail(testData)).rejects.toMatchObject({
        message: "Bad Request"
      });
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockSendEmail.mockRejectedValue(networkError);

      const testData = {
        fullName: "John Smith",
        email: "john@example.com",
        rejectReasons: "The applicant is not an accredited member of the media.",
        linkToService: "https://example.com"
      };

      await expect(sendMediaRejectionEmail(testData)).rejects.toThrow("Network timeout");
    });
  });

  describe("sendMediaNewAccountEmail", () => {
    it("should send email with correct template ID and personalisation", async () => {
      mockSendEmail.mockResolvedValue({ data: { id: "notification-id" } });

      await sendMediaNewAccountEmail({ email: "test@example.com", fullName: "Test Reporter" });

      expect(mockSendEmail).toHaveBeenCalledWith("91d93e44-0ad8-4782-8ef0-fb1cad0c641f", "test@example.com", {
        personalisation: {
          full_name: "Test Reporter",
          "forgot password process link": "https://example.com/reset"
        },
        reference: expect.stringContaining("media-new-account-")
      });
    });

    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_API_KEY;
      delete process.env.GOVUK_NOTIFY_API_KEY;

      vi.resetModules();
      const { sendMediaNewAccountEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test" })).rejects.toThrow("GOV Notify API key not configured");

      process.env.GOVUK_NOTIFY_API_KEY = originalApiKey;
    });

    it("should throw error when MEDIA_PASSWORD_RESET_LINK not configured", async () => {
      const original = process.env.MEDIA_PASSWORD_RESET_LINK;
      delete process.env.MEDIA_PASSWORD_RESET_LINK;

      vi.resetModules();
      const { sendMediaNewAccountEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test" })).rejects.toThrow(
        "MEDIA_PASSWORD_RESET_LINK environment variable is not configured"
      );

      process.env.MEDIA_PASSWORD_RESET_LINK = original;
    });
  });

  describe("sendMediaDuplicateAccountEmail", () => {
    it("should send email with correct template ID and personalisation", async () => {
      mockSendEmail.mockResolvedValue({ data: { id: "notification-id" } });

      await sendMediaDuplicateAccountEmail({ email: "test@example.com", fullName: "Test Reporter" });

      expect(mockSendEmail).toHaveBeenCalledWith("2b4ccd66-2b04-4d27-94e5-b7372f58be08", "test@example.com", {
        personalisation: {
          "Full name": "Test Reporter",
          "sign in page link": "https://example.com/sign-in"
        },
        reference: expect.stringContaining("media-duplicate-account-")
      });
    });

    it("should throw error when MEDIA_SIGN_IN_LINK not configured", async () => {
      const original = process.env.MEDIA_SIGN_IN_LINK;
      delete process.env.MEDIA_SIGN_IN_LINK;

      vi.resetModules();
      const { sendMediaDuplicateAccountEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test" })).rejects.toThrow("MEDIA_SIGN_IN_LINK environment variable is not configured");

      process.env.MEDIA_SIGN_IN_LINK = original;
    });
  });
});
