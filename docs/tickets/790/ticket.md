# #790: Style Guide: Magistrates Public Adult Court List (Crime Portal / Libra)

**State:** OPEN
**Assignees:** KianKwa
**Author:** OgechiOkelu
**Labels:** None
**Created:** 2026-07-01T12:11:50Z
**Updated:** 2026-07-08T14:52:21Z

## Description

## PROBLEM STATEMENT

This ticket is raised for the creation of the style guide, downloadable PDF and email summary of the **Magistrates Public Adult Court List - Daily** and **Magistrates Public Adult Court List - Future** from Crime Portal / Libra, which are to be published in CaTH.

## USER STORY

**AS A** Service
**I WANT** to create the style guide, PDF & email summary for the Magistrates Public Adult Court List - Daily and Magistrates Public Adult Court List - Future
**SO THAT** the hearing lists can be published in CaTH

## ACCEPTANCE CRITERIA

- The `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` list types are created in CaTH backend for publishing in CaTH from Crime Portal / Libra
- The names to be displayed in CaTH frontend are:
  - **Magistrates Public Adult Court List - Daily**
  - **Magistrates Public Adult Court List - Future**
- The data fields to be displayed are: Listing Time, Defendant Name and Case Number
- The validation schema, style guide, PDF & email summary are created for both list types
- Subscription fulfilment process is implemented for each list
- A new PDF template is created for the downloadable version of each list
- The Email notification summary will display: **Defendant Name** and **Case Number**
- List manipulation is created for both style guides
- The JSON file for the validation schema follows the structure in: https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/magistrates_public_adult_court_list.json

## WELSH TRANSLATIONS

| English | Welsh |
|---|---|
| Magistrates Public Adult Court List - Daily | Rhestr Achosion Dyddiol Cyhoeddus y Llys Ynadon – Oedolion |
| Magistrates Public Adult Court List - Future | Rhestr Llys Ynadon Oedolion – Dyfodol |
| Magistrates Public List | Rhestr Gyhoeddus y Llys Ynadon |
| Listing Time | Amser rhestru |
| Defendant Name | Enw'r Diffynnydd |
| Case Number | Cyfeirnod yr Achos |
| Sitting at | Yn eistedd yn |
| Session start | Yn eistedd yn |

## REPORTING RESTRICTIONS (English)

> Restrictions on publishing or writing about these cases
>
> You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media.
>
> You'll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both.
>
> Specific restrictions ordered by the court will be mentioned on the cases listed here.
>
> However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences.
>
> To find out which reporting restrictions apply on a specific case, contact:
> - the court directly
> - HM Courts and Tribunals Service on 0330 808 4407
>
> You can also read the reporting restrictions guide

## REPORTING RESTRICTIONS (Welsh)

> Cyfyngiadau ar gyhoeddi neu ysgrifennu am yr achosion hyn.
>
> Rhaid i chi wirio a oes unrhyw gyfyngiadau riportio yn berthnasol cyn cyhoeddi manylion am unrhyw un o'r achosion a restrir yma, naill ai'n ysgrifenedig, mewn darllediad neu ar y rhyngrwyd, gan gynnwys y cyfryngau cymdeithasol.
>
> Byddwch yn euog o ddirmyg llys os byddwch yn cyhoeddi unrhyw wybodaeth sydd wedi'i diogelu gan gyfyngiad riportio. Gallwch gael dirwy, eich dedfrydu i garchar, neu'r ddau.
>
> Bydd cyfyngiadau penodol a orchmynnir gan y llys yn cael eu crybwyll ar yr achosion a restrir yma.
>
> Fodd bynnag, nid yw'r cyfyngiadau bob amser yn cael eu rhestru. Mae rhai yn berthnasol yn awtomatig. Er enghraifft, anhysbysrwydd a roddir i ddioddefwyr rhai troseddau rhywiol.
>
> I ganfod pa gyfyngiadau riportio sy'n berthnasol ar achos penodol, cysylltwch â'r:
> - llys yn uniongyrchol
> - Gwasanaeth Llysoedd a Thribiwnlysoedd EM ar 0330 808 4407
>
> Gallwch hefyd ddarllen y canllaw ar gyfyngiadau riportio

## REFERENCE MATERIAL

- JSON Schema: https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/magistrates_public_adult_court_list.json
- English language file: https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/en/magistrates-public-adult-court-list.json
- Welsh language file: https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/locales/cy/magistrates-public-adult-court-list.json
- Data manipulation service: https://github.com/hmcts/pip-frontend/blob/master/src/main/service/listManipulation/MagistratesAdultCourtListService.ts
- NJK view: https://github.com/hmcts/pip-frontend/blob/master/src/main/views/style-guide/magistrates-public-adult-court-list.njk

## Comments

### Comment by junaidiqbalmoj on 2026-07-02T15:30:51Z

@SPEC

### Comment by hmctsclaudecode on 2026-07-02T15:38:15Z

# Technical Specification: Magistrates Public Adult Court List (Daily & Future)

> Source issue: **#790 — Style Guide: Magistrates Public Adult Court List (Crime Portal / Libra)**

## 1. User Story
**As a** Service (CaTH publishing platform)
**I want to** create the validation schema, style guide, downloadable PDF and email summary for the *Magistrates Public Adult Court List - Daily* and *Magistrates Public Adult Court List - Future*
**So that** these hearing lists received from Crime Portal / Libra can be published in CaTH and consumed by verified users, media and the public.

## 2. Background
CaTH (Court and Tribunal Hearings) receives hearing publications from upstream source systems and renders them as HTML style-guide pages, downloadable PDFs and subscription email summaries, in both English and Welsh.

This ticket introduces **two new list types** originating from **Crime Portal / Libra**:

| List type name (backend identifier) | English display name | Welsh display name |
|---|---|---|
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` | Magistrates Public Adult Court List - Daily | [WELSH TRANSLATION REQUIRED: "Magistrates Public Adult Court List - Daily"] |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` | Magistrates Public Adult Court List - Future | [WELSH TRANSLATION REQUIRED: "Magistrates Public Adult Court List - Future"] |

Both list types share the **same JSON payload structure, the same style guide layout, the same PDF template and the same email summary** — they differ only by identifier, display name and content date semantics (Daily = single publication date; Future = forward-looking range). They are implemented as one shared list-type package with two registered identifiers rather than two duplicated packages.

**Reference material (upstream pip equivalents):**
- JSON Schema: `pip-data-management/.../schemas/magistrates_public_adult_court_list.json`
- English locale: `pip-frontend/.../locales/en/magistrates-public-adult-court-list.json`
- Welsh locale: `pip-frontend/.../locales/cy/magistrates-public-adult-court-list.json`
- Data manipulation: `pip-frontend/.../service/listManipulation/MagistratesAdultCourtListService.ts`
- NJK view: `pip-frontend/.../views/style-guide/magistrates-public-adult-court-list.njk`

**Existing CaTH pattern this follows:** the list-type package structure established by `libs/list-types/care-standards-tribunal-weekly-hearing-list` and the nested cause-list structure of `libs/list-types/london-administrative-court-daily-cause-list`, wired through the registries documented in Section 6.

## 3. Acceptance Criteria

* **Scenario:** Both list types are registered in the backend
    * **Given** the CaTH backend list-type registry
    * **When** the seed data is applied
    * **Then** `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` exist with the correct English/Welsh friendly names, URL slugs, provenance (Crime Portal / Libra) and default sensitivity, and can be published against a location.

* **Scenario:** A valid publication is accepted and rendered
    * **Given** a JSON publication that conforms to the magistrates public adult court list schema
    * **When** it is uploaded for either list type
    * **Then** validation passes and the style-guide page renders **Listing Time, Defendant Name and Case Number** grouped by court house / court room / session, with the reporting-restrictions guidance and "Sitting at" / "Session start" headings.

* **Scenario:** An invalid publication is rejected
    * **Given** a JSON publication that does not conform to the schema (missing required field, HTML injected into a text field, malformed time)
    * **When** it is uploaded
    * **Then** validation fails with a schema error and the publication is not stored.

* **Scenario:** Downloadable PDF is produced
    * **Given** a published magistrates public adult court list (Daily or Future)
    * **When** the publication is processed
    * **Then** a PDF is generated from the list-type PDF template (English and Welsh) and stored, and is downloadable from the style-guide page.

* **Scenario:** Subscription email summary is sent
    * **Given** a user subscribed to one of the list types (or to a subscribed location/case)
    * **When** a matching publication is published
    * **Then** an email is sent whose case summary displays **Defendant Name** and **Case Number** for each case, with the PDF attached where within size limits.

* **Scenario:** Welsh rendering
    * **Given** any of the above outputs (page, PDF, email)
    * **When** the locale is Welsh (`?lng=cy`)
    * **Then** all field labels, headings and reporting-restriction guidance render in Welsh.

* **Scenario:** List manipulation
    * **Given** the nested source JSON (court house → court room → session → sittings → hearing → case/party)
    * **When** the list is rendered
    * **Then** the manipulation flattens the structure into ordered rows, formats the listing time, derives the defendant name from party data and surfaces the case number.

## 4. User Journey Flow

```
                        ┌─────────────────────────────────────┐
 Crime Portal / Libra ─▶│ Publication ingested into CaTH       │
                        │ (JSON payload + metadata:            │
                        │  listType, locationId, contentDate,  │
                        │  sensitivity, language)              │
                        └───────────────┬─────────────────────┘
                                        ▼
                        ┌─────────────────────────────────────┐
                        │ Validate against JSON schema         │
                        │  magistrates_public_adult_court_list │
                        └──────┬───────────────────────┬───────┘
                          fail │                     ok │
                               ▼                        ▼
                     reject + error       ┌──────────────────────────────┐
                                          │ Store artefact + generate PDF │
                                          │ (EN & CY) + fan out subs      │
                                          └──────┬────────────────┬───────┘
                                                 ▼                ▼
                             ┌──────────────────────────┐   ┌───────────────────────┐
                             │ Public/verified user      │   │ Subscriber email      │
                             │ opens summary of pubs →    │   │ summary: Defendant     │
                             │ selects list → style guide │   │ Name + Case Number     │
                             │ page (HTML) + download PDF │   │ (+ PDF attachment)     │
                             └──────────────────────────┘   └───────────────────────┘
```

## 5. Low Fidelity Wireframe

Style-guide HTML page (both Daily and Future share this layout; only title and date wording differ):

```
┌───────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings          English | Cymraeg │
├───────────────────────────────────────────────────────────────┤
│ [Phase banner: Beta]                                           │
│ < Back                                                         │
│                                                                │
│  Magistrates Public Adult Court List - Daily            (h1)   │
│  [Court/venue name]                                            │
│  List for [contentDate]                                        │
│  Last updated [date] at [time]                                 │
│                                                                │
│  ▸ Restrictions on publishing or writing about these cases    │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ You must check if any reporting restrictions apply ... │    │
│  │ You'll be in contempt of court if you publish ...      │    │
│  │ Contact: the court directly / HMCTS 0330 808 4407      │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                │
│  [ Download list as a PDF ]                                    │
│                                                                │
│  Sitting at: [Court house name]                        (h2)   │
│    Session start: [session start time]                 (h3)   │
│    ┌────────────────┬───────────────────┬─────────────────┐   │
│    │ Listing Time   │ Defendant Name    │ Case Number     │   │
│    ├────────────────┼───────────────────┼─────────────────┤   │
│    │ 10:00am        │ SURNAME, Forename │ ABC12345        │   │
│    │ 10:30am        │ SURNAME, Forename │ DEF67890        │   │
│    └────────────────┴───────────────────┴─────────────────┘   │
│                                                                │
│    Session start: [next session start time]           (h3)   │
│    ┌────────────────┬───────────────────┬─────────────────┐   │
│    │ Listing Time   │ Defendant Name    │ Case Number     │   │
│    └────────────────┴───────────────────┴─────────────────┘   │
│                                                                │
│  Data source: Crime Portal / Libra                            │
│  ^ Back to top                                                 │
└───────────────────────────────────────────────────────────────┘
```

Email summary (rendered by GOV.UK Notify):

```
Subject: There has been an update for [list name]

You are receiving this email because you subscribed to updates.

Case 1
Defendant Name: SURNAME, Forename
Case Number: ABC12345

Case 2
Defendant Name: SURNAME, Forename
Case Number: DEF67890

[PDF attached where under size limit]
```

## 6. Page Specifications

### 6.1 New list-type package
Create `libs/list-types/magistrates-public-adult-court-list/` following the established package layout:

```
libs/list-types/magistrates-public-adult-court-list/
├── package.json                 # @hmcts/magistrates-public-adult-court-list
│                                #   exports "." and "./config"; build + build:nunjucks + build:schemas scripts
├── tsconfig.json
└── src/
    ├── config.ts                # moduleRoot, assets, schemaPath
    ├── index.ts                 # business logic + locale exports; imports pdf/renderer/email-summary
    ├── schemas/
    │   └── magistrates-public-adult-court-list.json   # validation schema (from pip-data-management)
    ├── models/
    │   └── types.ts             # nested source types + flattened row types
    ├── rendering/
    │   ├── renderer.ts          # list manipulation: nested JSON -> ordered display rows
    │   └── renderer.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts     # generateMagistratesPublicAdultCourtListPdf(...)
    │   ├── pdf-template.njk
    │   └── pdf-generator.test.ts
    ├── email-summary/
    │   ├── summary-builder.ts   # extractCaseSummary -> [Defendant Name, Case Number]
    │   └── summary-builder.test.ts
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    └── config.test.ts
```

Because Daily and Future share the payload/layout, both identifiers reuse this single package. The controllers, PDF registry entries and email-builder registry entries register the same functions under both list-type names, with only the `pageTitle` / `listTitle` / content-date wording differing per identifier.

### 6.2 Data model (models/types.ts)
Mirror the nested upstream structure (court house → court room → session → sittings → hearing → party/case) and a flattened row model for display:

```ts
// Flattened display row (post-manipulation)
export interface MagistratesCourtListRow {
  listingTime: string;    // formatted sitting start time, e.g. "10:00am"
  defendantName: string;  // derived from party/individualDetails
  caseNumber: string;     // case number / URN
}

export interface MagistratesCourtSession {
  sessionStart: string;               // "Session start" heading value
  rows: MagistratesCourtListRow[];
}

export interface MagistratesCourtHouseGroup {
  sittingAt: string;                  // "Sitting at" court house name
  sessions: MagistratesCourtSession[];
}
```

### 6.3 List manipulation (rendering/renderer.ts)
Port `MagistratesAdultCourtListService` logic: walk `courtLists → courtHouse → courtRoom → session → sittings → hearing → party`, and for each hearing/case produce a row containing:
- **Listing Time** — formatted from the sitting start time (locale-aware time formatting via `@hmcts/list-types-common` date helpers).
- **Defendant Name** — built from the party where the party role is defendant (surname + forename ordering as in the upstream service).
- **Case Number** — the case number / URN from the hearing's case object.

Group rows by "Sitting at" (court house) and "Session start" (session start time), preserving source ordering. Header values (list title, content/publication date, last updated date & time, data source) are resolved from artefact metadata as in `renderCareStandardsTribunalData`.

### 6.4 PDF (pdf/pdf-generator.ts + pdf-template.njk)
Export `generateMagistratesPublicAdultCourtListPdf(options)` following `generateCareStandardsTribunalWeeklyHearingListPdf`: render the manipulated data through `pdf-template.njk` using `configureNunjucks`, `loadTranslations`, `PDF_BASE_STYLES`; produce the buffer with `generatePdfFromHtml` and persist via `savePdfToStorage`. The template renders the same header, reporting-restrictions block, and the grouped Listing Time / Defendant Name / Case Number tables.

### 6.5 Email summary (email-summary/summary-builder.ts)
Export `extractCaseSummary(jsonData)` returning, per case, a `CaseSummary` of exactly:
```ts
[
  { label: "Defendant Name", value: defendantName },
  { label: "Case Number", value: caseNumber }
]
```
Re-export `formatCaseSummaryForEmail` and `SPECIAL_CATEGORY_DATA_WARNING` from `@hmcts/list-types-common`.

### 6.6 Registration / wiring (integration points)
| # | Concern | File | Change |
|---|---|---|---|
| 1 | Master registry + DB seed | `libs/location/src/list-type-data.ts` | Add two entries (`MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `..._FUTURE`) with new unique `id`s, English/Welsh friendly names, `urlPath` slugs, Crime Portal / Libra provenance, default sensitivity, sub-jurisdiction id(s). Seeded automatically by existing seeders. |
| 2 | Public view pages | `apps/web/src/pages/(list-types)/magistrates-public-adult-court-list-daily/{index.ts,*.njk}` and `.../magistrates-public-adult-court-list-future/{index.ts,*.njk}` | New controllers using `createSimpleListTypeHandler` (with `guardArtefact` checking the correct `listTypeId`) + templates. |
| 3 | PDF dispatch | `libs/publication/src/processing/service.ts` | Add both names to `PDF_GENERATOR_REGISTRY`, delegating to `generateMagistratesPublicAdultCourtListPdf`. |
| 4 | Email fulfilment | `libs/notifications/src/notification/notification-service.ts` | Add both names to `EMAIL_BUILDER_REGISTRY` (`{ extract, format }`). |
| 5 | Path aliases + app wiring | root `tsconfig.json`; `apps/web/src/app.ts` | Add `@hmcts/magistrates-public-adult-court-list` (+ `/config`) alias; import `moduleRoot` and add to `modulePaths`. |
| 6 | `list-search-config` | — | No code change (data-driven by `listTypeId`; case-number / defendant-name field mapping optionally populated via admin UI to enable case subscriptions). |

## 7. Content

### 7.1 English page content (locales/en.ts)
- `pageTitleDaily`: "Magistrates Public Adult Court List - Daily"
- `pageTitleFuture`: "Magistrates Public Adult Court List - Future"
- `magistratesPublicList`: "Magistrates Public List"
- `listFor` / `lastUpdated` / `at`: as per care-standards pattern
- `tableHeaders`: `{ listingTime: "Listing Time", defendantName: "Defendant Name", caseNumber: "Case Number" }`
- `sittingAt`: "Sitting at"
- `sessionStart`: "Session start"
- `dataSource`: "Data source"
- `backToTop`: "Back to top"
- `cautionNote` / `cautionReporting`: Special Category Data handling notes (reuse care-standards wording).

**Reporting restrictions (English)** — rendered as a Details/inset block:
> Restrictions on publishing or writing about these cases
>
> You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media.
>
> You'll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both.
>
> Specific restrictions ordered by the court will be mentioned on the cases listed here.
>
> However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences.
>
> To find out which reporting restrictions apply on a specific case, contact:
> - the court directly
> - HM Courts and Tribunals Service on 0330 808 4407
>
> You can also read the reporting restrictions guide

### 7.2 Welsh page content (locales/cy.ts)
Mirror the English structure with these translations (use markers; the translation script resolves them):
- Daily list name: [WELSH TRANSLATION REQUIRED: "Magistrates Public Adult Court List - Daily"]
- Future list name: [WELSH TRANSLATION REQUIRED: "Magistrates Public Adult Court List - Future"]
- Magistrates Public List: Rhestr Gyhoeddus y Llys Ynadon
- Listing Time: [WELSH TRANSLATION REQUIRED: "Listing Time"]
- Defendant Name: [WELSH TRANSLATION REQUIRED: "Defendant Name"]
- Case Number: Rhif yr Achos
- Sitting at: Yn eistedd yn
- Session start: Amser Cychwyn y Sesiwn

**Reporting restrictions (Welsh)** — rendered from:
> [WELSH TRANSLATION REQUIRED: "Restrictions on publishing or writing about these cases"]
>
> [WELSH TRANSLATION REQUIRED: "You must check if any reporting restrictions apply before publishing details on any of the cases listed here either in writing, in a broadcast or by internet, including social media."]
>
> [WELSH TRANSLATION REQUIRED: "You'll be in contempt of court if you publish any information which is protected by a reporting restriction. You could get a fine, prison sentence or both."]
>
> [WELSH TRANSLATION REQUIRED: "Specific restrictions ordered by the court will be mentioned on the cases listed here."]
>
> [WELSH TRANSLATION REQUIRED: "However, restrictions are not always listed. Some apply automatically. For example, anonymity given to the victims of certain sexual offences."]
>
> [WELSH TRANSLATION REQUIRED: "To find out which reporting restrictions apply on a specific case, contact:"]
> - [WELSH TRANSLATION REQUIRED: "the court directly"]
> - [WELSH TRANSLATION REQUIRED: "HM Courts and Tribunals Service on 0330 808 4407"]
>
> [WELSH TRANSLATION REQUIRED: "You can also read the reporting restrictions guide"]

> **Note on Welsh source translations:** the issue provides Welsh strings for both list names, "Magistrates Public List", the three column headers and "Sitting at". The issue lists the same Welsh phrase ("Yn eistedd yn") for both *Sitting at* and *Session start*; this appears to be a source error — flag for content review (see Section 14). All Welsh text above is emitted as `[TRANSLATE: ...]` markers so the post-processing script applies the confirmed translations.

### 7.3 Email content
Per case, the summary lists **Defendant Name** and **Case Number** only. Subject and body wrapper come from the shared GOV.UK Notify subscription template selected by `getSubscriptionTemplateIdForListType`.

## 8. URL

Public style-guide pages (route group `(list-types)` adds no URL prefix); each takes an `artefactId` query parameter:

- `GET /magistrates-public-adult-court-list-daily?artefactId=<id>`
- `GET /magistrates-public-adult-court-list-future?artefactId=<id>`

The slugs must match the `urlPath` values seeded in `list-type-data.ts`; the summary-of-publications page builds the link from `listType.url`. PDF download is served through the existing publication file-download route for the artefact.

## 9. Validation

- **JSON schema:** `magistrates-public-adult-court-list.json` (Draft-07), ported from `pip-data-management`, validated at upload time via `createJsonValidator(schemaPath)` / the publication `json-validator`. The same schema validates both Daily and Future payloads.
- **Required structure:** the nested hierarchy required by the source (document/venue metadata + `courtLists` down to hearings and cases). Text fields carry the standard "no HTML tags" pattern; time/date fields carry format patterns as in the upstream schema.
- **Field-level validation** enforced by schema: presence of listing/sitting time, party/defendant details and case number for each case row.
- **Content date semantics:** Daily = single content date; Future = forward-looking. Both are supplied as publication metadata, not from the payload body, and are not re-validated here.
- No user-submitted form input exists on the style-guide page (read-only), so there is no client-side form validation.

## 10. Error Messages

- **Schema validation failure (upload):** publication rejected with the validator's schema error (path + reason); not stored. Surfaced through the existing upload/validation error channel — no new user-facing copy required.
- **Missing / invalid `artefactId` or wrong list type:** `guardArtefact` returns a 400 rendering the common error page:
  - Error title: "Server Error" / "There is a problem"
  - Error message: generic "The list you requested could not be displayed." (reuse the care-standards / london-admin `serverError` copy).
- **Artefact not found / not accessible:** existing publication access-control / not-found handling (404 / access-denied page) applies unchanged.
- **PDF generation failure:** logged; the style-guide page still renders (download simply unavailable), consistent with `createPdfErrorResult` behaviour — no publication-blocking error.

## 11. Navigation

- Entry point: **Summary of publications** page for a selected location lists available publications and links to the correct style-guide slug via `listType.url`.
- Style-guide page: GOV.UK **Back** link to the summary of publications; **English | Cymraeg** language toggle; **Download list as a PDF** action; **Back to top** anchor.
- No redirects on success (read-only page). Invalid requests redirect/render to the common error page (Section 10).
- Email summary links back to the published list on CaTH.

## 12. Accessibility

Target: **WCAG 2.2 AA** (mandatory).
- Page `<title>` matches the `<h1>` (list name); logical heading hierarchy: `h1` list title → `h2` "Sitting at" (court house) → `h3` "Session start" (session).
- Hearing data presented in a GOV.UK **Table** component with proper `<th scope="col">` column headers (Listing Time, Defendant Name, Case Number) and a caption per session for screen-reader context.
- Reporting-restrictions guidance in an accessible **Details**/inset block; content conveyed by text, not colour alone.
- Language toggle sets `lang` attribute correctly (`en`/`cy`) so screen readers switch pronunciation.
- Keyboard operable: skip link, visible focus states, logical tab order; download link is a real link/button ≥ 44×44px target.
- PDF is a supplementary format; the HTML page is the accessible primary source.
- Verify colour contrast ≥ 4.5:1 for body text.

## 13. Test Scenarios

* Render the style guide for a valid Daily publication and assert Listing Time, Defendant Name and Case Number appear, grouped under "Sitting at" and "Session start" headings.
* Render the style guide for a valid Future publication and assert the Future title and forward-looking date wording.
* List manipulation: given nested source JSON, assert rows are flattened, ordered, listing time is formatted, defendant name is derived correctly, and case number is surfaced.
* Schema validation: a conformant payload passes; payloads missing required fields, containing HTML in text fields, or with malformed times are rejected.
* PDF generation: for both list types, a PDF is produced and stored in English and Welsh, containing the header, reporting-restrictions block and grouped tables.
* Email summary: `extractCaseSummary` returns exactly Defendant Name and Case Number per case; formatted output matches the email builder contract.
* Welsh rendering: page, PDF and email render all labels, headings and reporting restrictions in Welsh when locale is `cy`.
* Registry wiring: both list-type identifiers resolve to the same PDF generator and email builder; the seeded `urlPath` matches the page route.
* Error handling: wrong `listTypeId` for the slug triggers the 400 common error page; missing artefact triggers the existing not-found handling.
* E2E (single journey, `@nightly`): user opens summary of publications → selects the Magistrates Public Adult Court List → views the style guide (English), toggles to Welsh, runs an inline Axe accessibility scan, and downloads the PDF.

## 14. Assumptions & Open Questions

* **Shared implementation:** Daily and Future are assumed to share one JSON schema, one PDF template, one style-guide layout and one email builder, differing only by identifier, display name and content-date semantics. If the payloads or layouts diverge, two separate packages/templates will be required.
* **Provenance value:** exact provenance/source-system identifier for Crime Portal / Libra in `list-type-data.ts` (and any `allowedProvenance` restriction) needs confirmation.
* **Sub-jurisdiction & default sensitivity:** the correct `subJurisdictionIds` and default sensitivity (Public assumed) for both list types need confirmation from the data/reference team.
* **Welsh source inconsistency:** the issue gives the same Welsh phrase ("Yn eistedd yn") for both *Sitting at* and *Session start*. This looks like an error in the source table — **needs content/Welsh-language confirmation** before the translation script is run. Similarly, confirm the two full list-name Welsh translations differ in structure ("Rhestr Achosion Dyddiol..." vs "Rhestr Llys Ynadon Oedolion – Dyfodol").
* **Defendant name formatting:** assumed to follow the upstream `MagistratesAdultCourtListService` ordering (surname, forename). Confirm whether title/middle names are included and how multiple defendants per case are displayed.
* **Case number vs URN:** confirm whether the displayed "Case Number" is the case number or the case URN when both are present in the payload.
* **Case subscriptions:** whether `listSearchConfig` should be populated (defendant-name / case-number field mapping) to enable case-level subscriptions for these list types, or only location/list-type subscriptions are in scope.
* **Content date range for Future:** confirm how the "Future" date range is displayed in the header (single date vs range) and whether it is derived from metadata or payload.
* **Non-strategic vs strategic ingest:** assumed these are strategic (JSON ingested from Crime Portal / Libra), so no Excel converter is required. Confirm they are not uploaded via the non-strategic Excel path.


