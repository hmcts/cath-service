# #791: Style Guide: IAC Daily List

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** OgechiOkelu
**Labels:** enhancement, type:story, epic:public-journey
**Created:** 2026-07-01T12:42:33Z
**Updated:** 2026-07-23T15:07:28Z

## Description

**PROBLEM STATEMENT**
This ticket is raised for the creation of IAC Daily List for manual publishing in CaTH.

**AS A** Service
**I WANT** to create the supporting information for IAC Daily List 
**SO THAT** this hearing list can be manually published in CaTH

**ACCEPTANCE CRITERIA**
• Immigration and Asylum Chamber publishes 2 lists manually in CaTH; the Immigration and Asylum Chamber Daily List and the Immigration and Asylum Chamber Daily List – Additional Cases. These lists are created in the front end.
• The Immigration and Asylum Chamber Daily List will always appear first where both list types are published under the same venue, regardless of the order in which both lists are published

- Because its a manually uploaded hearing list, there is no validation schema or style guide.

---

## Technical Reference

### List type configuration

```json
"IAC_DAILY_LIST": {
    "friendlyName": "Immigration and Asylum Chamber Daily List",
    "welshFriendlyName": "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
    "shortenedFriendlyName": "IAC Daily List",
    "url": "iac-daily-list",
    "jurisdictionTypes": ["Immigration and Asylum Chamber"],
    "restrictedProvenances": [],
    "defaultSensitivity": "",
    "isNonStrategic": false
},
"IAC_DAILY_LIST_ADDITIONAL_CASES": {
    "friendlyName": "Immigration and Asylum Chamber Daily List - Additional Cases",
    "welshFriendlyName": "Rhestr Dyddiol y Siambr Mewnfudo a Lloches  – Achosion Ychwanegol",
    "shortenedFriendlyName": "IAC Daily List – Additional Cases",
    "url": "iac-daily-list-additional-cases",
    "jurisdictionTypes": ["Immigration and Asylum Chamber"],
    "restrictedProvenances": [],
    "defaultSensitivity": "",
    "isNonStrategic": false
}
```

### Source references (pip-data-management / pip-frontend)

- **JSON schema:** https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/iac_daily_list.json
- **Email summary:** https://github.com/hmcts/pip-data-management/blob/master/src/main/java/uk/gov/hmcts/reform/pip/data/management/service/artefactsummary/IacDailyListSummaryData.java
- **Data manipulation service:** https://github.com/hmcts/pip-frontend/blob/master/src/main/service/listManipulation/IacDailyListService.ts
- **NJK template:** https://github.com/hmcts/pip-frontend/blob/master/src/main/views/style-guide/iac-daily-list.njk
- **Language files:**
  - Welsh (cy): https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/cy/iac-daily-list.json
  - English (en): https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/en/iac-daily-list.json


## Comments

### Comment by junaidiqbalmoj on 2026-07-23T15:01:42Z
@SPEC

### Comment by hmctsclaudecode on 2026-07-23T15:07:28Z
# Technical Specification — Style Guide: IAC Daily List (Issue #791)

## 1. User Story
**As a** service (Immigration and Asylum Chamber, publishing through CaTH)
**I want to** render the *Immigration and Asylum Chamber Daily List* and the *Immigration and Asylum Chamber Daily List – Additional Cases* from manually uploaded JSON
**So that** these two hearing lists can be manually published in CaTH and viewed by the public in an accessible, bilingual style guide, with the Daily List always appearing before the Additional Cases list under the same venue.

## 2. Background
The Immigration and Asylum Chamber (IAC) publishes two lists manually in CaTH:

- **IAC Daily List** (`IAC_DAILY_LIST`)
- **IAC Daily List – Additional Cases** (`IAC_DAILY_LIST_ADDITIONAL_CASES`)

Both are uploaded through the existing manual-upload admin flow as JSON artefacts and rendered as read-only style-guide pages. This ticket covers the CaTH supporting information required to render them: the list-type lib (models, renderer, schema, validator, PDF generator, locales, email summary), the public web page + template, and registration into the publication pipeline.

The issue notes it is a manually uploaded hearing list. However, the technical references below point at an existing JSON schema and rendering template in the legacy `pip-*` repositories, which are the source of truth for structure. **The CaTH implementation must reproduce the field structure defined by the pip-data-management schema and pip-frontend template.**

Source references (legacy pip services — structural source of truth):
- JSON schema: `pip-data-management/.../schemas/iac_daily_list.json`
- Email summary: `pip-data-management/.../artefactsummary/IacDailyListSummaryData.java`
- Data manipulation service: `pip-frontend/.../listManipulation/IacDailyListService.ts`
- NJK template: `pip-frontend/.../views/style-guide/iac-daily-list.njk`
- Language files: `pip-frontend/.../locales/{en,cy}/iac-daily-list.json`

List-type configuration (both types share jurisdiction *Immigration and Asylum Chamber*, non-strategic, public):

| name | friendlyName | url |
|---|---|---|
| `IAC_DAILY_LIST` | Immigration and Asylum Chamber Daily List | `iac-daily-list` |
| `IAC_DAILY_LIST_ADDITIONAL_CASES` | Immigration and Asylum Chamber Daily List - Additional Cases | `iac-daily-list-additional-cases` |

Reference implementation in this repo (canonical pattern to mirror): `libs/list-types/care-standards-tribunal-weekly-hearing-list` and, for a single controller handling two related list types keyed by `listTypeName`, the `createMultiListGuardAndRender` helper in `apps/web/src/pages/(list-types)/list-type-handler.ts`.

## 3. Acceptance Criteria

* **Scenario:** Both IAC list types render as style-guide pages
    * **Given** an admin has manually uploaded a valid `IAC_DAILY_LIST` (or `IAC_DAILY_LIST_ADDITIONAL_CASES`) JSON artefact for a venue
    * **When** a user opens the corresponding publication from the venue's *Summary of Publications* page
    * **Then** the hearing data is rendered as a read-only GOV.UK-styled page, grouped by court/hearing, with correct headings, tables, "last updated" metadata and data-source label, in the user's selected language.

* **Scenario:** IAC Daily List always appears before Additional Cases under the same venue
    * **Given** both `IAC_DAILY_LIST` and `IAC_DAILY_LIST_ADDITIONAL_CASES` are published live under the same venue
    * **When** a user views the venue's *Summary of Publications* list
    * **Then** the *Immigration and Asylum Chamber Daily List* appears first and the *…Daily List – Additional Cases* appears second, **regardless of the order in which the two lists were published**.

* **Scenario:** Welsh rendering
    * **Given** a published IAC list
    * **When** the user switches to Welsh (`?lng=cy`)
    * **Then** all page furniture (headings, table headers, important-information text, data source, caution notes) is displayed in Welsh, and the list still appears in the correct order.

* **Scenario:** Invalid / missing artefact handling
    * **Given** a request with a missing `artefactId`, an unknown artefact, a missing blob, or JSON that fails schema validation
    * **When** the page is requested
    * **Then** the appropriate error page is shown (400 / 404 / 400-invalid-data / 500) via the shared list-type handler.

* **Scenario:** Access control
    * **Given** a publication whose sensitivity/provenance restricts access
    * **When** an unauthorised user requests it
    * **Then** a 403 error page is returned and the response is marked no-store.

## 4. User Journey Flow

```
[Admin] Manual upload flow (existing)
  1. /manual-upload            → select list type = "IAC Daily List" / "…Additional Cases",
                                 venue, hearing/content date, sensitivity, language, display dates,
                                 upload .json file
  2. /manual-upload-summary    → confirm → createArtefact(provenance = MANUAL_UPLOAD, type = LIST,
                                 isFlatFile = false because .json)
                                 → saveUploadedFile(blob) → extractAndStoreArtefactSearch
                                 → processPublication (PDF + subscriber notifications, background)

[Public user] View flow
  3. /search or location page  → select venue
  4. /summary-of-publications?locationId=NNN
       → lists live publications; IAC Daily List ordered before Additional Cases
  5. click a publication
       → /iac-daily-list?artefactId=UUID
         or /iac-daily-list-additional-cases?artefactId=UUID
       → shared handler: getArtefactById → access check → getPublicationJson
         → validate against schema → render → GOV.UK style-guide page
```

```
JSON blob ──► getPublicationJson ──► validateIacDailyList ──► renderIacDailyListData
                                                                     │
                            (also used by) generateIacDailyListPdf ──┘──► HTML ──► PDF ──► storage
```

## 5. Low Fidelity Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings                        Cymraeg   │
├────────────────────────────────────────────────────────────────────┤
│ [Beta phase banner]                                                  │
│ < Back                                                               │
│                                                                      │
│  Immigration and Asylum Chamber Daily List            (h1)           │
│  [Venue name]                                                        │
│  List for: 23 July 2026                                              │
│  Last updated: 23 July 2026 at 9:30am                                │
│                                                                      │
│  ▸ Important information                              (details)      │
│                                                                      │
│  Search cases                                                        │
│  [ text input: search by case reference, name, hearing type … ]      │
│                                                                      │
│  ── Bail List / Hearing centre / Court room ──────────  (h2 group)   │
│  ┌───────┬───────────────┬───────────────┬─────────────┬──────────┐ │
│  │ Time  │ Case ref /    │ Appellant     │ Prosecuting │ Hearing  │ │
│  │       │ appeal ref    │               │ authority   │ channel  │ │
│  ├───────┼───────────────┼───────────────┼─────────────┼──────────┤ │
│  │ 10:00 │ AB/12345/2026 │ Mr A Example  │ Home Office │ In person│ │
│  │ 11:30 │ CD/67890/2026 │ Ms B Sample   │ Home Office │ Video    │ │
│  └───────┴───────────────┴───────────────┴─────────────┴──────────┘ │
│                                                                      │
│  ── [next court room group] ──                                       │
│                                                                      │
│  Data source: Manual upload                                          │
│  ↑ Back to top                                                       │
│                                                                      │
│  [Special Category Data caution note]                                │
└────────────────────────────────────────────────────────────────────┘
```

> **Note:** The exact column set and grouping (e.g. by hearing centre / court room / bail-vs-substantive) must be confirmed against the pip-frontend `iac-daily-list.njk` and `IacDailyListService.ts`. The wireframe above reflects the standard IAC daily list layout. See open questions in §14.

## 6. Page Specifications

Two new list-type libraries are **not** required if the two lists share the same JSON structure; a single lib with a multi-list controller is preferred. Confirm shape parity between the two schemas first (see §14). The recommended structure follows the canonical CST reference.

**New lib:** `libs/list-types/iac-daily-list/`

```
libs/list-types/iac-daily-list/
├── package.json                 # @hmcts/iac-daily-list; exports "." and "./config"
├── tsconfig.json
└── src/
    ├── index.ts                 # barrel; side-effect import of conversion config
    ├── config.ts                # moduleRoot, assets, schemaPath(s)
    ├── models/types.ts          # IacDailyList / IacHearing interfaces
    ├── rendering/renderer.ts    # renderIacDailyListData(json, opts) → { header, courtLists|hearings }
    ├── validation/json-validator.ts        # validateIacDailyList (createJsonValidator wrapper)
    ├── validation/json-validator.test.ts   # one it() per required field, every nesting level
    ├── schemas/iac-daily-list.json          # ported from pip-data-management
    ├── (schemas/iac-daily-list-additional-cases.json  # only if structurally different)
    ├── locales/en.ts, locales/cy.ts         # bilingual page furniture
    ├── pdf/pdf-generator.ts     # generateIacDailyListPdf(options)
    ├── pdf/pdf-template.njk     # standalone HTML doc for PDF
    ├── email-summary/summary-builder.ts     # extractCaseSummary for notification emails
    └── conversion/iac-config.ts # registerConverterByName (only if Excel upload is in scope)
```

**Web pages:** `apps/web/src/pages/(list-types)/iac-daily-list/` and (if separate URLs are required) `apps/web/src/pages/(list-types)/iac-daily-list-additional-cases/`, each with `index.ts`, `<name>.njk`, `index.test.ts`, `<name>.njk.test.ts`.

**Controller** — use `createSimpleListTypeHandler` (single type) or `createMultiListGuardAndRender` (both types, keyed by `artefact.listTypeName`) from `list-type-handler.ts`. The handler already performs: `artefactId` presence check, `getArtefactById`, access control (`canAccessPublicationData` + `resolveListType`), blob fetch (`getPublicationJson`), schema validation, then delegates to `render`.

**Pipeline registration:**
1. `registerConverterByName("IAC_DAILY_LIST", …)` / `("IAC_DAILY_LIST_ADDITIONAL_CASES", …)` in `conversion/iac-config.ts`, imported by `index.ts` — only if Excel→JSON conversion is required (manual JSON upload does not need it).
2. Add `IAC_DAILY_LIST` and `IAC_DAILY_LIST_ADDITIONAL_CASES` entries to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` (with matching import).
3. Add both entries to `listTypeData` in `libs/list-types/common/src/list-type-data.ts` (see §8) so they seed into the `list_types` table and resolve to routes.

**Ordering guarantee (AC 2):** The *Summary of Publications* controller (`apps/web/src/pages/(public)/summary-of-publications/index.ts`) currently sorts purely by `listTypeName.localeCompare(...)`, then content date desc, then language. For the English friendly names this happens to place "…Daily List" before "…Daily List - Additional Cases" (prefix ordering). **This incidental alphabetical behaviour is not a guarantee** — Welsh names differ (`Rhestr Ddyddiol …` vs `Rhestr Dyddiol … – Achosion Ychwanegol`, where Welsh collation treats `Dd` as a distinct letter that sorts after `D`), which can invert the order. To make AC 2 robust and locale-independent, introduce an explicit primary sort key: a small ordered list-type ranking (by `listTypeName`, the stable `@unique` string — never `listTypeId`) applied before the alphabetical fallback, placing `IAC_DAILY_LIST` immediately before `IAC_DAILY_LIST_ADDITIONAL_CASES`.

## 7. Content

All user-facing strings live in `libs/list-types/iac-daily-list/src/locales/{en,cy}.ts`, mirroring each other exactly (verified by a key-parity test). English values (illustrative — final wording to match pip-frontend `en/iac-daily-list.json`):

```
pageTitle:                       "Immigration and Asylum Chamber Daily List"
pageTitleAdditionalCases:        "Immigration and Asylum Chamber Daily List - Additional Cases"
listFor:                         "List for"
lastUpdated:                     "Last updated"
at:                              "at"
importantInformationTitle:       "Important information"
importantInformationText:        <observe-a-hearing guidance / contact details, per pip-frontend>
searchCasesTitle:                "Search cases"
searchCasesLabel:                "Search by case reference, appellant, hearing type or other details"
tableHeaders:                    { time, caseReference, appellant, prosecutingAuthority, hearingChannel, … }
dataSource:                      "Data source"
backToTop:                       "Back to top"
cautionNote:                     <Special Category Data / Data Protection Act 2018 note>
cautionReporting:                <accurate-reporting / reporting-restrictions note>
provenanceLabels:                (imported from @hmcts/list-types-common)
```

Welsh values (to be supplied by the translation step):

```
pageTitle:                  Rhestr Ddyddiol y Siambr Mewnfudo a Lloches
pageTitleAdditionalCases:   [WELSH TRANSLATION REQUIRED: "Immigration and Asylum Chamber Daily List - Additional Cases"]
listFor:                    Rhestr ar gyfer
lastUpdated:                [WELSH TRANSLATION REQUIRED: "Last updated"]
at:                         am
importantInformationTitle:  [WELSH TRANSLATION REQUIRED: "Important information"]
searchCasesTitle:           [WELSH TRANSLATION REQUIRED: "Search cases"]
searchCasesLabel:           [WELSH TRANSLATION REQUIRED: "Search by case reference, appellant, hearing type or other details"]
dataSource:                 [WELSH TRANSLATION REQUIRED: "Data source"]
backToTop:                  Yn 'l i frig y dudalen
tableHeaders.time:                 Amser
tableHeaders.caseReference:        [WELSH TRANSLATION REQUIRED: "Case reference"]
tableHeaders.appellant:            Apelydd
tableHeaders.prosecutingAuthority: [WELSH TRANSLATION REQUIRED: "Prosecuting authority"]
tableHeaders.hearingChannel:       [WELSH TRANSLATION REQUIRED: "Hearing channel"]
cautionNote:                Noder bod y ddogfen hon yn cynnwys Data Categori Arbennig fel y'i diffinnir yn Neddf Gwarchod Data 2018, a elwid gynt yn Ddata Personol Sensitif, a dylid ei drin yn y ffordd briodol.
cautionReporting:           Mae'r ddogfen hon yn cynnwys gwybodaeth a fwriedir i gynorthwyo i roi adroddiad manwl-gywir am achosion llys. Mae'n hanfodol eich bod yn sicrhau eich bod yn gwarchod y Data Categori Arbennig sydd ynddi ac yn cadw at gyfyngiadau adrodd (er enghraifft yn achos dioddefwyr a phlant). Bydd GLlTEM yn rhoi'r gorau i anfon y data os cyfyd pryder ynghylch sut y'i defnyddir.
```

The list-type friendly names in `list-type-data.ts` also require Welsh values (already provided in the ticket configuration):
- `IAC_DAILY_LIST` welshFriendlyName: `Rhestr Ddyddiol y Siambr Mewnfudo a Lloches`
- `IAC_DAILY_LIST_ADDITIONAL_CASES` welshFriendlyName: `Rhestr Dyddiol y Siambr Mewnfudo a Lloches – Achosion Ychwanegol`

## 8. URL

Public style-guide pages (auto-discovered from the `(list-types)` route group; group name is not part of the URL):

- `/iac-daily-list?artefactId=<uuid>`
- `/iac-daily-list-additional-cases?artefactId=<uuid>`

`listTypeData` entries in `libs/list-types/common/src/list-type-data.ts`:

```ts
{
  name: "IAC_DAILY_LIST",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List",
  welshFriendlyName: "Rhestr Ddyddiol y Siambr Mewnfudo a Lloches",
  shortenedFriendlyName: "IAC Daily List",
  provenance: "MANUAL_UPLOAD",            // confirm against existing manual-upload provenance convention
  urlPath: "iac-daily-list",
  isNonStrategic: false,
  defaultSensitivity: "Public",            // ticket config leaves defaultSensitivity blank — confirm
  subJurisdictionIds: [/* Immigration and Asylum Chamber */]
},
{
  name: "IAC_DAILY_LIST_ADDITIONAL_CASES",
  englishFriendlyName: "Immigration and Asylum Chamber Daily List - Additional Cases",
  welshFriendlyName: "Rhestr Dyddiol y Siambr Mewnfudo a Lloches – Achosion Ychwanegol",
  shortenedFriendlyName: "IAC Daily List – Additional Cases",
  provenance: "MANUAL_UPLOAD",
  urlPath: "iac-daily-list-additional-cases",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [/* Immigration and Asylum Chamber */]
}
```

> **Note on `isNonStrategic`:** the ticket config sets `isNonStrategic: false`, but the manual-upload dropdown for strategic vs non-strategic is driven by this flag. Confirm which manual-upload form these lists should appear in (`findStrategicListTypes()` vs the non-strategic form) before finalising. See §14.

## 9. Validation

- **JSON schema validation** is mandatory (repo rule: every list type that accepts JSON uploads MUST have a schema + `validate*` wrapper + test). Port `iac_daily_list.json` from pip-data-management into `libs/list-types/iac-daily-list/src/schemas/iac-daily-list.json`. If the Additional Cases list has a distinct structure, add a second schema; otherwise reuse.
- **Validator wrapper:** `validateIacDailyList(jsonData): ValidationResult` using `createJsonValidator(schemaPath)` from `@hmcts/list-types-common`, exported from `index.ts`.
- Validation is invoked automatically inside `createSimpleListTypeHandler` / `createMultiListGuardAndRender` before render; invalid JSON → 400 "Invalid Data".
- **CI guard:** `libs/list-types/common/src/validation/guard.test.ts` will fail if a schema ships without a `validate*` export — the wrapper and its test must exist before merge.
- **Routing guards** must use `artefact.listTypeName` (stable `@unique` string), never numeric `listTypeId`. Test fixtures should use an arbitrary `listTypeId` (e.g. `999`) to prove ID-independence.
- No user free-text input is accepted on these read-only pages (the on-page search box is client-side filtering only), so there is no form-submission validation.

## 10. Error Messages

Handled by the shared list-type handler; rendered via `errors/common` and `errors/403`:

| Condition | HTTP | Title | Message |
|---|---|---|---|
| Missing `artefactId` | 400 | Bad Request | Missing artefactId parameter |
| Artefact not found | 404 | Not Found | The requested list could not be found |
| Blob missing | 404 | Not Found | The requested list could not be found |
| Schema validation fails | 400 | Invalid Data | The list data is invalid |
| Unauthorised access | 403 | Access denied | You do not have permission to view this publication. |
| Unexpected error | 500 | Server Error | An error occurred while loading the list |
| Wrong list type (multi-list guard) | 400 | Invalid List Type | This list type is not supported by this module |

Welsh equivalents are provided for the 403 page by the handler defaults; the `errors/common` messages should also be provided bilingually via the lib's `en`/`cy` objects passed to the handler.

## 11. Navigation

- Entry point: the venue's *Summary of Publications* page (`/summary-of-publications?locationId=NNN`) links each live publication to its style-guide page using the list type's `url` + `?artefactId=`.
- **Ordering:** IAC Daily List link renders above the Additional Cases link under the same venue (see §6 ordering guarantee).
- **Back link:** GOV.UK back link returns the user to the Summary of Publications page.
- **Back to top:** in-page anchor link at the foot of long lists.
- **Language toggle:** `Cymraeg` / `English` toggle in the header re-renders the same page in the other locale (`?lng=cy`), preserving `artefactId`.
- No redirects on success (read-only GET pages); redirects only occur for the admin upload confirmation flow, which is out of scope for this ticket.

## 12. Accessibility

Target: WCAG 2.2 AA (mandatory for government services).

- Page `<title>` matches the `<h1>` (list title).
- Logical heading hierarchy: `h1` (list title) → `h2` per court/hearing group → table captions.
- GOV.UK Table component with proper `<th scope="col">` / `<th scope="row">` where appropriate; column headers programmatically associated with cells.
- Important information uses the GOV.UK Details component (keyboard operable, `aria-expanded` handled by the component).
- On-page "Search cases" input has an associated `<label>`; filtering is progressive enhancement — the full list is present and readable without JavaScript.
- Colour is never the sole information carrier (e.g. hearing channel conveyed by text, not colour).
- Visible focus states on all links and the details toggle; tab order follows reading order.
- Caution/reporting-restriction notes rendered as readable body text (not colour-coded only).
- Welsh rendering: `lang="cy"` applied so screen readers use correct pronunciation.
- Template tests assert structure (headings, table headers, colspan behaviour, conditional columns) rather than raw HTML strings, plus Welsh heading rendering and en/cy key parity.

## 13. Test Scenarios

* Renders the IAC Daily List page with correct h1, venue, "list for" date, and "last updated" date/time from a valid artefact + JSON blob.
* Renders every hearing grouped correctly (by court room / hearing centre) with the correct table columns populated.
* Renders the IAC Daily List – Additional Cases page from its artefact/JSON.
* Switching to Welsh renders all page furniture, table headers and caution notes in Welsh and keeps the correct list order.
* Summary of Publications places IAC Daily List before IAC Daily List – Additional Cases under the same venue — verified both when the Daily List is published first and when the Additional Cases list is published first, in both English and Welsh.
* Missing `artefactId` returns 400; unknown artefact returns 404; missing blob returns 404; schema-invalid JSON returns 400; unauthorised user returns 403 (no-store); unexpected error returns 500.
* JSON validator: valid fully-hydrated fixture passes; one test per required field at every nesting level fails validation when that field is removed (deep-clone isolation per test).
* Routing/guard logic is driven by `listTypeName`, proven by fixtures using an arbitrary numeric `listTypeId`.
* PDF generation produces a PDF for both list types and stores it (registry lookup by name succeeds).
* Email summary (`extractCaseSummary`) produces the expected label/value pairs for a sample hearing.
* E2E (`@nightly`): full public journey — open a seeded IAC publication from a venue, assert content + ordering, run inline Axe accessibility check, verify Welsh toggle, verify Additional Cases ordering.

## 14. Assumptions & Open Questions

* **Contradiction in the ticket:** the body states "there is no validation schema or style guide", yet links a JSON schema and NJK template in the pip repos. Assumption: CaTH *does* implement a schema + style guide, ported from those references. **Confirm.**
* **Shared vs separate structure:** it is assumed `IAC_DAILY_LIST` and `IAC_DAILY_LIST_ADDITIONAL_CASES` share the same JSON structure, so one lib + one schema + a multi-list controller (keyed by `listTypeName`) suffices. If the Additional Cases schema differs, a second schema/validator/template is needed. **Confirm against pip-data-management.**
* **Exact columns/grouping unverified:** the linked pip-frontend `iac-daily-list.njk` and `IacDailyListService.ts` could not be fetched in this environment. The precise table columns, grouping (hearing centre / court room / bail vs substantive) and field names must be read from those files and reflected in `models/types.ts`, the renderer, the template and the schema. The wireframe/columns in §5–§7 are the standard IAC layout and are provisional.
* **Ordering mechanism:** AC 2 ("Daily List always first") is only incidentally satisfied by the current alphabetical sort in English and can break under Welsh collation. Recommendation: add an explicit ordered-rank primary sort key in the Summary of Publications controller. **Confirm this is acceptable and whether a general "list priority" mechanism is wanted rather than an IAC-specific special case.**
* **`isNonStrategic` / upload form:** ticket config sets `isNonStrategic: false`, which routes these into the strategic manual-upload dropdown (`findStrategicListTypes()`), while most IAC/tribunal lists in the repo are `isNonStrategic: true`. Confirm which upload form the IAC lists should appear in and set the flag accordingly.
* **`defaultSensitivity`:** ticket config leaves it blank; §8 assumes `Public`. Confirm the intended default sensitivity and provenance (`MANUAL_UPLOAD`).
* **Excel conversion:** assumed out of scope (manual JSON upload only). If admins will upload Excel, a `conversion/iac-config.ts` converter + `registerConverterByName` is required.
* **Sub-jurisdiction IDs:** the `subJurisdictionIds` for "Immigration and Asylum Chamber" must be looked up from the seeded jurisdiction reference data before adding the `listTypeData` entries.
* **Welsh friendly name spacing:** the ticket's `welshFriendlyName` for Additional Cases contains a double space (`Lloches  – Achosion`). Assumed to be a typo to be normalised to a single space. **Confirm.**


