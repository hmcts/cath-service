# #674: Excel - Crown hearing lists

**State:** OPEN
**Assignees:** alao-daniel
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story
**Created:** 2026-06-04T13:29:20Z
**Updated:** 2026-09-22T14:35:34Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to create the Excel downloadable version of the Crown hearing lists.

**AS A** service

**I WANT** to provide additional download file options for hearing lists in CaTH

**SO THAT** CaTH verified users have more options to choose from

**ACCEPTANCE CRITERIA**

- Excel and PDF downloadable files are made available as downloadable options for the Crown hearing lists
- Links to download both file types are displayed in the email notifications
- The data fields / columns should be uniform on both the Excel and PDF downloadable files for all the Crown hearing lists
- The following fields are provided for the Crown Daily List: Court House, Court Room, Judge, Sitting at, Hearing Time, Case Reference, Defendant Name(s), Hearing Type, Prosecuting Authority, Listing Notes
- The following fields are provided for the Crown Firm List: Date, Court House, Court Room, Judge, Sitting at, Hearing Time, Case Number, Defendant Name(s), Hearing Type, Representative, Prosecuting Authority, Listing Notes
- The following fields are provided for the Crown Advance List: Hearing, Fixed For, Case Reference, Defendant Name(s), Prosecuting Authority, Linked Cases, Listing Notes
- This ticket is dependent on the completion of #957

## Comments

### Comment by OgechiOkelu on 2026-08-20T11:43:16Z
@spec

### Comment by hmctsclaudecode on 2026-08-20T11:52:46Z

# Technical Specification — Issue #674: Excel — Crown hearing lists

## 1. User Story

**As a** verified user of the Court and Tribunal Hearings service (CaTH)
**I want to** download the Crown Daily List, Crown Firm List and Crown Warned List as a Microsoft Excel spreadsheet as well as a PDF
**So that** I can filter, sort and re-use the hearing data in my own tools instead of re-typing it out of a PDF

## 2. Background

### What already exists

The three Crown hearing list types are fully implemented for on-screen rendering and PDF generation:

| List type name (stable, `@unique`) | Lib | Renderer | PDF generator |
|---|---|---|---|
| `CROWN_DAILY_LIST` | `libs/list-types/crown-daily-list` | `renderCrownDailyListData` | `generateCrownDailyListPdf` |
| `CROWN_FIRM_LIST` | `libs/list-types/crown-firm-list` | `renderCrownFirmListData` | `generateCrownFirmListPdf` |
| `CROWN_WARNED_LIST` | `libs/list-types/crown-warned-list` | `renderCrownWarnedListData` | `generateCrownWarnedListPdf` |

All three are already registered in `PDF_GENERATOR_REGISTRY`. **No PDF work is required by this ticket.**

Excel download generation is an established pattern used by five list types today (magistrates-standard-list is the closest reference). Shared helpers live in `libs/list-types/common/src/excel/excel-utilities.ts`: `sanitiseCellValue`, `autoFitColumns`, `saveExcelToStorage`. Generation is dispatched from `EXCEL_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, keyed by the stable `listTypeName` string.

### Email notifications are already generic

`buildEmailDataWithFiles` unconditionally attempts `downloadBlob({artefactId}.xlsx)`. AC 2 requires **no new notification code** — it is satisfied the moment the `.xlsx` blob exists for a Crown artefact.

### Naming discrepancy — "Crown Advance List"

The issue names a "Crown Advance List". The spec treats it as `CROWN_WARNED_LIST`; #957 renames Crown Warned → Crown Advance.

### Dependency

Depends on #957 (Crown Warned → Crown Advance rename / PDDA data work).

## 3-13. (Full spec)

The full technical specification (acceptance criteria scenarios, user journey flow, wireframes, page specifications, column mappings, registry wiring, SJP download journey promotion, content/locale additions, URLs, validation, error messages, navigation, accessibility, and test scenarios) is contained in issue comment 5355487004 and has been captured in the plan.

### Comment by OgechiOkelu on 2026-08-20T11:54:10Z
@plan

### Comment by hmctsclaudecode on 2026-08-20T12:06:18Z

## Planning complete — clarifications needed

Plan pushed to `feature/674-excel-crown-hearing-lists`.

### What is already done

The PDF half of the acceptance criteria is delivered. All three Crown list types are in `PDF_GENERATOR_REGISTRY` and render on screen today. **AC 2 (email links to both file types) needs no production code.** The actual work is three Excel generators, three `EXCEL_GENERATOR_REGISTRY` entries, and locale additions.

### Questions

**1. Scope: on-page download, or email attachment only?** Precedent is split — SJP has a full on-page journey (button → disclaimer → file list → download); the magistrates lists generate Excel purely for email attachment with no on-page download. The plan assumes the SJP journey.

**2. Sequencing against #957.** #957 changes the DB list type name for the Crown Warned → Crown Advance rename ("Crown Advanced PDDA list"), scheduled just before go-live on 1 Oct. Suggested approach (b): land #674 first on `CROWN_WARNED_LIST` and let #957's rename sweep pick up the registry entry.

**3. The custody asterisk in the Crown Advance spreadsheet.** The PDF explains `*denotes a defendant in custody` in its preamble; a spreadsheet has no preamble. Options: add a `Custody` Yes/No column, put the legend in a cell below the data, or accept the bare asterisk. Content/product call.

**4. Crown Firm List layout** — one sheet with a `Date` column (plan default), or one worksheet per sitting day?

**5. Welsh spreadsheets.** A Welsh `.xlsx` is only produced when the artefact is published with `locale: "cy"` — same limitation as the existing PDF.

**6. Notify link text is hardcoded English** (`"Download Excel version"`). Pre-existing across every list type — separate ticket, or fold in?

**7. Audit logging.** The existing SJP download flow records nothing. Assumed out of scope unless told otherwise.

**8. Backfill.** Crown artefacts published before this change will have no `.xlsx`. Plan specifies no backfill.

**9. Environment config.** Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in every environment — `getSubscriptionTemplateId` throws when it is missing.

### Flagged separately

`processPublication` passes `listTypeName: pdfResult.listTypeName ?? ""` into `generatePublicationExcel`. If PDF generation throws before resolving the list type name, Excel generation is silently skipped. Affects every Excel-enabled list type today, not just Crown.
