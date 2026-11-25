import { RESEND_ACTIONS, type ResendAction } from "@hmcts/publication";

const CONFIRM_PATH = "/blob-explorer-confirm-resubmission";
const SUCCESS_PATH = "/blob-explorer-resubmission-success";
const PRIMARY_BUTTON_CLASSES = "govuk-button";
const SECONDARY_BUTTON_CLASSES = "govuk-button govuk-button--secondary";

export function buildResendButtons(artefactId: string, locale: string, labels: Record<ResendAction, string>): ResendButton[] {
  return RESEND_ACTIONS.map((action, index) => ({
    text: labels[action],
    href: buildResendConfirmUrl(artefactId, action, locale),
    classes: index === 0 ? PRIMARY_BUTTON_CLASSES : SECONDARY_BUTTON_CLASSES
  }));
}

export function buildResendConfirmUrl(artefactId: string, action: ResendAction, locale: string): string {
  return `${CONFIRM_PATH}?${buildQuery({ artefactId, action }, locale)}`;
}

export function buildResendSuccessUrl(action: ResendAction, locale: string): string {
  return `${SUCCESS_PATH}?${buildQuery({ action }, locale)}`;
}

export function buildPublicationPageUrl(artefactId: string, artefactType: "json" | "flat-file", locale: string): string {
  const path = artefactType === "flat-file" ? "/blob-explorer-flat-file" : "/blob-explorer-json-file";
  return `${path}?${buildQuery({ artefactId }, locale)}`;
}

function buildQuery(params: Record<string, string>, locale: string): string {
  return new URLSearchParams(locale === "cy" ? { ...params, lng: "cy" } : params).toString();
}

export interface ResendButton {
  text: string;
  href: string;
  classes: string;
}
