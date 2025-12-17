import { beforeEach, describe, expect, it, vi } from "vitest";
import { performLocationDeletion, VALIDATION_ERROR_CODES, validateLocationForDeletion } from "./service.js";

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn(),
  hasActiveSubscriptions: vi.fn(),
  hasActiveArtefacts: vi.fn(),
  softDeleteLocation: vi.fn()
}));

const { getLocationWithDetails, hasActiveSubscriptions, hasActiveArtefacts, softDeleteLocation } = await import("@hmcts/location");

const mockLocation = {
  locationId: 1,
  name: "Test Court",
  welshName: "Llys Prawf",
  regions: [{ name: "London", welshName: "Llundain" }],
  subJurisdictions: [
    {
      name: "Civil Court",
      welshName: "Llys Sifil",
      jurisdictionName: "Civil",
      jurisdictionWelshName: "Sifil"
    }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateLocationForDeletion", () => {
  it("should return error when location not found", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(null);

    const result = await validateLocationForDeletion(999);

    expect(result).toEqual({
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.LOCATION_NOT_FOUND
    });
  });

  it("should return error when location has active subscriptions", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result).toEqual({
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_SUBSCRIPTIONS,
      location: mockLocation
    });
  });

  it("should return error when location has active artefacts", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(false);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result).toEqual({
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS,
      location: mockLocation
    });
  });

  it("should return valid when location can be deleted", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(false);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(false);

    const result = await validateLocationForDeletion(1);

    expect(result).toEqual({
      isValid: true,
      location: mockLocation
    });
  });

  it("should check subscriptions before artefacts", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(true);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result.errorCode).toBe(VALIDATION_ERROR_CODES.ACTIVE_SUBSCRIPTIONS);
    expect(hasActiveArtefacts).not.toHaveBeenCalled();
  });
});

describe("performLocationDeletion", () => {
  it("should call softDeleteLocation with correct id", async () => {
    vi.mocked(softDeleteLocation).mockResolvedValue(undefined);

    await performLocationDeletion(1);

    expect(softDeleteLocation).toHaveBeenCalledWith(1);
  });
});
