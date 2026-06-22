import { describe, expect, it } from "vitest";
import { formatPddaCitizenName, formatPddaDefendantName, formatPddaSittingTime } from "./crown-utilities.js";

describe("formatPddaCitizenName", () => {
  it("should return CitizenNameRequestedName alone when present", () => {
    expect(
      formatPddaCitizenName({ CitizenNameTitle: "Mr", CitizenNameForename: ["John"], CitizenNameSurname: "Smith", CitizenNameRequestedName: "Requested" })
    ).toBe("Requested");
  });

  it("should format title, forenames, surname, suffix when no RequestedName", () => {
    expect(
      formatPddaCitizenName({ CitizenNameTitle: "Ms", CitizenNameForename: ["Alice", "Jane"], CitizenNameSurname: "Jones", CitizenNameSuffix: "Jr" })
    ).toBe("Ms Alice Jane Jones Jr");
  });

  it("should skip absent optional parts", () => {
    expect(formatPddaCitizenName({ CitizenNameForename: ["Bob"], CitizenNameSurname: "Brown" })).toBe("Bob Brown");
  });

  it("should return empty string when all parts are absent", () => {
    expect(formatPddaCitizenName({})).toBe("");
  });
});

describe("formatPddaDefendantName", () => {
  it("should use MaskedName when IsMasked is yes and no RequestedName", () => {
    expect(
      formatPddaDefendantName({
        IsMasked: "yes",
        MaskedName: "Reporting Restriction Applied",
        Name: { CitizenNameForename: ["Real"], CitizenNameSurname: "Name" }
      })
    ).toBe("Reporting Restriction Applied");
  });

  it("should use RequestedName when IsMasked is yes but RequestedName is present", () => {
    expect(
      formatPddaDefendantName({
        IsMasked: "yes",
        MaskedName: "Masked",
        Name: { CitizenNameRequestedName: "RequestedOverride", CitizenNameForename: ["Real"], CitizenNameSurname: "Name" }
      })
    ).toBe("RequestedOverride");
  });

  it("should format citizen name when IsMasked is no", () => {
    expect(
      formatPddaDefendantName({
        IsMasked: "no",
        Name: { CitizenNameTitle: "Mr", CitizenNameForename: ["John"], CitizenNameSurname: "Doe" }
      })
    ).toBe("Mr John Doe");
  });

  it("should return citizen name when IsMasked is yes but no MaskedName", () => {
    expect(
      formatPddaDefendantName({
        IsMasked: "yes",
        Name: { CitizenNameForename: ["Jane"], CitizenNameSurname: "Smith" }
      })
    ).toBe("Jane Smith");
  });
});

describe("formatPddaSittingTime", () => {
  it("should return empty string when timeStr is undefined", () => {
    expect(formatPddaSittingTime(undefined)).toBe("");
  });

  it("should format morning time without minutes", () => {
    expect(formatPddaSittingTime("10:00:00")).toBe("10am");
  });

  it("should format afternoon time without minutes", () => {
    expect(formatPddaSittingTime("14:00:00")).toBe("2pm");
  });

  it("should format time with minutes", () => {
    expect(formatPddaSittingTime("14:30:00")).toBe("2:30pm");
  });

  it("should return original string when format is invalid", () => {
    expect(formatPddaSittingTime("invalid")).toBe("invalid");
  });
});
