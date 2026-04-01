import { describe, expect, it } from "vitest";
import { TooManyEmailsException } from "./too-many-emails-exception.js";

describe("TooManyEmailsException", () => {
  it("should be an instance of Error", () => {
    const exception = new TooManyEmailsException("t***@example.com", "MEDIA_APPROVAL");
    expect(exception instanceof Error).toBe(true);
  });

  it("should have name set to TooManyEmailsException", () => {
    const exception = new TooManyEmailsException("t***@example.com", "MEDIA_APPROVAL");
    expect(exception.name).toBe("TooManyEmailsException");
  });

  it("should format the message with emailType and maskedEmail", () => {
    const exception = new TooManyEmailsException("t***@example.com", "MEDIA_APPROVAL");
    expect(exception.message).toBe("Rate limit exceeded for MEDIA_APPROVAL emails to t***@example.com");
  });
});
