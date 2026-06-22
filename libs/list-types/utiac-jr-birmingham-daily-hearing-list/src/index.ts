import "./conversion/utiac-jr-birmingham-config.js"; // Register converter on module load

// Business logic exports
export type { ValidationResult } from "@hmcts/list-types-common";
export * from "./email-summary/summary-builder.js";
export { cy as utiacJrBirminghamDailyHearingListCy } from "./locales/cy.js";
// Locale exports
export { en as utiacJrBirminghamDailyHearingListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateUtiacJrBirminghamDailyHearingList } from "./validation/json-validator.js";
