import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSendEmail = vi.fn();
const mockPrepareUpload = vi.fn();

class MockNotifyClient {
  sendEmail = mockSendEmail;
  prepareUpload = mockPrepareUpload;
}

vi.mock("notifications-node-client", () => ({
  NotifyClient: MockNotifyClient
}));

const { sendMediaApplicationReportEmail } = await import("./media-application-report-email.js");

const TEMPLATE_ID = "c59c90a3-1806-4649-b4b5-b6bce8f8f72c";
const RECIPIENT = "team@example.com";
const REPORT_DATE = new Date("2026-10-19T00:00:00Z");
const PREPARED_UPLOAD = {
  file: "Y3N2",
  filename: "media-application-report-2026-10-19.csv",
  confirm_email_before_download: false,
  retention_period: "78 weeks"
};
const ENV_KEYS = ["GOVUK_NOTIFY_API_KEY", "GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT", "MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL", "ENV_NAME"];

function buildData(csvBuffer = Buffer.from("csv", "utf8")) {
  return { csvBuffer, reportDate: REPORT_DATE, applicationCount: 3 };
}

describe("sendMediaApplicationReportEmail", () => {
  const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.env.GOVUK_NOTIFY_API_KEY = "test-api-key";
    process.env.GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT = TEMPLATE_ID;
    process.env.MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL = RECIPIENT;
    process.env.ENV_NAME = "aat";
    mockPrepareUpload.mockReturnValue(PREPARED_UPLOAD);
    mockSendEmail.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("should send the report to the recipient using the report template", async () => {
    // Arrange
    const data = buildData();

    // Act
    await sendMediaApplicationReportEmail(data);

    // Assert
    expect(mockSendEmail).toHaveBeenCalledWith(TEMPLATE_ID, RECIPIENT, {
      personalisation: { link_to_file: PREPARED_UPLOAD, env_name: "AAT" },
      reference: `media-application-report-${REPORT_DATE.getTime()}`
    });
  });

  it("should prepare the upload as a CSV with 78 weeks retention and no email confirmation", async () => {
    // Arrange
    const data = buildData();

    // Act
    await sendMediaApplicationReportEmail(data);

    // Assert
    expect(mockPrepareUpload).toHaveBeenCalledWith(data.csvBuffer, {
      filename: "media-application-report-2026-10-19.csv",
      confirmEmailBeforeDownload: false,
      retentionPeriod: "78 weeks"
    });
  });

  it.each([
    ["prod", "Production"],
    ["aat", "AAT"],
    ["demo", "Demo"],
    ["perftest", "Perftest"],
    ["ithc", "ithc"]
  ])("should map ENV_NAME %s to %s", async (envName, expected) => {
    // Arrange
    process.env.ENV_NAME = envName;

    // Act
    await sendMediaApplicationReportEmail(buildData());

    // Assert
    expect(mockSendEmail.mock.calls[0][2].personalisation.env_name).toBe(expected);
  });

  it("should use Local when ENV_NAME is not set", async () => {
    // Arrange
    delete process.env.ENV_NAME;

    // Act
    await sendMediaApplicationReportEmail(buildData());

    // Assert
    expect(mockSendEmail.mock.calls[0][2].personalisation.env_name).toBe("Local");
  });

  it.each(["GOVUK_NOTIFY_API_KEY", "GOVUK_NOTIFY_TEMPLATE_ID_MEDIA_APPLICATION_REPORT", "MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL"])(
    "should throw when %s is not set",
    async (key) => {
      // Arrange
      delete process.env[key];

      // Act & Assert
      await expect(sendMediaApplicationReportEmail(buildData())).rejects.toThrow(`${key} environment variable is not set`);
      expect(mockSendEmail).not.toHaveBeenCalled();
    }
  );

  it("should throw when the recipient is not a valid email address", async () => {
    // Arrange
    process.env.MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL = "not-an-email";

    // Act & Assert
    await expect(sendMediaApplicationReportEmail(buildData())).rejects.toThrow("MEDIA_APPLICATION_REPORT_RECIPIENT_EMAIL is not a valid email address");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should throw before calling Notify when the CSV exceeds 2MB", async () => {
    // Arrange
    const data = buildData(Buffer.alloc(2 * 1024 * 1024 + 1));

    // Act & Assert
    await expect(sendMediaApplicationReportEmail(data)).rejects.toThrow("Media application report CSV exceeds the 2MB GOV.UK Notify limit");
    expect(mockPrepareUpload).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should wrap Notify API errors with the GOV.UK Notify prefix", async () => {
    // Arrange
    mockSendEmail.mockRejectedValue({
      response: { status: 400, data: { errors: [{ error: "BadRequestError", message: "Missing personalisation: link_to_file" }] } }
    });

    // Act & Assert
    await expect(sendMediaApplicationReportEmail(buildData())).rejects.toThrow("GOV.UK Notify error: Missing personalisation: link_to_file");
  });

  it("should wrap upload preparation errors with the GOV.UK Notify prefix", async () => {
    // Arrange
    mockPrepareUpload.mockImplementation(() => {
      throw new Error("File is larger than 2MB");
    });

    // Act & Assert
    await expect(sendMediaApplicationReportEmail(buildData())).rejects.toThrow("GOV.UK Notify error: File is larger than 2MB");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
