import { describe, expect, it } from "vitest";
import type { ParityUser } from "../fixtures/manifest.js";
import { pipSignInUrl } from "./sign-in-url.js";

const CONFIG = { baseUrl: "https://localhost:8180", signIn: "/parity-login?{key}={provenanceUserId}&flow={flow}&redirect=/" };

function user(provenance: ParityUser["provenance"]): ParityUser {
  return { id: "u", provenance, role: "VERIFIED", provenanceUserId: "abc-123", email: "u@example.com", forenames: "U", surname: "Ser" };
}

describe("pipSignInUrl", () => {
  it.each([
    ["PI_AAD", "oid", "AAD"],
    ["SSO", "oid", "SSO"],
    ["CFT_IDAM", "uid", "CFT"],
    ["CRIME_IDAM", "uid", "Crime"]
  ] as const)("should sign a %s user in by %s under the %s flow", (provenance, key, flow) => {
    // Act
    const url = pipSignInUrl(CONFIG, user(provenance));

    // Assert
    expect(url).toBe(`https://localhost:8180/parity-login?${key}=abc-123&flow=${flow}&redirect=/`);
  });
});
