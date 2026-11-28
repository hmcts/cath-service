import { archiveAndDeleteUser, type B2cUserDeleter } from "@hmcts/account/user-archive";
import { deleteB2cUser, getGraphApiAccessToken } from "@hmcts/auth/graph-api";
import { EMAIL_RATE_LIMITED } from "@hmcts/email-rate-limit";
import { extractNotifyError, isInvalidEmailAddressError } from "@hmcts/govuk-notify";
import { verificationEmailDate } from "./date-boundaries.js";
import { getNotificationSettings, sendIdamSignInNotificationEmail, sendMediaAccountDeletionEmail, sendMediaVerificationEmail } from "./notifications.js";
import {
  findAdminUsersForDeletion,
  findIdamUsersForDeletion,
  findIdamUsersForSignInNotification,
  findMediaUsersForDeletion,
  findMediaUsersForVerification,
  type UserId
} from "./queries.js";
import { getInactivitySettings } from "./settings.js";

const PRISMA_ERROR_CODE_PATTERN = /^P\d{4}$/;

export async function processInactiveAccounts(): Promise<InactiveAccountsSummary> {
  const settings = getInactivitySettings();
  const notificationSettings = getNotificationSettings();
  const runDate = new Date();
  const deleteFromB2c = createLazyB2cDeleter();
  const archiveAndDelete = (user: UserId) => archiveAndDeleteUser(user.userId, deleteFromB2c);

  const mediaVerificationEmails = await runStep(
    "media-verification-email",
    (after) => findMediaUsersForVerification(settings, runDate, after),
    async (user) => {
      await sendMediaVerificationEmail(notificationSettings, user);
      return true;
    }
  );

  const idamSignInEmails = await runStep(
    "idam-sign-in-email",
    (after) => findIdamUsersForSignInNotification(settings, runDate, after),
    async (user) => {
      await sendIdamSignInNotificationEmail(notificationSettings, user);
      return true;
    }
  );

  const mediaDeletions = await runStep(
    "media-deletion",
    (after) => findMediaUsersForDeletion(settings, runDate, after),
    // The email goes first because the address is gone once the account is deleted, so a failed send keeps the account for the next run.
    // The exception is an address Notify rejects as invalid: no retry can succeed, so keeping the account would hold its data past retention.
    async (user) => {
      const reVerificationEmailDate = verificationEmailDate(user.lastVerifiedDate, settings.mediaVerificationEmailDays, settings.startDate);
      try {
        await sendMediaAccountDeletionEmail(notificationSettings, user, reVerificationEmailDate);
      } catch (error) {
        if (!isInvalidEmailAddressError(error)) {
          throw error;
        }
        console.warn("Inactive accounts: deleting without the deletion email because Notify rejected the address", {
          step: "media-deletion",
          userId: user.userId,
          ...describeError(error)
        });
      }
      return archiveAndDelete(user);
    }
  );

  const adminDeletions = await runStep("admin-deletion", (after) => findAdminUsersForDeletion(settings, runDate, after), archiveAndDelete);

  const idamDeletions = await runStep("idam-deletion", (after) => findIdamUsersForDeletion(settings, runDate, after), archiveAndDelete);

  return { mediaVerificationEmails, idamSignInEmails, mediaDeletions, adminDeletions, idamDeletions };
}

function createLazyB2cDeleter(): B2cUserDeleter {
  let accessToken: Promise<string> | undefined;
  return async (b2cUserId) => {
    accessToken ??= getGraphApiAccessToken();
    await deleteB2cUser(await accessToken, b2cUserId);
  };
}

// Each user is handled on its own so that one failure does not stop the rest of the step
async function runStep<T extends UserId>(
  step: string,
  findBatch: (afterUserId?: string) => Promise<T[]>,
  handleUser: (user: T) => Promise<boolean>
): Promise<StepResult> {
  const result: StepResult = { succeeded: 0, skipped: 0, failed: 0 };
  let afterUserId: string | undefined;

  for (let batch = await findBatch(); batch.length > 0; batch = await findBatch(afterUserId)) {
    for (const user of batch) {
      try {
        const isHandled = await handleUser(user);
        result[isHandled ? "succeeded" : "skipped"]++;
      } catch (error) {
        result.failed++;
        console.error("Inactive accounts: failed to process user", { step, userId: user.userId, ...describeError(error) });
      }
    }
    afterUserId = batch[batch.length - 1].userId;
  }

  return result;
}

// Never log the raw error: Notify errors carry the API key in their request headers, Prisma
// messages can echo query arguments and rate-limit messages contain a masked recipient email,
// so only the status, code and a short message are kept
function describeError(error: unknown): { status?: number; code?: string; message: string } {
  if (!error || typeof error !== "object") {
    return { message: "Unknown error" };
  }

  const code = (error as { code?: unknown }).code;
  if (code === EMAIL_RATE_LIMITED) {
    return { code, message: "Email rate limit exceeded" };
  }

  if (typeof code === "string" && PRISMA_ERROR_CODE_PATTERN.test(code)) {
    const lines = (error as Error).message?.split("\n").filter((line) => line.trim() !== "") ?? [];
    return { code, message: lines.at(-1)?.trim() ?? "Unknown error" };
  }

  const { status, message } = extractNotifyError(error);
  return status ? { status, message } : { message };
}

interface StepResult {
  succeeded: number;
  skipped: number;
  failed: number;
}

export interface InactiveAccountsSummary {
  mediaVerificationEmails: StepResult;
  idamSignInEmails: StepResult;
  mediaDeletions: StepResult;
  adminDeletions: StepResult;
  idamDeletions: StepResult;
}
