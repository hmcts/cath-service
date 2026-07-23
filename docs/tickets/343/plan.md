# Technical Plan: Subscription Emails Fulfilment Complete Journey (#343)

## Summary

Extend the existing notification template selection logic to support four Gov Notify template types based on list type (SJP vs non-SJP), file size (< 2MB vs >= 2MB), and available file formats (PDF, Excel, both). Currently the system only differentiates between "PDF under 2MB" and "everything else" using two templates. This needs to expand to four templates with additional personalisation fields.

## Current State

### Template Selection (`libs/notifications/src/govnotify/template-config.ts`)
- Two env vars: `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` (no-link/fallback) and `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`
- `getSubscriptionTemplateIdForListType(listTypeId, hasPdf, pdfUnder2MB)` returns one of two templates
- No awareness of Excel files or SJP-specific logic

### Notification Flow (`libs/notifications/src/notification/notification-service.ts`)
- `buildEmailTemplateData()` → checks if enhanced config exists → calls `buildEnhancedEmailData()` or `buildFallbackEmailData()`
- `buildEmailDataWithPdf()` → reads PDF file, checks size against `MAX_PDF_SIZE_BYTES` (2MB), selects template
- PDF buffer is passed to Gov Notify for upload when < 2MB

### File Storage
- PDFs stored at paths passed in `event.pdfFilePath`
- Excel files stored at `storage/temp/uploads/{artefactId}.xlsx` via `saveExcelFile()`

### SJP List Types
- `SJP_PUBLIC_LIST` (id: 25), `SJP_DELTA_PUBLIC_LIST` (id: 27)
- `SJP_PRESS_LIST` (id: 24), `SJP_DELTA_PRESS_LIST` (id: 26)
- Excel generation exists for all four SJP list types in `EXCEL_GENERATOR_REGISTRY`

### Personalisation Fields (Current)
- `locations`, `ListType`, `content_date`, `start_page_link`, `subscription_page_link`
- `display_locations`, `display_case`, `case`
- `display_summary`, `summary_of_cases`
- `link_to_file` (added by govnotify-client when PDF buffer provided)

## Technical Approach

### Template Selection Expansion

Replace the current two-template logic with four templates:

| Template | Condition | Env Var |
|----------|-----------|---------|
| SJP PDF + Excel | SJP list type, < 2MB, both PDF and Excel exist | `GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL` |
| SJP Excel Only | SJP list type, < 2MB, Excel exists but no PDF | `GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY` |
| No Link | Any list type, >= 2MB | `GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS` |
| Non-SJP PDF Only | Non-SJP list type, < 2MB | `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF` |

The existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` becomes `GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS` and `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY` becomes `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF`.

### Key Design Decisions

1. **SJP detection**: Check the list type name from the database against `SJP_` prefix (covers all 4 SJP types)
2. **Excel file existence**: Check if `storage/temp/uploads/{artefactId}.xlsx` exists on disk
3. **PDF existence & size**: Already handled via `event.pdfFilePath` and `fs.stat()`
4. **Excel link**: Use Gov Notify's `prepareUpload()` same as PDF, passing Excel buffer
5. **Personalisation field mapping**: Map existing fields to the new template field names

### Personalisation Fields (New Templates)

All templates share:
- `display_case` → renamed from `display_case` (maps to template's `display_case_num`)
- `case_num` → from `case` field
- `display_case_urn` → "no" (we don't currently track URN separately)
- `case_urn` → "" (empty for now)
- `display_locations` → existing logic
- `locations` → existing logic
- `ListType` → existing logic
- `content_date` → existing logic
- `display_summary` → existing logic
- `summary_of_cases` → existing logic

Template-specific:
- `pdf_link_text` → link to PDF file via Gov Notify prepareUpload
- `excel_link_text` → link to Excel file via Gov Notify prepareUpload

## Implementation Details

### Files to Modify

1. **`libs/notifications/src/govnotify/template-config.ts`**
   - Add 4 new template ID env vars (replacing/augmenting existing 2)
   - Rewrite `getSubscriptionTemplateIdForListType()` to accept `isSjp`, `hasPdf`, `hasExcel`, `filesUnder2MB`
   - Add new personalisation fields to `TemplateParameters` interface
   - Update `buildTemplateParameters` / `buildEnhancedTemplateParameters` to include new fields

2. **`libs/notifications/src/notification/notification-service.ts`**
   - Update `buildEmailDataWithPdf()` to also check for Excel file existence
   - Add Excel file reading and buffer handling
   - Pass `isSjp` flag based on list type name
   - Update template selection call with new parameters

3. **`libs/notifications/src/govnotify/govnotify-client.ts`**
   - Support `excelBuffer` in `SendEmailParams`
   - Upload Excel to Gov Notify document service similar to PDF

4. **`libs/notifications/src/govnotify/template-config.test.ts`** - Update tests
5. **`libs/notifications/src/notification/notification-service.test.ts`** - Update tests
6. **`libs/notifications/src/govnotify/govnotify-client.test.ts`** - Update tests

### Template Selection Logic (Pseudocode)

```typescript
function selectTemplate(isSjp: boolean, hasPdf: boolean, hasExcel: boolean, filesUnder2MB: boolean): string {
  if (!filesUnder2MB) {
    return GOVUK_NOTIFY_TEMPLATE_ID_NO_LINKS;
  }

  if (isSjp) {
    if (hasPdf && hasExcel) {
      return GOVUK_NOTIFY_TEMPLATE_ID_SJP_PDF_EXCEL;
    }
    return GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY;
  }

  return GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF;
}
```

### Excel File Path Resolution

```typescript
const STORAGE_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const excelPath = path.join(STORAGE_DIR, `${artefactId}.xlsx`);
const hasExcel = await fileExists(excelPath);
```

## Error Handling & Edge Cases

1. **Missing Excel file**: If SJP list but Excel not generated yet → fall back to no-link template
2. **Missing PDF for SJP**: If SJP list has Excel but no PDF → use Excel-only template
3. **Both files missing**: Use no-link template regardless of size
4. **Excel file over 2MB**: Gov Notify has a 2MB limit on prepareUpload - if Excel exceeds this, use no-link template
5. **Template env var missing**: Throw clear error with env var name (existing pattern)
6. **Backward compatibility**: Rename env vars but keep fallback to old names during transition

## Acceptance Criteria Mapping

| Criterion | How Satisfied |
|-----------|---------------|
| SJP PDF + Excel email | Template selection logic checks isSjp=true, hasPdf=true, hasExcel=true, filesUnder2MB=true |
| SJP Excel only email | Template selection: isSjp=true, hasPdf=false, hasExcel=true, filesUnder2MB=true |
| No link email (> 2MB) | Template selection: filesUnder2MB=false |
| Non-SJP PDF only email | Template selection: isSjp=false, hasPdf=true, filesUnder2MB=true |

## CLARIFICATIONS NEEDED

1. **Personalisation field `pdf_link_text` / `excel_link_text`**: Should these contain the Gov Notify `prepareUpload()` link object (like `link_to_file` does currently), or actual display text? Based on the current `link_to_file` pattern, these likely need to be `prepareUpload()` results.

2. **`display_case_num` vs `display_case`**: The current templates use `display_case`. The ticket describes `display_case_num` and `display_case_urn` as separate fields. Need to confirm the exact field names the Gov Notify templates expect.

3. **`case_urn` source**: Where does case URN come from? The current system only stores `caseNumber` and `caseName` in subscriptions and artefact search. Is URN a future field or does it exist somewhere?

4. **SJP Press List "Excel only" scenario**: The ticket says template 2 is for "SJP Press list (need to check)". Is the Excel-only template specifically for SJP Press List (ids 24, 26), or any SJP list without PDF?

5. **Gov Notify subject line**: Can we set dynamic subjects via personalisation? If so, what field name? If not, this is out of scope.

6. **Existing `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`**: Should this be retired in favour of `GOVUK_NOTIFY_TEMPLATE_ID_NON_SJP_PDF`, or do we keep backward compatibility by mapping the old name?
