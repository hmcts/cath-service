import { sendNotifyEmail } from "@hmcts/govuk-notify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNotificationSettings, type NotificationSettings, sendIdamSignInNotificationEmail, sendMediaVerificationEmail } from "./notifications.js";

vi.mock("@hmcts/govuk-notify", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/govuk-notify")>()),
  sendNotifyEmail: vi.fn()
}));

const SETTINGS: NotificationSettings = {
  apiKey: "test-api-key",
  mediaVerificationPageLink: "https://cath.test/media-verification",
  cftSignInLink: "https://cath.test/cft-login",
  crimeSignInLink: "https://cath.test/crime-login"
};

describe("inactive account notifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MEDIA_VERIFICATION_PAGE_LINK;
    delete process.env.CFT_SIGN_IN_LINK;
    delete process.env.CRIME_SIGN_IN_LINK;
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
        crimeSignInLink: "https://cath.aat.platform.hmcts.net/crime-login"
      });
    });

    it("should use the link overrides without needing CATH_SERVICE_URL", () => {
      // Arrange
      process.env.GOVUK_NOTIFY_API_KEY = "key";
      delete process.env.CATH_SERVICE_URL;
      process.env.MEDIA_VERIFICATION_PAGE_LINK = "https://override/media";
      process.env.CFT_SIGN_IN_LINK = "https://override/cft";
      process.env.CRIME_SIGN_IN_LINK = "https://override/crime";

      // Act
      const settings = getNotificationSettings();

      // Assert
      expect(settings).toMatchObject({
        mediaVerificationPageLink: "https://override/media",
        cftSignInLink: "https://override/cft",
        crimeSignInLink: "https://override/crime"
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
