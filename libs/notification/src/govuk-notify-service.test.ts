import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variables before importing the module
process.env.GOVUK_NOTIFY_API_KEY = "test-api-key-12345";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION = "test-template-id-rejection";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT = "test-template-id-new-account";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER = "test-template-id-existing-user";

// Mock the NotifyClient
const mockSendEmail = vi.fn();

class MockNotifyClient {
  sendEmail = mockSendEmail;
}

vi.mock("notifications-node-client", () => ({
  NotifyClient: MockNotifyClient
}));

// Import after mocking
const { extractNotifyError, sendMediaExistingUserEmail, sendMediaNewAccountEmail, sendMediaRejectionEmail } = await import("./govuk-notify-service.js");

describe("extractNotifyError", () => {
  it("should extract status and message from a Notify API error", () => {
    const error = {
      response: {
        status: 400,
        data: {
          errors: [{ error: "BadRequestError", message: "Missing personalisation: name" }],
          status_code: 400
        }
      },
      message: "Bad Request"
    };

    expect(extractNotifyError(error)).toEqual({ status: 400, message: "Missing personalisation: name" });
  });

  it("should fall back to top-level message when response data is missing", () => {
    const error = new Error("Network timeout");

    expect(extractNotifyError(error)).toEqual({ status: 0, message: "Network timeout" });
  });

  it("should return defaults for an unknown error shape", () => {
    expect(extractNotifyError({})).toEqual({ status: 0, message: "Unknown error" });
  });
});

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

    it("should throw error when rejection template ID not configured", async () => {
      const originalTemplateId = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION;
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION;

      const testData = {
        fullName: "John Smith",
        email: "john@example.com",
        rejectReasons: "The applicant is not an accredited member of the media.",
        linkToService: "https://example.com"
      };

      // Re-import to pick up the changed environment variable
      vi.resetModules();
      const { sendMediaRejectionEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc(testData)).rejects.toThrow("GOV Notify rejection template ID not configured");

      process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION = originalTemplateId;
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

      expect(mockSendEmail).toHaveBeenCalledWith("test-template-id-rejection", "john@example.com", {
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

      await sendMediaNewAccountEmail({
        email: "test@example.com",
        fullName: "Test Reporter",
        signInPageLink: "https://example.com/sign-in"
      });

      expect(mockSendEmail).toHaveBeenCalledWith("test-template-id-new-account", "test@example.com", {
        personalisation: {
          full_name: "Test Reporter",
          "forgot password process link": "https://example.com/sign-in"
        },
        reference: expect.stringContaining("media-new-account-")
      });
    });

    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_API_KEY;
      delete process.env.GOVUK_NOTIFY_API_KEY;

      vi.resetModules();
      const { sendMediaNewAccountEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test", signInPageLink: "https://example.com" })).rejects.toThrow(
        "GOV Notify API key not configured"
      );

      process.env.GOVUK_NOTIFY_API_KEY = originalApiKey;
    });

    it("should throw error when new account template ID not configured", async () => {
      const originalTemplateId = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT;
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT;

      vi.resetModules();
      const { sendMediaNewAccountEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test", signInPageLink: "https://example.com" })).rejects.toThrow(
        "GOV Notify new account template ID not configured"
      );

      process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_NEW_ACCOUNT = originalTemplateId;
    });
  });

  describe("sendMediaExistingUserEmail", () => {
    it("should send email with correct template ID and personalisation", async () => {
      mockSendEmail.mockResolvedValue({ data: { id: "notification-id" } });

      await sendMediaExistingUserEmail({
        email: "test@example.com",
        fullName: "Existing Reporter",
        signInPageLink: "https://example.com/sign-in"
      });

      expect(mockSendEmail).toHaveBeenCalledWith("test-template-id-existing-user", "test@example.com", {
        personalisation: {
          "Full name": "Existing Reporter",
          "sign in page link": "https://example.com/sign-in"
        },
        reference: expect.stringContaining("media-existing-user-")
      });
    });

    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_API_KEY;
      delete process.env.GOVUK_NOTIFY_API_KEY;

      vi.resetModules();
      const { sendMediaExistingUserEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test", signInPageLink: "https://example.com" })).rejects.toThrow(
        "GOV Notify API key not configured"
      );

      process.env.GOVUK_NOTIFY_API_KEY = originalApiKey;
    });

    it("should throw error when existing user template ID not configured", async () => {
      const originalTemplateId = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER;
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER;

      vi.resetModules();
      const { sendMediaExistingUserEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc({ email: "test@example.com", fullName: "Test", signInPageLink: "https://example.com" })).rejects.toThrow(
        "GOV Notify existing user template ID not configured"
      );

      process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_EXISTING_USER = originalTemplateId;
    });
  });
});
