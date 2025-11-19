import { describe, expect, it, vi } from "vitest";
import * as repository from "../repository/sub-jurisdiction-repository.js";
import { validateSubJurisdictionData } from "./sub-jurisdiction-validation.js";

vi.mock("../repository/sub-jurisdiction-repository.js", () => ({
  checkSubJurisdictionExistsInJurisdiction: vi.fn()
}));

describe("validateSubJurisdictionData", () => {
  it("should return no errors for valid data", async () => {
    vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors).toHaveLength(0);
  });

  it("should return error for missing jurisdiction", async () => {
    const errors = await validateSubJurisdictionData({
      jurisdictionId: "",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Select a jurisdiction");
    expect(errors[0].href).toBe("#jurisdictionId");
  });

  it("should return error for missing English name", async () => {
    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "",
      welshName: "Llys Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Enter Sub Jurisdiction Name in English");
    expect(errors[0].href).toBe("#name");
  });

  it("should return error for missing Welsh name", async () => {
    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "Civil Court",
      welshName: ""
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Enter Sub Jurisdiction Name in Welsh");
    expect(errors[0].href).toBe("#welshName");
  });

  it("should return errors for all missing fields", async () => {
    const errors = await validateSubJurisdictionData({
      jurisdictionId: "",
      name: "",
      welshName: ""
    });

    expect(errors).toHaveLength(3);
    expect(errors[0].text).toContain("Select a jurisdiction");
    expect(errors[1].text).toContain("Enter Sub Jurisdiction Name in English");
    expect(errors[2].text).toContain("Enter Sub Jurisdiction Name in Welsh");
  });

  it("should return error for invalid jurisdiction ID", async () => {
    const errors = await validateSubJurisdictionData({
      jurisdictionId: "abc",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Invalid jurisdiction selection");
    expect(errors[0].href).toBe("#jurisdictionId");
  });

  it("should return error for duplicate English name in jurisdiction", async () => {
    vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction).mockResolvedValue({
      nameExists: true,
      welshNameExists: false
    });

    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the selected jurisdiction");
    expect(errors[0].href).toBe("#name");
  });

  it("should return error for duplicate Welsh name in jurisdiction", async () => {
    vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction).mockResolvedValue({
      nameExists: false,
      welshNameExists: true
    });

    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the selected jurisdiction");
    expect(errors[0].href).toBe("#welshName");
  });

  it("should return errors for both duplicate names", async () => {
    vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction).mockResolvedValue({
      nameExists: true,
      welshNameExists: true
    });

    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "Civil Court",
      welshName: "Llys Sifil"
    });

    expect(errors).toHaveLength(2);
    expect(errors[0].text).toContain("Civil Court");
    expect(errors[0].text).toContain("already exists");
    expect(errors[1].text).toContain("Llys Sifil");
    expect(errors[1].text).toContain("already exists");
  });

  it("should trim whitespace before validation", async () => {
    vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateSubJurisdictionData({
      jurisdictionId: "1",
      name: "  Civil Court  ",
      welshName: "  Llys Sifil  "
    });

    expect(errors).toHaveLength(0);
    expect(repository.checkSubJurisdictionExistsInJurisdiction).toHaveBeenCalledWith(1, "Civil Court", "Llys Sifil");
  });

  it("should not check for duplicates if required fields are empty", async () => {
    const checkSpy = vi.mocked(repository.checkSubJurisdictionExistsInJurisdiction);
    checkSpy.mockClear();

    await validateSubJurisdictionData({
      jurisdictionId: "",
      name: "",
      welshName: ""
    });

    expect(checkSpy).not.toHaveBeenCalled();
  });
});
