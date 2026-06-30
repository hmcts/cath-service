import "./conversion/utiac-jr-leeds-config.js"; // Register all UTIAC JR converters on module load

// Business logic exports
export type { ValidationResult } from "@hmcts/list-types-common";
export * from "./email-summary/summary-builder.js";
export { extractLondonCaseSummary } from "./email-summary/summary-builder-london.js";
// Locale exports — Birmingham
export { birminghamCy as utiacJrBirminghamDailyHearingListCy } from "./locales/birmingham-cy.js";
export { birminghamEn as utiacJrBirminghamDailyHearingListEn } from "./locales/birmingham-en.js";
// Locale exports — Cardiff
export { cardiffCy as utiacJrCardiffDailyHearingListCy } from "./locales/cardiff-cy.js";
export { cardiffEn as utiacJrCardiffDailyHearingListEn } from "./locales/cardiff-en.js";
// Locale exports — Leeds
export { baseCy as utiacJrDailyHearingListBaseCy, cy as utiacJrLeedsDailyHearingListCy } from "./locales/cy.js";
export { baseEn as utiacJrDailyHearingListBaseEn, en as utiacJrLeedsDailyHearingListEn } from "./locales/en.js";
// Locale exports — London
export { londonCy as utiacJrLondonDailyHearingListCy } from "./locales/london-cy.js";
export { londonEn as utiacJrLondonDailyHearingListEn } from "./locales/london-en.js";
// Locale exports — Manchester
export { manchesterCy as utiacJrManchesterDailyHearingListCy } from "./locales/manchester-cy.js";
export { manchesterEn as utiacJrManchesterDailyHearingListEn } from "./locales/manchester-en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export { generateUtiacJrLondonDailyHearingListPdf } from "./pdf/pdf-generator-london.js";
export * from "./rendering/renderer.js";
// Renderer aliases for regional variants
export {
  renderUtiacJrDailyHearingListData as renderUtiacJrBirminghamDailyHearingListData,
  renderUtiacJrDailyHearingListData as renderUtiacJrCardiffDailyHearingListData,
  renderUtiacJrDailyHearingListData as renderUtiacJrManchesterDailyHearingListData
} from "./rendering/renderer.js";
export { renderUtiacJrLondonDailyHearingListData } from "./rendering/renderer-london.js";
export { validateUtiacJrLeedsDailyHearingList } from "./validation/json-validator.js";
export { validateUtiacJrLondonDailyHearingList } from "./validation/json-validator-london.js";
