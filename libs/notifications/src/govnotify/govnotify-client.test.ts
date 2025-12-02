import { beforeEach, describe, expect, it, vi } from "vitest";

// Set environment variables BEFORE any imports
process.env.GOVUK_NOTIFY_API_KEY = "test-api-key";
process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION = "test-template-id";
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
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBe("notification-123");
    expect(mockSendEmail).toHaveBeenCalledWith("test-template-id", "user@example.com", {
      personalisation: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });
  });

  it("should handle errors and return failure result", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    mockSendEmail.mockRejectedValue(new Error("API Error"));

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("GOV.UK Notify error: API Error");
    expect(result.notificationId).toBeUndefined();
  });

  it("should retry on failure and succeed", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    // Fail once, succeed on retry (with default NOTIFICATION_RETRY_ATTEMPTS=1)
    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce({
      data: {
        id: "notification-456"
      }
    });

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBe("notification-456");
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should fail after exhausting all retries", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    // Fail consistently (more failures than retry attempts)
    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockRejectedValueOnce(new Error("Second failure"));

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("GOV.UK Notify error: Second failure");
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should handle non-Error exceptions", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    mockSendEmail.mockRejectedValue("String error");

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("GOV.UK Notify error: String error");
    expect(result.notificationId).toBeUndefined();
  });

  it("should implement exponential backoff in retry logic", async () => {
    const { sendEmail } = await import("./govnotify-client.js");

    // Mock setTimeout to track delay values
    const originalSetTimeout = global.setTimeout;
    const delays: number[] = [];
    vi.spyOn(global, "setTimeout").mockImplementation((callback: any, delay?: number) => {
      if (delay !== undefined) {
        delays.push(delay);
      }
      return originalSetTimeout(callback, 0) as any;
    });

    // Fail once, succeed on retry
    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce({
      data: {
        id: "notification-789"
      }
    });

    const result = await sendEmail({
      emailAddress: "user@example.com",
      templateParameters: {
        locations: "Test Court",
        ListType: "Daily Cause List",
        content_date: "1 December 2024",
        start_page_link: "https://www.court-tribunal-hearings.service.gov.uk",
        subscription_page_link: "https://www.court-tribunal-hearings.service.gov.uk"
      }
    });

    expect(result.success).toBe(true);
    expect(delays.length).toBeGreaterThan(0);
    expect(delays[0]).toBe(1000); // Default NOTIFICATION_RETRY_DELAY_MS

    vi.restoreAllMocks();
  });
});
