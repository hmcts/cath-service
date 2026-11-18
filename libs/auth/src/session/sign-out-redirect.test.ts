import { beforeEach, describe, expect, it, vi } from "vitest";
import { getB2cBaseUrl, getB2cConfig } from "../config/b2c-config.js";
import { getCftIdamConfig } from "../config/cft-idam-config.js";
import { getSsoConfig } from "../config/sso-config.js";
import { buildSignOutRedirectUrl } from "./sign-out-redirect.js";

vi.mock("../config/cft-idam-config.js", () => ({
  getCftIdamConfig: vi.fn()
}));

vi.mock("../config/b2c-config.js", () => ({
  getB2cConfig: vi.fn(),
  getB2cBaseUrl: vi.fn()
}));

vi.mock("../config/sso-config.js", () => ({
  getSsoConfig: vi.fn()
}));

const ORIGIN = "https://cath.example.net";
const TENANT_ID = "12345678-1234-1234-1234-123456789abc";

describe("buildSignOutRedirectUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCftIdamConfig).mockReturnValue({
      baseUrl: ORIGIN,
      endSessionEndpoint: "https://idam.example.net/o/endSession"
    } as ReturnType<typeof getCftIdamConfig>);
    vi.mocked(getB2cConfig).mockReturnValue({ policyCath: "B2C_1_SignInUserFlow" } as ReturnType<typeof getB2cConfig>);
    vi.mocked(getB2cBaseUrl).mockReturnValue("https://b2c.example.net/tenant");
    vi.mocked(getSsoConfig).mockReturnValue({
      issuerUrl: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`
    } as ReturnType<typeof getSsoConfig>);
  });

  it("should end the CFT IDAM session and return to /session-logged-out in English", () => {
    // Act
    const result = buildSignOutRedirectUrl({ provenance: "CFT_IDAM", locale: "en", origin: ORIGIN });

    // Assert
    expect(result).toBe("https://idam.example.net/o/endSession?post_logout_redirect_uri=https%3A%2F%2Fcath.example.net%2Fsession-logged-out%3Flng%3Den");
  });

  it("should keep Welsh for CFT IDAM", () => {
    // Act
    const result = buildSignOutRedirectUrl({ provenance: "CFT_IDAM", locale: "cy", origin: ORIGIN });

    // Assert
    expect(result).toContain("session-logged-out%3Flng%3Dcy");
  });

  it("should sign a Crime IDAM user out locally", () => {
    // Act
    const result = buildSignOutRedirectUrl({ provenance: "CRIME_IDAM", locale: "en", origin: ORIGIN });

    // Assert
    expect(result).toBe("/session-logged-out?lng=en");
  });

  it("should keep Welsh for Crime IDAM", () => {
    // Act
    const result = buildSignOutRedirectUrl({ provenance: "CRIME_IDAM", locale: "cy", origin: ORIGIN });

    // Assert
    expect(result).toBe("/session-logged-out?lng=cy");
  });

  it("should end the B2C session for a PI_AAD user", () => {
    // Act
    const result = new URL(buildSignOutRedirectUrl({ provenance: "PI_AAD", locale: "en", origin: ORIGIN }));

    // Assert
    expect(`${result.origin}${result.pathname}`).toBe("https://b2c.example.net/tenant/oauth2/v2.0/logout");
    expect(result.searchParams.get("p")).toBe("B2C_1_SignInUserFlow");
    expect(result.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/session-logged-out?lng=en`);
  });

  it("should keep Welsh in the B2C post logout redirect", () => {
    // Act
    const result = new URL(buildSignOutRedirectUrl({ provenance: "PI_AAD", locale: "cy", origin: ORIGIN }));

    // Assert
    expect(result.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/session-logged-out?lng=cy`);
  });

  it("should end the Microsoft session for an SSO user", () => {
    // Act
    const result = buildSignOutRedirectUrl({ provenance: "SSO", locale: "en", origin: ORIGIN });

    // Assert
    expect(result).toBe(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=https%3A%2F%2Fcath.example.net%2Fsession-logged-out%3Flng%3Den`
    );
  });

  it("should sign an SSO user out locally when the issuer has no tenant", () => {
    // Arrange
    vi.mocked(getSsoConfig).mockReturnValue({ issuerUrl: "https://issuer.example.net" } as ReturnType<typeof getSsoConfig>);

    // Act
    const result = buildSignOutRedirectUrl({ provenance: "SSO", locale: "en", origin: ORIGIN });

    // Assert
    expect(result).toBe("/session-logged-out?lng=en");
  });

  it("should keep Welsh in the Microsoft post logout redirect", () => {
    // Act
    const result = new URL(buildSignOutRedirectUrl({ provenance: "SSO", locale: "cy", origin: ORIGIN }));

    // Assert
    expect(result.searchParams.get("post_logout_redirect_uri")).toBe(`${ORIGIN}/session-logged-out?lng=cy`);
  });
});
