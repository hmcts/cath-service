import { sendNotifyEmail } from "@hmcts/govuk-notify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNotificationSettings,
  type NotificationSettings,
  sendIdamSignInNotificationEmail,
  sendMediaAccountDeletionEmail,
  sendMediaVerificationEmail
} from "./notifications.js";

vi.mock("@hmcts/govuk-notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/govuk-notify")>()),
  sendNotifyEmail: vi.fn()
}));

const SETTINGS: NotificationSettings = {
  apiKey: "test-api-key",
  mediaVerificationPageLink: "https://cath.test/media-verification",
  cftSignInLink: "https://cath.test/cft-login",
  crimeSignInLink: "https://cath.test/crime-login",
  createMediaAccountLink: "https://cath.test/create-media-account"
};

describe("inactive account notifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MEDIA_VERIFICATION_PAGE_LINK;
    delete process.env.CFT_SIGN_IN_LINK;
    delete process.env.CRIME_SIGN_IN_LINK;
    delete process.env.CREATE_MEDIA_ACCOUNT_LINK;
    vi.mocked(sendNotifyEmail).mockResolvedValue({ notificationId: "n-1" });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getNotificationSettings", () => {
    it("should build the links from CATH_SERVICE_URL", () => {
      // Arrange
      process.env.GOVUK_NOTIFY_API_KEY = "key";
      process.env.CATH_SERVICE_URL = "https://cath.aat.platform.hmcts.net/";

      // Act
      const settings = getNotificationSettings();

      // Assert
      expect(settings).toEqual({
        apiKey: "key",
        mediaVerificationPageLink: "https://cath.aat.platform.hmcts.net/media-verification",
        cftSignInLink: "https://cath.aat.platform.hmcts.net/cft-login",
        crimeSignInLink: "https://cath.aat.platform.hmcts.net/crime-login",
        createMediaAccountLink: "https://cath.aat.platform.hmcts.net/create-media-account"
      });
    });

    it("should use the link overrides without needing CATH_SERVICE_URL", () => {
      // Arrange
      process.env.GOVUK_NOTIFY_API_KEY = "key";
      delete process.env.CATH_SERVICE_URL;
      process.env.MEDIA_VERIFICATION_PAGE_LINK = "https://override/media";
      process.env.CFT_SIGN_IN_LINK = "https://override/cft";
      process.env.CRIME_SIGN_IN_LINK = "https://override/crime";
      process.env.CREATE_MEDIA_ACCOUNT_LINK = "https://override/create-media-account";

      // Act
      const settings = getNotificationSettings();

      // Assert
      expect(settings).toMatchObject({
        mediaVerificationPageLink: "https://override/media",
        cftSignInLink: "https://override/cft",
        crimeSignInLink: "https://override/crime",
        createMediaAccountLink: "https://override/create-media-account"
      });
    });

    it("should throw when GOVUK_NOTIFY_API_KEY is missing", () => {
      // Arrange
      delete process.env.GOVUK_NOTIFY_API_KEY;
      process.env.CATH_SERVICE_URL = "https://cath.test";

      // Act & Assert
      expect(() => getNotificationSettings()).toThrow("GOVUK_NOTIFY_API_KEY is required");
    });

    it("should throw when CATH_SERVICE_URL is missing and a link is not overridden", () => {
      // Arrange
      process.env.GOVUK_NOTIFY_API_KEY = "key";
      delete process.env.CATH_SERVICE_URL;

      // Act & Assert
      expect(() => getNotificationSettings()).toThrow("CATH_SERVICE_URL is required");
    });
  });

  describe("sendMediaVerificationEmail", () => {
    it("should send the verification template with full_name and verification_page_link", async () => {
      // Act
      await sendMediaVerificationEmail(SETTINGS, { userId: "u-1", email: "media@example.com", firstName: "Jane" });

      // Assert
      expect(sendNotifyEmail).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        templateId: "1dea6b4b-48b6-4eb1-8b86-7031de5502d9",
        emailAddress: "media@example.com",
        personalisation: { full_name: "Jane", verification_page_link: "https://cath.test/media-verification" },
        reference: "inactive-media-verification-u-1"
      });
    });

    it.each([null, ""])("should fall back to 'user' when the first name is %j", async (firstName) => {
      // Act
      await sendMediaVerificationEmail(SETTINGS, { userId: "u-1", email: "media@example.com", firstName });

      // Assert
      expect(vi.mocked(sendNotifyEmail).mock.calls[0][0].personalisation).toMatchObject({ full_name: "user" });
    });
  });

  describe("sendMediaAccountDeletionEmail", () => {
    const deletedUser = { userId: "u-3", email: "deleted@example.com", firstName: "Jane", lastVerifiedDate: new Date("2025-03-20T10:00:00.000Z") };

    it("should send the deletion template with full-name, the re-verification date and link-to-service", async () => {
      // Act
      await sendMediaAccountDeletionEmail(SETTINGS, deletedUser, new Date("2026-03-05T00:00:00.000Z"));

      // Assert
      expect(sendNotifyEmail).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        templateId: "b08a6094-edc4-4d76-beca-f8937b63e879",
        emailAddress: "deleted@example.com",
        personalisation: { "full-name": "Jane", date: "05 March 2026", "link-to-service": "https://cath.test/create-media-account" },
        reference: "inactive-media-deletion-u-3"
      });
    });

    it.each([null, ""])("should fall back to 'user' when the first name is %j", async (firstName) => {
      // Act
      await sendMediaAccountDeletionEmail(SETTINGS, { ...deletedUser, firstName }, new Date("2026-03-05T00:00:00.000Z"));

      // Assert
      expect(vi.mocked(sendNotifyEmail).mock.calls[0][0].personalisation).toMatchObject({ "full-name": "user" });
    });

    it("should reject when Notify fails", async () => {
      // Arrange
      vi.mocked(sendNotifyEmail).mockRejectedValueOnce(new Error("Notify unavailable"));

      // Act & Assert
      await expect(sendMediaAccountDeletionEmail(SETTINGS, deletedUser, new Date("2026-03-05T00:00:00.000Z"))).rejects.toThrow("Notify unavailable");
    });
  });

  describe("sendIdamSignInNotificationEmail", () => {
    it.each([
      { userProvenance: "CFT_IDAM", templateId: "cca7ea18-4e6f-406f-b4d3-9e017cb53ee9" },
      { userProvenance: "CRIME_IDAM", templateId: "710a1ea4-226d-4e94-a8f7-5a102bb31612" }
    ])("should send the $userProvenance template with PIP's personalisation", async ({ userProvenance, templateId }) => {
      // Act
      await sendIdamSignInNotificationEmail(SETTINGS, {
        userId: "u-2",
        email: "idam@example.com",
        firstName: "John",
        surname: "Smith",
        userProvenance,
        lastSignedInDate: new Date("2026-03-05T23:30:00.000Z")
      });

      // Assert
      expect(sendNotifyEmail).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        templateId,
        emailAddress: "idam@example.com",
        personalisation: {
          full_name: "John Smith",
          last_signed_in_date: "05 March 2026",
          cft_sign_in_link: "https://cath.test/cft-login",
          crime_sign_in_link: "https://cath.test/crime-login"
        },
        reference: "inactive-idam-sign-in-u-2"
      });
    });

    it.each([
      { firstName: null, surname: null, expected: "user" },
      { firstName: "John", surname: null, expected: "John" },
      { firstName: null, surname: "Smith", expected: "Smith" }
    ])("should send full_name $expected for first name $firstName and surname $surname", async ({ firstName, surname, expected }) => {
      // Act
      await sendIdamSignInNotificationEmail(SETTINGS, {
        userId: "u-2",
        email: "idam@example.com",
        firstName,
        surname,
        userProvenance: "CFT_IDAM",
        lastSignedInDate: null
      });

      // Assert
      expect(vi.mocked(sendNotifyEmail).mock.calls[0][0].personalisation).toMatchObject({ full_name: expected, last_signed_in_date: "" });
    });
  });
});
