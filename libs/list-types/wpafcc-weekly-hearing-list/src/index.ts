import "./conversion/wpafcc-config.js"; // Register converter on module load

// Business logic exports
export type { ValidationResult } from "@hmcts/list-types-common";
export * from "./email-summary/summary-builder.js";
export { cy as wpafccWeeklyHearingListCy } from "./locales/cy.js";
// Locale exports
export { en as wpafccWeeklyHearingListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateWpafccWeeklyHearingList } from "./validation/json-validator.js";
