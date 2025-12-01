import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variables BEFORE any imports
process.env.GOVNOTIFY_API_KEY = "test-api-key";
process.env.GOVNOTIFY_TEMPLATE_ID = "test-template-id";
process.env.CATH_SERVICE_URL = "https://www.court-tribunal-hearings.service.gov.uk";

const mockSendEmail = vi.fn();

vi.mock("notifications-node-client", () => ({
  NotifyClient: vi.fn(function NotifyClient() {
    return {
      sendEmail: mockSendEmail
    };
  })
}));

describe("govnotify-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSendEmail.mockResolvedValue({
      data: {
        id: "notification-123"
      }
    });
  });

  it("should send email successfully", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        user_name: "Test User",
        hearing_list_name: "Daily Cause List",
        publication_date: "1 December 2024",
        location_name: "Test Court",
        manage_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBe("notification-123");
    expect(mockSendEmail).toHaveBeenCalledWith("test-template-id", "user@example.com", {
      personalisation: {
        user_name: "Test User",
        hearing_list_name: "Daily Cause List",
        publication_date: "1 December 2024",
        location_name: "Test Court",
        manage_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });
  });
});
