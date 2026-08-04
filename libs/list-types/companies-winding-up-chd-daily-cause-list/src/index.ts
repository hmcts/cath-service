import "./conversion/companies-winding-up-chd-daily-cause-list-config.js"; // Register converter on module load

// Re-exported under this list type's own name so libs/publication's PDF registry and the web
// controller continue to resolve it. The hearing shape lives in @hmcts/chd-kb-common and is
// shared with future list types using the same schema.
export type { ChdKbHearing as CompaniesWindingUpHearing, ChdKbHearingList as CompaniesWindingUpHearingList } from "@hmcts/chd-kb-common";
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
  validateChdKbListType as validateCompaniesWindingUpChdDailyCauseList
} from "@hmcts/chd-kb-common";
// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
export { cy as companiesWindingUpChdDailyCauseListCy } from "./locales/cy.js";
// Locale exports
export { en as companiesWindingUpChdDailyCauseListEn } from "./locales/en.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
