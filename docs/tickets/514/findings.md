# Codebase Findings: Issue #514

These findings were validated by directly reading the codebase (not inferred).

## List Type Registry

**File:** `libs/location/src/list-type-data.ts`

A flat `ListTypeData[]` array. Each entry:
```ts
interface ListTypeData {
  id: number;
  name: string;                 // SCREAMING_SNAKE_CASE code
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;           // e.g. "CRIME_IDAM", "CFT_IDAM", "COMMON_PLATFORM", "MANUAL_UPLOAD"
  urlPath?: string;             // kebab-case
  isNonStrategic: boolean;
  defaultSensitivity: string;   // "Public" | "Private" | "Classified"  (string literal, NOT an enum)
  shortenedFriendlyName?: string;
  subJurisdictionIds: number[];
}
```

Highest existing id is **27** (SJP_DELTA_PUBLIC_LIST). New magistrates list types take **ids 28–31**.

Closest existing references:
- **id 4 `MAGISTRATES_PUBLIC_LIST`** — provenance `CRIME_IDAM`, sensitivity `Public`, subJurisdictionIds `[7]`. Same court family.
- **id 24 `SJP_PRESS_LIST`** — provenance `COMMON_PLATFORM`, sensitivity **`Classified`**, has `shortenedFriendlyName`. The closest *Classified* example.

For #514 the four new types are all `provenance: "CRIME_IDAM"`, `defaultSensitivity: "Classified"`, `subJurisdictionIds: [7]` (magistrates sub-jurisdiction).

**Seed:** `libs/location/src/seed-list-types.ts` upserts the array into `list_types` table on app init (skipped in production). No manual migration needed for registry rows; check whether a migration is required for non-dev environments.

**Prisma model:** `ListType` in `libs/postgres-prisma/prisma/schema/location.prisma` — already exists, no schema change needed.

## Reference Module (copy this whole structure)

**`libs/list-types/civil-daily-cause-list/`** is the most complete reference. Structure:
```
src/
  config.ts                         # moduleRoot + assets paths
  index.ts                          # re-exports validator, renderer, pdf, email, locales, types
  locales/en.ts, locales/cy.ts      # list-type content; exported as <name>En / <name>Cy
  models/types.ts                   # TS types for the JSON payload + render model
  schemas/<name>.json               # JSON Schema for validation
  validation/json-validator.ts      # exports validate<Name>() -> ValidationResult
  validation/json-validator.test.ts
  rendering/renderer.ts             # transforms JSON -> render model (list manipulation)
  rendering/renderer.test.ts        # (in daily-cause-list-common)
  email-summary/summary-builder.ts  # extractCaseSummary / format for email
  email-summary/summary-builder.test.ts
  pdf/pdf-generator.ts              # wrapper around daily-cause-list-common pdf utils
  pdf/pdf-generator.test.ts
  pdf/pdf-template.njk              # PDF Nunjucks template
package.json, tsconfig.json
```

`index.ts` re-export pattern:
```ts
export type { ValidationResult } from "@hmcts/publication";
export * from "./email-summary/summary-builder.js";
export { cy as civilDailyCauseListCy } from "./locales/cy.js";
export { en as civilDailyCauseListEn } from "./locales/en.js";
export * from "./models/types.js";
export * from "./pdf/pdf-generator.js";
export * from "./rendering/renderer.js";
export { validateCivilDailyCauseList } from "./validation/json-validator.js";
```

`config.ts` pattern:
```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const moduleRoot = __dirname;
export const assets = path.join(__dirname, "../assets/");
```

## Shared Helpers

**`libs/list-types/daily-cause-list-common/`** provides shared rendering + PDF + party extraction:
- `src/rendering/renderer.ts` — shared cause-list render logic
- `src/pdf/pdf-generator.ts` — shared PDF generation
- `src/email-summary/party-extractor.ts` — `extractParty(caseItem, partyRole)` to pick a party by role. **AC: main party = party with `partyRole === "DEFENDANT"`.**
- `src/models/types.ts` — shared payload types

Magistrates lists differ in field sets (public vs standard), so a magistrates-specific renderer/model is likely needed even if it reuses common helpers.

## Validation Schemas

JSON Schema per list type at `src/schemas/<name>.json`. Validator at `src/validation/json-validator.ts` exports `validate<Name>(data): ValidationResult` using `@hmcts/publication` schema-validation util. Structure: `document` (publicationDate, documentName, version) + `courtLists[]` → courtHouse → courtRoom → session → sittings → hearing → `party[]` (partyRole DEFENDANT/PROSECUTOR/...) + `offence[]`.

## Style Guide Page (web)

**`apps/web/src/pages/(list-types)/<url-path>/`** with `index.ts` (GET controller) + `<name>.njk`.
Controller flow (from civil-daily-cause-list page):
1. read `artefactId` from query
2. `getArtefactById(artefactId)`
3. `canAccessPublicationData(req.user, artefact, listType)` authorization check
4. read JSON from upload storage `storage/temp/uploads/{artefactId}.json`
5. validate JSON
6. call renderer
7. `res.render(template, { en, cy, locale, ... })`

Pages are auto-discovered (no manual registration). The `(list-types)` parens = route group, no URL prefix; URL is the `<url-path>` directory name.

## PDF Registry (integration point)

**File:** `libs/publication/src/processing/service.ts` — VALIDATED to exist. Holds the PDF generator registry mapping list-type `name` → generator fn. Add 4 entries for the new list types.

## Email Notification Summary (integration point)

**File:** `libs/notifications/src/notification/notification-service.ts` — email builder registry mapping list-type `name` → `{ extract, format }`. Add 4 entries. **AC: email summary must show defendant name, informant, case number, offence title.**

Per-list-type extractor/formatter lives in `libs/list-types/<name>/src/email-summary/summary-builder.ts`.

## Subscription Fulfilment

**File:** `libs/subscriptions/src/repository/subscription-list-type-service.ts`. Subscriptions stored in `SubscriptionListType` (`subscription.prisma`) as `listTypeIds Int[]` + `listLanguage String[]`. Because subscriptions reference list-type IDs generically, registering the 4 new list types in the registry + seed is what makes them subscribable. Notification on publish: `libs/notifications` finds subscribers by list type + language and sends email using the email builder.

## Access Control / Sensitivity

**File:** `libs/publication/src/authorisation/service.ts` — `canAccessPublicationData(user, artefact, listType)`.
Rules (validated by reading the service):
- Public: everyone
- Private: verified users
- Classified: verified users + provenance match (user provenance === list type provenance)

For #514: sensitivity `Classified`, provenance `CRIME_IDAM`. Crime IDAM users (provenance CRIME_IDAM) get access. "Media Verified" users get access per the existing classified rules — **must confirm during implementation** that media-verified users are granted access to these CRIME_IDAM/Classified lists (AC requires BOTH Crime IDAM and Media Verified users can access). This may require adjusting the authorization rule for these list types if media-verified users do not have CRIME_IDAM provenance.

## Welsh / English Translations

`libs/list-types/<name>/src/locales/{en,cy}.ts` — mirrored objects. Ticket provides specific Welsh terms (Listing time = Amser rhestru, etc.) plus requires reporting-restriction warnings in EN + CY.

## Recommended Approach

Model the four new list types on **civil-daily-cause-list** (full module) for structure, and on **sjp-press-list** (id 24) for the **Classified** sensitivity + press/public split. Public vs standard field sets differ, so implement distinct render models:
- Public lists fields: Listing Time, Defendant Name, Case Number
- Standard lists fields: Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title, Offence Summary

## Open Questions for Plan/Implementation

1. Whether one shared "magistrates" module covers all 4 types (public/standard × daily/future) or 4 separate modules. Given public vs standard differ only in field sets, and daily vs future are the same shape, a **single `libs/list-types/magistrates-court-list` module with parameterised render** is more DRY. Confirm with developer.
2. Whether non-dev environments need a Prisma migration to insert the new `list_types` rows (seed only runs outside production).
3. Exact "Media Verified" access semantics for Classified CRIME_IDAM lists.
