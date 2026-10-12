import { describe, expect, it } from "vitest";
import { planArtefactWrites } from "./artefact-plan.js";
import type { MigratedArtefact } from "./artefact-transform.js";

function buildArtefact(overrides: Partial<MigratedArtefact> = {}): MigratedArtefact {
  return {
    artefactId: "a1",
    type: "LIST",
    locationId: "9",
    listTypeId: 901,
    contentDate: new Date("2026-10-09T00:00:00Z"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: null,
    displayTo: null,
    lastReceivedDate: new Date("2026-10-08T17:00:00Z"),
    isFlatFile: false,
    provenance: "SNL",
    supersededCount: 0,
    sourceArtefactId: null,
    ...overrides
  };
}

describe("planArtefactWrites", () => {
  it("should insert new artefacts, update changed ones, and delete ones legacy no longer has", () => {
    // Arrange
    const existing = [buildArtefact({ artefactId: "unchanged" }), buildArtefact({ artefactId: "changed" }), buildArtefact({ artefactId: "expired" })];
    const loaded = [
      buildArtefact({ artefactId: "unchanged" }),
      buildArtefact({ artefactId: "changed", supersededCount: 1, lastReceivedDate: new Date("2026-10-09T08:00:00Z") }),
      buildArtefact({ artefactId: "new" })
    ];

    // Act
    const plan = planArtefactWrites(loaded, existing);

    // Assert
    expect(plan.inserts.map(({ artefactId }) => artefactId)).toEqual(["new"]);
    expect(plan.updates.map(({ artefactId }) => artefactId)).toEqual(["changed"]);
    expect(plan.deletes).toEqual(["expired"]);
  });

  it("should treat equal dates as unchanged even when they are different Date instances", () => {
    // Arrange
    const existing = [buildArtefact({ displayTo: new Date("2026-10-10T00:00:00Z") })];
    const loaded = [buildArtefact({ displayTo: new Date("2026-10-10T00:00:00Z") })];

    // Act
    const plan = planArtefactWrites(loaded, existing);

    // Assert
    expect(plan.updates).toHaveLength(0);
  });
});
