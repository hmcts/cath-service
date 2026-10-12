import type { MigratedArtefact } from "./artefact-transform.js";

// Artefacts are upserted rather than replaced, so artefact_search rows and generated files of
// unchanged artefacts survive the run. Before cutover every artefact here came from this job,
// so a row missing from legacy is deleted without needing a ledger.
export function planArtefactWrites(loaded: MigratedArtefact[], existing: MigratedArtefact[]): ArtefactWritePlan {
  const existingById = new Map(existing.map((artefact) => [artefact.artefactId, artefact]));
  const loadedIds = new Set(loaded.map((artefact) => artefact.artefactId));

  return {
    inserts: loaded.filter((artefact) => !existingById.has(artefact.artefactId)),
    updates: loaded.filter((artefact) => {
      const current = existingById.get(artefact.artefactId);
      return current !== undefined && !artefactsEqual(current, artefact);
    }),
    deletes: existing.filter((artefact) => !loadedIds.has(artefact.artefactId)).map((artefact) => artefact.artefactId)
  };
}

function artefactsEqual(a: MigratedArtefact, b: MigratedArtefact): boolean {
  return (
    a.type === b.type &&
    a.locationId === b.locationId &&
    a.listTypeId === b.listTypeId &&
    sameTime(a.contentDate, b.contentDate) &&
    a.sensitivity === b.sensitivity &&
    a.language === b.language &&
    sameTime(a.displayFrom, b.displayFrom) &&
    sameTime(a.displayTo, b.displayTo) &&
    sameTime(a.lastReceivedDate, b.lastReceivedDate) &&
    a.isFlatFile === b.isFlatFile &&
    a.provenance === b.provenance &&
    a.supersededCount === b.supersededCount &&
    a.sourceArtefactId === b.sourceArtefactId
  );
}

function sameTime(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

export interface ArtefactWritePlan {
  inserts: MigratedArtefact[];
  updates: MigratedArtefact[];
  deletes: string[];
}
