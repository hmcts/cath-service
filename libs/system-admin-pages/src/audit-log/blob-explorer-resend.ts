import type {} from "@hmcts/auth";
import type { ChannelOutcome, ResendAction, ResendChannel, ResendResult } from "@hmcts/publication";
import { AuditLogAction, logAction } from "./logger.js";

const ACTION_BY_RESEND_ACTION: Record<ResendAction, AuditLogAction> = {
  resubmit: AuditLogAction.BLOB_EXPLORER_RESUBMISSION,
  courtel: AuditLogAction.BLOB_EXPLORER_SEND_TO_COURTEL,
  "third-party": AuditLogAction.BLOB_EXPLORER_SEND_TO_THIRD_PARTY,
  email: AuditLogAction.BLOB_EXPLORER_SEND_SUBSCRIPTION_EMAIL
};

const STATUS_LABELS: Record<ResendResult["status"], string> = {
  sent: "Completed successfully",
  "no-recipients": "No recipients",
  failed: "Failed",
  "not-found": "Failed"
};

const CHANNEL_LABELS: Record<ResendChannel, string> = {
  courtel: "Courtel",
  "third-party": "Third party",
  email: "Email"
};

const CHANNEL_ORDER: ResendChannel[] = ["courtel", "third-party", "email"];

// A failed audit write is logged and swallowed so the admin still sees the true send outcome
export async function recordBlobExplorerResend(user: Express.User | undefined, artefactId: string, action: ResendAction, result: ResendResult): Promise<void> {
  try {
    await logAction({
      userId: user?.id || "unknown",
      userEmail: user?.email || "unknown",
      userRole: user?.role || "SYSTEM_ADMIN",
      userProvenance: user?.provenance || "azure-ad",
      action: normaliseActionName(ACTION_BY_RESEND_ACTION[action]),
      details: buildDetails(artefactId, action, result)
    });
  } catch (error) {
    console.error("Failed to record Blob Explorer resend audit entry:", {
      artefactId,
      action,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Stored in the same normalised form auditLogMiddleware uses (e.g. BLOB_EXPLORER_RESUBMISSION)
function normaliseActionName(action: AuditLogAction): string {
  return action.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function buildDetails(artefactId: string, action: ResendAction, result: ResendResult): string {
  const parts = [`Artefact ID: ${artefactId}`, `Status: ${STATUS_LABELS[result.status]}`];

  if (result.status === "not-found") {
    parts.push("Reason: Publication not found");
  } else if (action === "resubmit") {
    const channelOutcomes = CHANNEL_ORDER.filter((channel) => result.channels[channel]).map(
      (channel) => `${CHANNEL_LABELS[channel]}: ${STATUS_LABELS[result.channels[channel] as ChannelOutcome]}`
    );
    parts.push(`Channels: ${channelOutcomes.join(", ")}`);
  }

  if (result.status !== "not-found" && result.emailCounts) {
    parts.push(`Emails sent: ${result.emailCounts.sent}, failed: ${result.emailCounts.failed}`);
  }

  return parts.join("; ");
}
