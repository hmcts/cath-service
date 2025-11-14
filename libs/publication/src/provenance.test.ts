import { describe, expect, it } from "vitest";
import { PROVENANCE_LABELS, Provenance } from "./provenance.js";

describe("Provenance", () => {
  it("should have MANUAL_UPLOAD value", () => {
    expect(Provenance.MANUAL_UPLOAD).toBe("MANUAL_UPLOAD");
  });

  it("should have label for MANUAL_UPLOAD", () => {
    expect(PROVENANCE_LABELS[Provenance.MANUAL_UPLOAD]).toBe("Manual Upload");
  });

  it("should have all provenance values in labels", () => {
    const provenanceValues = Object.values(Provenance);
    for (const value of provenanceValues) {
      expect(PROVENANCE_LABELS[value]).toBeDefined();
    }
  });
});
