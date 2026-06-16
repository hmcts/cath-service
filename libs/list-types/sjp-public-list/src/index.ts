// SJP Public List Module

export type { ValidationResult } from "@hmcts/publication";
// Content exports for pages
export { cy as sjpPublicListCy } from "./sjp-public-list/cy.js";
export { en as sjpPublicListEn } from "./sjp-public-list/en.js";
export { validateSjpPublicList } from "./validation/json-validator.js";
