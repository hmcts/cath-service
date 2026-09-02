# Technical Plan: #429 — Non-Strategic Hearing Lists (GRC, WPAFCC, UTIAC)

## 1. Technical Approach

Five new list type library modules are added under `libs/list-types/`, each following the same structure as the canonical reference implementation `libs/list-types/care-standards-tribunal-weekly-hearing-list/`. The page controllers and Nunjucks templates live in `apps/web/src/pages/(list-types)/`. Three central files are updated to register the new types: `libs/location/src/list-type-data.ts`, `apps/web/src/app.ts`, and the root `tsconfig.json`.

The weekly lists (GRC, WPAFCC) are structurally identical and use the same renderer pattern as CST — `formatDisplayDate(contentDate, locale)` for the `weekCommencingDate` header field, and `formatDdMmYyyyDate` to format the per-row `date` field. The three UTIAC daily lists do not have a `date` column in their Excel data; the display date comes from `artefact.displayFrom`. Their renderer exposes a `listForDate` header field rather than `weekCommencingDate`, and the Nunjucks templates show "List for [date]" rather than "List for week commencing [date]".

All five list types are `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`, and `defaultSensitivity: "Public"`.

---

## 2. New Modules

| ID | Internal name | Package dir | Package name |
|----|---|---|---|
| 28 | `GRC_WEEKLY_HEARING_LIST` | `libs/list-types/grc-weekly-hearing-list/` | `@hmcts/grc-weekly-hearing-list` |
| 29 | `WPAFCC_WEEKLY_HEARING_LIST` | `libs/list-types/wpafcc-weekly-hearing-list/` | `@hmcts/wpafcc-weekly-hearing-list` |
| 30 | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `libs/list-types/utiac-statutory-appeal-daily-hearing-list/` | `@hmcts/utiac-statutory-appeal-daily-hearing-list` |
| 31 | `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `libs/list-types/utiac-jr-london-daily-hearing-list/` | `@hmcts/utiac-jr-london-daily-hearing-list` |
| 32 | `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` | `libs/list-types/utiac-jr-leeds-daily-hearing-list/` | `@hmcts/utiac-jr-leeds-daily-hearing-list` |

IDs 24–27 are already in use by SJP list types. The comment in `ticket.md` that assigns IDs 24–28 is based on an earlier draft of the registry; the actual next available IDs are 28–32.

---

## 3. Files to Create per Module

The file list below uses GRC as the example; the same structure applies to each module with names substituted accordingly.

```
libs/list-types/grc-weekly-hearing-list/
  package.json
  tsconfig.json
  src/
    config.ts
    index.ts
    conversion/
      grc-config.ts
    email-summary/
      summary-builder.ts
      summary-builder.test.ts
    locales/
      en.ts
      cy.ts
    models/
      types.ts
    pdf/
      pdf-generator.ts
      pdf-generator.test.ts
      pdf-template.njk
    rendering/
      renderer.ts
      renderer.test.ts
    schemas/
      grc-weekly-hearing-list.json

apps/web/src/pages/(list-types)/grc-weekly-hearing-list/
  index.ts
  grc-weekly-hearing-list.njk
  index.test.ts
```

---

## 4. Field Structures

### GRC Weekly (ID 28) and WPAFCC Weekly (ID 29) — identical

| Field name | Required | Validators |
|---|---|---|
| `date` | Yes | `validateDateFormat(DD_MM_YYYY_PATTERN, ...)` |
| `hearingTime` | Yes | `validateTimeFormatSimple` |
| `caseReferenceNumber` | Yes | `validateNoHtmlTags` |
| `caseName` | Yes | `validateNoHtmlTags` |
| `judges` | Yes | `validateNoHtmlTags` |
| `members` | No | `validateNoHtmlTags` |
| `modeOfHearing` | Yes | `validateNoHtmlTags` |
| `venue` | Yes | `validateNoHtmlTags` |
| `additionalInformation` | No | `validateNoHtmlTags` |

### UTIAC Statutory Appeal Daily (ID 30)

| Field name | Required | Validators |
|---|---|---|
| `hearingTime` | Yes | `validateTimeFormatSimple` |
| `appellant` | Yes | `validateNoHtmlTags` |
| `representative` | No | `validateNoHtmlTags` |
| `appealReferenceNumber` | Yes | `validateNoHtmlTags` |
| `judges` | Yes | `validateNoHtmlTags` |
| `hearingType` | Yes | `validateNoHtmlTags` |
| `location` | Yes | `validateNoHtmlTags` |
| `additionalInformation` | No | `validateNoHtmlTags` |

No `date` column — date displayed from `artefact.displayFrom`.

### UTIAC JR London Daily (ID 31)

| Field name | Required | Validators |
|---|---|---|
| `hearingTime` | Yes | `validateTimeFormatSimple` |
| `caseTitle` | Yes | `validateNoHtmlTags` |
| `representative` | No | `validateNoHtmlTags` |
| `caseReferenceNumber` | Yes | `validateNoHtmlTags` |
| `judges` | Yes | `validateNoHtmlTags` |
| `hearingType` | Yes | `validateNoHtmlTags` |
| `location` | Yes | `validateNoHtmlTags` |
| `additionalInformation` | No | `validateNoHtmlTags` |

No `date` column — date displayed from `artefact.displayFrom`.

### UTIAC JR Leeds Daily (ID 32)

| Field name | Required | Validators |
|---|---|---|
| `venue` | Yes | `validateNoHtmlTags` |
| `judges` | Yes | `validateNoHtmlTags` |
| `hearingTime` | Yes | `validateTimeFormatSimple` |
| `caseReferenceNumber` | Yes | `validateNoHtmlTags` |
| `caseTitle` | Yes | `validateNoHtmlTags` |
| `hearingType` | Yes | `validateNoHtmlTags` |
| `additionalInformation` | No | `validateNoHtmlTags` |

No `date` column — date displayed from `artefact.displayFrom`.

---

## 5. Renderer Differences: Weekly vs Daily

**Weekly lists (GRC, WPAFCC):**
- Renderer signature mirrors CST: accepts `hearingList` and `RenderOptions` including `contentDate: Date`.
- Header exposes `weekCommencingDate` = `formatDisplayDate(options.contentDate, options.locale)`.
- Per-row `date` field is formatted via `formatDdMmYyyyDate(hearing.date, locale)`.
- Template shows "List for week commencing [weekCommencingDate]".

**Daily lists (UTIAC SA, UTIAC JR London, UTIAC JR Leeds):**
- Renderer accepts `artefact.displayFrom` (a `Date`) instead of `contentDate`.
- Header exposes `listForDate` = `formatDisplayDate(options.displayFrom, options.locale)`.
- No per-row date formatting needed (no `date` field in Excel).
- Template shows "List for [listForDate]".
- Page controller passes `artefact.displayFrom` to the renderer rather than `artefact.contentDate`.

---

## 6. Email Summary Fields

| List type | Field 1 | Field 2 | Field 3 |
|---|---|---|---|
| GRC Weekly | `hearing.date` → label "Date" | `hearing.hearingTime` → label "Hearing time" | `hearing.caseReferenceNumber` → label "Case reference number" |
| WPAFCC Weekly | `hearing.date` → label "Date" | `hearing.hearingTime` → label "Hearing time" | `hearing.caseReferenceNumber` → label "Case reference number" |
| UTIAC SA Daily | artefact `displayFrom` date → label "Date" | `hearing.hearingTime` → label "Hearing time" | `hearing.appealReferenceNumber` → label "Appeal reference number" |
| UTIAC JR London Daily | artefact `displayFrom` date → label "Date" | `hearing.hearingTime` → label "Hearing time" | `hearing.caseReferenceNumber` → label "Case reference number" |
| UTIAC JR Leeds Daily | artefact `displayFrom` date → label "Date" | `hearing.hearingTime` → label "Hearing time" | `hearing.caseReferenceNumber` → label "Case reference number" |

For the three UTIAC daily lists, `extractCaseSummary` accepts both `jsonData` and `displayFrom: string` so the date can be included in each summary row.

---

## 7. Opening Statements (importantInformationText)

| List type | Opening statement |
|---|---|
| GRC | "Parties and representatives will be informed about arrangements for hearing cases remotely. Any other person interested in joining the hearing remotely should email GRC@justice.gov.uk so that arrangements can be made. If the case is to be heard in private or is subject to a reporting restriction, this will be notified. If you join a hearing you must not make any personal or private recording or publish any part of this hearing, including court communications. It is a criminal offence to do so." |
| WPAFCC | "Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any telephone or video hearing remotely while they are taking place by sending an email in advance to the tribunal at armedforces.listing@justice.gov.uk" |
| UTIAC SA | "We update this list by 5pm for the following day. If there are late changes to the list, we'll update no later than 9am on the day of the hearing. For details on attending a UTIAC remote hearing, please email uppertribunallistingteam@justice.gov.uk." |
| UTIAC JR London | "The following list is subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives." |
| UTIAC JR Leeds | "The following list is subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives." |

---

## 8. Welsh Translations

Welsh translations are required for all user-facing strings. Where official translations have not been provided, use the placeholder format `"[WELSH TRANSLATION REQUIRED: 'English text here']"`.

**Exception — UTIAC SA Welsh page title**: an official translation is available:
`"Uwch Dribiwnlys (Siambr Mewnfudo a Lloches) - Rhestr o Wrandawiadau Dyddiol - Apeliadau Statudol"`

All other UTIAC and GRC/WPAFCC Welsh strings must use the placeholder format.

---

## 9. Files to Modify

### `libs/location/src/list-type-data.ts`
Append five new entries at the end of the `listTypeData` array with IDs 28–32, `isNonStrategic: true`, `provenance: "MANUAL_UPLOAD"`, `defaultSensitivity: "Public"`, and `subJurisdictionIds: []` (no sub-jurisdiction mapping defined in the ticket).

### `apps/web/src/app.ts`
Add five `import { moduleRoot as xModuleRoot } from "@hmcts/x/config"` statements in alphabetical order alongside the existing list-type imports, and add each `xModuleRoot` variable to the `modulePaths` array.

### `tsconfig.json` (root)
Add five path alias entries under `compilerOptions.paths` following the existing pattern:
```json
"@hmcts/grc-weekly-hearing-list": ["libs/list-types/grc-weekly-hearing-list/src"],
"@hmcts/wpafcc-weekly-hearing-list": ["libs/list-types/wpafcc-weekly-hearing-list/src"],
"@hmcts/utiac-statutory-appeal-daily-hearing-list": ["libs/list-types/utiac-statutory-appeal-daily-hearing-list/src"],
"@hmcts/utiac-jr-london-daily-hearing-list": ["libs/list-types/utiac-jr-london-daily-hearing-list/src"],
"@hmcts/utiac-jr-leeds-daily-hearing-list": ["libs/list-types/utiac-jr-leeds-daily-hearing-list/src"]
```

---

## 10. Acceptance Criteria Mapping

| Acceptance Criterion | Satisfied by |
|---|---|
| Validation schemas created for each list type | `src/schemas/*.json` per module, Draft 7, with required fields and no-HTML patterns |
| Error handling on validation schema | `validateDateFormat`, `validateTimeFormatSimple`, `validateNoHtmlTags` in each `*-config.ts`; `minRows: 1` |
| Valid publications saved via current method | Converter registration via `registerConverter(id, ...)` and `registerConverterByName(name, ...)` in each `-config.ts` |
| List types classified with user groups | `defaultSensitivity: "Public"` in `list-type-data.ts` entries |
| New PDF templates created | `src/pdf/pdf-template.njk` per module |
| Unified email summary format | `extractCaseSummary` exports Date + Time + Reference Number per list type |
| Email summary fields: Date, Time, Case/Appeal Reference Number | Confirmed in section 6 above |
| New style guide (HTML page) for each list | `apps/web/src/pages/(list-types)/[slug]/index.ts` + `.njk` per module |
| List manipulation for style guide | `renderXxxData` function in each `src/rendering/renderer.ts` |
| GRC weekly, displayed as "General Regulatory Chamber Weekly Hearing List" | `englishFriendlyName` in `list-type-data.ts`; `pageTitle` in `en.ts` |
| WPAFCC weekly, displayed as "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List" | Same |
| UTIAC SA daily, displayed as "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List" | Same |
| UTIAC JR London daily, displayed as "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List" | Same |
| UTIAC JR Leeds daily, displayed as "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List" | Same |
| Upload form names (GRC Weekly Hearing List, etc.) | `name` field in `list-type-data.ts` used by admin upload form |
| Regions: National / London / Yorkshire | Implicitly carried by the `subJurisdictionIds` linked to location records; noted in `list-type-data.ts` comments |
| Opening statements per tribunal | `importantInformationText` in each module's `en.ts` and `cy.ts` |
| Fields per list type match spec | Converter `fields` array and JSON schema `required` array in each module |
| Observe a hearing link text and URL | `importantInformationLinkText` / `importantInformationLinkUrl` in `en.ts` per module |

---

## 11. Important Notes

- **IDs are 28–32, not 24–28.** IDs 24–27 are already occupied by the four SJP list types. The comment in `ticket.md` (generated from an earlier bot plan) used stale IDs.
- **No `date` column in UTIAC daily Excel files.** The date for display comes from `artefact.displayFrom`. Renderers for these three lists must accept `displayFrom: Date` rather than `contentDate: Date`, and page controllers must pass `artefact.displayFrom`.
- **Welsh placeholders.** Only UTIAC SA has a confirmed Welsh page title. All other Welsh strings use the placeholder pattern.
- **`subJurisdictionIds`** — the ticket does not specify sub-jurisdiction IDs for the new types. Use `[]` and add a comment to chase this with the location team if needed.
- **`validateTimeFormatSimple`** is exported from `@hmcts/list-types-common` alongside `validateDateFormat` and `validateNoHtmlTags`. Import all three from that package in each `*-config.ts`.
- **Build scripts** — each `package.json` includes `build:nunjucks` (copies `src/pdf/*.njk` to `dist/pdf/`) and `build:schemas` (copies `src/schemas/*.json` to `dist/schemas/`), matching the CST package.
- **No assets directory** needed for any of the five modules (no module-specific CSS or JS).
- **`@hmcts/publication`** is a dependency required for `PROVENANCE_LABELS` in the PDF generator, matching the CST pattern.
