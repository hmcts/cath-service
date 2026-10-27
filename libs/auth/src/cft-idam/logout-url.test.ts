import { describe, expect, it } from "vitest";
import type { CftIdamConfig } from "../config/cft-idam-config.js";
import { buildCftIdamLogoutUrl } from "./logout-url.js";

const config = {
  baseUrl: "https://localhost:8080",
  endSessionEndpoint: "https://hmcts-access.aat.platform.hmcts.net/o/endSession"
} as CftIdamConfig;

describe("buildCftIdamLogoutUrl", () => {
  it("should build the IDAM endSession URL with an encoded post logout redirect", () => {
    // Act
    const result = buildCftIdamLogoutUrl("/session-logged-out?lng=en", config);

    // Assert
    expect(result).toBe(
      "https://hmcts-access.aat.platform.hmcts.net/o/endSession?post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-logged-out%3Flng%3Den"
    );
  });

  it("should preserve the Welsh language and extra query parameters in the redirect", () => {
    // Act
    const result = buildCftIdamLogoutUrl("/session-expired?lng=cy&reSignInUrl=CFT", config);

    // Assert
    expect(result).toBe(
      "https://hmcts-access.aat.platform.hmcts.net/o/endSession?post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-expired%3Flng%3Dcy%26reSignInUrl%3DCFT"
    );
  });
});
