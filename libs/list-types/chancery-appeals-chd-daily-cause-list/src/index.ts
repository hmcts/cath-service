import "./conversion/chancery-appeals-chd-daily-cause-list-config.js"; // Register converter on module load

// Re-exported under this list type's own name so libs/publication's PDF registry and the web
// controller continue to resolve it. The hearing shape lives in @hmcts/chd-kb-common and is
// shared with other CHD/KB list types using the same schema.
export type { ChdKbHearing as ChanceryAppealsChdHearing, ChdKbHearingList as ChanceryAppealsChdHearingList } from "@hmcts/chd-kb-common";
// Re-exported so the dynamic list-type validator dispatcher (which imports this package by name and
// looks for a validate* export) continues to resolve a validator, and so libs/notifications (which
// imports the email summary by package name) resolves a summary builder. The schema and summary
// logic live in @hmcts/chd-kb-common and are shared with other CHD/KB list types.
export {
  extractCaseSummary,
  formatCaseSummaryForEmail,
  SPECIAL_CATEGORY_DATA_WARNING,
  validateChdKbListType as validateChanceryAppealsChdDailyCauseList
} from "@hmcts/chd-kb-common";
// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
export { cy as chanceryAppealsChdDailyCauseListCy } from "./locales/cy.js";
// Locale exports
export { en as chanceryAppealsChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
