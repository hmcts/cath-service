import { describe, expect, it } from "vitest";
import { buildPartyName } from "./party-name.js";

describe("buildPartyName", () => {
  it("should return empty string when party is undefined", () => {
    expect(buildPartyName(undefined)).toBe("");
  });

  it("should return empty string when party has no details", () => {
    expect(buildPartyName({})).toBe("");
  });

  it("should return organisation name when present", () => {
    expect(buildPartyName({ organisationDetails: { organisationName: "Acme Ltd" } })).toBe("Acme Ltd");
  });

  it("should prefer organisation name over individual details when both are present", () => {
    expect(
      buildPartyName({
        organisationDetails: { organisationName: "Acme Ltd" },
        individualDetails: { individualSurname: "Smith", individualForenames: "John" }
      })
    ).toBe("Acme Ltd");
  });

  it("should return 'surname, forenames' when both individual name parts are present", () => {
    expect(buildPartyName({ individualDetails: { individualSurname: "Smith", individualForenames: "John" } })).toBe("Smith, John");
  });

  it("should return surname only when forenames are absent", () => {
    expect(buildPartyName({ individualDetails: { individualSurname: "Smith" } })).toBe("Smith");
  });

  it("should return forenames only when surname is absent", () => {
    expect(buildPartyName({ individualDetails: { individualForenames: "John" } })).toBe("John");
  });

  it("should return empty string when individual details has no name parts", () => {
    expect(buildPartyName({ individualDetails: {} })).toBe("");
  });

  it("should return empty string when organisation details has no organisation name", () => {
    expect(buildPartyName({ organisationDetails: {} })).toBe("");
  });
});
