import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendEmail = vi.fn();
const mockPrepareUpload = vi.fn();

vi.mock("notifications-node-client", () => ({
  NotifyClient: vi.fn(function NotifyClient() {
    return {
      sendEmail: mockSendEmail,
      prepareUpload: mockPrepareUpload
    };
  })
}));

describe("sendNotifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ data: { id: "notification-123" } });
  });

  it("should send an email and return the notification ID", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");

    const result = await sendNotifyEmail({
      apiKey: "test-api-key",
      templateId: "test-template-id",
      emailAddress: "user@example.com",
      personalisation: { name: "Test" }
    });

    expect(result).toEqual({ notificationId: "notification-123" });
    expect(mockSendEmail).toHaveBeenCalledWith("test-template-id", "user@example.com", {
      personalisation: { name: "Test" }
    });
  });

  it("should include the reference when provided", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");

    await sendNotifyEmail({
      apiKey: "test-api-key",
      templateId: "test-template-id",
      emailAddress: "user@example.com",
      personalisation: { name: "Test" },
      reference: "my-reference-123"
    });

    expect(mockSendEmail).toHaveBeenCalledWith("test-template-id", "user@example.com", {
      personalisation: { name: "Test" },
      reference: "my-reference-123"
    });
  });

  it("should throw when the response has no notification ID", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");
    mockSendEmail.mockResolvedValue({ data: {} });

    await expect(
      sendNotifyEmail({
        apiKey: "test-api-key",
        templateId: "test-template-id",
        emailAddress: "user@example.com"
      })
    ).rejects.toThrow("Unable to extract notification ID from GOV.UK Notify response");
  });

  it("should propagate the raw error from the Notify client on failure", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");
    const apiError = new Error("API Error");
    mockSendEmail.mockRejectedValue(apiError);

    await expect(
      sendNotifyEmail({
        apiKey: "test-api-key",
        templateId: "test-template-id",
        emailAddress: "user@example.com"
      })
    ).rejects.toBe(apiError);
  });

  it("should upload a PDF and include link_to_file/pdf_link_to_file when pdfBuffer is provided", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");
    const pdfBuffer = Buffer.from("PDF content");
    mockPrepareUpload.mockReturnValue({ file: "uploaded-file-reference" });

    await sendNotifyEmail({
      apiKey: "test-api-key",
      templateId: "test-template-id",
      emailAddress: "user@example.com",
      pdfBuffer
    });

    expect(mockPrepareUpload).toHaveBeenCalledWith(pdfBuffer, {
      confirmEmailBeforeDownload: false,
      retentionPeriod: "1 week"
    });
    expect(mockSendEmail).toHaveBeenCalledWith(
      "test-template-id",
      "user@example.com",
      expect.objectContaining({
        personalisation: expect.objectContaining({
          link_to_file: { file: "uploaded-file-reference" },
          pdf_link_to_file: { file: "uploaded-file-reference" },
          pdf_link_text: "Download PDF version"
        })
      })
    );
  });

  it("should upload an Excel file and include excel_link_to_file when excelBuffer is provided", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");
    const excelBuffer = Buffer.from("Excel content");
    mockPrepareUpload.mockReturnValue({ file: "uploaded-excel-reference" });

    await sendNotifyEmail({
      apiKey: "test-api-key",
      templateId: "test-template-id",
      emailAddress: "user@example.com",
      excelBuffer
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      "test-template-id",
      "user@example.com",
      expect.objectContaining({
        personalisation: expect.objectContaining({
          excel_link_to_file: { file: "uploaded-excel-reference" },
          excel_link_text: "Download Excel version"
        })
      })
    );
  });

  it("should not upload attachments when no buffers are provided", async () => {
    const { sendNotifyEmail } = await import("./notify-client.js");

    await sendNotifyEmail({
      apiKey: "test-api-key",
      templateId: "test-template-id",
      emailAddress: "user@example.com"
    });

    expect(mockPrepareUpload).not.toHaveBeenCalled();
  });
});

describe("sendNotifyEmailWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retry on failure and succeed", async () => {
    const { sendNotifyEmailWithRetry } = await import("./notify-client.js");

    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce({ data: { id: "notification-456" } });

    const result = await sendNotifyEmailWithRetry(
      { apiKey: "test-api-key", templateId: "test-template-id", emailAddress: "user@example.com" },
      { retryAttempts: 1, retryDelayMs: 1 }
    );

    expect(result).toEqual({ notificationId: "notification-456" });
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should throw the final error after exhausting all retries", async () => {
    const { sendNotifyEmailWithRetry } = await import("./notify-client.js");

    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockRejectedValueOnce(new Error("Second failure"));

    await expect(
      sendNotifyEmailWithRetry(
        { apiKey: "test-api-key", templateId: "test-template-id", emailAddress: "user@example.com" },
        { retryAttempts: 1, retryDelayMs: 1 }
      )
    ).rejects.toThrow("Second failure");
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should implement exponential backoff between retries", async () => {
    const { sendNotifyEmailWithRetry } = await import("./notify-client.js");

    const originalSetTimeout = global.setTimeout;
    const delays: number[] = [];
    vi.spyOn(global, "setTimeout").mockImplementation((callback: any, delay?: number) => {
      if (delay !== undefined) {
        delays.push(delay);
      }
      return originalSetTimeout(callback, 0) as any;
    });

    mockSendEmail.mockRejectedValueOnce(new Error("First failure")).mockResolvedValueOnce({ data: { id: "notification-789" } });

    await sendNotifyEmailWithRetry(
      { apiKey: "test-api-key", templateId: "test-template-id", emailAddress: "user@example.com" },
      { retryAttempts: 1, retryDelayMs: 1000 }
    );

    expect(delays[0]).toBe(1000);

    vi.restoreAllMocks();
  });

  it("should not retry when retryAttempts is 0", async () => {
    const { sendNotifyEmailWithRetry } = await import("./notify-client.js");

    mockSendEmail.mockRejectedValue(new Error("Only failure"));

    await expect(
      sendNotifyEmailWithRetry(
        { apiKey: "test-api-key", templateId: "test-template-id", emailAddress: "user@example.com" },
        { retryAttempts: 0, retryDelayMs: 1 }
      )
    ).rejects.toThrow("Only failure");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});
