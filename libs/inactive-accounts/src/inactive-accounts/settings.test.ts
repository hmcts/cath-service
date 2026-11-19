import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getInactivitySettings } from "./settings.js";

const THRESHOLD_ENV_NAMES = [
  "MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS",
  "MEDIA_ACCOUNT_DELETION_DAYS",
  "AAD_ADMIN_ACCOUNT_DELETION_DAYS",
  "SSO_ADMIN_ACCOUNT_DELETION_DAYS",
  "CFT_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS",
  "CFT_IDAM_ACCOUNT_DELETION_DAYS",
  "CRIME_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS",
  "CRIME_IDAM_ACCOUNT_DELETION_DAYS"
];

describe("getInactivitySettings", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, INACTIVE_ACCOUNTS_START_DATE: "2026-12-01" };
    for (const name of THRESHOLD_ENV_NAMES) {
      delete process.env[name];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return PIP's defaults with separate AAD and SSO admin thresholds", () => {
    // Act
    const settings = getInactivitySettings();

    // Assert
    expect(settings).toEqual({
      mediaVerificationEmailDays: 350,
      mediaDeletionDays: 365,
      aadAdminDeletionDays: 90,
      ssoAdminDeletionDays: 90,
      cftSignInNotificationDays: 118,
      cftDeletionDays: 132,
      crimeSignInNotificationDays: 180,
      crimeDeletionDays: 208,
      startDate: new Date("2026-12-01T00:00:00.000Z")
    });
  });

  it("should apply overrides from the environment", () => {
    // Arrange
    process.env.MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS = "10";
    process.env.MEDIA_ACCOUNT_DELETION_DAYS = "20";
    process.env.AAD_ADMIN_ACCOUNT_DELETION_DAYS = "30";
    process.env.SSO_ADMIN_ACCOUNT_DELETION_DAYS = "40";
    process.env.CFT_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS = "50";
    process.env.CFT_IDAM_ACCOUNT_DELETION_DAYS = "60";
    process.env.CRIME_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS = "70";
    process.env.CRIME_IDAM_ACCOUNT_DELETION_DAYS = "80";

    // Act
    const settings = getInactivitySettings();

    // Assert
    expect(settings).toMatchObject({
      mediaVerificationEmailDays: 10,
      mediaDeletionDays: 20,
      aadAdminDeletionDays: 30,
      ssoAdminDeletionDays: 40,
      cftSignInNotificationDays: 50,
      cftDeletionDays: 60,
      crimeSignInNotificationDays: 70,
      crimeDeletionDays: 80
    });
  });

  it("should use the default when a threshold is set to an empty string", () => {
    // Arrange
    process.env.SSO_ADMIN_ACCOUNT_DELETION_DAYS = "";

    // Act & Assert
    expect(getInactivitySettings().ssoAdminDeletionDays).toBe(90);
  });

  it.each(["abc", "0", "-5", "1.5", "12days", " 30"])("should throw when a threshold is %j", (value) => {
    // Arrange
    process.env.CFT_IDAM_ACCOUNT_DELETION_DAYS = value;

    // Act & Assert
    expect(() => getInactivitySettings()).toThrow("CFT_IDAM_ACCOUNT_DELETION_DAYS must be a positive integer");
  });

  it("should throw when INACTIVE_ACCOUNTS_START_DATE is missing", () => {
    // Arrange
    delete process.env.INACTIVE_ACCOUNTS_START_DATE;

    // Act & Assert
    expect(() => getInactivitySettings()).toThrow("INACTIVE_ACCOUNTS_START_DATE is required (YYYY-MM-DD)");
  });

  it.each(["19/11/2026", "2026-11-19T00:00", "2026-1-19", "20261119"])("should throw when INACTIVE_ACCOUNTS_START_DATE has the wrong format %j", (value) => {
    // Arrange
    process.env.INACTIVE_ACCOUNTS_START_DATE = value;

    // Act & Assert
    expect(() => getInactivitySettings()).toThrow("INACTIVE_ACCOUNTS_START_DATE must be a date in the format YYYY-MM-DD");
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2025-02-29"])("should throw when INACTIVE_ACCOUNTS_START_DATE is not a real date %j", (value) => {
    // Arrange
    process.env.INACTIVE_ACCOUNTS_START_DATE = value;

    // Act & Assert
    expect(() => getInactivitySettings()).toThrow("INACTIVE_ACCOUNTS_START_DATE must be a real calendar date");
  });

  it("should parse a valid start date to UTC midnight regardless of the local time zone", () => {
    // Arrange
    const originalTz = process.env.TZ;
    process.env.TZ = "Pacific/Auckland";
    process.env.INACTIVE_ACCOUNTS_START_DATE = "2028-02-29";

    // Act
    const { startDate } = getInactivitySettings();

    // Assert
    expect(startDate.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    process.env.TZ = originalTz;
  });
});
