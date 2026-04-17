import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variables before importing the module
process.env.GOVUK_NOTIFY_TEST_API_KEY = "test-api-key-12345";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL = "test-template-id-approval";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_REJECTION = "test-template-id-rejection";

// Mock the NotifyClient
const mockSendEmail = vi.fn();

class MockNotifyClient {
  sendEmail = mockSendEmail;
}

vi.mock("notifications-node-client", () => ({
  NotifyClient: MockNotifyClient
}));

// Import after mocking
const { sendMediaApprovalEmail, sendMediaRejectionEmail } = await import("./govuk-notify-service.js");

describe("GOV Notify Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendMediaApprovalEmail", () => {
    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_TEST_API_KEY;
      delete process.env.GOVUK_NOTIFY_TEST_API_KEY;

      const testData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC"
      };

      // Re-import to pick up the changed environment variable
      vi.resetModules();
      const { sendMediaApprovalEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc(testData)).rejects.toThrow("GOV Notify API key not configured");

      process.env.GOVUK_NOTIFY_TEST_API_KEY = originalApiKey;
    });

    it("should throw error when approval template ID not configured", async () => {
      const originalTemplateId = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL;
      delete process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL;

      const testData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC"
      };

      // Re-import to pick up the changed environment variable
      vi.resetModules();
      const { sendMediaApprovalEmail: testFunc } = await import("./govuk-notify-service.js");

      await expect(testFunc(testData)).rejects.toThrow("GOV Notify approval template ID not configured");

      process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPROVAL = originalTemplateId;
    });

    it("should send email with correct parameters", async () => {
      mockSendEmail.mockResolvedValue({
        data: {
          id: "test-notification-id",
          reference: "media-approval-123",
          uri: "https://api.notifications.service.gov.uk/v2/notifications/test-notification-id",
          template: {
            id: "test-template-id",
            version: 1,
            uri: "https://api.notifications.service.gov.uk/v2/template/test-template-id"
          },
          content: {
            subject: "Media Account Approved",
            body: "Your account has been approved",
            from_email: "noreply@notifications.service.gov.uk"
          }
        }
      });

      const testData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC"
      };

      await sendMediaApprovalEmail(testData);

      expect(mockSendEmail).toHaveBeenCalledWith("test-template-id-approval", "john@example.com", {
        personalisation: {
          "full name": "John Smith",
          Employer: "BBC"
        },
        reference: expect.stringContaining("media-approval-")
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
                message: "Missing personalisation: name"
              }
            ],
            status_code: 400
          }
        },
        message: "Bad Request"
      };

      mockSendEmail.mockRejectedValue(apiError);

      const testData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC"
      };

      await expect(sendMediaApprovalEmail(testData)).rejects.toMatchObject({
        message: "Bad Request"
      });
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockSendEmail.mockRejectedValue(networkError);

      const testData = {
        name: "John Smith",
        email: "john@example.com",
        employer: "BBC"
      };

      await expect(sendMediaApprovalEmail(testData)).rejects.toThrow("Network timeout");
    });
  });

  describe("sendMediaRejectionEmail", () => {
    it("should throw error when API key not configured", async () => {
      const originalApiKey = process.env.GOVUK_NOTIFY_TEST_API_KEY;
      delete process.env.GOVUK_NOTIFY_TEST_API_KEY;

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

      process.env.GOVUK_NOTIFY_TEST_API_KEY = originalApiKey;
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
});
