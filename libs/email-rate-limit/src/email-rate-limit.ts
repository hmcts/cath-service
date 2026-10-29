import { tryConsumeToken } from "@hmcts/redis";

const KEY_PREFIX = "email-rate-limit";
const DEFAULT_STANDARD_CAPACITY = 10;
const DEFAULT_HIGH_CAPACITY = 200;
const DEFAULT_INTERVAL_MINUTES = 30;
const MS_PER_MINUTE = 60_000;

const LIMIT_KEY_PREFIX: Record<EmailLimit, string> = {
  STANDARD: "1",
  HIGH: "2"
};

export async function validateEmailRateLimit(email: string, emailLimit: EmailLimit, description: string): Promise<void> {
  const isWithinLimit = await tryConsumeToken(`${KEY_PREFIX}:${LIMIT_KEY_PREFIX[emailLimit]}::${email.toLowerCase()}`, {
    capacity: getCapacity(emailLimit),
    refillPeriodMs: getIntervalMinutes() * MS_PER_MINUTE
  });

  if (!isWithinLimit) {
    throw new Error(`Rate limit has been exceeded. ${description} failed to be sent to ${maskEmail(email)}`);
  }
}

function getCapacity(emailLimit: EmailLimit): number {
  return emailLimit === "STANDARD"
    ? parsePositiveInt(process.env.STANDARD_MAX_EMAILS, DEFAULT_STANDARD_CAPACITY)
    : parsePositiveInt(process.env.HIGH_CAPACITY_MAX_EMAILS, DEFAULT_HIGH_CAPACITY);
}

function getIntervalMinutes(): number {
  return parsePositiveInt(process.env.EMAIL_RATE_LIMIT_INTERVAL, DEFAULT_INTERVAL_MINUTES);
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

function maskEmail(email: string): string {
  return email.replace(/^([^@])([^@]*)/, (_match, first: string, rest: string) => first + "*".repeat(rest.length));
}

export type EmailLimit = "STANDARD" | "HIGH";
