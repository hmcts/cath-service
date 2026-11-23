import { beforeEach, describe, expect, it, vi } from "vitest";
import { getB2cBaseUrl, getB2cConfig } from "../config/b2c-config.js";
import { buildB2cLogoutUrl } from "./logout-url.js";

vi.mock("../config/b2c-config.js", () => ({
  getB2cConfig: vi.fn(),
  getB2cBaseUrl: vi.fn()
}));

describe("buildB2cLogoutUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getB2cConfig).mockReturnValue({ policyCath: "B2C_1A_CaTH_SignIn" } as ReturnType<typeof getB2cConfig>);
    vi.mocked(getB2cBaseUrl).mockReturnValue("https://sign-in.example.net/tenant.example.net");
  });

  it("should build the B2C logout URL with the CaTH policy", () => {
    // Act
    const url = new URL(buildB2cLogoutUrl("https://localhost:8080/session-logged-out"));

    // Assert
    expect(`${url.origin}${url.pathname}`).toBe("https://sign-in.example.net/tenant.example.net/oauth2/v2.0/logout");
    expect(url.searchParams.get("p")).toBe("B2C_1A_CaTH_SignIn");
  });

  it("should encode the post logout redirect URI including its query string", () => {
    // Act
    const result = buildB2cLogoutUrl("https://localhost:8080/session-expired?lng=cy&reSignInUrl=AAD");

    // Assert
    expect(result).toBe(
      "https://sign-in.example.net/tenant.example.net/oauth2/v2.0/logout?p=B2C_1A_CaTH_SignIn&post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-expired%3Flng%3Dcy%26reSignInUrl%3DAAD"
    );
    expect(new URL(result).searchParams.get("post_logout_redirect_uri")).toBe("https://localhost:8080/session-expired?lng=cy&reSignInUrl=AAD");
  });
});
