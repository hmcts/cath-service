import { getLocationWithDetails } from "@hmcts/location";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRegionName } from "./region-resolver.js";

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

const baseLocation = {
  locationId: 1,
  name: "Leeds Employment Tribunal",
  welshName: "",
  regions: [{ name: "Midlands", welshName: "Canolbarth Lloegr" }],
  subJurisdictions: []
};

describe("resolveRegionName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the English region name", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(baseLocation);
    expect(await resolveRegionName("1", "en")).toBe("Midlands");
  });

  it("should return the Welsh region name when locale is cy", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(baseLocation);
    expect(await resolveRegionName("1", "cy")).toBe("Canolbarth Lloegr");
  });

  it("should join multiple regions", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue({
      ...baseLocation,
      regions: [
        { name: "Midlands", welshName: "" },
        { name: "North East", welshName: "" }
      ]
    });
    expect(await resolveRegionName("1", "en")).toBe("Midlands, North East");
  });

  it("should return an empty string when there are no regions", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue({ ...baseLocation, regions: [] });
    expect(await resolveRegionName("1", "en")).toBe("");
  });

  it("should return an empty string when the location is not found", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(null);
    expect(await resolveRegionName("999", "en")).toBe("");
  });
});
