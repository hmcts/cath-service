import { describe, expect, it, vi } from "vitest";
import * as repository from "../repository/jurisdiction-repository.js";
import { validateJurisdictionData } from "./jurisdiction-validation.js";

vi.mock("../repository/jurisdiction-repository.js", () => ({
  checkJurisdictionExists: vi.fn()
}));

describe("validateJurisdictionData", () => {
  it("should return no errors for valid data", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: "Sifil"
    });

    expect(errors).toHaveLength(0);
  });

  it("should return error for missing English name", async () => {
    const errors = await validateJurisdictionData({
      name: "",
      welshName: "Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Enter jurisdiction name in English");
    expect(errors[0].href).toBe("#name");
  });

  it("should return error for missing Welsh name", async () => {
    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: ""
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("Enter jurisdiction name in Welsh");
    expect(errors[0].href).toBe("#welshName");
  });

  it("should return errors for both missing fields", async () => {
    const errors = await validateJurisdictionData({
      name: "",
      welshName: ""
    });

    expect(errors).toHaveLength(2);
    expect(errors[0].text).toContain("Enter jurisdiction name in English");
    expect(errors[1].text).toContain("Enter jurisdiction name in Welsh");
  });

  it("should return error for HTML tags in English name", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateJurisdictionData({
      name: "<script>alert('xss')</script>Civil",
      welshName: "Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("HTML tags which are not allowed");
    expect(errors[0].href).toBe("#name");
  });

  it("should return error for HTML tags in Welsh name", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: "<b>Sifil</b>"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("HTML tags which are not allowed");
    expect(errors[0].href).toBe("#welshName");
  });

  it("should return error for duplicate English name", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: true,
      welshNameExists: false
    });

    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: "Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the database");
    expect(errors[0].href).toBe("#name");
  });

  it("should return error for duplicate Welsh name", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: false,
      welshNameExists: true
    });

    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: "Sifil"
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].text).toContain("already exists in the database");
    expect(errors[0].href).toBe("#welshName");
  });

  it("should return errors for both duplicate names", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: true,
      welshNameExists: true
    });

    const errors = await validateJurisdictionData({
      name: "Civil",
      welshName: "Sifil"
    });

    expect(errors).toHaveLength(2);
    expect(errors[0].text).toContain("Civil");
    expect(errors[0].text).toContain("already exists");
    expect(errors[1].text).toContain("Sifil");
    expect(errors[1].text).toContain("already exists");
  });

  it("should trim whitespace before validation", async () => {
    vi.mocked(repository.checkJurisdictionExists).mockResolvedValue({
      nameExists: false,
      welshNameExists: false
    });

    const errors = await validateJurisdictionData({
      name: "  Civil  ",
      welshName: "  Sifil  "
    });

    expect(errors).toHaveLength(0);
    expect(repository.checkJurisdictionExists).toHaveBeenCalledWith("Civil", "Sifil");
  });

  it("should not check for duplicates if fields are empty", async () => {
    const checkSpy = vi.mocked(repository.checkJurisdictionExists);
    checkSpy.mockClear();

    await validateJurisdictionData({
      name: "",
      welshName: ""
    });

    expect(checkSpy).not.toHaveBeenCalled();
  });
});
