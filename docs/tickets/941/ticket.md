# #941: Create additional file format for Download version of Rolls Building hearing lists

**State:** OPEN
**Assignees:** 
**Author:** OgechiOkelu
**Labels:** 
**Created:** 2026-08-12T11:38:14Z
**Updated:** 2026-08-12T12:33:18Z

## Description

**PROBLEM STATEMENT**
Currently, only the PDF download file is available to CaTH users in the email notification sent out when a list the user has subscribed to is published. This ticket is raised to create the CSV download file for the Rolls Building hearing lists.
**Rolls Building Lists:**
Intellectual Property and Enterprise Court (ChD) daily cause list
Intellectual Property List (ChD) daily cause list
London Circuit Commercial Court (KB) daily cause list
Patents Court (ChD) daily cause list
Pensions List (ChD) daily cause list
Property, Trusts and Probate list (ChD) daily cause list
Revenue List (ChD) daily cause list
Technology and Construction Court (KB) daily cause list
Admiralty Court (KB) daily cause list
Business list (ChD) daily cause list
Chancery Appeals (ChD) daily cause list
Commercial Court (KB) daily cause list
Companies Winding Up (ChD) daily cause list
Competition List (ChD) daily cause list
Financial List (ChD/KB) daily cause list
Insolvency & Companies Court (ChD) daily cause list
 Interim Applications (ChD) daily cause list

 

**AS A** service
**I WANT** to provide additional download file options for hearing lists in CaTH
**SO THAT** CaTH verified users have more options to choose from
 

**ACCEPTANCE CRITERIA**
- CSV and PDF downloadable files are made available as downloadable options for all Rolls Building hearing lists above
- All the data fields available in the current downloadable PDF file should also be available on the CSV downloadable file
- Links to download both file types are displayed in the email notifications

## Comments

### Comment by OgechiOkelu on 2026-08-12T11:45:19Z

@spec 

### Comment by hmctsclaudecode on 2026-08-12T11:53:06Z

# Technical Specification — Issue #941

**Create additional file format (CSV) for the download version of Rolls Building hearing lists**

---

## 1. User Story

**As a** CaTH verified user (press, legal professional or court user) subscribed to a Rolls Building hearing list
**I want to** receive a CSV download of the list alongside the existing PDF in my subscription email
**So that** I can open the hearing data in a spreadsheet to sort, filter and re-use it, instead of re-typing it out of a PDF

---

## 2. Background

### 2.1 What exists today

Subscription emails for generated (non flat-file) publications carry file links produced by GOV.UK Notify's `prepareUpload()` document service. The pipeline is:

```
processPublication()                         libs/publication/src/processing/service.ts
  ├─ generatePublicationPdf()                → PDF_GENERATOR_REGISTRY[listTypeName]  → <artefactId>.pdf
  ├─ generatePublicationExcel()              → EXCEL_GENERATOR_REGISTRY[listTypeName] → <artefactId>.xlsx
  └─ sendPublicationNotificationsForArtefact()
       └─ buildEmailDataWithFiles()          libs/notifications/src/notification/notification-service.ts
            ├─ downloadBlob(<artefactId>.pdf)
            ├─ downloadBlob(<artefactId>.xlsx)
            ├─ getSubscriptionTemplateId()   libs/notifications/src/govnotify/template-config.ts
            └─ sendEmail()                   libs/notifications/src/govnotify/govnotify-client.ts
                 → personalisation.pdf_link_to_file   / pdf_link_text
                 → personalisation.excel_link_to_file / excel_link_text
```

A second download format has already been delivered twice by this route:

| List type | Second format | Generator |
|---|---|---|
| `SJP_PUBLIC_LIST`, `SJP_DELTA_PUBLIC_LIST`, `SJP_PRESS_LIST`, `SJP_DELTA_PRESS_LIST` | `.xlsx` | `libs/excel-generation/src/excel/` |
| `MAGISTRATES_PUBLIC_LIST` | `.xlsx` | `libs/list-types/magistrates-public-list/src/excel/excel-generator.ts` |
| `MAGISTRATES_STANDARD_LIST` | `.xlsx` | `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts` |

Issue #673 ("Excel — Magistrate public and standard hearing lists") is the direct precedent for this ticket. It was delivered as **email links only** — no new in-service download page was added for the magistrates lists. Only the SJP lists have an in-service format chooser (`apps/web/src/pages/(list-types)/sjp-*/list-download-files.*` + `sjp-download-shared.ts`, whose `ALLOWED_TYPES` is `{pdf, xlsx}`).

`libs/publication/src/file-storage/content-type.ts` already maps `.csv` → `text/csv`, so blob serving needs no change for the new extension.

### 2.2 The Rolls Building lists share one data shape

All 17 lists named in the issue are non-strategic, Excel-upload lists that share a single 7-field hearing shape in `libs/list-types/chd-kb-common`:

```ts
// libs/list-types/chd-kb-common/src/models/types.ts
export interface ChdKbHearing {
  judge: string;
  time: string;
  venue: string;
  type: string;
  caseNumber: string;
  caseName: string;
  additionalInformation: string;
}
```

`chd-kb-common` already owns the JSON schema, the validator, the renderer, the email-summary builder and the Excel-upload converter config for this shape. **One shared CSV generator in `chd-kb-common` therefore covers all 17 lists** — this is the core of the design below.

### 2.3 Blocking dependency — 16 of the 17 list types do not exist yet

Only **`COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`** is present in `libs/list-types/common/src/list-type-data.ts` today. Searching the repo for `PATENTS`, `ADMIRALTY`, `INSOLVENCY`, `FINANCIAL_LIST`, `REVENUE_LIST`, `INTELLECTUAL_PROPERTY`, `COMPETITION_LIST`, `INTERIM_APPLICATIONS` etc. returns no matches.

Two existing names look similar but are **not** these lists — both are flat-file (manual PDF upload) High Court lists with `isNonStrategic: false` and no JSON pipeline at all:

* `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` ≠ "Business list (ChD) daily cause list"
* `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` ≠ "London Circuit Commercial Court (KB) daily cause list"

**Consequence:** this ticket can only be *exercised end-to-end* for Companies Winding Up. For the other 16, CSV generation is wired up ahead of the list types themselves; each will produce a CSV automatically on the day its list type, schema mapping and PDF generator land. That is stated as an explicit assumption in §14 and must be confirmed with the product owner before the ticket is sized — it is the single largest risk to "all Rolls Building hearing lists above" being demonstrably met.

### 2.4 CSV, not Excel

The AC says CSV. Every previous "additional format" in this codebase produced `.xlsx`. This spec delivers a genuine `text/csv` file (`<artefactId>.csv`) because:

* the AC is explicit, and CSV is what a data re-user asks for;
* the ChD/KB shape is a flat 7-column table with no merged cells, grouping or styling — none of ExcelJS's capabilities are needed;
* no new dependency is required (hand-rolled RFC 4180 serialisation is ~20 lines; PapaParse is already in the repo for *parsing* but is not needed to write).

A UTF-8 BOM is prepended so Microsoft Excel renders Welsh diacritics (`ï`, `â`, `ŵ`) correctly on double-click. Without it, Welsh CSVs open as mojibake in Excel on Windows — a real defect for a bilingual service.

---

## 3. Acceptance Criteria

* **Scenario:** CSV is generated when a Rolls Building list is published
    * **Given** a publication is created for a Rolls Building list type (JSON payload conforming to the ChD/KB schema)
    * **When** `processPublication` runs
    * **Then** a `text/csv` blob is written to the `PUBLICATIONS` container as `<artefactId>.csv`, alongside the existing `<artefactId>.pdf`

* **Scenario:** CSV contains every data field the PDF contains
    * **Given** a generated CSV for a Rolls Building list
    * **When** the file is opened in a spreadsheet application
    * **Then** row 1 is a header row with exactly the 7 columns rendered in the PDF table (Judge, Time, Venue, Type, Case number, Case name, Additional information)
    * **And** there is one data row per hearing, in the same order as the PDF table, with values identical to the PDF cells

* **Scenario:** Subscription email offers both formats
    * **Given** a verified user is subscribed to a Rolls Building list (by location, case or list type)
    * **And** both the PDF and the CSV are under 2 MB
    * **When** that list is published
    * **Then** the email uses the two-file Notify template and contains a "Download PDF version" link and a "Download CSV version" link, both resolving to the correct file

* **Scenario:** Welsh publication produces Welsh CSV headers and Welsh link text
    * **Given** a Rolls Building list published with `language = WELSH` (`locale = "cy"`)
    * **When** the CSV is generated and the notification sent
    * **Then** the CSV header row uses the Welsh column names
    * **And** the email download link text is in Welsh

* **Scenario:** Empty list still produces a valid CSV
    * **Given** a published Rolls Building list whose JSON array contains no hearings
    * **When** the CSV is generated
    * **Then** the file contains the header row only, and the email still links to it

* **Scenario:** Formula injection is neutralised
    * **Given** a hearing field whose value begins with `=`, `+`, `-` or `@`
    * **When** the CSV is generated
    * **Then** the value is prefixed with an apostrophe so no spreadsheet evaluates it as a formula

* **Scenario:** Oversized files fall back to the no-links email
    * **Given** either the PDF or the CSV exceeds 2 MB
    * **When** notifications are sent
    * **Then** the existing no-links template is used and neither file is attached (current behaviour, unchanged)

* **Scenario:** Non-Rolls-Building lists are unaffected
    * **Given** a publication for any list type not in the Rolls Building set
    * **When** `processPublication` runs
    * **Then** no CSV is generated and the email is byte-for-byte what it is today

---

## 4. User Journey Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PUBLISHING (admin / API)                                                 │
└──────────────────────────────────────────────────────────────────────────┘

  Admin uploads Rolls Building Excel      OR     POST /publication (JSON)
  (non-strategic upload journey)                        │
            │                                            │
            └──────────────► convertExcelForListTypeName ─┘
                                       │
                                       ▼
                          validateChdKbListType (JSON schema)
                                       │
                                       ▼
                             processPublication()
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
        generatePublicationPdf  generatePublicationCsv  extractAndStoreArtefactSearch
                    │                  │  (NEW)
          <artefactId>.pdf     <artefactId>.csv
                    └──────────────────┬──────────────────┐
                                       ▼
                    sendPublicationNotificationsForArtefact()
                                       │
                                       ▼
                            buildEmailDataWithFiles()
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             downloadBlob .pdf   downloadBlob .csv   getSubscriptionTemplateId()
                    └──────────────────┬──────────────────┘
                                       ▼
                         GOV.UK Notify sendEmail()
                       pdf_link_to_file + excel_link_to_file
                                       │
┌──────────────────────────────────────▼───────────────────────────────────┐
│ SUBSCRIBER                                                               │
└──────────────────────────────────────────────────────────────────────────┘

  Opens email ──► clicks "Download CSV version"
                          │
                          ▼
              Notify document-download page
                          │
                          ▼
                  <artefactId>.csv saved to device
                          │
                          ▼
              Opens in Excel / Numbers / Sheets
                  (7 columns, one row per hearing)
```

No change to the in-service journeys (`/courts-tribunals-list`, `/summary-of-publications`, the list view page). See §11 and §14.

---

## 5. Low Fidelity Wireframe

### 5.1 Subscription email — two-file variant (existing Notify template, new link text)

```
┌────────────────────────────────────────────────────────────────────┐
│  GOV.UK Notify email                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Court and tribunal hearings                                       │
│  ─────────────────────────────                                     │
│                                                                    │
│  There is an updated hearing list for a court or tribunal you       │
│  have subscribed to.                                               │
│                                                                    │
│  Court or tribunal: Rolls Building                                 │
│  Hearing list:      Companies Winding Up (ChD) Daily Cause List    │
│  List for:          12 August 2026                                 │
│                                                                    │
│  Summary of cases                                                  │
│  ─────────────────                                                 │
│  Case number: CR-2026-000123                                       │
│  Case name:   Acme Holdings Ltd                                    │
│  ...                                                               │
│                                                                    │
│  Download the hearing list                                         │
│  ──────────────────────────                                        │
│  ▸ Download PDF version        ← pdf_link_to_file / pdf_link_text  │
│  ▸ Download CSV version        ← excel_link_to_file /              │
│                                  excel_link_text  (NEW value)      │
│                                                                    │
│  Links expire after 1 week.                                        │
│                                                                    │
│  Manage your subscriptions:                                        │
│  https://www.court-tribunal-hearings.service.gov.uk                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Generated CSV opened in a spreadsheet

```
┌────┬──────────────┬───────┬────────────┬──────────┬───────────────┬──────────────────┬────────────────────────┐
│    │      A       │   B   │     C      │    D     │       E       │        F         │           G            │
├────┼──────────────┼───────┼────────────┼──────────┼───────────────┼──────────────────┼────────────────────────┤
│ 1  │ Judge        │ Time  │ Venue      │ Type     │ Case number   │ Case name        │ Additional information │
├────┼──────────────┼───────┼────────────┼──────────┼───────────────┼──────────────────┼────────────────────────┤
│ 2  │ ICC Judge    │ 10:30 │ Rolls      │ Winding  │ CR-2026-      │ Acme Holdings    │ Hearing in private     │
│    │ Barber       │ am    │ Building   │ up       │ 000123        │ Ltd              │                        │
├────┼──────────────┼───────┼────────────┼──────────┼───────────────┼──────────────────┼────────────────────────┤
│ 3  │ ICC Judge    │ 11:00 │ Rolls      │ Restore  │ CR-2026-      │ Beta Trading Ltd │ Remote — CVP           │
│    │ Burton       │ am    │ Building   │          │ 000124        │                  │                        │
└────┴──────────────┴───────┴────────────┴──────────┴───────────────┴──────────────────┴────────────────────────┘
        ▲ header row is localised: Welsh publications get Barnwr / Amser / Lleoliad / …
```

---

## 6. Page Specifications

No new or changed web pages. All work is in the publication-processing and notification layers.

### 6.1 New — shared CSV serialisation helper

**`libs/list-types/common/src/csv/csv-utilities.ts`**

```ts
export function toCsv(rows: string[][]): string;
export async function saveCsvToStorage(artefactId: string, content: string): Promise<{ csvPath: string }>;
```

* `toCsv` — RFC 4180: fields containing `,`, `"`, `\r` or `\n` are wrapped in double quotes with internal `"` doubled; rows joined with `\r\n`; every field passed through the existing `sanitiseCellValue` (from `excel-utilities.ts`) to neutralise formula injection.
* `saveCsvToStorage` — prepends the UTF-8 BOM (`﻿`), uploads via `uploadBlob(`${artefactId}.csv`, buffer, "text/csv", CONTAINER.PUBLICATIONS)`, returns `{ csvPath }`. Mirrors `saveExcelToStorage` exactly.

Both exported from `libs/list-types/common/src/index.ts`.

`sanitiseCellValue` currently indexes `value[0]` — it must be made safe for the empty string (`""[0]` is `undefined`, and `CSV_INJECTION_CHARS.includes(undefined)` is `false`, so it happens to work today, but an explicit empty-string guard should be added while the file is being touched).

### 6.2 New — Rolls Building CSV generator

**`libs/list-types/chd-kb-common/src/csv/csv-generator.ts`**

```ts
interface ChdKbCsvGenerationOptions {
  artefactId: string;
  locale: string;
  jsonData: ChdKbHearingList;
}

interface ChdKbCsvGenerationResult {
  success: boolean;
  csvPath?: string;
  error?: string;
}

export async function generateChdKbCsv(options: ChdKbCsvGenerationOptions): Promise<ChdKbCsvGenerationResult>;
```

Behaviour:

1. `const t = locale === "cy" ? cy : en` — new shared locale files (§7.1).
2. Build the header row from `t.csvColumns` in fixed column order: judge, time, venue, type, caseNumber, caseName, additionalInformation.
3. Append one row per element of `jsonData`, reading the seven fields in the same order. Field order and values are taken from the same `ChdKbHearing` objects the PDF template iterates, which is what guarantees PDF/CSV parity.
4. `toCsv(rows)` → `saveCsvToStorage(artefactId, csv)`.
5. On throw, return `{ success: false, error }` — never propagate. A CSV failure must not block the PDF or the notification (same contract as the Excel generators).

Exported from `libs/list-types/chd-kb-common/src/index.ts`.

**No preamble rows.** The PDF header block (list title, "List for <date>", "Last updated", venue address, important-information box) is deliberately *not* reproduced in the CSV: metadata rows above a header row break sorting and filtering in every spreadsheet application, and this matches the magistrates Excel precedent (header row + data rows only). The AC wording — "All the data fields available in the current downloadable PDF file" — refers to the seven tabular data fields, all of which are present. Confirm with the product owner (§14).

### 6.3 Changed — publication processing

**`libs/publication/src/processing/service.ts`**

Add a `CSV_GENERATOR_REGISTRY` parallel to `EXCEL_GENERATOR_REGISTRY`:

```ts
const chdKbCsvGenerator: CsvGenerator = (p) =>
  generateChdKbCsv({ artefactId: p.artefactId, locale: p.locale, jsonData: p.jsonData as ChdKbHearingList });

const CSV_GENERATOR_REGISTRY: Partial<Record<string, CsvGenerator>> = Object.fromEntries(
  ROLLS_BUILDING_LIST_TYPE_NAMES.map((name) => [name, chdKbCsvGenerator])
);

export async function generatePublicationCsv(params: GenerateCsvParams): Promise<CsvGenerationResult>;
```

`ROLLS_BUILDING_LIST_TYPE_NAMES` is a `readonly string[]` exported from `@hmcts/chd-kb-common` (§6.4). `generatePublicationCsv` mirrors `generatePublicationExcel`: look up by `listTypeName`, return `{}` when unregistered, log and swallow failures.

In `processPublication`, after the Excel block:

```ts
const csvResult = await generatePublicationCsv({
  artefactId,
  listTypeName: pdfResult.listTypeName ?? "",
  locale,
  jsonData,
  logPrefix
});

if (csvResult.hasCsv) {
  result.csvPath = `${artefactId}.csv`;
}
```

and pass `csvPath: result.csvPath` into `sendPublicationNotificationsForArtefact`, which forwards it to `sendLocationAndCaseSubscriptionNotifications`.

`ProcessPublicationResult` gains `csvPath?: string`.

**Deliberate choice:** a *parallel* CSV registry rather than generalising `EXCEL_GENERATOR_REGISTRY` into a `DOWNLOAD_GENERATOR_REGISTRY` keyed by extension. Generalising would touch the SJP and magistrates paths and the Notify template-selection logic for no user-visible gain; the parallel registry is the smaller, lower-risk diff. If a third format is ever added, generalise then.

### 6.4 Changed — Rolls Building list-type name set

**`libs/list-types/chd-kb-common/src/rolls-building-list-types.ts`** (new)

```ts
export const ROLLS_BUILDING_LIST_TYPE_NAMES = [
  "ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST",
  "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST",
  "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST",
  "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST",
  "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
  "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST",
  "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_CHD_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST",
  "LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "PATENTS_COURT_CHD_DAILY_CAUSE_LIST",
  "PENSIONS_LIST_CHD_DAILY_CAUSE_LIST",
  "PROPERTY_TRUSTS_AND_PROBATE_LIST_CHD_DAILY_CAUSE_LIST",
  "REVENUE_LIST_CHD_DAILY_CAUSE_LIST",
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST"
] as const;
```

Stable string `name` values only — never `ListType.id`, which is autoincrement and differs per environment.

**Only `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` exists in `list-type-data.ts` today.** The other 16 names are *proposed* and must be reconciled with whichever ticket creates those list types; a registry key that does not match the seeded `name` silently produces no CSV. If those names are not yet agreed, ship the set with Companies Winding Up only and extend it as each list type lands — that is the safer sequencing and should be the default unless the names are confirmed.

### 6.5 Changed — notifications

**`libs/notifications/src/notification/validation.ts`** — `PublicationEvent` gains `csvPath?: string`.

**`libs/notifications/src/notification/notification-service.ts`** — `buildEmailDataWithFiles`:

```ts
const [pdfBuffer, excelBuffer, csvBuffer] = await Promise.all([
  pdfBlobKey ? downloadBlob(pdfBlobKey, CONTAINER.PUBLICATIONS) : Promise.resolve(null),
  downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS),
  downloadBlob(`${artefactId}.csv`, CONTAINER.PUBLICATIONS)
]);
```

* A given list type produces at most one secondary format, so `.xlsx` and `.csv` are mutually exclusive in practice. If both are somehow present, `.xlsx` wins (existing behaviour preserved) and a warning is logged.
* `csvUnder2MB` participates in `filesUnder2MB` exactly as `excelUnder2MB` does.
* The three `downloadBlob` calls are parallelised while this function is being edited — currently they are sequential, which adds needless latency per subscriber.

The resolved secondary file is passed to `sendEmail` as:

```ts
secondaryFile?: { buffer: Buffer; linkText: string };
```

**`libs/notifications/src/govnotify/govnotify-client.ts`** — replace `excelBuffer?: Buffer` with `secondaryFile`, and set the Notify personalisation from it:

```ts
if (params.secondaryFile) {
  personalisation.excel_link_to_file = notifyClient.prepareUpload(params.secondaryFile.buffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week"
  });
  personalisation.excel_link_text = params.secondaryFile.linkText;
}
```

The `excel_link_*` personalisation *keys* are retained because they are the contract with the existing Notify templates — only the link *text* varies by format. This means **no new GOV.UK Notify template and no new environment variable**, which keeps the change to a single repo and avoids Helm/Key Vault work across environments. See §14 for the verification this requires.

**`libs/notifications/src/govnotify/template-config.ts`** — `getSubscriptionTemplateId` takes `hasSecondaryFile` in place of `hasExcel`:

```ts
if (!filesUnder2MB || (!hasPdf && !hasSecondaryFile)) return NO_LINKS;
if (isSjp && hasSecondaryFile && !hasPdf)                return SJP_EXCEL_ONLY;
if (hasPdf && hasSecondaryFile)                          return SUBSCRIPTION_PDF_EXCEL;
return NON_SJP_PDF;
```

Behaviour for SJP and magistrates is identical to today.

### 6.6 Not changed

* **PDF generation** — untouched. The 17 lists need PDF generators, but that is the responsibility of the tickets that create them; Companies Winding Up already has one.
* **Third-party publication push** (`sendThirdPartyPublications`) — receives `pdfPath` and `flatFilePath` only. CSV is not pushed to third parties. Out of scope; flagged in §14.
* **In-service download page** — none added. See §11 and §14.

---

## 7. Content

### 7.1 New shared locale files — `libs/list-types/chd-kb-common/src/locales/`

The seven column names are identical across all 17 Rolls Building lists, so they live once in `chd-kb-common` rather than being duplicated into 17 packages. Values match the existing `tableHeaders` in `libs/list-types/companies-winding-up-chd-daily-cause-list/src/locales/` so the CSV header row reads exactly like the PDF table header.

**`en.ts`**

```ts
export const en = {
  csvColumns: {
    judge: "Judge",
    time: "Time",
    venue: "Venue",
    type: "Type",
    caseNumber: "Case number",
    caseName: "Case name",
    additionalInformation: "Additional information"
  }
};
```

**`cy.ts`**

```ts
export const cy = {
  csvColumns: {
    judge: "[TRANSLATE: \"Judge\"]",
    time: "[TRANSLATE: \"Time\"]",
    venue: "[TRANSLATE: \"Venue\"]",
    type: "[TRANSLATE: \"Type\"]",
    caseNumber: "[TRANSLATE: \"Case number\"]",
    caseName: "[TRANSLATE: \"Case name\"]",
    additionalInformation: "[TRANSLATE: \"Additional information\"]"
  }
};
```

Approved Welsh already exists in `companies-winding-up-chd-daily-cause-list/src/locales/cy.ts` (`Barnwr`, `Amser`, `Lleoliad`, `Math`, `Rhif yr achos`, `Enw'r achos`, `Gwybodaeth ychwanegol`) — reuse those values verbatim rather than commissioning new translations.

A locale-key-parity assertion (`expect(Object.keys(en.csvColumns).sort()).toEqual(Object.keys(cy.csvColumns).sort())`) is required, per the repo's template/locale testing rules.

### 7.2 Email download link text

Currently hardcoded English in `govnotify-client.ts` for both links, regardless of the publication language — a pre-existing bilingual defect. Since `secondaryFile.linkText` is now supplied by the caller, the text becomes localisable:

**English**

| Link | Text |
|---|---|
| PDF | `Download PDF version` |
| CSV | `Download CSV version` |

**Welsh**

| Link | Text |
|---|---|
| PDF | `[WELSH TRANSLATION REQUIRED: "Download PDF version"]` |
| CSV | `[WELSH TRANSLATION REQUIRED: "Download CSV version"]` |

`buildEmailDataWithFiles` has no `locale` parameter today. Thread the publication language through from `PublicationEvent` (`sendListTypePublicationNotifications` already carries `language`; `sendLocationAndCaseSubscriptionNotifications` does not and will need it added). If threading the locale is judged out of scope for this ticket, the CSV link text stays English like the PDF link and a follow-up ticket is raised — say so explicitly rather than leaving the Welsh text half-done.

### 7.3 CSV file naming

`<artefactId>.csv` — consistent with `.pdf` and `.xlsx`. GOV.UK Notify presents its own download page and does not use the blob name for the saved filename, so no user-facing filename work is needed. If an in-service download page is added later (§14), `Content-Disposition: attachment; filename="<artefactId>.csv"` follows the existing `handleBlobDownload` behaviour.

---

## 8. URL

No new routes.

Should the in-service download page be added later (out of scope here), it would follow the SJP pattern:

| Purpose | Path |
|---|---|
| Format chooser | `GET /<list-url-path>/list-download-files?artefactId=<uuid>` |
| File download | `GET /<list-url-path>/download?artefactId=<uuid>&type=csv` |

where `<list-url-path>` is the `urlPath` from `list-type-data.ts` (e.g. `companies-winding-up-chd-daily-cause-list`). `ALLOWED_TYPES` in `apps/web/src/pages/(list-types)/sjp-download-shared.ts` would need `"csv"` added and `getAvailableFiles` a `.csv` probe.

---

## 9. Validation

No user input is introduced, so there are no form validation rules. The validation surface is data-integrity and safety on generation:

| Rule | Where | Behaviour |
|---|---|---|
| JSON conforms to the ChD/KB schema | `validateChdKbListType` (existing, upstream) | Publication rejected before CSV generation; no change |
| Formula injection — value starts `=`, `+`, `-`, `@` | `sanitiseCellValue` via `toCsv` | Prefix `'` |
| Empty string field | `sanitiseCellValue` | Explicit guard added; emitted as an empty field |
| Field contains `,` `"` `\r` `\n` | `toCsv` | Quoted, internal `"` doubled |
| Empty hearing array | `generateChdKbCsv` | Header row only; `success: true` |
| `jsonData` is not an array | `generateChdKbCsv` | `success: false` with error; PDF and notification unaffected |
| Non-UTF-8-safe output in Excel | `saveCsvToStorage` | UTF-8 BOM prepended |
| File exceeds 2 MB | `buildEmailDataWithFiles` | Falls back to the no-links Notify template (existing behaviour) |
| Unregistered list type | `generatePublicationCsv` | Returns `{}`; no CSV, no log noise |

CSV generation must never fail a publication. Every failure path returns a result object and logs; nothing throws out of `generatePublicationCsv`.

---

## 10. Error Messages

No user-facing error messages are added — there is no new page or form.

Operational logging follows the existing `[Publication]` / notification conventions:

| Condition | Log |
|---|---|
| Generator threw | `console.warn("[Publication] CSV generation failed:", { artefactId, error })` |
| Unexpected error in `generatePublicationCsv` | `console.error("[Publication] CSV generation error:", { artefactId, error })` |
| Both `.xlsx` and `.csv` present for one artefact | `console.warn("[Notifications] Both xlsx and csv present, using xlsx:", { artefactId })` |
| Notify send failed | Existing retry-and-log path, unchanged |

No email addresses, case names or defendant details in any log line (the existing email-redaction in `sendPublicationNotificationsForArtefact` stays).

If the in-service download page is added later, the existing responses apply: `400` (`errors/400`) for a missing or malformed `artefactId`, `404` (`errors/404`) when no downloadable file exists.

---

## 11. Navigation

* **Email → file.** The CSV link points at a GOV.UK Notify document-download URL created by `prepareUpload()`, with `confirmEmailBeforeDownload: false` and a 1-week retention period — identical handling to the existing PDF and Excel links.
* **In-service navigation is unchanged.** `/courts-tribunals-list` → `/summary-of-publications` → the rendered list page behave exactly as today. The rendered HTML list page remains the in-service view; the CSV is an email-delivered artefact.
* **No redirects added or changed.**

Interpretation of AC 1 ("CSV and PDF downloadable files are made available as downloadable options"): the issue's problem statement scopes this to the email — *"only the PDF download file is available to CaTH users in the email notification"*. Combined with AC 3 and the #673 precedent (magistrates Excel shipped email-only, no download page), "downloadable options" means the two links in the notification. Confirm in §14 before build.

---

## 12. Accessibility

No new pages, so no new WCAG 2.2 AA surface in the service itself. What still applies:

* **Link purpose (2.4.4, A).** Email link text states the format explicitly — "Download PDF version" / "Download CSV version" — so it is unambiguous out of context. Do not use "click here" or repeat identical text for two different files.
* **Language of page (3.1.1, A).** Welsh publications must produce Welsh link text; an English link inside a Welsh email is a genuine failure. This is why §7.2 threads the locale through, and why leaving it undone must be recorded as a known gap rather than silently shipped.
* **Non-text content / alternatives.** The CSV is not a replacement for an accessible view — the HTML list page remains the accessible primary rendering, and the PDF remains available. Offering a machine-readable tabular format *improves* accessibility for screen-reader users, who can navigate a spreadsheet table more easily than a PDF table.
* **CSV structure.** A single header row as row 1 with no merged cells, no blank leading rows and no title banner is what assistive technology in spreadsheet applications expects for table semantics. This is a further reason for the no-preamble decision in §6.2.
* **Welsh diacritics.** The UTF-8 BOM prevents mojibake in Excel; garbled Welsh characters are a content-accessibility failure for Welsh-language users.

If a download page is added later, it must follow the SJP `list-download-files.njk` pattern: `h1` matching the page title, link text stating both format and file size, and no reliance on colour or icon to convey format.

---

## 13. Test Scenarios

**`libs/list-types/common/src/csv/csv-utilities.test.ts`**
* Serialises a simple row set to `\r\n`-delimited RFC 4180 output.
* Quotes and escapes fields containing commas, double quotes, carriage returns and newlines.
* Prefixes an apostrophe onto values beginning `=`, `+`, `-` and `@`.
* Handles an empty-string field without throwing.
* `saveCsvToStorage` uploads to `<artefactId>.csv` in the `PUBLICATIONS` container with content type `text/csv` and a leading UTF-8 BOM.

**`libs/list-types/chd-kb-common/src/csv/csv-generator.test.ts`**
* Emits the English header row in the fixed seven-column order for `locale: "en"`.
* Emits the Welsh header row for `locale: "cy"`.
* Emits one data row per hearing, preserving input order and field-to-column mapping.
* Returns `success: true` with a header-only file for an empty hearing array.
* Returns `success: false` (does not throw) when `jsonData` is not an array, and when the blob upload rejects.
* Locale-key parity between the new `en.csvColumns` and `cy.csvColumns`.

**Column parity with the PDF**
* A test asserting the CSV header keys are exactly the keys rendered by `pdf-template.njk`'s `tableHeaders`, so a future PDF column addition fails the build rather than silently diverging — this is the mechanism that keeps AC 2 true over time.

**`libs/publication/src/processing/service.test.ts`**
* `generatePublicationCsv` invokes the ChD/KB generator for a Rolls Building list type name and reports `hasCsv`.
* Returns `{}` for a list type with no CSV registration (e.g. `CIVIL_DAILY_CAUSE_LIST`).
* Swallows and logs a generator failure without affecting the returned PDF path.
* `processPublication` sets `csvPath` and forwards it to the notification call.
* A non-Rolls-Building publication produces no `csvPath` and an unchanged notification payload.

**`libs/notifications/src/notification/notification-service.test.ts`**
* Picks up `<artefactId>.csv` and sends it as the secondary file with link text "Download CSV version".
* Selects the PDF-plus-secondary-file template when both PDF and CSV are present and under 2 MB.
* Falls back to the no-links template when the CSV exceeds 2 MB.
* Prefers `.xlsx` and logs a warning when both `.xlsx` and `.csv` exist.
* Existing SJP and magistrates Excel behaviour is unchanged (regression).
* Welsh publication yields Welsh link text (or, if locale threading is deferred, an explicit test documenting the English fallback).

**`libs/notifications/src/govnotify/template-config.test.ts`**
* `getSubscriptionTemplateId` returns the same template IDs as today for every existing combination, with `hasSecondaryFile` substituted for `hasExcel`.

**E2E (`e2e-tests/`)**
* Extend the existing Rolls Building / non-strategic upload journey rather than adding new specs: upload a Companies Winding Up list, confirm the publication succeeds and the rendered list page is unchanged. GOV.UK Notify emails and Notify document links cannot be asserted in Playwright, so email delivery is covered by the integration tests above — do not add an E2E spec that cannot assert its outcome.

---

## 14. Assumptions & Open Questions

**Blocking — must be answered before build**

* **16 of the 17 named list types do not exist in the codebase.** Only `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` is in `list-type-data.ts`. Is this ticket expected to (a) deliver CSV for Companies Winding Up now and be extended as each list type lands, or (b) wait on the tickets that create the other 16? This spec assumes **(a)**, with the shared generator built so each new list type gets CSV by adding one name to `ROLLS_BUILDING_LIST_TYPE_NAMES`. Under (a), the ticket cannot be demonstrated against 16 of the 17 lists at review time — that needs to be understood and accepted up front, not discovered in QA.
* **Proposed list type names (§6.4) need confirming.** A registry key that does not match the seeded `name` produces no CSV, silently. If the names are not yet agreed, ship with Companies Winding Up only.
* **GOV.UK Notify template contents.** This design reuses `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` with `excel_link_text` set to "Download CSV version". This only works if that Notify template renders `((excel_link_text))` as a placeholder rather than hardcoding the word "Excel" in its body. Someone with Notify access must verify this. If the text is hardcoded, the fallback is a new Notify template plus a `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_CSV` env var wired through Helm and Key Vault in every environment — materially more work, and it should be priced into the estimate now.

**Decisions taken, open to challenge**

* **CSV, not `.xlsx`.** The AC says CSV and the data is a flat 7-column table. Every prior "additional format" in this repo shipped `.xlsx`. If the product intent is really "a spreadsheet file" and consistency with SJP/magistrates matters more than the literal AC, say so and this becomes a much smaller change (reuse `saveExcelToStorage` and ExcelJS). Worth an explicit answer, since it is the kind of thing that gets raised at review.
* **No metadata preamble in the CSV** (§6.2) — header row and data rows only, so the file sorts and filters cleanly. If the product owner reads "all the data fields available in the current downloadable PDF" as including the list title, list date, last-updated timestamp, venue address and important-information text, that changes the file shape and the test expectations.
* **Email-only delivery, no in-service download page** (§11), matching the #673 magistrates precedent. If an in-service format chooser is wanted for the Rolls Building lists, that is a separate piece of work: `sjp-download-shared.ts` would need to be generalised out of the SJP folder, `ALLOWED_TYPES` extended with `csv`, and a `list-download-files` page plus locale content and template tests added per list type.
* **Parallel CSV registry, not a generalised download registry** (§6.3) — smaller, lower-risk diff. Revisit if a third format appears.
* **`.xlsx` and `.csv` are mutually exclusive per list type.** No current or planned list type generates both. The precedence rule and warning log exist as a safety net, not as a supported configuration.

**Known gaps and follow-ups**

* **Welsh email link text.** The link text is hardcoded English today for all languages. §7.2 fixes this by threading the publication language through `buildEmailDataWithFiles`, which requires adding `language`/`locale` to `sendLocationAndCaseSubscriptionNotifications`'s event. If that is descoped, the CSV link ships in English alongside the already-English PDF link and a follow-up ticket must be raised — do not leave it undecided.
* **Third-party push excludes CSV.** `sendThirdPartyPublications` forwards `pdfPath` and `flatFilePath` only. Out of scope unless a third party has asked for CSV.
* **Notify document links expire after 1 week.** Unchanged from the PDF behaviour, but it means the CSV is not a permanent archive — if users expect long-term access, that is an argument for the in-service download page above.
* **No new dependency.** CSV serialisation is hand-rolled in `csv-utilities.ts`; PapaParse (already present) is a parser and is not needed for writing.


### Comment by OgechiOkelu on 2026-08-12T12:33:18Z

@plan 

