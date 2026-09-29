import { describe, expect, it } from "vitest";
import { extractNotifyError } from "./notify-error.js";

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
