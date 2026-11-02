import type { ParityUser } from "../fixtures/manifest.js";

// The local pip sign-in (pip-frontend.patch) for a fixture user: oid for B2C and SSO users, uid
// for CFT and Crime IDAM, with the flow pip records the sign-in under
const SIGN_IN = {
  PI_AAD: { key: "oid", flow: "AAD" },
  SSO: { key: "oid", flow: "SSO" },
  CFT_IDAM: { key: "uid", flow: "CFT" },
  CRIME_IDAM: { key: "uid", flow: "Crime" }
} as const;

export function pipSignInUrl(config: { baseUrl: string; signIn: string }, user: ParityUser): string {
  const { key, flow } = SIGN_IN[user.provenance];
  return `${config.baseUrl}${config.signIn.replace("{key}", key).replace("{provenanceUserId}", user.provenanceUserId).replace("{flow}", flow)}`;
}
