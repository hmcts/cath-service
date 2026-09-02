import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  performLocationDeletion,
  performLocationPublicationsDeletion,
  performLocationSubscriptionsDeletion,
  VALIDATION_ERROR_CODES,
  validateLocationForDeletion
} from "./service.js";

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn(),
  hasActiveSubscriptions: vi.fn(),
  hasActiveArtefacts: vi.fn(),
  deleteLocation: vi.fn(),
  deleteLocationMetadataRecord: vi.fn(),
  findLocationMetadataByLocationId: vi.fn()
}));

vi.mock("@hmcts/account/repository/query", () => ({
  findSystemAdminEmails: vi.fn()
}));

vi.mock("@hmcts/notifications", () => ({
  sendSystemAdminNotification: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  deleteArtefactsByLocationId: vi.fn()
}));

vi.mock("@hmcts/subscriptions", () => ({
  deleteSubscriptionsByLocationId: vi.fn()
}));

const { getLocationWithDetails, hasActiveSubscriptions, hasActiveArtefacts, deleteLocation, deleteLocationMetadataRecord, findLocationMetadataByLocationId } =
  await import("@hmcts/location");
const { findSystemAdminEmails } = await import("@hmcts/account/repository/query");
const { sendSystemAdminNotification } = await import("@hmcts/notifications");
const { deleteArtefactsByLocationId } = await import("@hmcts/publication");
const { deleteSubscriptionsByLocationId } = await import("@hmcts/subscriptions");

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

  it("should return error when location has active artefacts", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result).toEqual({
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS,
      location: mockLocation
    });
  });

  it("should return error when location has active subscriptions", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(false);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result).toEqual({
      isValid: false,
      errorCode: VALIDATION_ERROR_CODES.ACTIVE_SUBSCRIPTIONS,
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

  it("should check artefacts before subscriptions", async () => {
    vi.mocked(getLocationWithDetails).mockResolvedValue(mockLocation);
    vi.mocked(hasActiveArtefacts).mockResolvedValue(true);
    vi.mocked(hasActiveSubscriptions).mockResolvedValue(true);

    const result = await validateLocationForDeletion(1);

    expect(result.errorCode).toBe(VALIDATION_ERROR_CODES.ACTIVE_ARTEFACTS);
    expect(hasActiveSubscriptions).not.toHaveBeenCalled();
  });
});

describe("performLocationDeletion", () => {
  it("should delete metadata when present, then hard delete the location and notify admins", async () => {
    vi.mocked(findLocationMetadataByLocationId).mockResolvedValue({ locationId: 1 } as never);
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);

    await performLocationDeletion(1, "Test Court", "requester@example.com");

    expect(deleteLocationMetadataRecord).toHaveBeenCalledWith(1);
    expect(deleteLocation).toHaveBeenCalledWith(1);
    expect(sendSystemAdminNotification).toHaveBeenCalledWith(["admin@example.com"], {
      requesterEmail: "requester@example.com",
      changeType: "Delete Location",
      additionalChangeDetail: "Location Test Court with Id 1 has been deleted."
    });
  });

  it("should not delete metadata when absent (no-op) but still hard delete the location", async () => {
    vi.mocked(findLocationMetadataByLocationId).mockResolvedValue(null);
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);

    await performLocationDeletion(1, "Test Court", "requester@example.com");

    expect(deleteLocationMetadataRecord).not.toHaveBeenCalled();
    expect(deleteLocation).toHaveBeenCalledWith(1);
  });
});

describe("performLocationPublicationsDeletion", () => {
  it("should delete artefacts for the location and notify admins", async () => {
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);

    await performLocationPublicationsDeletion(5, "Test Court", "requester@example.com");

    expect(deleteArtefactsByLocationId).toHaveBeenCalledWith("5");
    expect(sendSystemAdminNotification).toHaveBeenCalledWith(["admin@example.com"], {
      requesterEmail: "requester@example.com",
      changeType: "Delete Location Artefact(s)",
      additionalChangeDetail: "Publications for location Test Court with Id 5 have been deleted."
    });
  });
});

describe("performLocationSubscriptionsDeletion", () => {
  it("should delete subscriptions for the location and notify admins", async () => {
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);

    await performLocationSubscriptionsDeletion(5, "Test Court", "requester@example.com");

    expect(deleteSubscriptionsByLocationId).toHaveBeenCalledWith(5);
    expect(sendSystemAdminNotification).toHaveBeenCalledWith(["admin@example.com"], {
      requesterEmail: "requester@example.com",
      changeType: "Delete Location Subscription(s)",
      additionalChangeDetail: "Subscriptions for location Test Court with Id 5 have been deleted."
    });
  });
});
