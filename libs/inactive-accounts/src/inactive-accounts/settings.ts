const THRESHOLD_ENV_DEFAULTS = {
  mediaVerificationEmailDays: ["MEDIA_ACCOUNT_VERIFICATION_EMAIL_DAYS", 350],
  mediaDeletionDays: ["MEDIA_ACCOUNT_DELETION_DAYS", 365],
  aadAdminDeletionDays: ["AAD_ADMIN_ACCOUNT_DELETION_DAYS", 90],
  ssoAdminDeletionDays: ["SSO_ADMIN_ACCOUNT_DELETION_DAYS", 90],
  cftSignInNotificationDays: ["CFT_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS", 118],
  cftDeletionDays: ["CFT_IDAM_ACCOUNT_DELETION_DAYS", 132],
  crimeSignInNotificationDays: ["CRIME_IDAM_ACCOUNT_SIGN_IN_NOTIFICATION_DAYS", 180],
  crimeDeletionDays: ["CRIME_IDAM_ACCOUNT_DELETION_DAYS", 208]
} as const satisfies Record<string, readonly [string, number]>;

const START_DATE_ENV = "INACTIVE_ACCOUNTS_START_DATE";
// Fixed go-live date, not "today": a floor that moved with each run would make every user look
// active on the day of the run, so nobody would ever be reminded or deleted
const DEFAULT_START_DATE = "2026-11-19";
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export function getInactivitySettings(): InactivitySettings {
  const entries = Object.entries(THRESHOLD_ENV_DEFAULTS).map(([key, [envName, defaultDays]]) => [key, readThreshold(envName, defaultDays)]);
  const thresholds = Object.fromEntries(entries) as InactivityThresholds;

  return { ...thresholds, startDate: readStartDate() };
}

function readThreshold(envName: string, defaultDays: number): number {
  const value = process.env[envName];
  if (value === undefined || value === "") {
    return defaultDays;
  }

  if (!POSITIVE_INTEGER_PATTERN.test(value)) {
    throw new Error(`${envName} must be a positive integer`);
  }

  return Number(value);
}

function readStartDate(): Date {
  const value = process.env[START_DATE_ENV] || DEFAULT_START_DATE;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`${START_DATE_ENV} must be a date in the format YYYY-MM-DD`);
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${START_DATE_ENV} must be a real calendar date`);
  }

  return date;
}

type InactivityThresholds = Record<keyof typeof THRESHOLD_ENV_DEFAULTS, number>;

export interface InactivitySettings extends InactivityThresholds {
  startDate: Date;
}
