import type { CreateLocationMetadataInput, UpdateLocationMetadataInput } from "../repository/model.js";

const HTML_TAG_REGEX = /<[^<>]*>/;

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

  // These messages are rendered on the public summary-of-publications page. Rejecting
  // tags on write keeps stored data plain text, so the template's autoescaping is not
  // the only thing standing between an admin-authored string and a script execution.
  const fieldWithTag = MESSAGE_FIELDS.find((field) => {
    const value = data[field];
    return value && HTML_TAG_REGEX.test(value);
  });

  if (fieldWithTag) {
    return {
      valid: false,
      error: `${MESSAGE_FIELD_LABELS[fieldWithTag]} contains HTML tags which are not allowed`
    };
  }

  return { valid: true };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

type MessageField = "cautionMessage" | "welshCautionMessage" | "noListMessage" | "welshNoListMessage";
