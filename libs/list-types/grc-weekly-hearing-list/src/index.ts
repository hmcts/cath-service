import "./conversion/grc-config.js"; // Register converter on module load

// Business logic exports
export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export { cy as grcWeeklyHearingListCy } from "./locales/cy.js";
// Locale exports
export { en as grcWeeklyHearingListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateGrcWeeklyHearingList } from "./validation/json-validator.js";
