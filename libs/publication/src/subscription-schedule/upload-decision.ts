import { getLondonDay } from "./london-day.js";
import { SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } from "./scheduled-list-types.js";

// Uses the same London day as the crons so a publication is notified exactly once, either here or by a cron.
export function getUploadSubscriptionDecision(publication: UploadedPublication, now: Date): UploadSubscriptionDecision {
  const { start, end } = getLondonDay(now);

  if (publication.displayFrom && publication.displayFrom >= end) {
    return { notifyEmail: false, pushThirdParty: false, reason: "FUTURE_DISPLAY_FROM" };
  }

  if (publication.displayTo && publication.displayTo < start) {
    return { notifyEmail: false, pushThirdParty: false, reason: "EXPIRED" };
  }

  if (publication.listTypeName === undefined) {
    return { notifyEmail: false, pushThirdParty: true, reason: "LIST_TYPE_UNKNOWN" };
  }

  // The scheduled-list-type cron is email only, so third parties are still pushed at upload.
  if (SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES.includes(publication.listTypeName)) {
    return { notifyEmail: false, pushThirdParty: true, reason: "SCHEDULED_LIST_TYPE" };
  }

  return { notifyEmail: true, pushThirdParty: true };
}

interface UploadedPublication {
  displayFrom?: Date | null;
  displayTo?: Date | null;
  listTypeName?: string;
}

export interface UploadSubscriptionDecision {
  notifyEmail: boolean;
  pushThirdParty: boolean;
  reason?: UploadSkipReason;
}

type UploadSkipReason = "FUTURE_DISPLAY_FROM" | "EXPIRED" | "LIST_TYPE_UNKNOWN" | "SCHEDULED_LIST_TYPE";
