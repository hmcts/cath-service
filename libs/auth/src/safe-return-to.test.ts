import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safe-return-to.js";

const FALLBACK = "/account-home";

describe("safeReturnTo", () => {
  it.each(["/account-home", "/sjp-press-list?artefactId=abc-123", "/a?x=a+b%20c#section", "/.//evil.com", "/%2e//evil.com"])(
    "should return the same-origin path %s unchanged",
    (returnTo) => {
      expect(safeReturnTo(returnTo, FALLBACK)).toBe(returnTo);
    }
  );

  it.each(["//evil.com", "//evil.com/x", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", ""])(
    "should return the fallback for the off-site or non-path value %j",
    (returnTo) => {
      expect(safeReturnTo(returnTo, FALLBACK)).toBe(FALLBACK);
    }
  );

  it.each([undefined, null, 42, ["/account-home"]])("should return the fallback for the non-string value %j", (returnTo) => {
    expect(safeReturnTo(returnTo, FALLBACK)).toBe(FALLBACK);
  });
});
