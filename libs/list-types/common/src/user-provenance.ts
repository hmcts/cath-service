// Valid values a user.provenance can take (login side). MANUAL_UPLOAD is NOT one of
// these — it belongs to the unrelated artefact-provenance enum in
// libs/publication/src/provenance.ts and must never be used as a user/list-type provenance.
export const USER_PROVENANCES = ["CRIME_IDAM", "PI_AAD", "CFT_IDAM", "SSO"] as const;

// The subset used as list-type publisher provenances (what the shared model assigns and
// what the System Admin form offers). SSO is a login provenance, never a list-type provenance.
export const PUBLISHER_PROVENANCES = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;

export function formatProvenance(provenances: string[]): string {
  for (const p of provenances) {
    if (!(USER_PROVENANCES as readonly string[]).includes(p)) {
      throw new Error(`Invalid provenance "${p}". Expected one of: ${USER_PROVENANCES.join(", ")}`);
    }
  }
  return provenances.join(",");
}

export function parseProvenance(value: string): string[] {
  return value
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
