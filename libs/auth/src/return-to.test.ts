import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { consumeReturnTo } from "./return-to.js";

const FALLBACK = "/account-home";

function buildRequest(returnTo: unknown): Request {
  return { session: { returnTo } } as unknown as Request;
}

describe("consumeReturnTo", () => {
  it.each(["/account-home", "/sjp-press-list?artefactId=abc-123", "/a?x=a+b%20c#section", "/a/./b", "/a/../b"])(
    "should return the same-origin path %s unchanged",
    (returnTo) => {
      expect(consumeReturnTo(buildRequest(returnTo), FALLBACK)).toBe(returnTo);
    }
  );

  it.each([
    "//evil.com",
    "//evil.com/x",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/.//evil.com",
    "/%2e//evil.com",
    "/a/..//evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    ""
  ])("should return the fallback for the unsafe value %j", (returnTo) => {
    expect(consumeReturnTo(buildRequest(returnTo), FALLBACK)).toBe(FALLBACK);
  });

  it.each([undefined, null, 42, ["/account-home"]])("should return the fallback for the non-string value %j", (returnTo) => {
    expect(consumeReturnTo(buildRequest(returnTo), FALLBACK)).toBe(FALLBACK);
  });

  it.each(["/account-home", "//evil.com", undefined])("should clear returnTo from the session for %j", (returnTo) => {
    const req = buildRequest(returnTo);

    consumeReturnTo(req, FALLBACK);

    expect(req.session.returnTo).toBeUndefined();
  });
});
