import { randomUUID } from "node:crypto";
import { isEmailRateLimitError } from "@hmcts/email-rate-limit";
import { extractNotifyError, GOVUK_NOTIFY_TEMPLATE_ID_OTP, sendNotifyEmail } from "@hmcts/govuk-notify";
import { getApiKey } from "../notify-templates/template-config.js";

const OTP_EMAIL_DESCRIPTION = "B2C OTP email";
const OTP_EMPTY_MESSAGE = "otp must not be empty";
const EMAIL_INVALID_MESSAGE = "email must be a valid email address";
// Ported from Hibernate Validator's @Email (AbstractEmailValidator, DomainNameUtil), which pip
// uses. Quoted local parts and IP-literal domains are left out: B2C cannot create such accounts.
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 255;
const LOCAL_PART_ATOM = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uFFFF-]+";
const DOMAIN_CHARS = "[a-z\\u0080-\\uFFFF0-9!#$%&'*+/=?^_`{|}~]+";
const DOMAIN_LABEL = `${DOMAIN_CHARS}(?:-+${DOMAIN_CHARS})*`;
const LOCAL_PART_PATTERN = new RegExp(`^${LOCAL_PART_ATOM}(?:\\.${LOCAL_PART_ATOM})*$`, "i");
const DOMAIN_PATTERN = new RegExp(`^${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})*$`, "i");

// The OTP and recipient address are never logged; the masked address only reaches the caller
// through the rate-limit message.
export async function sendOtpEmail(request: unknown): Promise<OtpEmailResult> {
  const validation = validateOtpEmailRequest(request);
  if (!validation.isValid) {
    return { outcome: "VALIDATION_ERROR", message: validation.message };
  }

  // pip generates its own reference, sends it to Notify and returns it to the caller.
  const referenceId = randomUUID();

  try {
    const { notificationId } = await sendNotifyEmail({
      apiKey: getApiKey(),
      templateId: GOVUK_NOTIFY_TEMPLATE_ID_OTP,
      emailAddress: validation.email,
      personalisation: { otp: validation.otp },
      emailLimit: "HIGH",
      emailDescription: OTP_EMAIL_DESCRIPTION,
      reference: referenceId
    });

    console.info("OTP email sent", { notificationId, referenceId });
    return { outcome: "SENT", referenceId };
  } catch (error) {
    if (isEmailRateLimitError(error)) {
      console.info("OTP email rate limited");
      return { outcome: "RATE_LIMITED", message: (error as Error).message };
    }

    const { status, message } = extractNotifyError(error);
    if (status > 0) {
      console.error("OTP email failed", { status, message });
      return { outcome: "NOTIFY_ERROR", message };
    }

    throw error;
  }
}

function validateOtpEmailRequest(request: unknown): OtpEmailValidation {
  const body = isPlainObject(request) ? request : {};
  const { otp, email } = body;

  const messages = [
    ...(typeof otp === "string" && otp.length > 0 ? [] : [OTP_EMPTY_MESSAGE]),
    ...(typeof email === "string" && isValidEmailAddress(email.trim()) ? [] : [EMAIL_INVALID_MESSAGE])
  ];

  if (messages.length > 0) {
    return { isValid: false, message: messages.join(", ") };
  }

  return { isValid: true, otp: otp as string, email: (email as string).trim() };
}

function isValidEmailAddress(email: string): boolean {
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 0) {
    return false;
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  return localPart.length <= MAX_LOCAL_PART_LENGTH && LOCAL_PART_PATTERN.test(localPart) && domain.length <= MAX_DOMAIN_LENGTH && DOMAIN_PATTERN.test(domain);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type OtpEmailValidation = { isValid: true; otp: string; email: string } | { isValid: false; message: string };

export type OtpEmailResult =
  | { outcome: "SENT"; referenceId: string }
  | { outcome: "VALIDATION_ERROR"; message: string }
  | { outcome: "RATE_LIMITED"; message: string }
  | { outcome: "NOTIFY_ERROR"; message: string };
