import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/blob-ingestion", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/blob-ingestion")>("@hmcts/blob-ingestion");
  return {
    ...actual,
    authenticateApi: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next())
  };
});

vi.mock("@hmcts/notifications", () => ({
  sendOtpEmail: vi.fn()
}));

const { API_ROLE, authenticateApi } = await import("@hmcts/blob-ingestion");
const { sendOtpEmail } = await import("@hmcts/notifications");
const { POST } = await import("./otp.js");

// Captured before any beforeEach clears the mock: the middleware is built once, at import.
const authenticateApiCalls = vi.mocked(authenticateApi).mock.calls.map((call) => [...call]);

const OTP = "918273";
const EMAIL = "jane.doe@example.com";
const VALID_BODY = { otp: OTP, email: EMAIL };
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function buildApp() {
  const app = express();
  app.post("/notify/otp", ...POST);
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(599).json({ forwarded: error.message });
  });
  return app;
}

function loggedText(...spies: ReturnType<typeof vi.spyOn>[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

describe("POST /notify/otp middleware", () => {
  it("should parse the body only after authentication", () => {
    // Arrange
    const middlewareNames = POST.map((middleware) => middleware.name);

    // Assert
    expect(middlewareNames[0]).not.toMatch(/Parser$/);
    expect(middlewareNames[1]).toBe("jsonParser");
    expect(middlewareNames[2]).toBe("handleBodyParseError");
  });

  it("should require the B2C app role", () => {
    // Assert
    expect(authenticateApiCalls).toEqual([[API_ROLE.B2C]]);
  });
});

describe("POST /notify/otp", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 200 with the plain-text reference ID when the email is sent", async () => {
    // Arrange
    vi.mocked(sendOtpEmail).mockResolvedValue({ outcome: "SENT", referenceId: "9b1f3c2e-5d4a-4e6b-8c7d-1a2b3c4d5e6f" });

    // Act
    const response = await request(buildApp()).post("/notify/otp").send(VALID_BODY);

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^text\/plain/);
    expect(response.text).toBe("9b1f3c2e-5d4a-4e6b-8c7d-1a2b3c4d5e6f");
    expect(sendOtpEmail).toHaveBeenCalledWith(VALID_BODY);
  });

  it("should return 400 with the validation message when the request is invalid", async () => {
    // Arrange
    vi.mocked(sendOtpEmail).mockResolvedValue({ outcome: "VALIDATION_ERROR", message: "otp must not be empty" });

    // Act
    const response = await request(buildApp()).post("/notify/otp").send({ email: EMAIL });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "otp must not be empty", timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
  });

  it("should return 429 with the rate-limit message when the limit is exceeded", async () => {
    // Arrange
    const message = "Rate limit has been exceeded. B2C OTP email failed to be sent to j*******@example.com";
    vi.mocked(sendOtpEmail).mockResolvedValue({ outcome: "RATE_LIMITED", message });

    // Act
    const response = await request(buildApp()).post("/notify/otp").send(VALID_BODY);

    // Assert
    expect(response.status).toBe(429);
    expect(response.body).toEqual({ message, timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
  });

  it("should return 400 with Notify's message when Notify rejects the send", async () => {
    // Arrange
    vi.mocked(sendOtpEmail).mockResolvedValue({ outcome: "NOTIFY_ERROR", message: "Missing personalisation: otp" });

    // Act
    const response = await request(buildApp()).post("/notify/otp").send(VALID_BODY);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Missing personalisation: otp", timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
  });

  it("should pass an undefined body to the service when the content type is not JSON", async () => {
    // Arrange
    vi.mocked(sendOtpEmail).mockResolvedValue({ outcome: "VALIDATION_ERROR", message: "otp must not be empty, email must be a valid email address" });

    // Act
    const response = await request(buildApp()).post("/notify/otp").type("text/plain").send(`otp=${OTP}`);

    // Assert
    expect(response.status).toBe(400);
    expect(sendOtpEmail).toHaveBeenCalledWith(undefined);
  });

  it("should return a generic 500 without logging the error message, OTP or email when the service throws", async () => {
    // Arrange
    vi.mocked(sendOtpEmail).mockRejectedValue(Object.assign(new Error(`connect ECONNREFUSED for ${EMAIL}`), { code: "ECONNREFUSED" }));

    // Act
    const response = await request(buildApp()).post("/notify/otp").send(VALID_BODY);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal server error", timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
    expect(errorSpy).toHaveBeenCalledWith("Unexpected error in OTP endpoint:", { name: "Error", code: "ECONNREFUSED" });
    const logged = loggedText(errorSpy, infoSpy, logSpy);
    expect(logged).not.toContain("ECONNREFUSED for");
    expect(logged).not.toContain(OTP);
    expect(logged).not.toContain(EMAIL);
  });

  describe("body parse errors", () => {
    it("should return 400 without logging the body when the JSON is malformed", async () => {
      // Act
      const response = await request(buildApp()).post("/notify/otp").type("application/json").send(`{"otp":"${OTP}","email":"${EMAIL}"`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Malformed JSON request body", timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
      expect(sendOtpEmail).not.toHaveBeenCalled();
      const logged = loggedText(errorSpy, infoSpy, logSpy);
      expect(logged).not.toContain(OTP);
      expect(logged).not.toContain(EMAIL);
    });

    it("should return 413 without logging the body when it exceeds 10kb", async () => {
      // Arrange
      const body = { otp: OTP, email: EMAIL, padding: "x".repeat(11 * 1024) };

      // Act
      const response = await request(buildApp()).post("/notify/otp").send(body);

      // Assert
      expect(response.status).toBe(413);
      expect(response.body).toEqual({ message: "Request body too large", timestamp: expect.stringMatching(TIMESTAMP_PATTERN) });
      expect(sendOtpEmail).not.toHaveBeenCalled();
      const logged = loggedText(errorSpy, infoSpy, logSpy);
      expect(logged).not.toContain(OTP);
      expect(logged).not.toContain(EMAIL);
    });

    it("should forward other errors to the next error handler", () => {
      // Arrange
      const handleBodyParseError = POST[2] as (error: Error, req: Request, res: Response, next: NextFunction) => void;
      const error = Object.assign(new Error("unsupported charset"), { type: "charset.unsupported" });
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      // Act
      handleBodyParseError(error, {} as Request, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
