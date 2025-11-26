import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "../repository/region-repository.js";
import { validateRegionData } from "./region-validation.js";

vi.mock("../repository/region-repository.js", () => ({
  checkRegionExists: vi.fn()
}));

describe("region-validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateRegionData", () => {
    it("should return error when name is empty", async () => {
      const errors = await validateRegionData({ name: "", welshName: "Llundain" });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        text: "Enter region name in English",
        href: "#name"
      });
    });

    it("should return error when welshName is empty", async () => {
      const errors = await validateRegionData({ name: "London", welshName: "" });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        text: "Enter region name in Welsh",
        href: "#welshName"
      });
    });

    it("should return both errors when both fields are empty", async () => {
      const errors = await validateRegionData({ name: "", welshName: "" });

      expect(errors).toHaveLength(2);
      expect(errors[0].text).toBe("Enter region name in English");
      expect(errors[1].text).toBe("Enter region name in Welsh");
    });

    it("should return error when name contains HTML tags", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: false,
        welshNameExists: false
      });

      const errors = await validateRegionData({ name: "<script>alert('xss')</script>", welshName: "Test" });

      expect(errors).toContainEqual({
        text: "Region name (English) contains HTML tags which are not allowed",
        href: "#name"
      });
    });

    it("should return error when welshName contains HTML tags", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: false,
        welshNameExists: false
      });

      const errors = await validateRegionData({ name: "Test", welshName: "<div>Test</div>" });

      expect(errors).toContainEqual({
        text: "Region name (Welsh) contains HTML tags which are not allowed",
        href: "#welshName"
      });
    });

    it("should return error when name already exists", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: true,
        welshNameExists: false
      });

      const errors = await validateRegionData({ name: "London", welshName: "Llundain" });

      expect(errors).toContainEqual({
        text: "Region 'London' already exists in the database",
        href: "#name"
      });
    });

    it("should return error when welshName already exists", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: false,
        welshNameExists: true
      });

      const errors = await validateRegionData({ name: "London", welshName: "Llundain" });

      expect(errors).toContainEqual({
        text: "Welsh region name 'Llundain' already exists in the database",
        href: "#welshName"
      });
    });

    it("should return no errors for valid data", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: false,
        welshNameExists: false
      });

      const errors = await validateRegionData({ name: "London", welshName: "Llundain" });

      expect(errors).toHaveLength(0);
    });

    it("should trim whitespace before validation", async () => {
      vi.mocked(repository.checkRegionExists).mockResolvedValueOnce({
        nameExists: false,
        welshNameExists: false
      });

      await validateRegionData({ name: "  London  ", welshName: "  Llundain  " });

      expect(repository.checkRegionExists).toHaveBeenCalledWith("London", "Llundain");
    });
  });
});
