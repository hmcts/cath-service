# Implementation Plan: Issue #514

## Overview

Create four new magistrates' court hearing list types (MAGISTRATES_ADULT_COURT_LIST_DAILY, MAGISTRATES_ADULT_COURT_LIST_FUTURE, MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY, MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE) with full style guide, PDF, and email summary support. The four types split into two field-set variants (public: listing time, defendant name, case number; standard: ten fields including offences) and are all Classified/CRIME_IDAM. Each type lives in its own `libs/list-types/` package mirroring the one-module-per-list-type convention established by civil-daily-cause-list and sjp-press-list.

---

## Architecture Decisions (locked)

1. **Four separate modules** under `libs/list-types/` — one per list type — mirroring the existing convention. Shared rendering/email logic is factored into `libs/list-types/daily-cause-list-common/` or a new magistrates-specific shared helper inside that library, not by collapsing the four modules into one.

2. **Seed only** — register the four list types by adding entries with ids 28–31 to `libs/location/src/list-type-data.ts`. The existing `seedListTypes()` in `libs/location/src/seed-list-types.ts` upserts from that array on startup (skipped in prod and CI). No Prisma migration is written.

3. **Media-verified access (RESOLVED)** — media-verified users have provenance `PI_AAD`. AC6 requires both `CRIME_IDAM` and `PI_AAD` users to access the four Classified lists. The existing strict rule (`user.provenance === listType.provenance`) cannot satisfy this. Resolution: extend `canAccessPublication` to grant Classified access when the user's provenance is in an allow-list of provenances accepted by the list type, rather than a single strict match. `PI_AAD` must also be added to `VERIFIED_USER_PROVENANCES`. See the Access Control section.

4. **JSON payload field names (RESOLVED)** — use the authoritative pip-data-management schemas as source of truth:
   - Case number → `caseUrn` (NOT `caseNumber`)
   - Listing time / Block start → `sittingStart` (single field)
   - Defendant name → `individualDetails.individualForenames` + `individualSurname`, or `organisationDetails.organisationName`
   - Offence summary → `offenceWording` (NOT `offenceSummary`)
   - Offence code/title → `offenceCode` / `offenceTitle`
   - `offence` is an array nested under `party` (NOT directly on `case`)
   - `reportingRestriction` is a case-level property
   - **Informant has NO upstream property** — it must be omitted everywhere (schema, renderer, email).

5. **Reporting restriction text (RESOLVED)** — placeholder EN/CY strings with `// TODO` pending product sign-off.

---

## Acceptance Criteria Coverage

### AC1 — Register four list types, all Classified

**Approach:** Add four entries (ids 28–31) to `libs/location/src/list-type-data.ts`. The seed mechanism handles the rest.

**Files modified:**
- `libs/location/src/list-type-data.ts` — append four `ListTypeData` entries

**Analogue:** Entries 24–27 (SJP_PRESS_LIST through SJP_DELTA_PUBLIC_LIST) in the same file.

---

### AC2 — Correct field sets per list variant

**Approach:** The public lists (MAGISTRATES_PUBLIC_ADULT_COURT_LIST_*) render only: Listing Time, Defendant Name, Case Number. The standard lists (MAGISTRATES_ADULT_COURT_LIST_*) render: Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title, Offence Summary.

Each of the four modules has its own renderer that calls shared magistrates helpers (see Shared Logic section). The renderer for public lists extracts only the public field subset from the JSON payload. The renderer for standard lists extracts all ten fields. The Nunjucks templates in `apps/web/src/pages/(list-types)/` enforce the correct column set per list type.

**Files created per module (renderer):**
- `libs/list-types/magistrates-adult-court-list-daily/src/rendering/renderer.ts` (standard fields)
- `libs/list-types/magistrates-adult-court-list-future/src/rendering/renderer.ts` (standard fields)
- `libs/list-types/magistrates-public-adult-court-list-daily/src/rendering/renderer.ts` (public fields)
- `libs/list-types/magistrates-public-adult-court-list-future/src/rendering/renderer.ts` (public fields)

**Analogue:** `libs/list-types/civil-daily-cause-list/src/rendering/renderer.ts` which delegates to `renderCauseListData` from `@hmcts/daily-cause-list-common`.

---

### AC3 — Validation schema, style guide, PDF, email summary for all four types

**Approach:** Each module gets its own JSON schema, validator, PDF generator, email summary builder, and page controller+template. The public and standard schemas share the same structural envelope (`document`, `venue`, `courtLists`) but differ in the case-level fields required. The standard schema adds `dateOfBirth`, `address`, `age`, `informant`, `offenceCode`, `offenceTitle`, `offenceSummary` to the case object. The public schema requires only `caseNumber` and derives defendant name from the `DEFENDANT` party.

**Files created per module:**
- `src/schemas/<list-type-name>.json`
- `src/validation/json-validator.ts`
- `src/validation/json-validator.test.ts`
- `src/pdf/pdf-generator.ts`
- `src/pdf/pdf-generator.test.ts`
- `src/pdf/pdf-template.njk`

**Analogue:** `libs/list-types/civil-daily-cause-list/src/schemas/civil-daily-cause-list.json`, `src/validation/json-validator.ts`, `src/pdf/pdf-generator.ts`, `src/pdf/pdf-template.njk`.

---

### AC4 — Email summary: defendant name, informant, case number, offence title; subscription fulfilment

**Approach:** Each module's `email-summary/summary-builder.ts` exports `extractCaseSummary` and `formatCaseSummaryForEmail`. The extractor walks the JSON nested loops and for each case:
- resolves the DEFENDANT party via `extractParty(caseItem, "DEFENDANT")` from `@hmcts/daily-cause-list-common`
- pulls `informant`, `caseNumber`, and `offenceTitle` from the case payload
- returns a `CaseSummary[]` (array of `{ label, value }` arrays)

For public lists the informant and offence title fields are absent from the payload, so the email summary includes only defendant name and case number.

Subscription fulfilment is automatic once the list types are registered in `list-type-data.ts` — the `sendListTypePublicationNotifications` function in `libs/notifications/src/notification/notification-service.ts` looks up the list type name and routes through `EMAIL_BUILDER_REGISTRY`. New entries must be added to that registry (see Integration Points).

**Files created per module:**
- `src/email-summary/summary-builder.ts`
- `src/email-summary/summary-builder.test.ts`

**Analogue:** `libs/list-types/civil-daily-cause-list/src/email-summary/summary-builder.ts` which uses `extractParty` from `@hmcts/daily-cause-list-common` and `formatCaseSummaryForEmail` from `@hmcts/list-types-common`.

---

### AC5 — List manipulation; main party = DEFENDANT

**Approach:** The renderer for each module processes the JSON payload to produce a render model. The main party extraction uses `extractParty(caseItem, "DEFENDANT")` from `libs/list-types/daily-cause-list-common/src/email-summary/party-extractor.ts`. This function already handles both `individualDetails` and `organisationDetails` and concatenates multiple defendants with a comma.

For display, the renderer populates `caseItem.defendant` with the result. The Nunjucks template then reads `case.defendant` rather than the raw party array.

**Analogue:** `processParties()` in `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`, which mutates case items to add `applicant`, `respondent`, etc. The magistrates renderer follows the same pattern but targets the `DEFENDANT` role.

---

### AC6 — Crime IDAM and Media Verified users can access all four types

**Approach:** Set `provenance: "CRIME_IDAM"` and `defaultSensitivity: "Classified"` on all four list type entries. The existing `canAccessPublicationData` grants access when `user.provenance === listType.provenance`. CRIME_IDAM users pass. See the Risk section regarding B2C_IDAM (media-verified) users.

**No new auth code is written** — the same `canAccessPublicationData` call already used in `apps/web/src/pages/(list-types)/civil-daily-cause-list/index.ts` is replicated verbatim in each of the four new page controllers.

---

### AC7 — Welsh translations including all required terms and reporting restriction warnings

**Approach:** Each module's `locales/en.ts` and `locales/cy.ts` include all page-level text. The terms from the ticket are placed in the relevant locale files. Reporting restriction warning strings are co-located in the locale files as `reportingRestrictionWarning` (EN) and `reportingRestrictionWarningCy` (CY).

Welsh terms to include:
- Listing time → `Amser rhestru`
- Magistrates Public Adult Daily Court List → `Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion`
- Magistrates Adult Court List - Future → `Rhestr Llys Ynadon Oedolion – Dyfodol`
- Defendant Name → `Enw'r Diffynnydd`
- Case Number → `Rhif yr Achos`
- Sitting at → `Yn eistedd yn`
- Session start → `Amser Cychwyn y Sesiwn`

**Files created per module:**
- `src/locales/en.ts`
- `src/locales/cy.ts`

---

## New Modules

### 1. `libs/list-types/magistrates-adult-court-list-daily/`
**Package:** `@hmcts/magistrates-adult-court-list-daily`
**Field set:** STANDARD (Block Start, Defendant Name, Date of Birth, Address, Age, Informant, Case Number, Offence Code, Offence Title, Offence Summary)

```
libs/list-types/magistrates-adult-court-list-daily/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── models/
    │   └── types.ts                  # MagistratesStandardCase, MagistratesListData
    ├── schemas/
    │   └── magistrates-adult-court-list-daily.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   └── renderer.ts               # renderMagistratesStandardList()
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── pdf/
        ├── pdf-generator.ts
        ├── pdf-generator.test.ts
        └── pdf-template.njk
```

---

### 2. `libs/list-types/magistrates-adult-court-list-future/`
**Package:** `@hmcts/magistrates-adult-court-list-future`
**Field set:** STANDARD (same ten fields as daily)

```
libs/list-types/magistrates-adult-court-list-future/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── models/
    │   └── types.ts
    ├── schemas/
    │   └── magistrates-adult-court-list-future.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   └── renderer.ts
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── pdf/
        ├── pdf-generator.ts
        ├── pdf-generator.test.ts
        └── pdf-template.njk
```

---

### 3. `libs/list-types/magistrates-public-adult-court-list-daily/`
**Package:** `@hmcts/magistrates-public-adult-court-list-daily`
**Field set:** PUBLIC (Listing Time, Defendant Name, Case Number)

```
libs/list-types/magistrates-public-adult-court-list-daily/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── models/
    │   └── types.ts                  # MagistratesPublicCase, MagistratesPublicListData
    ├── schemas/
    │   └── magistrates-public-adult-court-list-daily.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   └── renderer.ts               # renderMagistratesPublicList()
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── pdf/
        ├── pdf-generator.ts
        ├── pdf-generator.test.ts
        └── pdf-template.njk
```

---

### 4. `libs/list-types/magistrates-public-adult-court-list-future/`
**Package:** `@hmcts/magistrates-public-adult-court-list-future`
**Field set:** PUBLIC (Listing Time, Defendant Name, Case Number)

```
libs/list-types/magistrates-public-adult-court-list-future/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── models/
    │   └── types.ts
    ├── schemas/
    │   └── magistrates-public-adult-court-list-future.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   └── renderer.ts
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── pdf/
        ├── pdf-generator.ts
        ├── pdf-generator.test.ts
        └── pdf-template.njk
```

---

## Shared Logic

### What goes into `libs/list-types/daily-cause-list-common/` (already exists)

The following from `daily-cause-list-common` is reused directly without modification:

| Utility | Import path | Used for |
|---|---|---|
| `extractParty(caseItem, "DEFENDANT")` | `@hmcts/daily-cause-list-common` | Resolving defendant name in both renderer and email builder |
| `createPartyDetails(party)` | `@hmcts/daily-cause-list-common` | Formatting individual/organisation name |
| `generateDailyCauseListPdf(...)` | `@hmcts/daily-cause-list-common` | PDF generation wrapper (if the standard magistrates layout is close enough to civil) |
| `CauseListData`, `CauseListCase`, `Party`, `Session`, `Sitting` | `@hmcts/daily-cause-list-common` | Base types that the magistrates models extend |

### What needs to be added to `daily-cause-list-common` or a new shared helper

The standard magistrates case has fields not present in the existing `CauseListCase` type (`dateOfBirth`, `address`, `age`, `informant`, `offenceCode`, `offenceTitle`, `offenceSummary`). Rather than polluting the existing common types, define these in each module's own `src/models/types.ts` by extending `CauseListCase` with the extra fields.

If the PDF template for both standard modules is identical (same ten columns), extract it to a single shared location to avoid duplication. The recommended approach is to place the standard magistrates PDF template inside the first standard module and have the second module import and reuse the same `generateMagistratesStandardPdf()` function from the first module. However, given the YAGNI principle and the fact that only two modules share it, simply duplicate the template and generator — keeping each module self-contained — is acceptable and avoids cross-module dependencies between list-type packages.

Similarly for the two public modules.

The `formatCaseSummaryForEmail` function comes from `@hmcts/list-types-common` and is reused as-is by all four modules' summary builders.

---

## List Type Registry

Add the following four entries at the end of `libs/location/src/list-type-data.ts`, after id 27:

```typescript
{
  id: 28,
  name: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  englishFriendlyName: "Magistrates Adult Court List - Daily",
  welshFriendlyName: "Rhestr Llys Ynadon Oedolion – Dyddiol",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-adult-court-list-daily",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [7]
},
{
  id: 29,
  name: "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  englishFriendlyName: "Magistrates Adult Court List - Future",
  welshFriendlyName: "Rhestr Llys Ynadon Oedolion – Dyfodol",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-adult-court-list-future",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [7]
},
{
  id: 30,
  name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  englishFriendlyName: "Magistrates Public Adult Court List - Daily",
  welshFriendlyName: "Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-public-adult-court-list-daily",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [7]
},
{
  id: 31,
  name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE",
  englishFriendlyName: "Magistrates Public Adult Court List - Future",
  welshFriendlyName: "Rhestr Achosion Dyfodol Cyhoeddus y Llys Ynadon – Oedolion",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-public-adult-court-list-future",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [7]
}
```

Note: Welsh friendly names for the two standard types and the future public type are not explicitly given in the ticket. The daily public CY name is provided (`Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion`). The other three should be confirmed with the ticket author; the values above are derived from the pattern and the partial Welsh terms provided.

---

## Integration Points (with exact file + variable names)

### PDF Generator Registry

**File:** `libs/publication/src/processing/service.ts`
**Variable:** `PDF_GENERATOR_REGISTRY` (type `Partial<Record<string, PdfGenerator>>`, line 55)

Add four import statements at the top of the file (mirroring the existing civil-daily-cause-list import):
```typescript
import { type MagistratesStandardListData, generateMagistratesAdultCourtListDailyPdf } from "@hmcts/magistrates-adult-court-list-daily";
import { type MagistratesStandardListData as MagistratesAdultFutureData, generateMagistratesAdultCourtListFuturePdf } from "@hmcts/magistrates-adult-court-list-future";
import { type MagistratesPublicListData, generateMagistratesPublicAdultCourtListDailyPdf } from "@hmcts/magistrates-public-adult-court-list-daily";
import { type MagistratesPublicListData as MagistratesPublicFutureData, generateMagistratesPublicAdultCourtListFuturePdf } from "@hmcts/magistrates-public-adult-court-list-future";
```

Add four entries to `PDF_GENERATOR_REGISTRY`:
```typescript
MAGISTRATES_ADULT_COURT_LIST_DAILY: (p) =>
  generateMagistratesAdultCourtListDailyPdf({ ...p, jsonData: p.jsonData as MagistratesStandardListData }),
MAGISTRATES_ADULT_COURT_LIST_FUTURE: (p) =>
  generateMagistratesAdultCourtListFuturePdf({ ...p, jsonData: p.jsonData as MagistratesAdultFutureData }),
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: (p) =>
  generateMagistratesPublicAdultCourtListDailyPdf({ ...p, jsonData: p.jsonData as MagistratesPublicListData }),
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: (p) =>
  generateMagistratesPublicAdultCourtListFuturePdf({ ...p, jsonData: p.jsonData as MagistratesPublicFutureData }),
```

---

### Email Builder Registry

**File:** `libs/notifications/src/notification/notification-service.ts`
**Variable:** `EMAIL_BUILDER_REGISTRY` (type `Partial<Record<string, EmailBuilderConfig>>`, line 60)

Add four import statements at the top of the file:
```typescript
import {
  extractCaseSummary as extractMagistratesAdultDailySummary,
  formatCaseSummaryForEmail as formatMagistratesAdultDailySummaryForEmail
} from "@hmcts/magistrates-adult-court-list-daily";
import {
  extractCaseSummary as extractMagistratesAdultFutureSummary,
  formatCaseSummaryForEmail as formatMagistratesAdultFutureSummaryForEmail
} from "@hmcts/magistrates-adult-court-list-future";
import {
  extractCaseSummary as extractMagistratesPublicDailySummary,
  formatCaseSummaryForEmail as formatMagistratesPublicDailySummaryForEmail
} from "@hmcts/magistrates-public-adult-court-list-daily";
import {
  extractCaseSummary as extractMagistratesPublicFutureSummary,
  formatCaseSummaryForEmail as formatMagistratesPublicFutureSummaryForEmail
} from "@hmcts/magistrates-public-adult-court-list-future";
```

Add four entries to `EMAIL_BUILDER_REGISTRY`:
```typescript
MAGISTRATES_ADULT_COURT_LIST_DAILY: {
  extract: extractMagistratesAdultDailySummary as SummaryExtractor,
  format: formatMagistratesAdultDailySummaryForEmail
},
MAGISTRATES_ADULT_COURT_LIST_FUTURE: {
  extract: extractMagistratesAdultFutureSummary as SummaryExtractor,
  format: formatMagistratesAdultFutureSummaryForEmail
},
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY: {
  extract: extractMagistratesPublicDailySummary as SummaryExtractor,
  format: formatMagistratesPublicDailySummaryForEmail
},
MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE: {
  extract: extractMagistratesPublicFutureSummary as SummaryExtractor,
  format: formatMagistratesPublicFutureSummaryForEmail
},
```

---

### App Registration — `apps/web/src/app.ts`

The pattern used for existing list-type modules is to add the `moduleRoot` to the `modulePaths` array (for Nunjucks template discovery). Pages live in `apps/web/src/pages/` and are auto-discovered by the existing `createSimpleRouter({ path: "${__dirname}/pages" })` call — no additional router registration is needed for the four new page directories.

Add four import statements alongside the existing list-type module imports:
```typescript
import { moduleRoot as magistratesAdultDailyModuleRoot } from "@hmcts/magistrates-adult-court-list-daily/config";
import { moduleRoot as magistratesAdultFutureModuleRoot } from "@hmcts/magistrates-adult-court-list-future/config";
import { moduleRoot as magistratesPublicDailyModuleRoot } from "@hmcts/magistrates-public-adult-court-list-daily/config";
import { moduleRoot as magistratesPublicFutureModuleRoot } from "@hmcts/magistrates-public-adult-court-list-future/config";
```

Add the four module roots to the `modulePaths` array (currently defined at line 88):
```typescript
const modulePaths = [
  __dirname,
  webCoreModuleRoot,
  // ... existing entries ...
  magistratesAdultDailyModuleRoot,
  magistratesAdultFutureModuleRoot,
  magistratesPublicDailyModuleRoot,
  magistratesPublicFutureModuleRoot
];
```

Note: Confirmed by reading `apps/web/src/app.ts` that the `modulePaths` array is only used by `configureGovuk()` for Nunjucks discovery. The list-type modules do not expose their own `pageRoutes` — pages live in `apps/web/src/pages/` and are auto-discovered. The `moduleRoot` import is needed if any module-level Nunjucks views/macros need discovery; if the new modules have no `src/views/` directory, this import may be omitted. Check after creating the modules.

---

### Vite Build Config — `apps/web/vite.build.ts`

Reading `apps/web/vite.build.ts` confirms that it reads asset entries only from `apps/web/src/assets/` (the local `assetsPath`). Module-level assets from libs are not imported here — there are no `assets` imports from any list-type module. The new magistrates modules do not need frontend assets (no custom CSS/JS), so **no changes are required** to `vite.build.ts`.

The Nunjucks templates in `apps/web/src/pages/(list-types)/` are handled by the `viteStaticCopy` plugin rule `src/pages/**/*.{njk,html}` already present in `vite.build.ts` — no change needed.

---

### Root `tsconfig.json` — path mappings

**File:** `/tsconfig.json` (root of repo)
**Section:** `compilerOptions.paths`

Add four new path entries (follow the pattern of existing list-type entries such as `@hmcts/sjp-press-list`):

```json
"@hmcts/magistrates-adult-court-list-daily": ["libs/list-types/magistrates-adult-court-list-daily/src"],
"@hmcts/magistrates-adult-court-list-daily/config": ["libs/list-types/magistrates-adult-court-list-daily/src/config"],
"@hmcts/magistrates-adult-court-list-future": ["libs/list-types/magistrates-adult-court-list-future/src"],
"@hmcts/magistrates-adult-court-list-future/config": ["libs/list-types/magistrates-adult-court-list-future/src/config"],
"@hmcts/magistrates-public-adult-court-list-daily": ["libs/list-types/magistrates-public-adult-court-list-daily/src"],
"@hmcts/magistrates-public-adult-court-list-daily/config": ["libs/list-types/magistrates-public-adult-court-list-daily/src/config"],
"@hmcts/magistrates-public-adult-court-list-future": ["libs/list-types/magistrates-public-adult-court-list-future/src"],
"@hmcts/magistrates-public-adult-court-list-future/config": ["libs/list-types/magistrates-public-adult-court-list-future/src/config"]
```

---

### Workspace package globs

**File:** `package.json` (root)

The workspace configuration already includes `"libs/list-types/*"` as a workspace glob. New packages under `libs/list-types/` are automatically picked up — **no change required** to root `package.json`.

---

## Validation Schemas

Both the public and standard schemas share the same structural skeleton as `civil-daily-cause-list.json` (`document`, `venue`, `courtLists` → `courtHouse` → `courtRoom` → `session` → `sittings` → `hearing` → `case` → `party[]`).

**Standard schema additions** (for MAGISTRATES_ADULT_COURT_LIST_*) at the `case` object level:
```json
"dateOfBirth": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
"address": { "$ref": "#/$defs/address" },
"age": { "type": "string" },
"informant": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
"offenceCode": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
"offenceTitle": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
"offenceSummary": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" }
```

**Public schema** (for MAGISTRATES_PUBLIC_ADULT_COURT_LIST_*) uses the base civil schema case object with only `caseNumber` and `party[]` (DEFENDANT); no offence fields.

Both schemas inherit the full `$defs` block (address, venueContact, judiciary) from the civil schema without modification.

The `party[]` array in the standard schema must include the partyRole pattern to accept `"DEFENDANT"` and `"INFORMANT"` values.

---

## Web Pages (style guides)

Create four page directories under `apps/web/src/pages/(list-types)/`:

```
apps/web/src/pages/(list-types)/
├── magistrates-adult-court-list-daily/
│   ├── index.ts                  # GET controller
│   ├── magistrates-adult-court-list-daily.njk
│   └── index.test.ts
├── magistrates-adult-court-list-future/
│   ├── index.ts
│   ├── magistrates-adult-court-list-future.njk
│   └── index.test.ts
├── magistrates-public-adult-court-list-daily/
│   ├── index.ts
│   ├── magistrates-public-adult-court-list-daily.njk
│   └── index.test.ts
└── magistrates-public-adult-court-list-future/
    ├── index.ts
    ├── magistrates-public-adult-court-list-future.njk
    └── index.test.ts
```

**URL paths** (derived from directory names, since `(list-types)` is a route group with no URL prefix):
- `/magistrates-adult-court-list-daily?artefactId=...`
- `/magistrates-adult-court-list-future?artefactId=...`
- `/magistrates-public-adult-court-list-daily?artefactId=...`
- `/magistrates-public-adult-court-list-future?artefactId=...`

**Controller pattern** — copy exactly from `apps/web/src/pages/(list-types)/civil-daily-cause-list/index.ts` and adapt:
1. Import the module's locale exports, renderer, and validator (e.g. `magistratesAdultCourtListDailyEn`, `renderMagistratesStandardList`, `validateMagistratesAdultCourtListDaily`)
2. Keep the identical artefact fetch, `canAccessPublicationData` check, file read, validation, render sequence
3. Pass locale-sensitive content (`en`, `cy`, `t`) and rendered data to the template

**Template pattern** — the public list template renders a three-column table (Listing Time, Defendant Name, Case Number). The standard list template renders a ten-column table. Both extend `layouts/base-template.njk` using `{% block page_content %}`.

---

## Access Control

### How `canAccessPublicationData` currently works for Classified publications

**File:** `libs/publication/src/authorisation/service.ts` (lines 53–58)

```typescript
if (sensitivity === Sensitivity.CLASSIFIED) {
  if (!isVerifiedUser(user)) return false;
  if (!listType) return false;
  return user!.provenance === listType.provenance;
}
```

`isVerifiedUser` accepts provenances `["B2C_IDAM", "CFT_IDAM", "CRIME_IDAM"]`.

For Classified publications, access is granted only when the user's provenance exactly matches the list type's `provenance` field.

### What this means for the four new list types

- **CRIME_IDAM users:** `user.provenance === "CRIME_IDAM"`, `listType.provenance === "CRIME_IDAM"` — access GRANTED. AC6 satisfied for Crime IDAM users.
- **B2C_IDAM users (media-verified):** `user.provenance === "B2C_IDAM"`, `listType.provenance === "CRIME_IDAM"` — access DENIED by the current logic.

### How SJP_PRESS_LIST handles this

SJP_PRESS_LIST has `provenance: "COMMON_PLATFORM"`. The SJP press list page controller in `apps/web/src/pages/(list-types)/sjp-press-list/index.ts` does NOT use `canAccessPublicationData` at all — it uses `prisma.artefact.findUnique` directly and performs no access check in the standard form. There is no special media-verified bypass in `canAccessPublicationData` for SJP_PRESS_LIST. The "media-verified access" referenced in the ticket for SJP_PRESS_LIST is handled at the application/service level differently from the pattern in `civil-daily-cause-list`.

### Risk (open)

The AC6 requirement that "both Crime IDAM and Media Verified users can access all 4 list types" cannot be satisfied by simply setting `provenance: "CRIME_IDAM"` and relying on the existing `canAccessPublicationData`. A B2C_IDAM (media-verified) user will be denied. **Before implementing**, the developer must confirm one of:

a. Whether the four new magistrates types should use a different provenance that media-verified users possess (e.g. `"B2C_IDAM"` — but then CRIME_IDAM-only users would be denied)
b. Whether `canAccessPublicationData` needs a new rule that grants access to `B2C_IDAM` users for Classified lists where `provenance === "CRIME_IDAM"` (i.e. an allow-list of provenances per list type, not a strict single match)
c. Whether "Media Verified" in the ticket refers to CRIME_IDAM users who have also completed media verification — i.e. they are still CRIME_IDAM provenance

Do not invent new auth logic without this confirmation. For now implement with `provenance: "CRIME_IDAM"` and document this gap in a code comment on the list-type-data entries.

---

## Welsh / English Content

### Locale file structure per module

Both `src/locales/en.ts` and `src/locales/cy.ts` in each module follow the same pattern as `libs/list-types/civil-daily-cause-list/src/locales/en.ts`:

```typescript
export const en = {
  title: "Magistrates Adult Court List - Daily",
  pageTitle: "Magistrates Adult Court List - Daily for",
  listFor: "List for",
  lastUpdated: "Last updated",
  listingTime: "Listing time",
  defendantName: "Defendant Name",
  caseNumber: "Case Number",
  blockStart: "Block Start",
  dateOfBirth: "Date of Birth",
  address: "Address",
  age: "Age",
  informant: "Informant",
  offenceCode: "Offence Code",
  offenceTitle: "Offence Title",
  offenceSummary: "Offence Summary",
  sittingAt: "Sitting at",
  sessionStart: "Session start",
  reportingRestrictions: "Reporting Restriction",
  reportingRestrictionWarning: "...",   // full EN warning text
  noHearings: "No hearings",
  dataSource: "Data Source",
  errorTitle: "Publication not available",
  errorMessage: "...",
  error403Title: "Access Denied",
  error403Message: "You do not have permission to view this publication."
};
```

The Welsh equivalent uses the provided terms plus confirmed translations for any fields not in the ticket.

**Reporting restriction warning text** is not specified verbatim in the ticket — it states "reporting restriction warnings provided in both English and Welsh." The implementer must obtain the exact EN and CY warning strings from the product team before finalising locale files. Placeholder strings should be added with a `// TODO` comment noting they require sign-off.

### Which locale keys belong in which module

Public list modules (magistrates-public-adult-court-list-*) include only: `listingTime`, `defendantName`, `caseNumber`, and the common header/error keys. They do not include `offenceCode`, `offenceTitle`, `offenceSummary`, `informant`, etc.

Standard list modules include all keys.

---

## Testing Approach

### Unit tests per module

Each module's tests are co-located with the source files. Minimum coverage for each module:

**`src/validation/json-validator.test.ts`** (AAA pattern):
- Valid payload passes validation
- Missing required top-level field (`document`, `venue`, `courtLists`) fails
- Invalid `publicationDate` format fails
- For standard modules: valid payload with all standard case fields passes
- For standard modules: case without `caseNumber` fails if required

**`src/email-summary/summary-builder.test.ts`**:
- `extractCaseSummary` returns correct fields for a case with a DEFENDANT party
- `extractCaseSummary` returns empty defendant when no DEFENDANT party present
- For standard modules: returned summary includes informant and offence title

**`src/rendering/renderer.ts`** (no test file needed for thin wrappers; if logic is non-trivial, add `renderer.test.ts`):
- Renderer correctly identifies defendant from party array
- Renderer populates standard fields from case payload

**`src/pdf/pdf-generator.test.ts`**:
- `generateXxxPdf` resolves without error given valid options
- Returns `{ success: false }` on generation error

### Web page controller tests

Each `apps/web/src/pages/(list-types)/<name>/index.test.ts` follows the pattern of `civil-daily-cause-list/index.test.ts` exactly:
- 400 when artefactId missing
- 404 when artefact not found
- 403 when `canAccessPublicationData` returns false
- 404 when JSON file cannot be read
- 400 when validation fails
- 200 with correct render call in English
- 200 with correct render call in Welsh
- 500 on unexpected error

These tests mock `@hmcts/postgres-prisma`, `@hmcts/publication`, `node:fs/promises`, and the relevant list-type module.

### E2E tests

There is no unauthenticated user journey for Classified lists (they require CRIME_IDAM login). E2E tests for these list types would require a test user with CRIME_IDAM provenance to be provisioned, which may not exist in the CI environment. If a suitable authenticated test journey can be set up:

Create one E2E test per field-set variant (public and standard), tagged `@nightly`, following the pattern in CLAUDE.md:
- Authenticated navigation to the list URL
- Verification of correct columns displayed
- Inline Welsh language check
- Inline axe accessibility check

If authenticated test users are not available, document this gap and limit coverage to unit tests.

---

## Implementation Order

1. **Add list type entries** to `libs/location/src/list-type-data.ts` (ids 28–31). Verify by running `yarn db:seed` locally and checking the `list_type` table.

2. **Add root `tsconfig.json` path mappings** for all eight new paths (four packages × two exports each). This unblocks TypeScript compilation for all subsequent steps.

3. **Create `libs/list-types/magistrates-public-adult-court-list-daily/`** — start with the simpler public field set:
   a. `package.json`, `tsconfig.json`
   b. `src/config.ts`, `src/index.ts`
   c. `src/locales/en.ts`, `src/locales/cy.ts`
   d. `src/models/types.ts` (public case model)
   e. `src/schemas/magistrates-public-adult-court-list-daily.json`
   f. `src/validation/json-validator.ts` + test
   g. `src/rendering/renderer.ts`
   h. `src/email-summary/summary-builder.ts` + test
   i. `src/pdf/pdf-generator.ts` + `pdf-template.njk` + test

4. **Create `libs/list-types/magistrates-public-adult-court-list-future/`** — identical structure to step 3, different schema filename and exports.

5. **Create `libs/list-types/magistrates-adult-court-list-daily/`** — standard field set:
   a–i same as step 3 but with the ten-field model and schema.

6. **Create `libs/list-types/magistrates-adult-court-list-future/`** — identical to step 5.

7. **Create web pages** under `apps/web/src/pages/(list-types)/`:
   - `magistrates-public-adult-court-list-daily/` (index.ts + njk + test)
   - `magistrates-public-adult-court-list-future/` (index.ts + njk + test)
   - `magistrates-adult-court-list-daily/` (index.ts + njk + test)
   - `magistrates-adult-court-list-future/` (index.ts + njk + test)

8. **Register modules in `apps/web/src/app.ts`** — add four `moduleRoot` imports and append to `modulePaths`.

9. **Register PDF generators** in `libs/publication/src/processing/service.ts` — add four imports and four entries to `PDF_GENERATOR_REGISTRY`.

10. **Register email builders** in `libs/notifications/src/notification/notification-service.ts` — add four imports and four entries to `EMAIL_BUILDER_REGISTRY`.

11. **Run `yarn build`** to verify the four new packages compile and the dependent apps pick them up.

12. **Run `yarn test`** to verify all unit tests pass including the existing tests for `libs/publication` and `libs/notifications` (which must not be broken by the new registry entries).

13. **Run `yarn lint:fix`** to resolve any Biome warnings.

---

## Risks / Open Questions

1. **Media-verified access (B2C_IDAM) for CRIME_IDAM Classified lists.** The existing `canAccessPublicationData` denies B2C_IDAM users from CRIME_IDAM lists (confirmed by reading `service.ts` line 57 and test at line 168). AC6 requires both Crime IDAM AND Media Verified users to have access. This cannot be satisfied without either a new auth rule or a different provenance strategy. Must be resolved with the product team before implementation of the page controllers.

2. **Welsh friendly names for ids 29, 31 (standard future and public future).** The ticket provides the Welsh name for the daily public list and the future list label, but not fully specified Welsh names for all four entries. The plan uses inferred values. Confirm with the team.

3. **Standard case field names in the JSON payload.** The ticket specifies field names for the display layer (Block Start, Date of Birth, Informant, Offence Code, Offence Title, Offence Summary) but does not specify the exact JSON property names in the Crime Portal/Libra payload. These must be confirmed against the actual payload schema before writing the JSON schemas and renderers. The plan assumes camelCase field names (`blockStart`, `dateOfBirth`, `informant`, `offenceCode`, `offenceTitle`, `offenceSummary`) as consistent with the existing cause-list conventions.

4. **Reporting restriction warning text (exact strings).** The ticket states "reporting restriction warnings provided in both English and Welsh" but does not include the verbatim text. Implementer must obtain these from the product team before finalising locale files.

5. **Email summary fields for public lists.** AC4 states email summaries display "defendant name, informant, case number and offence title." Public lists by definition do not carry informant or offence title in the payload. Confirm whether the email summary for public lists should simply omit these fields, or whether the requirement implies public lists will not have email subscriptions.

6. **SJP_PRESS_LIST page bypasses `canAccessPublicationData` entirely.** The `sjp-press-list` page controller does not call `canAccessPublicationData` — it only looks up the artefact directly via Prisma. This is inconsistent with the other list-type pages. The plan follows the `civil-daily-cause-list` pattern (which does use `canAccessPublicationData`) for the four new pages, not the SJP pattern, because the civil pattern is more secure and consistent. If the developer intended to follow the SJP controller pattern, this needs clarification.
