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
  sendSystemAdminNotification: vi.fn(),
  sendSubscriptionDeletedNotification: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  deleteArtefactsByLocationId: vi.fn(),
  getArtefactsByLocation: vi.fn()
}));

vi.mock("@hmcts/third-party-subscription-fulfilment", () => ({
  sendPublicationDeletionToThirdParties: vi.fn()
}));

vi.mock("@hmcts/subscriptions", () => ({
  deleteSubscriptionsByLocationId: vi.fn(),
  findSubscribersByLocationId: vi.fn()
}));

const { getLocationWithDetails, hasActiveSubscriptions, hasActiveArtefacts, deleteLocation, deleteLocationMetadataRecord, findLocationMetadataByLocationId } =
  await import("@hmcts/location");
const { findSystemAdminEmails } = await import("@hmcts/account/repository/query");
const { sendSystemAdminNotification, sendSubscriptionDeletedNotification } = await import("@hmcts/notifications");
const { deleteArtefactsByLocationId, getArtefactsByLocation } = await import("@hmcts/publication");
const { sendPublicationDeletionToThirdParties } = await import("@hmcts/third-party-subscription-fulfilment");
const { deleteSubscriptionsByLocationId, findSubscribersByLocationId } = await import("@hmcts/subscriptions");

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
  beforeEach(() => {
    vi.mocked(getArtefactsByLocation).mockResolvedValue([]);
    vi.mocked(sendPublicationDeletionToThirdParties).mockResolvedValue(undefined);
  });

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

  it("should send a third-party OAuth deletion for each artefact of the location after deleting them", async () => {
    // Arrange
    vi.mocked(findSystemAdminEmails).mockResolvedValue([]);
    vi.mocked(getArtefactsByLocation).mockResolvedValue([
      { artefactId: "art-1", listTypeId: 999, sensitivity: "PUBLIC", displayTo: null },
      { artefactId: "art-2", listTypeId: 999, sensitivity: "PRIVATE", displayTo: new Date(Date.now() + 86_400_000) }
    ] as never);

    // Act
    await performLocationPublicationsDeletion(5, "Test Court", "requester@example.com");

    // Assert
    expect(getArtefactsByLocation).toHaveBeenCalledWith("5");
    expect(vi.mocked(getArtefactsByLocation).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deleteArtefactsByLocationId).mock.invocationCallOrder[0]);
    expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledTimes(2);
    expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledWith({ artefactId: "art-1", listTypeId: 999, sensitivity: "PUBLIC" });
    expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledWith({ artefactId: "art-2", listTypeId: 999, sensitivity: "PRIVATE" });
    expect(vi.mocked(deleteArtefactsByLocationId).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendPublicationDeletionToThirdParties).mock.invocationCallOrder[0]
    );
  });

  it("should delete an expired artefact without sending it a third-party deletion", async () => {
    // Arrange
    vi.mocked(findSystemAdminEmails).mockResolvedValue([]);
    vi.mocked(getArtefactsByLocation).mockResolvedValue([
      { artefactId: "art-live", listTypeId: 999, sensitivity: "PUBLIC", displayTo: new Date(Date.now() + 86_400_000) },
      { artefactId: "art-expired", listTypeId: 999, sensitivity: "PUBLIC", displayTo: new Date(Date.now() - 86_400_000) }
    ] as never);

    // Act
    await performLocationPublicationsDeletion(5, "Test Court", "requester@example.com");

    // Assert
    expect(deleteArtefactsByLocationId).toHaveBeenCalledWith("5");
    expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledTimes(1);
    expect(sendPublicationDeletionToThirdParties).toHaveBeenCalledWith({ artefactId: "art-live", listTypeId: 999, sensitivity: "PUBLIC" });
  });

  it("should send no third-party deletions when the location has no artefacts", async () => {
    // Arrange
    vi.mocked(findSystemAdminEmails).mockResolvedValue([]);

    // Act
    await performLocationPublicationsDeletion(5, "Test Court", "requester@example.com");

    // Assert
    expect(sendPublicationDeletionToThirdParties).not.toHaveBeenCalled();
  });

  it("should still notify admins when a third-party OAuth deletion rejects", async () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);
    vi.mocked(getArtefactsByLocation).mockResolvedValue([{ artefactId: "art-1", listTypeId: 999, sensitivity: "PUBLIC" }] as never);
    vi.mocked(sendPublicationDeletionToThirdParties).mockRejectedValue(new Error("OAuth down"));

    // Act
    await performLocationPublicationsDeletion(5, "Test Court", "requester@example.com");
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(sendSystemAdminNotification).toHaveBeenCalledWith(["admin@example.com"], expect.objectContaining({ changeType: "Delete Location Artefact(s)" }));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Third-party OAuth deletion failed:", { artefactId: "art-1", error: "OAuth down" });
    consoleErrorSpy.mockRestore();
  });
});

describe("performLocationSubscriptionsDeletion", () => {
  it("should delete subscriptions for the location, notify subscribers and admins", async () => {
    const mockSubscribers = [
      { userId: "user-1", user: { email: "subscriber1@example.com", firstName: "Jane", surname: "Doe" } },
      { userId: "user-2", user: { email: "subscriber2@example.com", firstName: null, surname: null } }
    ];
    vi.mocked(findSubscribersByLocationId).mockResolvedValue(mockSubscribers as never);
    vi.mocked(findSystemAdminEmails).mockResolvedValue(["admin@example.com"]);

    await performLocationSubscriptionsDeletion(5, "Test Court", "requester@example.com");

    expect(findSubscribersByLocationId).toHaveBeenCalledWith(5);
    expect(deleteSubscriptionsByLocationId).toHaveBeenCalledWith(5);
    expect(sendSubscriptionDeletedNotification).toHaveBeenCalledWith([mockSubscribers[0].user, mockSubscribers[1].user], "Test Court");
    expect(sendSystemAdminNotification).toHaveBeenCalledWith(["admin@example.com"], {
      requesterEmail: "requester@example.com",
      changeType: "Delete Location Subscription(s)",
      additionalChangeDetail: "Subscriptions for location Test Court with Id 5 have been deleted."
    });
  });

  it("should fetch subscribers before deleting the subscriptions", async () => {
    vi.mocked(findSystemAdminEmails).mockResolvedValue([]);

    const callOrder: string[] = [];
    vi.mocked(findSubscribersByLocationId).mockImplementation(async () => {
      callOrder.push("findSubscribersByLocationId");
      return [];
    });
    vi.mocked(deleteSubscriptionsByLocationId).mockImplementation(async () => {
      callOrder.push("deleteSubscriptionsByLocationId");
      return 0;
    });

    await performLocationSubscriptionsDeletion(5, "Test Court", "requester@example.com");

    expect(callOrder).toEqual(["findSubscribersByLocationId", "deleteSubscriptionsByLocationId"]);
  });

  it("should not send a subscriber notification when there are no subscribers", async () => {
    vi.mocked(findSubscribersByLocationId).mockResolvedValue([] as never);
    vi.mocked(findSystemAdminEmails).mockResolvedValue([]);

    await performLocationSubscriptionsDeletion(5, "Test Court", "requester@example.com");

    expect(sendSubscriptionDeletedNotification).toHaveBeenCalledWith([], "Test Court");
  });
});
