import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.GOVUK_NOTIFY_API_KEY = "test-api-key";

const { mockSendNotifyEmail } = vi.hoisted(() => ({ mockSendNotifyEmail: vi.fn() }));

vi.mock("@hmcts/govuk-notify", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/govuk-notify")>("@hmcts/govuk-notify");
  return { ...actual, sendNotifyEmail: mockSendNotifyEmail };
});

const { GOVUK_NOTIFY_TEMPLATE_ID_OTP } = await import("@hmcts/govuk-notify");
const { sendOtpEmail } = await import("./otp-email-service.js");

const OTP = "918273";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMAIL = "jane.doe@example.com";
const RATE_LIMIT_MESSAGE = "Rate limit has been exceeded. B2C OTP email failed to be sent to j*******@example.com";

function rateLimitError(): Error {
  const error = new Error(RATE_LIMIT_MESSAGE);
  error.name = "EmailRateLimitError";
  return error;
}

function notifyHttpError(): Error {
  return Object.assign(new Error("Request failed with status code 400"), {
    response: { status: 400, data: { errors: [{ error: "BadRequestError", message: "Missing personalisation: otp" }] } }
  });
}

function loggedText(...spies: ReturnType<typeof vi.spyOn>[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

describe("sendOtpEmail", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendNotifyEmail.mockResolvedValue({ notificationId: "notification-123" });
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when the request is valid", () => {
    it("should send the OTP template with the HIGH limit and return the reference ID", async () => {
      // Arrange
      const request = { otp: OTP, email: `  ${EMAIL} ` };

      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result).toEqual({ outcome: "SENT", referenceId: expect.stringMatching(UUID_PATTERN) });
      expect(mockSendNotifyEmail).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        templateId: GOVUK_NOTIFY_TEMPLATE_ID_OTP,
        emailAddress: EMAIL,
        personalisation: { otp: OTP },
        emailLimit: "HIGH",
        emailDescription: "B2C OTP email",
        reference: result.outcome === "SENT" ? result.referenceId : undefined
      });
    });

    it("should accept a whitespace-only otp, matching pip's @NotEmpty", async () => {
      // Arrange
      const request = { otp: "   ", email: EMAIL };

      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result.outcome).toBe("SENT");
    });

    it.each([
      ["an apostrophe", "o'brien@example.com"],
      ["a plus sign", "jane+otp@example.com"],
      ["other RFC 5322 local-part characters", "j!#$%&*/=?^_`{|}~-@example.com"],
      ["a hyphenated domain", "jane@my-court.example.com"],
      ["a domain without a dot", "jane@localhost"],
      ["non-ASCII characters", "zoë@exämple.com"]
    ])("should accept an email with %s, matching pip's @Email", async (_case, email) => {
      // Act
      const result = await sendOtpEmail({ otp: OTP, email });

      // Assert
      expect(result.outcome).toBe("SENT");
      expect(mockSendNotifyEmail).toHaveBeenCalledWith(expect.objectContaining({ emailAddress: email }));
    });

    it("should ignore unknown fields", async () => {
      // Arrange
      const request = { otp: OTP, email: EMAIL, extra: "ignored" };

      // Act
      await sendOtpEmail(request);

      // Assert
      expect(mockSendNotifyEmail).toHaveBeenCalledWith(expect.objectContaining({ personalisation: { otp: OTP } }));
    });
  });

  describe("when the request is invalid", () => {
    it.each([
      ["otp is missing", { email: EMAIL }, "otp must not be empty"],
      ["otp is empty", { otp: "", email: EMAIL }, "otp must not be empty"],
      ["otp is not a string", { otp: 918273, email: EMAIL }, "otp must not be empty"],
      ["email is missing", { otp: OTP }, "email must be a valid email address"],
      ["email is invalid", { otp: OTP, email: "not-an-email" }, "email must be a valid email address"],
      ["email is not a string", { otp: OTP, email: ["jane@example.com"] }, "email must be a valid email address"]
    ])("should return a validation error and send nothing when %s", async (_case, request, expectedMessage) => {
      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result).toEqual({ outcome: "VALIDATION_ERROR", message: expectedMessage });
      expect(mockSendNotifyEmail).not.toHaveBeenCalled();
    });

    it.each([
      ["has no @", "jane.example.com"],
      ["has an empty local part", "@example.com"],
      ["has an empty domain", "jane@"],
      ["has consecutive dots in the local part", "jane..doe@example.com"],
      ["starts with a dot", ".jane@example.com"],
      ["has a domain ending in a dot", "jane@example.com."],
      ["has a domain label starting with a hyphen", "jane@-example.com"],
      ["contains a space", "jane doe@example.com"],
      ["has a local part longer than 64 characters", `${"a".repeat(65)}@example.com`]
    ])("should reject an email that %s, matching pip's @Email", async (_case, email) => {
      // Act
      const result = await sendOtpEmail({ otp: OTP, email });

      // Assert
      expect(result).toEqual({ outcome: "VALIDATION_ERROR", message: "email must be a valid email address" });
      expect(mockSendNotifyEmail).not.toHaveBeenCalled();
    });

    it("should report both fields in one validation error when both are invalid", async () => {
      // Arrange
      const request = { otp: "", email: "bad" };

      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result).toEqual({ outcome: "VALIDATION_ERROR", message: "otp must not be empty, email must be a valid email address" });
      expect(mockSendNotifyEmail).not.toHaveBeenCalled();
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["an array", [{ otp: OTP, email: EMAIL }]],
      ["a string", "otp=123456"]
    ])("should return a validation error when the body is %s", async (_case, request) => {
      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result).toEqual({ outcome: "VALIDATION_ERROR", message: "otp must not be empty, email must be a valid email address" });
      expect(mockSendNotifyEmail).not.toHaveBeenCalled();
    });

    it("should not echo the submitted values in the validation message", async () => {
      // Arrange
      const request = { otp: 918273, email: "secret-address-without-at" };

      // Act
      const result = await sendOtpEmail(request);

      // Assert
      expect(result.outcome).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(result)).not.toContain("918273");
      expect(JSON.stringify(result)).not.toContain("secret-address-without-at");
    });
  });

  describe("when sending fails", () => {
    it("should return RATE_LIMITED with the masked-email message when the limit is exceeded", async () => {
      // Arrange
      mockSendNotifyEmail.mockRejectedValue(rateLimitError());

      // Act
      const result = await sendOtpEmail({ otp: OTP, email: EMAIL });

      // Assert
      expect(result).toEqual({ outcome: "RATE_LIMITED", message: RATE_LIMIT_MESSAGE });
    });

    it("should return NOTIFY_ERROR with Notify's message when Notify rejects the send", async () => {
      // Arrange
      mockSendNotifyEmail.mockRejectedValue(notifyHttpError());

      // Act
      const result = await sendOtpEmail({ otp: OTP, email: EMAIL });

      // Assert
      expect(result).toEqual({ outcome: "NOTIFY_ERROR", message: "Missing personalisation: otp" });
    });

    it("should rethrow errors that are neither rate-limit nor Notify HTTP errors", async () => {
      // Arrange
      const infrastructureError = new Error("connect ECONNREFUSED 127.0.0.1:6379");
      mockSendNotifyEmail.mockRejectedValue(infrastructureError);

      // Act
      const result = sendOtpEmail({ otp: OTP, email: EMAIL });

      // Assert
      await expect(result).rejects.toBe(infrastructureError);
    });
  });

  describe("logging", () => {
    it.each([
      ["the send succeeds", () => mockSendNotifyEmail.mockResolvedValue({ notificationId: "notification-123" })],
      ["the rate limit is exceeded", () => mockSendNotifyEmail.mockRejectedValue(rateLimitError())],
      ["Notify rejects the send", () => mockSendNotifyEmail.mockRejectedValue(notifyHttpError())]
    ])("should not log the OTP or the email address when %s", async (_case, arrangeSend) => {
      // Arrange
      arrangeSend();

      // Act
      await sendOtpEmail({ otp: OTP, email: EMAIL });

      // Assert
      const logged = loggedText(infoSpy, errorSpy, logSpy, warnSpy);
      expect(logged).not.toContain(OTP);
      expect(logged).not.toContain(EMAIL);
    });

    it("should not log the OTP or the email address when validation fails", async () => {
      // Act
      await sendOtpEmail({ otp: OTP, email: "jane.doe@" });

      // Assert
      const logged = loggedText(infoSpy, errorSpy, logSpy, warnSpy);
      expect(logged).not.toContain(OTP);
      expect(logged).not.toContain("jane.doe");
    });
  });
});
