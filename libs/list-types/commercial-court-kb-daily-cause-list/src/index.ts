import "./conversion/commercial-court-kb-daily-cause-list-config.js"; // Register converter on module load

// Re-exported under this list type's own name so libs/publication's PDF registry and the web
// controller continue to resolve it. The hearing shape lives in @hmcts/chd-kb-common and is
// shared with future list types using the same schema.
export type { ChdKbHearing as CommercialCourtKbHearing, ChdKbHearingList as CommercialCourtKbHearingList } from "@hmcts/chd-kb-common";
// Re-exported so the dynamic list-type validator dispatcher (which imports this package
// by name and looks for a validate* export) continues to resolve a validator. The
// schema itself lives in @hmcts/chd-kb-common and is shared with future list types.
// Re-exported so libs/notifications (which imports these by package name) continues to
// resolve an email summary builder. The summary logic lives in @hmcts/chd-kb-common and
// is shared with future list types using the same schema.
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateCommercialCourtKbDailyCauseList
} from "@hmcts/chd-kb-common";
// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
export { cy as commercialCourtKbDailyCauseListCy } from "./locales/cy.js";
// Locale exports
export { en as commercialCourtKbDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
