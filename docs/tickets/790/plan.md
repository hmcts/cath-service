# Technical Plan: #790 — Magistrates Public Adult Court List (Daily & Future)

## 1. Technical Approach

Create a new list-type library `libs/list-types/magistrates-public-adult-court-list/` that implements both `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`. Both list types share the same JSON payload structure, schema, rendering logic, PDF template, and email summary — they differ only in their identifier, display name, and content date semantics.

The implementation follows the exact same pattern as `libs/list-types/magistrates-public-list/`, which is the closest existing reference. Key differences from the existing magistrates-public-list:
- Different list type identifiers (Daily and Future variants)
- Different data fields displayed: **Listing Time, Defendant Name, Case Number** (no offences, no hearing type, no prosecuting authority)
- Different table column structure (Sitting at / Session start headings rather than court room/session accordion)
- Email summary shows only Defendant Name and Case Number

## 2. Implementation Details

### File Structure

```
libs/list-types/magistrates-public-adult-court-list/
├── package.json                 # @hmcts/magistrates-public-adult-court-list
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── schemas/
    │   └── magistrates-public-adult-court-list.json   # ported from pip-data-management
    ├── rendering/
    │   ├── renderer.ts          # list manipulation + header building
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-template.njk
    │   └── pdf-generator.test.ts
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    └── locales/
        ├── en.ts
        └── cy.ts

apps/web/src/pages/(list-types)/
├── magistrates-public-adult-court-list-daily/
│   ├── index.ts
│   └── magistrates-public-adult-court-list-daily.njk
└── magistrates-public-adult-court-list-future/
    ├── index.ts
    └── magistrates-public-adult-court-list-future.njk
```

### Key Data Fields (per ticket AC)

The style guide must display three columns:
- **Listing Time** — from `sittingStart` on each sitting
- **Defendant Name** — from party with `partyRole === "DEFENDANT"`, formatted as `SURNAME, Forename`
- **Case Number** — from `caseUrn` on each case

Grouped by "Sitting at" (court house name) → "Session start" (session start time).

### Schema (src/schemas/magistrates-public-adult-court-list.json)

Port from the upstream pip-data-management schema referenced in the ticket:
`https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/magistrates_public_adult_court_list.json`

The schema structure is the same as the existing `magistrates-public-list.json` (same court house / court room / session / sittings / hearing / party hierarchy). Reuse that schema as the base, adjusting the title to `Magistrates Public Adult Court List`.

### Rendering (src/rendering/renderer.ts)

The renderer follows the same pattern as `magistrates-public-list/src/rendering/renderer.ts`:
- `renderMagistratesPublicAdultCourtListData(jsonData, options)` — entry point
- `buildHeader(...)` — builds locationName, contentDate, publishedDate/Time, venueAddress
- `processCourtLists(...)` — walks the nested structure, computing `defendant` (from DEFENDANT party) and formatting `sitting.time` from `sittingStart`
- Return `{ header, listData: jsonData }`

The template groups by court house (h2 "Sitting at") → session (h3 "Session start") → table rows with Listing Time, Defendant Name, Case Number.

### PDF Generator (src/pdf/pdf-generator.ts)

Follows `magistrates-public-list/src/pdf/pdf-generator.ts` exactly:
- `generateMagistratesPublicAdultCourtListPdf(options)` — renders template + saves to storage
- Uses `configureNunjucks`, `loadTranslations`, `PDF_BASE_STYLES`, `generatePdfFromHtml`, `savePdfToStorage` from `@hmcts/list-types-common`

### Email Summary (src/email-summary/summary-builder.ts)

Per ticket AC: **Defendant Name** and **Case Number** only:
```ts
summaries.push([
  { label: "Defendant Name", value: defendantName },
  { label: "Case Number", value: caseUrn }
]);
```

### Locales

**en.ts**: Title variants for Daily/Future, column headers (Listing Time, Defendant Name, Case Number), Sitting at, Session start, reporting restrictions text (full English text from ticket).

**cy.ts**: Welsh translations from ticket:
- `sittingAt`: "Yn eistedd yn"
- `sessionStart`: "Yn eistedd yn" (confirmed — both use the same Welsh phrase per the ticket)
- `listingTime`: "Amser rhestru"
- `defendantName`: "Enw'r Diffynnydd"
- `caseNumber`: "Cyfeirnod yr Achos"
- Daily title: "Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion"
- Future title: "Rhestr Llys Ynadon Oedolion – Dyfodol"
- Reporting restrictions: full Welsh text from ticket

### Registration / Wiring

| Location | Change |
|---|---|
| `libs/location/src/list-type-data.ts` | Add two new entries (ids 57 and 58) for `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` |
| `libs/publication/src/processing/service.ts` | Import `generateMagistratesPublicAdultCourtListPdf` and register both list type names in `PDF_GENERATOR_REGISTRY` |
| `libs/notifications/src/notification/notification-service.ts` | Import extract/format functions and register both list type names in `EMAIL_BUILDER_REGISTRY` |
| `apps/web/src/app.ts` | Import `moduleRoot as magistratesPublicAdultCourtListModuleRoot` and add to `modulePaths` |
| `tsconfig.json` (root) | Add path alias `"@hmcts/magistrates-public-adult-court-list"` → `["libs/list-types/magistrates-public-adult-court-list/src"]` |

**list-type-data entries:**
```ts
{
  id: 57,
  name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  englishFriendlyName: "Magistrates Public Adult Court List - Daily",
  welshFriendlyName: "Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-public-adult-court-list-daily",
  isNonStrategic: false,
  defaultSensitivity: null,
  subJurisdictionIds: [7]
},
{
  id: 58,
  name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE",
  englishFriendlyName: "Magistrates Public Adult Court List - Future",
  welshFriendlyName: "Rhestr Llys Ynadon Oedolion – Dyfodol",
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-public-adult-court-list-future",
  isNonStrategic: false,
  defaultSensitivity: null,
  subJurisdictionIds: [7]
}
```

### Web Page Controllers

Both page controllers use `createListTypeHandler` with `createCauseListRender`, the same pattern as `magistrates-public-list/index.ts`. The NJK templates share the same layout logic but use different title keys (`t.titleDaily` vs `t.titleFuture`). Since both templates are nearly identical, each page imports the same library but renders with its own title key.

## 3. Error Handling & Edge Cases

- **Missing/invalid artefactId**: handled by `createListTypeHandler` — renders error page with `t.errorTitle` / `t.errorMessage`
- **Schema validation failure**: `validateJson` returns a `ValidationResult` with errors; the upload path rejects the publication
- **Missing defendant party**: renderer should gracefully return empty string if no DEFENDANT party found
- **Missing sittingStart**: `formatSittingTime` returns empty string if undefined
- **PDF generation failure**: `createPdfErrorResult` wraps the error; style guide page still renders
- **Session start Welsh translation**: both "Sitting at" and "Session start" use "Yn eistedd yn" — confirmed correct per ticket

## 4. Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `..._FUTURE` list types created | `list-type-data.ts` entries (ids 57 and 58) |
| Display names correct | `englishFriendlyName` / `welshFriendlyName` in list-type-data, and `t.titleDaily` / `t.titleFuture` in locales |
| Data fields: Listing Time, Defendant Name, Case Number | Renderer + NJK template table columns |
| Validation schema, style guide, PDF & email summary created | Schema JSON, NJK template, pdf-generator, summary-builder |
| Subscription fulfilment | EMAIL_BUILDER_REGISTRY registration |
| New PDF template | `pdf-template.njk` |
| Email: Defendant Name and Case Number | summary-builder extracts only these two fields |
| List manipulation | `processCourtLists` in renderer.ts |
| JSON schema follows pip-data-management structure | Schema ported from upstream reference |

## 5. Resolved Clarifications

1. **Welsh "Session start"**: Both "Sitting at" and "Session start" use "Yn eistedd yn" — confirmed per ticket.
2. **`defaultSensitivity`**: `null` — no default selected on manual upload page, user must choose.
3. **`checkAccess`**: `true` — access control applied, matching existing magistrates-public-list behaviour.
4. **`subJurisdictionIds`**: `[7]` — Crime jurisdiction, matching all other Crime Portal list types.
