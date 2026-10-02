import "./conversion/interim-applications-chd-daily-cause-list-config.js"; // Register converter on module load

// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
// Email summary (object-shaped jsonData, so extract reads data.hearingList)
export { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./email-summary/summary-builder.js";
export { cy as interimApplicationsChdDailyCauseListCy } from "./locales/cy.js";
// Locale exports
export { en as interimApplicationsChdDailyCauseListEn } from "./locales/en.js";
export type { InterimApplicationHearing, InterimApplicationsChdData, OpenJusticeStatementDetail } from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateInterimApplicationsChdDailyCauseList } from "./validation/json-validator.js";
