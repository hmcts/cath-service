import { describe, expect, it } from "vitest";
import { extractNotifyError, isInvalidEmailAddressError } from "./notify-error.js";

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

  it("should join multiple API error messages", () => {
    const error = {
      response: {
        status: 400,
        data: {
          errors: [
            { error: "BadRequestError", message: "Missing personalisation: name" },
            { error: "BadRequestError", message: "Missing personalisation: email" }
          ]
        }
      }
    };

    expect(extractNotifyError(error)).toEqual({ status: 400, message: "Missing personalisation: name, Missing personalisation: email" });
  });

  it("should fall back to top-level message when response data is missing", () => {
    const error = new Error("Network timeout");

    expect(extractNotifyError(error)).toEqual({ status: 0, message: "Network timeout" });
  });

  it("should fall back to the raw string when a non-Error value is thrown", () => {
    expect(extractNotifyError("String error")).toEqual({ status: 0, message: "String error" });
  });

  it("should return defaults for an unknown error shape", () => {
    expect(extractNotifyError({})).toEqual({ status: 0, message: "Unknown error" });
  });
});

describe("isInvalidEmailAddressError", () => {
  function notifyError(status: number, errors: { error: string; message: string }[]) {
    return Object.assign(new Error("Request failed"), { response: { status, data: { errors, status_code: status } } });
  }

  it("should return true when Notify rejects the email address as invalid", () => {
    const error = notifyError(400, [{ error: "ValidationError", message: "email_address Not a valid email address" }]);

    expect(isInvalidEmailAddressError(error)).toBe(true);
  });

  it.each([
    { name: "missing personalisation", error: notifyError(400, [{ error: "BadRequestError", message: "Missing personalisation: full-name" }]) },
    {
      name: "team-only key",
      error: notifyError(400, [{ error: "BadRequestError", message: "Can't send to this recipient using a team-only API key" }])
    },
    { name: "validation error on another field", error: notifyError(400, [{ error: "ValidationError", message: "template_id is not a valid UUID" }]) },
    {
      name: "invalid address alongside another error",
      error: notifyError(400, [
        { error: "ValidationError", message: "email_address Not a valid email address" },
        { error: "BadRequestError", message: "Missing personalisation: full-name" }
      ])
    },
    { name: "400 with no errors", error: notifyError(400, []) },
    { name: "auth error", error: notifyError(403, [{ error: "AuthError", message: "Invalid token: API key not found" }]) },
    { name: "server error", error: notifyError(500, [{ error: "Exception", message: "Internal server error" }]) },
    { name: "network error", error: new Error("Network timeout") },
    { name: "non-object value", error: "String error" },
    { name: "undefined", error: undefined }
  ])("should return false for $name", ({ error }) => {
    expect(isInvalidEmailAddressError(error)).toBe(false);
  });
});
