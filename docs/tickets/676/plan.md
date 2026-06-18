# Technical Plan — Excel Download for SJP Hearing Lists (#676)

## 1. Technical Approach

Add on-demand Excel (`.xlsx`) file generation and download for the four SJP hearing list pages, and include an Excel download link in publication email notifications.

**Key facts from codebase:**
- `exceljs@4.4.0` is already a dependency in `libs/list-types/common/package.json` — no new dependency needed.
- `getAllSjpPressCases(artefactId, filters)` exists in `sjp-service.ts` (unpaginated, explicitly for downloads). No equivalent exists for public cases — a new `getAllSjpPublicCases` function is needed.
- `getSjpPublicCases` derives public cases from press cases via `extractPressCases` — the public download can use the same approach.
- Delta pages (`sjp-delta-press-list`, `sjp-delta-public-list`) simply re-export from the non-delta pages (`export { GET, POST } from "../sjp-press-list/index.js"`).
- PDF is **not** generated for SJP list types — `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts` has no SJP entry. PDF is out of scope for this ticket.
- Email notification flow: `publication service → sendPublicationNotificationsForArtefact → buildEmailTemplateData → sendEmail({ pdfBuffer })`. The `pdfBuffer` param on `sendEmail` attaches a file via `notifyClient.prepareUpload`, sets `personalisation.link_to_file`. To add Excel, the same mechanism needs a parallel `excelBuffer` param and `link_to_excel_file` personalisation variable.
- ExcelJS write pattern from `multi-sheet-converter.ts`: `import ExcelJSPkg from "exceljs"; const { Workbook } = ExcelJSPkg; ... await workbook.xlsx.writeBuffer()`.
- Template config currently has two template IDs (`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`, `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`). Excel adds a third scenario (with/without excel), likely requiring a new template ID env var.

## 2. Implementation Details

### 2.1 New function: `getAllSjpPublicCases`

**File:** `libs/list-types/common/src/sjp/sjp-service.ts`

Add alongside `getAllSjpPressCases`. Mirrors `getSjpPublicCases` but without pagination:

```typescript
export async function getAllSjpPublicCases(
  artefactId: string,
  filters: SjpSearchFilters
): Promise<{ cases: SjpCasePublic[]; totalCases: number }>
```

### 2.2 New module: Excel generator

**File:** `libs/list-types/common/src/sjp/sjp-excel-generator.ts`

Two exported functions, both pure (no `req`/`res`, no side effects):

```typescript
export async function generateSjpPressListExcel(
  cases: SjpCasePress[],
  contentDate: Date
): Promise<Buffer>

export async function generateSjpPublicListExcel(
  cases: SjpCasePublic[],
  contentDate: Date
): Promise<Buffer>
```

**Column mapping — Press list:**

| Header | Source field |
|--------|-------------|
| Name | `name` |
| Date of birth | `dateOfBirth` (format `DD/MM/YYYY`) |
| Age | `age` |
| Address | `address` |
| Postcode | `postcode` |
| Reference (URN) | `reference` |
| Prosecutor | `prosecutor` |
| Offence | `offences[].offenceTitle` |
| Offence wording | `offences[].offenceWording` |
| Reporting restriction | `offences[].reportingRestriction` (Yes/No) |

For cases with multiple offences: one row per offence (matching the HTML accordion that shows each offence separately). If a case has zero offences, emit one row with blank offence columns.

**Column mapping — Public list:**

| Header | Source field |
|--------|-------------|
| Name | `name` |
| Postcode | `postcode` |
| Offence | `offence` |
| Prosecutor | `prosecutor` |

**Implementation notes:**
- Use `import ExcelJSPkg from "exceljs"; const { Workbook } = ExcelJSPkg;`
- Header row: bold, row 1
- Column headers reuse the existing translated strings from `@hmcts/sjp-press-list` / `@hmcts/sjp-public-list` (English only in the file itself — locale does not affect the spreadsheet content)
- Return `Buffer.from(await workbook.xlsx.writeBuffer())`
- Null/undefined fields → empty string (never the literal string `"null"`)

**Export from index:**

```typescript
// libs/list-types/common/src/index.ts
export { generateSjpPressListExcel, generateSjpPublicListExcel } from "./sjp/sjp-excel-generator.js";
export { getAllSjpPublicCases } from "./sjp/sjp-service.js";
```

### 2.3 Download endpoints (web pages)

**Files to create:**
- `apps/web/src/pages/(list-types)/sjp-press-list/download.ts`
- `apps/web/src/pages/(list-types)/sjp-public-list/download.ts`
- `apps/web/src/pages/(list-types)/sjp-delta-press-list/download.ts` → re-exports from press-list download
- `apps/web/src/pages/(list-types)/sjp-delta-public-list/download.ts` → re-exports from public-list download

**Route (auto-discovered by page router):**
- `GET /sjp-press-list/download?artefactId={uuid}`
- `GET /sjp-delta-press-list/download?artefactId={uuid}`
- `GET /sjp-public-list/download?artefactId={uuid}`
- `GET /sjp-delta-public-list/download?artefactId={uuid}`

**Handler pattern** (`sjp-press-list/download.ts`):
```typescript
import { getAllSjpPressCases, generateSjpPressListExcel, getSjpListById } from "@hmcts/list-types-common";

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  if (!artefactId) return res.status(400).json({ error: "Invalid request" });

  const list = await getSjpListById(artefactId);
  if (!list || list.listType !== "press") return res.status(404).json({ error: "Artefact not found" });

  const { cases } = await getAllSjpPressCases(artefactId, {});
  const buffer = await generateSjpPressListExcel(cases, list.contentDate);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="sjp-press-list.xlsx"`);
  res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
  res.send(buffer);
};
```

The download always exports the **full unfiltered list** (consistent with email content). No auth middleware changes needed — the download is accessible to users who can already view the list page.

**Delta re-exports:**
```typescript
// sjp-delta-press-list/download.ts
export { GET } from "../sjp-press-list/download.js";
```

### 2.4 UI: Download link on list pages

**Templates to update:**
- `apps/web/src/pages/(list-types)/sjp-press-list/sjp-press-list.njk` (check actual template name)
- `apps/web/src/pages/(list-types)/sjp-public-list/sjp-public-list.njk`

Add a download options section above the case table:

```nunjucks
<h2 class="govuk-heading-m">{{ t.downloadThisList }}</h2>
<p>
  <a class="govuk-link" href="/sjp-press-list/download?artefactId={{ list.artefactId }}">
    {{ t.downloadAsExcel }}
  </a>
</p>
```

**Content strings to add** to `en.ts`/`cy.ts` for each SJP list page (co-located):
- `downloadThisList`: `"Download this list"` / `"[Welsh translation needed]"`
- `downloadAsExcel`: `"Download as a spreadsheet (Excel)"` / `"[Welsh translation needed]"`

The delta pages share templates with their non-delta counterparts, so template changes are made once in the non-delta template.

### 2.5 Email notification: Excel attachment

**File:** `libs/notifications/src/govnotify/govnotify-client.ts`

Add `excelBuffer?: Buffer` to `SendEmailParams`. When present, call `prepareUpload` and set `personalisation.link_to_excel_file`:

```typescript
if (params.excelBuffer) {
  const linkToExcelFile = (notifyClient as any).prepareUpload(params.excelBuffer, {
    confirmEmailBeforeDownload: false,
    retentionPeriod: "1 week"
  });
  personalisation.link_to_excel_file = linkToExcelFile;
}
```

**File:** `libs/notifications/src/notification/notification-service.ts`

Add `excelBuffer?: Buffer` to `EmailTemplateData`. In `buildEmailTemplateData`, for SJP list type IDs (24, 25, 26, 27), generate the Excel buffer and attach it:

```typescript
const SJP_LIST_TYPE_IDS = new Set([24, 25, 26, 27]);

if (SJP_LIST_TYPE_IDS.has(listTypeId)) {
  const excelBuffer = await generateSjpExcelForNotification(event.artefactId, listTypeId);
  if (excelBuffer && excelBuffer.length < MAX_PDF_SIZE_BYTES) {
    emailData.excelBuffer = excelBuffer;
  }
  // If over 2MB, silently omit — email still sends, just without download link
}
```

Add helper `generateSjpExcelForNotification` (private, in notification-service.ts):
- Calls `getAllSjpPressCases` / `getAllSjpPublicCases` based on list type ID (24/26 = press, 25/27 = public)
- Calls the appropriate Excel generator
- Returns Buffer or null on error (never throws)

**Template IDs:** Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` env var for the template that includes `((link_to_excel_file))`. Update `getSubscriptionTemplateIdForListType` to return this template ID when `hasExcel` is true. The GOV.UK Notify template itself (adding `((link_to_excel_file))`) is an **ops task** outside this codebase.

## 3. Error Handling & Edge Cases

- **Missing `artefactId`**: Download endpoints return `400 { error: "Invalid request" }`.
- **Artefact not found / wrong list type**: Return `404 { error: "Artefact not found" }`.
- **JSON read failure** (file missing/corrupt): `getAllSjpPressCases` will throw; catch in download handler and return `500 { error: "Internal server error" }`.
- **Empty case list**: Generator must produce a valid `.xlsx` with headers only — no error.
- **Null/undefined fields**: Output blank cells, never the string `"null"`.
- **Excel buffer > 2MB in email**: Omit `excelBuffer` from `sendEmail` call; email sends without the download link. The on-page download is still available.
- **Multiple offences per case (press list)**: One row per offence. Name/DOB/address repeat on each offence row (same as the expanded accordion in the UI).

## 4. Acceptance Criteria Mapping

| Criterion | How satisfied |
|-----------|--------------|
| Excel downloadable for all four SJP list types | Download endpoints at `/sjp-*-list/download?artefactId=` for each page; delta pages re-export the handler |
| Download link in email notifications | `excelBuffer` attached in `notification-service.ts` for SJP list type IDs; GOV.UK Notify template updated (ops) |
| All CaTH columns in Excel | Column mapping in §2.2 covers every field shown in the HTML table |

## 5. Clarifications Needed

1. **PDF for SJP (out of scope?)**  
   The AC says "Excel and PDF downloadable files are made available." SJP list types are absent from `PDF_GENERATOR_REGISTRY`. Is PDF generation for SJP in scope for this ticket or a sibling ticket? This plan implements Excel only.

2. **Welsh translations**  
   The `downloadThisList` and `downloadAsExcel` strings need Welsh translations. Please provide or confirm who supplies them.

3. **GOV.UK Notify template update**  
   Adding `((link_to_excel_file))` to the notification email template requires an update in the GOV.UK Notify dashboard (not in this codebase). Who owns that template and when can it be updated?

4. **Download filters**  
   Should the on-page Excel download honour the user's active postcode/prosecutor filter, or always export the full list? This plan assumes the full list (consistent with email content and deterministic per artefact). Please confirm.

5. **Press list offence rows**  
   Where a case has multiple offences, the plan uses one row per offence. Please confirm this matches the desired format (alternative: one row per case with offences concatenated).
