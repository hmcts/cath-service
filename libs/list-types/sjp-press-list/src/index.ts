// SJP Press List Module

export type { ValidationResult } from "@hmcts/publication";
// Content exports for pages
export { cy as sjpPressListCy } from "./sjp-press-list/cy.js";
export { en as sjpPressListEn } from "./sjp-press-list/en.js";
export { validateSjpPressList } from "./validation/json-validator.js";
