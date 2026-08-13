# #677: Downloadable excel File - CFT Hearing Lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story
**Created:** 2026-06-04T13:59:33Z
**Updated:** 2026-08-13T13:06:50Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the downloadable excel file for all the CFT hearing lists.
 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from


**ACCEPTANCE CRITERIA**
- Excel and PDF downloadable files are made available as downloadable options for All Civil and Family Hearing Lists
- All the data fields / columns available in the current downloadable PDF file should also be available on the Excel downloadable file
- Links to download both file types are displayed in the email notifications 

## Comments

### Comment by OgechiOkelu on 2026-08-12T13:08:11Z

@SPEC

### Comment by hmctsclaudecode on 2026-08-12T13:20:50Z

# Technical Specification — Issue #677: Downloadable Excel File — CFT Hearing Lists

## 1. User Story

**As a** verified user of the Court and Tribunal Hearings (CaTH) service
**I want to** download a Civil or Family hearing list as either a PDF or a Microsoft Excel spreadsheet, both from the list page and from my subscription email
**So that** I can work with the hearing data in the format that suits my task — reading and circulating the PDF, or sorting, filtering and re-using the data in a spreadsheet

## 2. Background

CaTH already generates a PDF for every JSON-ingested hearing list and stores it in the publications blob container as `<artefactId>.pdf`. Excel generation exists but is registered for only six list types:

`libs/publication/src/processing/service.ts` — `EXCEL_GENERATOR_REGISTRY`:
- `MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`
- `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`, `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST`

No Civil or Family list type has an Excel generator, and **no Civil or Family list page exposes a download link of any kind** — the generated PDF is only reachable via the subscription email. The `list-download-disclaimer` → `list-download-files` → `download` journey exists only inside `apps/web/src/pages/(list-types)/sjp-public-list/` and `sjp-press-list/`, with the shared helpers in `apps/web/src/pages/(list-types)/sjp-download-shared.ts`.

The pieces that already work and must be reused rather than re-invented:

| Concern | Existing asset |
|---|---|
| Excel writing, CSV-injection escaping, column autofit | `libs/list-types/common/src/excel/excel-utilities.ts` — `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage` |
| Reference Excel generator | `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` |
| Registration by stable list type name | `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` |
| Blob download endpoint with UUID + type allow-list | `handleBlobDownload` in `apps/web/src/pages/(list-types)/sjp-download-shared.ts` |
| Disclaimer + file-choice pages | `sjp-public-list/list-download-disclaimer.{ts,njk}`, `list-download-files.{ts,njk}` |
| Notify template selection incl. PDF+Excel variant | `libs/notifications/src/govnotify/template-config.ts` — `getSubscriptionTemplateId` |
| Notify attachment links | `libs/notifications/src/govnotify/govnotify-client.ts` — `pdf_link_to_file`, `excel_link_to_file` |

Crucially, `buildEmailDataWithFiles` in `libs/notifications/src/notification/notification-service.ts` already attempts `downloadBlob(`${artefactId}.xlsx`)` for **every** list type and already selects the PDF+Excel Notify template when both exist. Acceptance criterion 3 therefore requires no new email plumbing — only that the Excel file is produced, plus one defect fix described in §6.4.

Shared renderers mean the Excel generators can be shared too. The in-scope list types collapse into exactly two data shapes:

- **Shape A — nested cause list.** `renderCauseListData` in `libs/list-types/daily-cause-list-common/src/rendering/renderer.ts` produces `courtLists → courtHouse → courtRoom → session → sittings → hearing → case`. Used by Civil, Family, Civil and Family, and COP.
- **Shape B — flat standard hearing list.** `renderStandardDailyCauseList` in `libs/list-types/rcj-standard-daily-cause-list/src/rendering/renderer.ts` produces a flat `hearings[]` with `venue, judge, time, caseNumber, caseDetails, hearingType, additionalInformation`. Used by the RCJ family, the four regional Administrative Courts, London Administrative Court, Court of Appeal (Civil Division) and Companies Winding Up (ChD).

Two shared generators therefore cover all nineteen in-scope list types.

**Scope definition.** "All Civil and Family Hearing Lists" is read as every list type whose `subJurisdictionIds` fall under jurisdiction `Civil` (id 1) or `Family` (id 2) — that is sub-jurisdictions 1 (Civil Court), 2 (Family Court), 5 (Court of Appeal Civil Division), 10 (High Court), 11 (High Court Family Division) — **and** which already has a view page and PDF generator to mirror. See §14 for the list types this excludes and why.

## 3. Acceptance Criteria

* **Scenario:** Excel is generated for a Civil and Family Daily Cause List on publication
    * **Given** a `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` JSON artefact is published through `processPublication`
    * **When** publication processing completes
    * **Then** `<artefactId>.xlsx` exists in the publications blob container alongside `<artefactId>.pdf`, and `ProcessPublicationResult.excelPath` is set

* **Scenario:** Excel is generated for every in-scope Civil and Family list type
    * **Given** a JSON artefact for any of the nineteen list types named in §6.1
    * **When** publication processing completes
    * **Then** an `.xlsx` blob is produced for that artefact, and `listTypeHasExcel(listTypeName)` returns `true`

* **Scenario:** Excel contains every column present in the PDF
    * **Given** a published Shape A cause list whose PDF renders Time, Case ref, Case name, Case type, Hearing type, Location, Duration, Applicant/Petitioner (with legal advisor), Respondent (with legal advisor) and a reporting-restriction row
    * **When** the Excel file is opened
    * **Then** the worksheet's header row contains a column for each of those fields plus the court house, court room and judge context that the PDF carries in its section headings, with legal advisors and reporting restrictions in their own columns

* **Scenario:** A verified user downloads a Civil hearing list from the list page
    * **Given** a signed-in verified user viewing `/civil-and-family-daily-cause-list?artefactId=<uuid>` for an artefact that has a PDF and an Excel file
    * **When** they select "Download this list", tick the terms and conditions checkbox and continue
    * **Then** they reach a page offering both "Download this PDF (nnKB) to your device" and "Download this Microsoft Excel spreadsheet (nnKB) to your device", and selecting either downloads the file with `Content-Disposition: attachment`

* **Scenario:** The download link is hidden from users who are not verified
    * **Given** an unauthenticated user, a media user, or an internal admin user viewing an in-scope list page
    * **When** the page renders
    * **Then** no "Download this list" button is shown

* **Scenario:** Direct access to the download journey is rejected for users without rights to the artefact
    * **Given** a signed-in verified user whose `provenance` does not permit a `Classified` artefact
    * **When** they request `/list-download-files?artefactId=<uuid>` or `/list-download?artefactId=<uuid>&type=xlsx` directly
    * **Then** the service responds `403` and renders the access-denied page, and no file bytes are returned

* **Scenario:** Terms and conditions must be accepted before the file list is shown
    * **Given** a verified user on `/list-download-disclaimer?artefactId=<uuid>`
    * **When** they submit without ticking the checkbox
    * **Then** the page re-renders with a GOV.UK error summary containing "You must agree to the terms and conditions", and they are not redirected

* **Scenario:** Only the formats that exist are offered
    * **Given** an artefact for which PDF generation succeeded but Excel generation failed
    * **When** a verified user reaches the download files page
    * **Then** only the PDF link is shown, and the page does not error

* **Scenario:** Subscription email carries links to both files
    * **Given** a user subscribed to a location that publishes an in-scope list, and both generated files are under 2MB
    * **When** the publication notification is sent
    * **Then** GOV.UK Notify is called with the PDF+Excel template and both `pdf_link_to_file` and `excel_link_to_file` personalisation

* **Scenario:** An oversized file does not suppress the link to the file that fits
    * **Given** a published in-scope list whose PDF is 3MB and whose Excel is 400KB
    * **When** the notification is sent
    * **Then** the email links to the Excel file only, rather than falling back to the no-links template

* **Scenario:** The journey works in Welsh
    * **Given** a verified user with `?lng=cy`
    * **When** they walk the list page → terms and conditions → download files journey
    * **Then** every heading, body paragraph, checkbox label, button and error message is in Welsh, and the Excel worksheet header row uses the Welsh column names

* **Scenario:** A formula-like cell cannot become a spreadsheet formula
    * **Given** a hearing list where a case name begins with `=`, `+`, `-` or `@`
    * **When** the Excel file is generated
    * **Then** the cell value is prefixed with an apostrophe so the spreadsheet application treats it as text

## 4. User Journey Flow

```
                     ┌──────────────────────────────────────┐
                     │ Publication ingested (JSON)          │
                     │ processPublication()                 │
                     └──────────────┬───────────────────────┘
                                    │
                  ┌─────────────────┴──────────────────┐
                  ▼                                    ▼
      generatePublicationPdf()              generatePublicationExcel()
      → <artefactId>.pdf                    → <artefactId>.xlsx   [NEW for CFT]
                  └─────────────────┬──────────────────┘
                                    ▼
                   sendPublicationNotificationsForArtefact()
                   → Notify template with pdf_link + excel_link
                                    │
        ┌───────────────────────────┴────────────────────────────┐
        ▼                                                        ▼
  EMAIL JOURNEY                                          WEB JOURNEY
  Subscriber opens email                       Verified user finds list via
  → clicks "Download PDF version"              search / courts list / A-Z
    or "Download Excel version"                → /summary-of-publications
  → Notify-hosted file download                → list page (e.g.
    (no CaTH page in between)                    /civil-and-family-daily-cause-list
                                                  ?artefactId=<uuid>)
                                                        │
                                                        ▼
                                            ┌───────────────────────────┐
                                            │ "Download this list"      │
                                            │ button — verified users   │
                                            │ only, only if a file      │
                                            │ exists                    │
                                            └───────────┬───────────────┘
                                                        ▼
                                            /list-download-disclaimer
                                              ?artefactId=<uuid>
                                            Terms and conditions
                                              ├─ not ticked → re-render + error
                                              └─ ticked → POST → redirect
                                                        ▼
                                            /list-download-files
                                              ?artefactId=<uuid>
                                            Choose PDF and/or Excel
                                                        ▼
                                            /list-download
                                              ?artefactId=<uuid>&type=pdf|xlsx
                                            Streams blob as attachment
                                            (browser save dialog; user
                                             stays on the files page)
```

Guard applied at every step of the web journey: `getArtefactById` → `canAccessPublicationData(req.user, artefact, listType)`. Signed-out users hitting the journey directly are sent to `/sign-in` with `session.returnTo` preserved.

## 5. Low Fidelity Wireframe

**5.1 List page — download entry point (verified user only)**

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings              English | Cymraeg   │
├──────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it. │
├──────────────────────────────────────────────────────────────────────┤
│ < Back                                                               │
│                                                                      │
│ Civil and Family Daily Cause List for                                │
│ Birmingham Civil and Family Justice Centre                           │
│ ═══════════════════════════════════════════════════════════════════  │
│ Find contact details and other information about courts and          │
│ tribunals in England and Wales...                                    │
│                                                                      │
│ Priory Courts, 33 Bull Street, Birmingham, B4 6DS                    │
│                                                                      │
│ List for 12 August 2026                                              │
│ Last updated 12 August 2026 at 9:30am                                │
│                                                                      │
│ ┌──────────────────────────┐                                         │
│ │  Download this list      │  ← NEW. govukButton, secondary variant   │
│ └──────────────────────────┘    Rendered only when the user is        │
│                                 VERIFIED and a .pdf or .xlsx blob     │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Important information                                            │ │
│ │ Open justice is a fundamental principle of our justice system... │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Courtroom 1, Before: District Judge Smith                            │
│ ┌───────┬──────────┬───────────┬──────────┬─────────┬──────────────┐ │
│ │ Time  │ Case ref │ Case name │ Case type│ Hearing │ ...          │ │
│ ├───────┼──────────┼───────────┼──────────┼─────────┼──────────────┤ │
│ │ 10am  │ CV-001   │ A v B     │ Civil    │ Trial   │ ...          │ │
│ └───────┴──────────┴───────────┴──────────┴─────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**5.2 Terms and conditions page — `/list-download-disclaimer`**

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings              English | Cymraeg   │
├──────────────────────────────────────────────────────────────────────┤
│ < Back                                                               │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ There is a problem                        (only after a failed   │ │
│ │ • You must agree to the terms and conditions   submission)       │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Terms and conditions                                                 │
│ ═══════════════════════════════════════════════════════════════════  │
│                                                                      │
│ As a verified user of the court and tribunal hearings service you     │
│ are authorised to download this file containing personal protected    │
│ data.                                                                │
│                                                                      │
│ It is your responsibility to ensure you comply with any GDPR and/or  │
│ reporting restrictions regarding the content of this file.           │
│                                                                      │
│ ┌─┐                                                                  │
│ │ │  Please tick this box to agree to the above terms and conditions │
│ └─┘                                                                  │
│                                                                      │
│ ┌────────────┐                                                       │
│ │  Continue  │                                                       │
│ └────────────┘                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**5.3 Download your file page — `/list-download-files`**

```
┌──────────────────────────────────────────────────────────────────────┐
│ GOV.UK  Court and Tribunal Hearings              English | Cymraeg   │
├──────────────────────────────────────────────────────────────────────┤
│ < Back                                                               │
│                                                                      │
│ Download your file                                                   │
│ ═══════════════════════════════════════════════════════════════════  │
│                                                                      │
│ Save your file somewhere you can find it. You may need to print it   │
│ or show it to someone later.                                         │
│                                                                      │
│ Download this PDF (412.6KB) to your device                            │
│ ─────────────────────────────────────────                            │
│                                                                      │
│ Download this Microsoft Excel spreadsheet (78.2KB) to your device     │
│ ────────────────────────────────────────────────────────────         │
│                                                                      │
│ If you have any questions, call 0300 303 0656.                       │
└──────────────────────────────────────────────────────────────────────┘
```

**5.4 Excel worksheet layout — Shape A (Civil / Family / Civil and Family / COP)**

```
   A            B           C       D      E         F          G
┌────────────┬───────────┬───────┬──────┬─────────┬──────────┬───────────┐
│ Court house│ Court room│ Judge │ Time │ Case ref│ Case name│ Case type │  ← bold
├────────────┼───────────┼───────┼──────┼─────────┼──────────┼───────────┤
│ Birmingham │ Court 1   │ DJ    │ 10am │ CV-001  │ A v B    │ Civil     │
│ CFJC       │           │ Smith │      │         │          │           │
│ Birmingham │ Court 1   │ DJ    │ 10am │ CV-002  │ C v D [2]│ Family    │
│ CFJC       │           │ Smith │      │         │          │           │
└────────────┴───────────┴───────┴──────┴─────────┴──────────┴───────────┘
   H              I          J           K                 L
┌──────────────┬──────────┬──────────┬──────────────────┬──────────────┐
│ Hearing type │ Location │ Duration │ Applicant/       │ Applicant    │
│              │          │          │ Petitioner       │ legal advisor│
└──────────────┴──────────┴──────────┴──────────────────┴──────────────┘
   M            N                    O
┌────────────┬────────────────────┬──────────────────────┐
│ Respondent │ Respondent legal   │ Reporting restriction│
│            │ advisor            │                      │
└────────────┴────────────────────┴──────────────────────┘

One row per case (the PDF's innermost loop). Court house / court room /
judge are repeated on every row because a spreadsheet has no section
headings to hang them on.
```

**5.5 Excel worksheet layout — Shape B (RCJ / Administrative Court / Court of Appeal Civil / Companies Winding Up)**

```
   A         B       C       D      E         F        G          H
┌─────────┬───────┬───────┬──────┬─────────┬────────┬──────────┬─────────────┐
│ Section │ Date  │ Venue │ Judge│ Time    │ Case   │ Case     │ Hearing type│  ← bold
│         │       │       │      │         │ number │ details  │             │
├─────────┼───────┼───────┼──────┼─────────┼────────┼──────────┼─────────────┤
│ Admin   │       │ Court │ Mr   │ 10:30am │ CO/123 │ R v Sec  │ Judicial    │
│ Court   │       │ 5     │ J X  │         │        │ of State │ Review      │
│ Planning│       │ Court │ Mrs  │ 2pm     │ CO/456 │ Y v Z    │ Hearing     │
│ Court   │       │ 2     │ J W  │         │        │          │             │
└─────────┴───────┴───────┴──────┴─────────┴────────┴──────────┴─────────────┘
   I
┌────────────────────────┐
│ Additional information │
└────────────────────────┘

Section is populated only for list types whose PDF renders more than one
table (London Administrative Court: Administrative Court / Planning Court;
Court of Appeal Civil: main / future hearings). Date is populated only where
the PDF renders a Date column. Single-section lists omit both columns.
```

## 6. Page Specifications

### 6.1 In-scope list types

**Shape A — one shared generator in `libs/list-types/daily-cause-list-common` (4 list types)**

| `listTypeName` | Page path |
|---|---|
| `CIVIL_DAILY_CAUSE_LIST` | `/civil-daily-cause-list` |
| `FAMILY_DAILY_CAUSE_LIST` | `/family-daily-cause-list` |
| `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` | `/civil-and-family-daily-cause-list` |
| `COP_DAILY_CAUSE_LIST` | `/cop-daily-cause-list` |

**Shape B — one shared generator in `libs/list-types/common` (15 list types)**

| `listTypeName` | Page path | Sections |
|---|---|---|
| `CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST` | `/civil-courts-rcj-daily-cause-list` | single |
| `COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST` | `/county-court-central-london-civil-daily-cause-list` | single |
| `FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST` | `/family-division-high-court-daily-cause-list` | single |
| `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` | `/kings-bench-division-daily-cause-list` | single |
| `KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST` | `/kings-bench-masters-daily-cause-list` | single |
| `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | `/mayor-city-civil-daily-cause-list` | single |
| `SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` | `/senior-courts-costs-office-daily-cause-list` | single |
| `BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `/birmingham-administrative-court-daily-cause-list` | single |
| `LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `/leeds-administrative-court-daily-cause-list` | single |
| `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `/bristol-cardiff-administrative-court-daily-cause-list` | single |
| `MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `/manchester-administrative-court-daily-cause-list` | single |
| `LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `/london-administrative-court-daily-cause-list` | Administrative Court, Planning Court |
| `COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST` | `/court-of-appeal-civil-division-daily-cause-list` | main, future (has Date) |
| `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` | `/companies-winding-up-chd-daily-cause-list` | single |
| `HIGH_COURT_CIVIL_DAILY_CAUSE_LIST`, `HIGH_COURT_FAMILY_DAILY_CAUSE_LIST` | — | **excluded, see §14** |

`COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` shares the Shape B renderer but sits under the Crime jurisdiction (sub-jurisdiction 12). The shared generator will work for it, but it **must not** be added to `EXCEL_GENERATOR_REGISTRY` under this ticket — adding it would silently change the Notify template used for Crime subscribers.

### 6.2 Shape A Excel generator

New file `libs/list-types/daily-cause-list-common/src/excel/excel-generator.ts`, exported from that package's `index.ts`.

```
generateDailyCauseListExcel(options: {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CauseListData;
  translations: { excelColumns: Record<string, string>; title: string; legalAdvisor: string };
}): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

Behaviour, following `magistrates-standard-list/src/excel/excel-generator.ts` exactly:

1. Call `renderCauseListData(jsonData, { locale, locationId, contentDate })` — the same call the PDF generator makes, so PDF and Excel can never drift apart.
2. `new ExcelJS.Workbook()`, one worksheet named from the list's `title` translation (truncate to Excel's 31-character sheet-name limit, strip `[ ] : * ? / \`).
3. Bold header row from `t.excelColumns`, in the order given in §5.4.
4. Iterate `courtLists → courtHouse → courtRoom → session → sittings → hearing → case`, emitting one row per case. Every cell passes through `sanitiseCellValue`.
5. Derive the same values the PDF template derives:
   - Judge — `session.formattedJudiciaries`
   - Duration — `durationAsHours`/`durationAsMinutes` formatted as `"2 hours 30 mins"`, singularised at 1, empty when both are 0. This logic is currently inline in each PDF `.njk`; extract it to `formatSittingDuration(sitting, t)` in `daily-cause-list-common` and call it from both the Excel generator and the templates so the two cannot diverge.
   - Case name — `case.caseName` plus ` [n]` when `caseSequenceIndicator` is set
   - Location — `sitting.caseHearingChannel`
   - Reporting restriction — `case.formattedReportingRestriction`
6. `autoFitColumns(worksheet)`, `workbook.xlsx.writeBuffer()`, `saveExcelToStorage(artefactId, Buffer.from(buffer))`.
7. Never throw: catch and return `{ success: false, error }`. `generatePublicationExcel` logs a warning and publication continues without Excel.

Each of the four list packages adds a thin wrapper that supplies its own locale object, e.g. `libs/list-types/civil-and-family-daily-cause-list/src/excel/excel-generator.ts` exporting `generateCivilAndFamilyDailyCauseListExcel`.

### 6.3 Shape B Excel generator

New file `libs/list-types/common/src/excel/standard-hearing-list-excel.ts`, exported from `@hmcts/list-types-common`.

```
generateStandardHearingListExcel(options: {
  artefactId: string;
  locale: string;
  sheetName: string;
  columns: StandardExcelColumns;       // translated header labels
  sections: { name?: string; hearings: StandardHearing[] }[];
  includeSection: boolean;
  includeDate: boolean;
}): Promise<{ success: boolean; excelPath?: string; error?: string }>
```

Section and Date columns are emitted only when `includeSection` / `includeDate` are true, so single-section lists get exactly the seven PDF columns and nothing more. Callers build `sections` from the same `normaliseHearings`-derived arrays their PDF templates use.

### 6.4 Registration and notification changes

`libs/publication/src/processing/service.ts`:

- Add the nineteen entries to `EXCEL_GENERATOR_REGISTRY`, keyed by `listTypeName` string. Shared factory helpers keep the additions to one line each, mirroring how `rcjStandardGenerator` and `adminCourtGenerator` are shared in `PDF_GENERATOR_REGISTRY`.
- No change to `generatePublicationExcel`, `listTypeHasExcel` or `processPublication` — they are already generic over the registry.

`libs/notifications/src/notification/notification-service.ts` — fix `buildEmailDataWithFiles`:

```
// current: one oversized file suppresses the link to the other
const filesUnder2MB = (hasPdf ? pdfUnder2MB : true) && (hasExcel ? excelUnder2MB : true);
```

Today a 3MB PDF plus a 400KB Excel yields `filesUnder2MB === false`, which routes to the no-links template and drops the usable Excel link. Replace the combined flag with per-file gating so the template is chosen from whichever files actually fit:

```
const attachPdf = hasPdf && pdfUnder2MB;
const attachExcel = hasExcel && excelUnder2MB;
// no-links template only when neither file can be attached
```

`getSubscriptionTemplateId` already returns the no-links template when `!hasPdf && !hasExcel`, so the `filesUnder2MB` parameter can be dropped from its signature once callers pass pre-gated booleans.

This is not cosmetic: Civil and Family cause lists for large venues are among the biggest PDFs in the service, so the oversized-PDF path is a realistic case and would defeat acceptance criterion 3.

### 6.5 Shared download journey

Replace the per-list-type duplication with three generic pages under the `(list-types)` route group. All three resolve the artefact and re-check authorisation rather than trusting the role alone.

| File | Exports | Responsibility |
|---|---|---|
| `apps/web/src/pages/(list-types)/list-download-disclaimer/index.ts` | `GET`, `POST` | Terms and conditions. `GET` validates the UUID and renders. `POST` requires `agreed`, else re-renders with the error summary, else redirects to `/list-download-files?artefactId=…` |
| `apps/web/src/pages/(list-types)/list-download-files/index.ts` | `GET` | Lists the formats that exist via `getBlobProperties` on `<id>.pdf` and `<id>.xlsx`; `404` when neither exists |
| `apps/web/src/pages/(list-types)/list-download/index.ts` | `GET` | Streams the blob with `Content-Type` from `getContentType`, `Content-Disposition: attachment`, and no-store cache headers |
| `apps/web/src/pages/(list-types)/list-download-shared.ts` | helpers | `requireDownloadAccess` middleware, `getAvailableFiles`, `formatFileSize` — generalised from today's `sjp-download-shared.ts` |

`requireDownloadAccess` (new, applied to all three pages):

1. Reject a missing or malformed `artefactId` with `400` (reuse the existing `UUID_REGEX`).
2. If there is no `req.user`, set `req.session.returnTo = req.originalUrl` and redirect to `/sign-in`.
3. `getArtefactById(artefactId)` → `404` if absent.
4. `canAccessPublicationData(req.user, artefact, await resolveListType(artefact.listTypeId))` → `403` + `errors/403` if false.
5. Require `req.user.role === "VERIFIED"` → `403` otherwise. Downloads are a verified-user capability even for `Public` artefacts, matching the current SJP rule.
6. Attach the artefact to `res.locals` so the handlers do not refetch.

Step 4 is stronger than the current SJP journey, which checks only `role === "VERIFIED"` and never re-reads the artefact — meaning a verified user with the wrong `provenance` can currently fetch a `Classified` blob by guessing the artefact ID. Routing the CFT journey through `canAccessPublicationData` closes that gap; migrating SJP onto the shared pages (§6.7) closes it there too.

Templates, single copy each, in `libs/web-core/src/views/list-download/`:
- `disclaimer.njk` — `govukErrorSummary`, `govukCheckboxes`, `govukButton`, hidden `artefactId`
- `files.njk` — one `govuk-body` paragraph per available file with a `govuk-link`

Both extend `layouts/base-template.njk` and use the `page_content` block.

### 6.6 Download entry point on list pages

Compute the URL centrally rather than in nineteen controllers. In `apps/web/src/pages/(list-types)/list-type-handler.ts`, both `createListTypeHandler` and `createSimpleListTypeHandler` already load the artefact and check access; after that check, add:

```
res.locals.downloadDisclaimerUrl =
  req.user?.role === "VERIFIED" && (await hasDownloadableFile(artefactId))
    ? `/list-download-disclaimer?artefactId=${artefactId}`
    : null;
```

`hasDownloadableFile` issues the two `getBlobProperties` calls in parallel and returns as soon as either resolves truthy. Because it runs only for verified users it adds no latency for the public.

New partial `libs/web-core/src/views/components/list-download-button.njk`:

```njk
{% if downloadDisclaimerUrl %}
  <p class="govuk-body">
    <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false"
       class="govuk-button govuk-button--secondary" data-module="govuk-button">
      {{ t.downloadListButton or listDownload.downloadListButton }}
    </a>
  </p>
{% endif %}
```

Each of the nineteen list templates includes it once, directly below the "Last updated" line:

```njk
{% include "components/list-download-button.njk" %}
```

Since `res.locals` is exposed to Nunjucks, no per-page controller change is needed.

### 6.7 SJP consolidation

The two SJP page directories currently hold four near-identical `.njk` files with the same template names (`list-download-disclaimer.njk`, `list-download-files.njk`). Nunjucks resolves by name across the search path, so which copy wins is search-order dependent — a latent bug that a third and fourth copy would make worse.

Delete `sjp-public-list/list-download-{disclaimer,files}.{ts,njk}` and the `sjp-press-list` equivalents, delete `sjp-download-shared.ts`, and point both SJP list pages' download buttons at the shared `/list-download-disclaimer`. SJP keeps its existing wording by having the shared disclaimer content live in one place (§7) — the current SJP copy is already generic and mentions no list type. Existing `.njk.test.ts` and `.test.ts` files for the deleted pages are removed; their coverage is replaced by tests against the shared pages.

If product wants SJP-specific disclaimer wording retained, keep the SJP pages and scope the shared journey to CFT only — see §14.

## 7. Content

Shared download-journey content in `libs/web-core/src/locales/list-download/en.ts` and `cy.ts`, exported from `@hmcts/web-core` as `listDownloadEn` / `listDownloadCy`. Wording is carried over verbatim from `libs/list-types/sjp-public-list/src/sjp-public-list/en.ts` so the journey reads identically to the one verified users already know.

**English — `en.ts`**

```typescript
export const en = {
  downloadListButton: "Download this list",
  disclaimer: {
    pageTitle: "Terms and conditions",
    disclaimerText:
      "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data.",
    responsibility:
      "It is your responsibility to ensure you comply with any GDPR and/or reporting restrictions regarding the content of this file.",
    checkboxLabel: "Please tick this box to agree to the above terms and conditions",
    continueButton: "Continue",
    errorTitle: "There is a problem",
    errorCheckbox: "You must agree to the terms and conditions"
  },
  downloadFiles: {
    pageTitle: "Download your file",
    saveInstructions:
      "Save your file somewhere you can find it. You may need to print it or show it to someone later.",
    downloadPdfLink: "Download this PDF",
    downloadExcelLink: "Download this Microsoft Excel spreadsheet",
    toDevice: "to your device",
    contactInfo: "If you have any questions, call 0300 303 0656."
  }
};
```

**Welsh — `cy.ts`** (identical key structure, per the Welsh language rules)

```typescript
export const cy = {
  downloadListButton: [WELSH TRANSLATION REQUIRED: "Download this list"],
  disclaimer: {
    pageTitle: Telerau ac amodau,
    disclaimerText: [WELSH TRANSLATION REQUIRED: "As a verified user of the court and tribunal hearings service you are authorised to download this file containing personal protected data."],
    responsibility: Eich cyfrifoldeb chi yw sicrhau eich bod yn cydymffurfio ag unrhyw gyfyngiadau GDPR a/neu gyfyngiadau riportio gyda golwg ar gynnwys y ffeil hon.,
    checkboxLabel: [WELSH TRANSLATION REQUIRED: "Please tick this box to agree to the above terms and conditions"],
    continueButton: Parhau,
    errorTitle: Mae problem,
    errorCheckbox: Rhaid ichi gytuno 'r telerau a'r amodau
  },
  downloadFiles: {
    pageTitle: Llwytho eich ffeil i lawr,
    saveInstructions: Arbedwch eich ffeil yn rhywle y gellir cael hyd iddi. Efallai y bydd arnoch angen ei hargraffu neu ei dangos i rywun yn nes ymlaen.,
    downloadPdfLink: [WELSH TRANSLATION REQUIRED: "Download this PDF"],
    downloadExcelLink: [WELSH TRANSLATION REQUIRED: "Download this Microsoft Excel spreadsheet"],
    toDevice: [WELSH TRANSLATION REQUIRED: "to your device"],
    contactInfo: Os oes gennych gwestiwn, ffoniwch 0300 303 0656.
  }
};
```

**Excel column headers — Shape A.** Added as `excelColumns` to each of the four list packages' locale files, matching the `magistrates-standard-list` convention. English:

```typescript
excelColumns: {
  courtHouse: "Court house",
  courtRoom: "Court room",
  judge: "Judge",
  time: "Time",
  caseRef: "Case ref",
  caseName: "Case name",
  caseType: "Case type",
  hearingType: "Hearing type",
  location: "Location",
  duration: "Duration",
  applicant: "Applicant/Petitioner",
  applicantLegalAdvisor: "Applicant legal advisor",
  respondent: "Respondent",
  respondentLegalAdvisor: "Respondent legal advisor",
  reportingRestriction: "Reporting restriction"
}
```

Welsh equivalents reuse the existing translated keys already present in each package's `cy.ts` where they exist (`time`, `caseRef`, `caseName`, `caseType`, `hearingType`, `location`, `duration`, `applicant`, `respondent`, `reportingRestrictions`, `legalAdvisor`, `courtroom`, `judge`). Only the genuinely new labels need markers:

```typescript
excelColumns: {
  courtHouse: [WELSH TRANSLATION REQUIRED: "Court house"],
  courtRoom: cy.courtroom,
  judge: cy.judge,
  time: cy.time,
  caseRef: cy.caseRef,
  caseName: cy.caseName,
  caseType: cy.caseType,
  hearingType: cy.hearingType,
  location: cy.location,
  duration: cy.duration,
  applicant: cy.applicant,
  applicantLegalAdvisor: [WELSH TRANSLATION REQUIRED: "Applicant legal advisor"],
  respondent: cy.respondent,
  respondentLegalAdvisor: [WELSH TRANSLATION REQUIRED: "Respondent legal advisor"],
  reportingRestriction: cy.reportingRestrictions
}
```

**Excel column headers — Shape B.** Reuse the existing `tableHeaders` objects (`venue`, `judge`, `time`, `caseNumber`, `caseDetails`, `hearingType`, `additionalInformation`, `date`) already translated in each Shape B package, plus one new shared label:

```typescript
section: "Section"          // en
section: [WELSH TRANSLATION REQUIRED: "Section"]   // cy
```

**Notify email link text.** `govnotify-client.ts` hardcodes `"Download PDF version"` and `"Download Excel version"` in English for all recipients. The subscription notification path already knows the recipient's `language` (`LOCALE_TO_LANGUAGE` in `processing/service.ts`), so the link text should be locale-aware:

```typescript
pdf_link_text:   "Download PDF version"    / [WELSH TRANSLATION REQUIRED: "Download PDF version"]
excel_link_text: "Download Excel version"  / [WELSH TRANSLATION REQUIRED: "Download Excel version"]
```

## 8. URL

| Method | URL | Purpose | Access |
|---|---|---|---|
| `GET` | `/<list-path>?artefactId=<uuid>` | Existing list pages (§6.1); now render the download button | Per artefact sensitivity |
| `GET` | `/list-download-disclaimer?artefactId=<uuid>` | Terms and conditions | Verified + artefact access |
| `POST` | `/list-download-disclaimer` | Body `artefactId`, `agreed` | Verified + artefact access |
| `GET` | `/list-download-files?artefactId=<uuid>` | Choose format | Verified + artefact access |
| `GET` | `/list-download?artefactId=<uuid>&type=pdf` | Stream the PDF | Verified + artefact access |
| `GET` | `/list-download?artefactId=<uuid>&type=xlsx` | Stream the Excel file | Verified + artefact access |

Routes are auto-discovered from `apps/web/src/pages`; `(list-types)` is a route group so it adds no URL prefix. Flat top-level URLs — rather than the current per-list nesting (`/sjp-public-list/list-download-disclaimer`) — mean one implementation serves all nineteen list types with no `req.path`-prefix arithmetic.

The download filename is `<artefactId>.pdf` / `<artefactId>.xlsx`, as today. Blob keys are unchanged, so the Notify path and the third-party push path are unaffected.

## 9. Validation

**`artefactId`** — required on all three pages; must match `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. Failure → `400` + `errors/400`. Validating the shape before any blob or DB call prevents the ID being used to probe storage.

**`type`** — required on `/list-download`; must be a member of the `["pdf", "xlsx"]` allow-list. Failure → `400`. The allow-list, not string concatenation, is what makes the blob key safe.

**`agreed`** — required on `POST /list-download-disclaimer`; any truthy value passes. Absent → re-render with an error summary and preserve `artefactId` in the hidden field. Server-side only; no client-side validation.

**Artefact existence** — `getArtefactById` returning `undefined` → `404` + `errors/404`.

**Blob existence** — `getAvailableFiles` returning an empty array → `404`. A `type` whose blob is missing → `404`, not an empty `200`.

**Excel generation input** — none. The generator receives JSON that `validateListTypeJson` already accepted at upload, and consumes it through the same renderer as the PDF. It must nevertheless tolerate missing optional branches (`session.sittings` empty, `hearing.case` empty, absent `party` array) by emitting no rows rather than throwing, and must never block publication: a failure is logged by `generatePublicationExcel` and the PDF-only path continues.

**Cell content** — every string written to a cell goes through `sanitiseCellValue`, which prefixes `'` when the value starts with `=`, `+`, `-` or `@`. Numeric and date values are written as pre-formatted strings (`"10am"`, `"2 hours 30 mins"`) exactly as the PDF renders them, so no locale-dependent spreadsheet coercion occurs.

**Worksheet name** — derived from the list title, truncated to 31 characters and stripped of `[ ] : * ? / \`, which Excel rejects.

## 10. Error Messages

| Condition | Response | User-facing text |
|---|---|---|
| Checkbox not ticked | Re-render disclaimer, `200` | Summary title: "There is a problem" / Mae problem · Item and inline: "You must agree to the terms and conditions" / Rhaid ichi gytuno 'r telerau a'r amodau, linked to `#agreed` |
| Missing or malformed `artefactId` | `400` `errors/400` | Existing 400 page content |
| Missing or unsupported `type` | `400` `errors/400` | Existing 400 page content |
| Not signed in | `302` → `/sign-in` | None — `session.returnTo` returns the user to the journey after sign-in |
| Signed in but not `VERIFIED`, or no rights to this artefact | `403` `errors/403` | "Access Denied" / [WELSH TRANSLATION REQUIRED: "Access Denied"] · "You do not have permission to view this publication." / [WELSH TRANSLATION REQUIRED: "You do not have permission to view this publication."] |
| Artefact not found | `404` `errors/404` | Existing 404 page content |
| Neither file exists for the artefact | `404` `errors/404` | Existing 404 page content |
| Requested file missing from blob storage | `404` `errors/404` | Existing 404 page content |
| Blob storage or unexpected failure | `500` `errors/500` | Existing 500 page content; error logged server-side without the artefact's personal data |
| Excel generation fails during publication | No user-facing error | Warning logged by `generatePublicationExcel`; the list page and email offer PDF only |

The current SJP download pages return `res.status(400).json({ error: "Invalid request" })` for bad input. The shared pages render the GOV.UK error pages instead — these are browser navigations, and a raw JSON body is neither accessible nor bilingual.

## 11. Navigation

- **Entry** — the "Download this list" secondary button on each in-scope list page. It appears only for `VERIFIED` users when at least one file exists, so a user is never offered a dead end.
- **Back link** — `layouts/base-template.njk` provides it. From `/list-download-disclaimer` it returns to the list page; from `/list-download-files` it returns to the disclaimer.
- **`POST /list-download-disclaimer`** — on success, `302` to `/list-download-files?artefactId=<uuid>`. Redirect-after-POST prevents a re-submission on refresh.
- **`GET /list-download`** — returns a file body, not a page. The browser opens its save dialog and the user remains on `/list-download-files`, free to download the other format without repeating the disclaimer.
- **Language toggle** — preserved by the existing i18n middleware; `?lng=cy` survives the redirect and the file download.
- **Email** — Notify-hosted `pdf_link_to_file` / `excel_link_to_file` links download directly and do not route through CaTH, so the disclaimer is not shown. This is existing behaviour and is unchanged; the acceptance criterion asks only that both links appear.
- **Deep links** — all three URLs are individually addressable and independently guarded, so a bookmarked or shared `/list-download-files` link is safe: an unauthorised user gets `403`, a signed-out user is sent to sign in and returned.

## 12. Accessibility

WCAG 2.2 AA is mandatory. Requirements specific to this work:

**Disclaimer page**
- `<h1>` is the page title "Terms and conditions", and `<title>` matches it.
- Error summary rendered with `govukErrorSummary` above the `<h1>`, with `role="alert"` and focus moved to it on load after a failed submission.
- Summary item links to `#agreed`; the checkbox carries `aria-describedby` pointing at the inline error and `aria-invalid="true"` when in error.
- Single `govukCheckboxes` item — label text is the full sentence, associated via `for`/`id`.
- `novalidate` on the form; validation is server-side so the error is announced on a fresh page load.

**Download files page**
- `<h1>` "Download your file"; `<title>` matches.
- Each file is a plain `<a class="govuk-link">` whose text carries format, size and destination — "Download this PDF (412.6KB) to your device". Never "click here" or a bare "Download": link text must make sense out of context for screen-reader users listing links.
- Size is exposed as text, not colour or an icon, so it is available to all users.
- No `target="_blank"`; the download does not navigate away, so context is preserved.

**Download button on list pages**
- Rendered as an `<a role="button" class="govuk-button govuk-button--secondary" data-module="govuk-button">`, which is keyboard-focusable and Space/Enter operable via GOV.UK Frontend.
- Secondary variant so it does not compete with the page's primary content; it sits after the "Last updated" line and before "Important information", within the reading order and not visually detached from the list it applies to.
- Minimum 44×44px target from the GOV.UK button component.

**Progressive enhancement**
- The whole journey is HTML forms and links. No JavaScript is required at any step, including the file downloads.

**Excel artefact accessibility**
- Row 1 is a bold header row; no merged cells, no blank spacer rows, no data above the header. This keeps the sheet navigable by screen readers and usable by `Ctrl+Shift+L`-style filtering.
- The worksheet is named for the list rather than left as `Sheet1`.
- Context that the PDF conveys visually through section headings (court house, court room, judge, section) is repeated in data columns, so no information is carried by layout alone.

**Testing**
- Axe scans run inline within the E2E journey test at the disclaimer page and the download files page.
- Keyboard-only traversal of the journey is asserted in the same test.
- Both pages checked at 400% zoom / 320px width for reflow.

## 13. Test Scenarios

**Excel generators — Shape A (`libs/list-types/daily-cause-list-common/src/excel/excel-generator.test.ts`)**
- Generates a workbook whose header row contains every column named in §5.4, in order, and in bold
- Emits one row per case across a fixture with two court houses, two court rooms, two sessions, two sittings and multiple hearings and cases, proving the full nesting is traversed
- Repeats court house, court room and judge on every row belonging to that section
- Appends the case sequence indicator to the case name in the same `[n]` form the PDF uses
- Formats duration as "2 hours 30 mins", "1 hour", "1 min", and empty when the sitting has no start or end — asserted against the same helper the PDF template uses
- Writes applicant and respondent legal advisors to their own columns rather than concatenating them into the party column
- Writes the joined reporting restriction into its column, and an empty cell when there is none
- Prefixes an apostrophe when a case name, party name or additional-information value starts with `=`, `+`, `-` or `@`
- Produces a header-only workbook for a list with no hearings, without throwing
- Returns `{ success: false, error }` — not a rejected promise — when the blob upload fails
- Uses Welsh column headers and the Welsh location name when the locale is `cy`

**Excel generator — Shape B (`libs/list-types/common/src/excel/standard-hearing-list-excel.test.ts`)**
- Emits exactly the seven PDF columns for a single-section list, with no Section or Date column
- Emits a Section column populated per section for a two-section list, and a Date column only when `includeDate` is set
- Truncates and sanitises a worksheet name longer than 31 characters or containing characters Excel rejects

**Registry (`libs/publication/src/processing/service.test.ts`)**
- `listTypeHasExcel` returns `true` for each of the nineteen in-scope names and `false` for `COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST`
- `processPublication` sets `result.excelPath` to `<artefactId>.xlsx` for an in-scope list type
- A throwing Excel generator does not prevent the PDF path from completing or notifications from being sent
- Fixtures use an arbitrary `listTypeId` such as `999` to prove routing is driven entirely by `listTypeName`

**Notifications (`libs/notifications/src/notification/notification-service.test.ts`, `govnotify/template-config.test.ts`)**
- Both files present and under 2MB → PDF+Excel template, with both `pdf_link_to_file` and `excel_link_to_file` personalisation
- PDF over 2MB, Excel under → Excel link only, **not** the no-links template (regression test for the §6.4 fix)
- Excel over 2MB, PDF under → PDF-only template
- Both over 2MB → no-links template
- Excel blob absent → existing PDF-only behaviour is unchanged
- Notify link text is Welsh when the subscriber's language is `WELSH`

**Shared download pages (`apps/web/src/pages/(list-types)/list-download*/index.test.ts`)**
- Disclaimer `GET` renders with the shared content and no errors
- Disclaimer `POST` without `agreed` re-renders with an error summary item linked to `#agreed`, and does not redirect
- Disclaimer `POST` with `agreed` redirects to `/list-download-files?artefactId=<uuid>`
- Malformed `artefactId` yields `400` on all three pages
- Signed-out request redirects to `/sign-in` with `session.returnTo` set to the original URL
- A verified user without rights to a `Classified` artefact gets `403` and no file bytes — asserted separately for the files page and the download endpoint
- A non-`VERIFIED` signed-in role gets `403`
- Files page lists only the formats whose blobs exist; `404` when neither does
- Download endpoint rejects a `type` outside the allow-list with `400`
- Download endpoint sets `Content-Type`, `Content-Disposition: attachment` and no-store cache headers

**Template tests (`libs/web-core/src/views/list-download/*.njk.test.ts`)**
- Disclaimer renders the checkbox, the hidden `artefactId` and the continue button; renders the error summary only when `errors` is set
- Files page renders one link per file with format, size and "to your device" in the link text; renders the correct labels for PDF versus Excel
- Both render Welsh headings and labels when passed the `cy` object
- Locale key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, recursively for `disclaimer` and `downloadFiles`
- `components/list-download-button.njk` renders the anchor when `downloadDisclaimerUrl` is set and nothing at all when it is null

**List page integration (`apps/web/src/pages/(list-types)/*/index.test.ts`)**
- For one Shape A and one Shape B list page: `res.locals.downloadDisclaimerUrl` is set for a verified user when a blob exists, and null for a verified user when no blob exists, for a media user, and for an anonymous user

**E2E (`e2e-tests/tests/verified-user/list-download.spec.ts`)** — one journey test, tagged `@nightly`:
- Sign in as a verified user, open a seeded Civil and Family Daily Cause List, select "Download this list"
- Submit the disclaimer without ticking and assert the error summary appears
- Switch to Welsh and assert the Welsh disclaimer heading and error text
- Run an Axe scan on the disclaimer page
- Tab to the checkbox, activate it with Space, submit with Enter
- On the download files page, assert both the PDF and Excel links with their sizes, run an Axe scan, and assert the `.xlsx` download completes with the expected filename
- Sign out and request `/list-download-files?artefactId=<uuid>` directly, asserting the redirect to sign-in

## 14. Assumptions & Open Questions

* **The ticket title says "CSV" but every acceptance criterion says "Excel". This spec delivers `.xlsx`.** That is what the ACs ask for, what the existing infrastructure produces (`saveExcelToStorage`, the `xlsx` entry in the download type allow-list, the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` template), and what SJP and Magistrates users already receive. **If genuine CSV is wanted, that is a different ticket** — it needs a new blob extension, a new entry in the download allow-list, a new Notify template, and a decision about how a nested cause list flattens into a single unheaded CSV. Confirm before build.
* **Scope is read as the Civil and Family jurisdictions, which is nineteen list types.** The title says "CFT hearing lists", which would also pull in Employment Tribunals, IAC, SSCS, the FTT chambers, the Upper Tribunal chambers and the rest — roughly forty more. The AC text ("All Civil and Family Hearing Lists") is narrower and is what this spec builds. **Confirm whether tribunals are expected in this ticket or a follow-up.** The two shared generators make the follow-up cheap: most tribunal lists already use the Shape B flat renderer.
* **`HIGH_COURT_CIVIL_DAILY_CAUSE_LIST` and `HIGH_COURT_FAMILY_DAILY_CAUSE_LIST` are excluded.** They exist in `list-type-data.ts` but have no view page, no PDF generator and no schema, so there is no PDF whose columns an Excel file could mirror. `PCOL_DAILY_CAUSE_LIST` is excluded for the same reason. They should be picked up when those list types are implemented.
* **`COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST` is deliberately not registered** even though it shares the Shape B generator, because it is a Crime list. Registering it would change the Notify template Crime subscribers receive, which is outside this ticket's remit.
* **The web download journey is new for Civil and Family lists — not just the Excel half.** These pages currently expose no download link at all, so AC 1 ("Excel and PDF downloadable files are made available as downloadable options") requires building the entry point and the two-page journey, not only the generator. Flagging in case the AC was written on the assumption that PDF download already worked.
* **Downloads stay verified-user-only, including for `Public` artefacts.** This matches today's SJP rule and the "CaTH verified users" framing in the user story. Confirm that a media or anonymous user viewing a `Public` Civil list should still not be offered a download.
* **Assumed no separate disclaimer wording is needed per list type.** The existing SJP terms text is generic. If Civil and Family require different wording — for example a reference to family reporting restrictions — the shared content object needs a per-list override and §6.7's SJP consolidation should be reconsidered.
* **The §6.4 Notify fix changes existing behaviour for other list types.** Any list where one file exceeds 2MB and the other does not will start receiving a link instead of a no-links email. That is the correct behaviour and is needed for AC 3, but it is a live behavioural change beyond the Civil and Family scope and should be called out at review.
* **No audit logging of downloads is specified.** The service audits notifications but there is no existing download-audit mechanism. Confirm whether verified-user downloads of personal data need an audit-log entry — if so, that is additional work in `libs/audit`.
* **Excel file size is not capped.** `MAX_PDF_SIZE_BYTES` (2MB) gates email attachment only, not the blob or the web download. A very large Civil list will produce a large `.xlsx` that is downloadable from the web but not emailable. Assumed acceptable; the file-size label on the download page sets the user's expectation.
* **`generateStandardHearingListExcel` lives in `libs/list-types/common`.** That package is already imported by every Shape B list type, so no new dependency edges or circular-import risk. If it grows further it should move to its own package.
* **Assumed the same Excel file serves both languages, generated at publication in the publication's own locale.** This matches the PDF, which is also generated once per artefact from `params.locale`. A Welsh-speaking user downloading an English-language publication gets English column headers. Confirm this is acceptable, or the generator must produce two blobs per artefact.


### Comment by OgechiOkelu on 2026-08-13T13:06:50Z

@plan 

