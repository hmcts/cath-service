import { findDisallowedHtmlTags } from "@hmcts/web-core";
import type { CreateLocationMetadataInput, UpdateLocationMetadataInput } from "../repository/model.js";

const MESSAGE_FIELD_LABELS: Record<MessageField, string> = {
  cautionMessage: "English caution message",
  welshCautionMessage: "Welsh caution message",
  noListMessage: "English no list message",
  welshNoListMessage: "Welsh no list message"
};

const MESSAGE_FIELDS = Object.keys(MESSAGE_FIELD_LABELS) as MessageField[];

export function validateLocationMetadataInput(data: CreateLocationMetadataInput | UpdateLocationMetadataInput): ValidationResult {
  const hasAtLeastOneMessage = MESSAGE_FIELDS.some((field) => {
    const value = data[field];
    return value && value.trim().length > 0;
  });

  if (!hasAtLeastOneMessage) {
    return {
      valid: false,
      error: "At least one message required"
    };
  }

  // These messages are rendered as markup on the public summary-of-publications page,
  // where the sanitiseHtml filter discards anything outside the allowlist. Rejecting here
  // as well means admins are told their markup will not appear, rather than having it
  // silently dropped at render time. Nothing is rewritten — the stored value stays exactly
  // as authored, so widening the allowlist later brings existing content back.
  for (const field of MESSAGE_FIELDS) {
    const value = data[field];

    if (!value) {
      continue;
    }

    const disallowedTags = findDisallowedHtmlTags(value);

    if (disallowedTags.length > 0) {
      return {
        valid: false,
        error: `${MESSAGE_FIELD_LABELS[field]} contains HTML tags which cannot be used: ${disallowedTags.join(", ")}`
      };
    }
  }

  return { valid: true };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

type MessageField = "cautionMessage" | "welshCautionMessage" | "noListMessage" | "welshNoListMessage";
