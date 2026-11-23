import { beforeEach, describe, expect, it, vi } from "vitest";
import { getB2cBaseUrl, getB2cConfig } from "../config/b2c-config.js";
import { getCftIdamConfig } from "../config/cft-idam-config.js";
import { buildSessionExpiredPath, buildSessionExpiredRedirectUrl, getRedirectType, isRedirectType, RE_SIGN_IN_URLS } from "./expiry-redirect.js";

vi.mock("../config/cft-idam-config.js", () => ({
  getCftIdamConfig: vi.fn()
}));

vi.mock("../config/b2c-config.js", () => ({
  getB2cConfig: vi.fn(),
  getB2cBaseUrl: vi.fn()
}));

const ORIGIN = "https://cath.example.net";

describe("expiry-redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCftIdamConfig).mockReturnValue({
      baseUrl: ORIGIN,
      endSessionEndpoint: "https://idam.example.net/o/endSession"
    } as ReturnType<typeof getCftIdamConfig>);
    vi.mocked(getB2cConfig).mockReturnValue({ policyCath: "B2C_1_SignInUserFlow" } as ReturnType<typeof getB2cConfig>);
    vi.mocked(getB2cBaseUrl).mockReturnValue("https://b2c.example.net/tenant");
  });

  describe("RE_SIGN_IN_URLS", () => {
    it("should map every redirect type to its sign in page", () => {
      expect(RE_SIGN_IN_URLS).toEqual({
        CFT: "/cft-login",
        CRIME: "/crime-login",
        AAD: "/b2c-login",
        SSO: "/login"
      });
    });
  });

  describe("getRedirectType", () => {
    it.each([
      ["PI_AAD", "AAD"],
      ["CRIME_IDAM", "CRIME"],
      ["SSO", "SSO"],
      ["CFT_IDAM", "CFT"],
      ["UNKNOWN", "CFT"],
      [undefined, "CFT"],
      ["", "CFT"]
    ])("should map provenance %s to %s", (provenance, expected) => {
      expect(getRedirectType(provenance)).toBe(expected);
    });
  });

  describe("isRedirectType", () => {
    it.each(["CFT", "CRIME", "AAD", "SSO"])("should accept %s", (value) => {
      expect(isRedirectType(value)).toBe(true);
    });

    it.each([["cft"], ["toString"], ["__proto__"], [""], [undefined], [["CFT"]], [1]])("should reject %j", (value) => {
      expect(isRedirectType(value)).toBe(false);
    });
  });

  describe("buildSessionExpiredPath", () => {
    it("should include the Welsh locale", () => {
      expect(buildSessionExpiredPath("SSO", "cy")).toBe("/session-expired?lng=cy&reSignInUrl=SSO");
    });

    it("should default any other locale to English", () => {
      expect(buildSessionExpiredPath("CRIME", "fr")).toBe("/session-expired?lng=en&reSignInUrl=CRIME");
      expect(buildSessionExpiredPath("CRIME", undefined)).toBe("/session-expired?lng=en&reSignInUrl=CRIME");
    });
  });

  describe("buildSessionExpiredRedirectUrl", () => {
    it("should wrap the expired page in the CFT IDAM endSession URL for CFT_IDAM", () => {
      // Act
      const result = buildSessionExpiredRedirectUrl({ provenance: "CFT_IDAM", locale: "cy", origin: ORIGIN });

      // Assert
      const url = new URL(result);
      expect(`${url.origin}${url.pathname}`).toBe("https://idam.example.net/o/endSession");
      expect(url.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/session-expired?lng=cy&reSignInUrl=CFT`);
    });

    it("should use the B2C logout with an absolute post logout redirect URI for PI_AAD", () => {
      // Act
      const result = buildSessionExpiredRedirectUrl({ provenance: "PI_AAD", locale: "en", origin: ORIGIN });

      // Assert
      const url = new URL(result);
      expect(`${url.origin}${url.pathname}`).toBe("https://b2c.example.net/tenant/oauth2/v2.0/logout");
      expect(url.searchParams.get("p")).toBe("B2C_1_SignInUserFlow");
      expect(url.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/session-expired?lng=en&reSignInUrl=AAD`);
    });

    it("should redirect locally for CRIME_IDAM", () => {
      expect(buildSessionExpiredRedirectUrl({ provenance: "CRIME_IDAM", locale: "en", origin: ORIGIN })).toBe("/session-expired?lng=en&reSignInUrl=CRIME");
    });

    it("should redirect locally for SSO without the Microsoft logout", () => {
      expect(buildSessionExpiredRedirectUrl({ provenance: "SSO", locale: "cy", origin: ORIGIN })).toBe("/session-expired?lng=cy&reSignInUrl=SSO");
    });

    it("should redirect locally to the CFT sign in for an unknown provenance without calling IDAM", () => {
      // Act
      const result = buildSessionExpiredRedirectUrl({ provenance: undefined, locale: "en", origin: ORIGIN });

      // Assert
      expect(result).toBe("/session-expired?lng=en&reSignInUrl=CFT");
      expect(getCftIdamConfig).not.toHaveBeenCalled();
    });
  });
});
