import { describe, expect, it } from "vitest";
import { normaliseHearings } from "./hearing-normalisation.js";

describe("normaliseHearings", () => {
  const hearing = {
    venue: "Court 1",
    judge: "Judge Smith",
    time: "10.30am",
    caseNumber: "CO/2025/123",
    caseDetails: "R v Jones",
    hearingType: "Trial",
    additionalInformation: ""
  };

  it("should normalise time format", () => {
    const [result] = normaliseHearings([hearing]);
    expect(result.time).toBe("10:30am");
  });

  it("should default empty additionalInformation to empty string", () => {
    const [result] = normaliseHearings([{ ...hearing, additionalInformation: "" }]);
    expect(result.additionalInformation).toBe("");
  });

  it("should preserve all other fields unchanged", () => {
    const [result] = normaliseHearings([hearing]);
    expect(result.venue).toBe("Court 1");
    expect(result.judge).toBe("Judge Smith");
    expect(result.caseNumber).toBe("CO/2025/123");
    expect(result.caseDetails).toBe("R v Jones");
    expect(result.hearingType).toBe("Trial");
  });

  it("should handle multiple hearings", () => {
    const hearings = [hearing, { ...hearing, time: "2.15pm", caseNumber: "CO/2025/456" }];
    const results = normaliseHearings(hearings);
    expect(results).toHaveLength(2);
    expect(results[0].time).toBe("10:30am");
    expect(results[1].time).toBe("2:15pm");
  });
});
