import { describe, expect, it } from "vitest";
import { parseResendAction, RESEND_ACTIONS } from "./resend-action.js";

describe("resend-action", () => {
  it("should list the actions in the order the buttons are shown", () => {
    expect(RESEND_ACTIONS).toEqual(["resubmit", "courtel", "third-party", "email"]);
  });

  it.each(["resubmit", "courtel", "third-party", "email"])("should accept %s", (action) => {
    expect(parseResendAction(action)).toBe(action);
  });

  it.each([undefined, null, "", "COURTEL", "delete", 1, ["email"]])("should reject %s", (value) => {
    expect(parseResendAction(value)).toBeNull();
  });
});
