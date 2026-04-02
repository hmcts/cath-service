import { countEmailsSentInWindow } from "../notification/notification-queries.js";
import { TooManyEmailsException } from "./too-many-emails-exception.js";

const RATE_LIMIT_DEFAULTS: Record<string, RateLimitDefaults> = {
  SUBSCRIPTION: {
    maxEnvVar: "RATE_LIMIT_SUBSCRIPTION_MAX",
    defaultMax: 100,
    windowEnvVar: "RATE_LIMIT_SUBSCRIPTION_WINDOW_MS",
    defaultWindowMs: 3600000,
    isCritical: false
  },
  MEDIA_APPROVAL: {
    maxEnvVar: "RATE_LIMIT_MEDIA_APPROVAL_MAX",
    defaultMax: 5,
    windowEnvVar: "RATE_LIMIT_MEDIA_APPROVAL_WINDOW_MS",
    defaultWindowMs: 86400000,
    isCritical: true
  },
  MEDIA_REJECTION: {
    maxEnvVar: "RATE_LIMIT_MEDIA_REJECTION_MAX",
    defaultMax: 5,
    windowEnvVar: "RATE_LIMIT_MEDIA_REJECTION_WINDOW_MS",
    defaultWindowMs: 86400000,
    isCritical: true
  }
};

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return "***@***";
  }
  return `${parts[0][0]}***@${parts[1]}`;
}

export async function checkEmailRateLimit(userId: string, email: string, emailType: string): Promise<void> {
  const defaults = RATE_LIMIT_DEFAULTS[emailType];
  if (!defaults) {
    return;
  }

  const config = resolveConfig(defaults);
  const windowStart = new Date(Date.now() - config.windowMs);
  const count = await countEmailsSentInWindow(userId, emailType, windowStart);

  if (count >= config.maxEmails) {
    const maskedEmail = maskEmail(email);
    if (config.isCritical) {
      throw new TooManyEmailsException(maskedEmail, emailType);
    }
    throw new Error(`Rate limit exceeded: ${emailType} emails to ${maskedEmail} (userId: ${userId}). Limit: ${config.maxEmails} per ${config.windowMs}ms`);
  }
}

function resolveConfig(defaults: RateLimitDefaults): RateLimitConfig {
  const maxParsed = Number.parseInt(process.env[defaults.maxEnvVar] ?? "", 10);
  const windowParsed = Number.parseInt(process.env[defaults.windowEnvVar] ?? "", 10);
  return {
    maxEmails: Number.isNaN(maxParsed) ? defaults.defaultMax : maxParsed,
    windowMs: Number.isNaN(windowParsed) ? defaults.defaultWindowMs : windowParsed,
    isCritical: defaults.isCritical
  };
}

interface RateLimitConfig {
  maxEmails: number;
  windowMs: number;
  isCritical: boolean;
}

interface RateLimitDefaults {
  maxEnvVar: string;
  defaultMax: number;
  windowEnvVar: string;
  defaultWindowMs: number;
  isCritical: boolean;
}
