// The provenances a list type may declare as allowed publishers — what the shared model
// (pip-data-models ListType.java) assigns and what the System Admin form offers.
// MANUAL_UPLOAD is NOT one of these: it belongs to the unrelated artefact-provenance enum in
// libs/publication/src/provenance.ts and must never be used as a list-type provenance.
export const PUBLISHER_PROVENANCES = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;

export function assertValidProvenances(provenances: string[]): string[] {
  for (const p of provenances) {
    if (!(PUBLISHER_PROVENANCES as readonly string[]).includes(p)) {
      throw new Error(`Invalid provenance "${p}". Expected one of: ${PUBLISHER_PROVENANCES.join(", ")}`);
    }
  }
  return provenances;
}
