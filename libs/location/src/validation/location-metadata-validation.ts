import type { CreateLocationMetadataInput, UpdateLocationMetadataInput } from "../repository/model.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateLocationMetadataInput(data: CreateLocationMetadataInput | UpdateLocationMetadataInput): ValidationResult {
  const { cautionMessage, welshCautionMessage, noListMessage, welshNoListMessage } = data;

  const hasAtLeastOneMessage =
    (cautionMessage && cautionMessage.trim().length > 0) ||
    (welshCautionMessage && welshCautionMessage.trim().length > 0) ||
    (noListMessage && noListMessage.trim().length > 0) ||
    (welshNoListMessage && welshNoListMessage.trim().length > 0);

  if (!hasAtLeastOneMessage) {
    return {
      valid: false,
      error: "At least one message required"
    };
  }

  return { valid: true };
}
