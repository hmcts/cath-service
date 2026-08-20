# Technical Plan — #674: Excel — Crown hearing lists

## 0. Summary of what this ticket actually adds

The PDF half of the acceptance criteria is **already delivered**. All three Crown list types are
registered in `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts:201-203`) and
render on screen today. The notification layer is **already generic** — `buildEmailDataWithFiles`
unconditionally attempts `downloadBlob(`${artefactId}.xlsx`)` and
`getSubscriptionTemplateId` picks `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` whenever both
files exist under 2MB.

So the real work is:

1. Three Excel generators (`crown-daily-list`, `crown-firm-list`, `crown-warned-list`).
2. Three entries in `EXCEL_GENERATOR_REGISTRY`.
3. An on-page download journey for the three Crown pages (disclaimer → files → download), reusing
   the existing SJP shared handlers.
4. Locale additions (`excelColumns` + the download-journey blocks).

Acceptance criterion 2 (email links) needs **no production code** — only test coverage and a
config check that the PDF+Excel Notify template is set in every environment.

---

## 1. Technical Approach

### 1.1 Architecture decisions

**Reuse the renderers; do not re-derive formatting.** Each generator calls the existing
`renderCrown*ListData` and reads the already-rendered object graph. This is the mechanism that
guarantees the "uniform fields between Excel and PDF" criterion: `formatPddaSittingTime`,
`formatPddaDefendantName`, judiciary joining and locale-aware date formatting all live in the
renderer, and the PDF consumes the same output. Re-implementing any of it in the Excel path would
guarantee eventual divergence.

**One row per case; ancestors repeated.** The PDF expresses court house / court room / judge /
sitting time as section *headings*. The Excel promotes them to *columns* repeated on every row.
This is deliberate: merged cells and blank spacer rows would make the file unsortable and break
assistive-technology table navigation. "Uniform data fields" means the same field set with the
same values, not the same visual layout.

**Follow `magistrates-standard-list` exactly.** `libs/list-types/magistrates-standard-list/src/excel/excel-generator.ts`
is the reference implementation — same options/result interfaces, same `sanitiseCellValue` /
`autoFitColumns` / `saveExcelToStorage` pipeline from `@hmcts/list-types-common`.

**Register by `listTypeName`, never a numeric id.** Per `CLAUDE.md` § List Type Implementation.

### 1.2 Key technical considerations (verified against `master`)

| Claim | Verified |
|---|---|
| No `excel/` directory exists in any of the three Crown libs | ✅ |
| `EXCEL_GENERATOR_REGISTRY` at `service.ts:363`, keyed by string name; `listTypeHasExcel` reads `name in registry` | ✅ |
| `processPublication` calls `generatePublicationExcel` after the PDF and passes `result.excelPath` into notifications (`service.ts:637-662`) | ✅ |
| `generatePublicationExcel` swallows errors, logs, returns `{}` — publication continues on the PDF-only path | ✅ |
| `sanitiseCellValue(value: string)` indexes `value[0]` and **throws on `undefined`** | ✅ — coalesce `?? ""` at every call site |
| `renderCrownFirmListData` returns `{ header, openJustice, listData: null, groupedListData }` | ✅ — use `groupedListData` |
| `TO_BE_ALLOCATED_KEY` is exported from `crown-warned-list/src/rendering/renderer.ts:7` | ✅ — import it, do not re-declare |
| `sjp-download-shared.ts` is already list-type-agnostic | ✅ |
| Notify template selection and `excel_link_*` personalisation need no change | ✅ (`template-config.ts:37-42`, `govnotify-client.ts:88-89`) |
| `queries.ts` already deletes `{artefactId}.xlsx` on artefact deletion | ✅ — no lifecycle work |

### 1.3 Three corrections to the spec in the issue comment

**(a) Nunjucks template resolution is a flat search path, not per-directory.**
`configureGovuk` calls `nunjucks.configure(allViewPaths, …)` with a flat array; a bare template
name like `"list-download-disclaimer"` resolves to the **first match** across all view paths.
`sjp-press-list/` and `sjp-public-list/` already ship byte-identical copies of both templates
(verified with `diff`), so one of them is already dead — the collision is invisible only because
they are identical.

The spec's instruction to "copy them per directory" would add three more copies of an
already-duplicated file and rely on accidental first-match ordering. Instead:

- Move `list-download-disclaimer.njk` and `list-download-files.njk` into
  `libs/web-core/src/views/` (already on the search path as `sharedViews`, and ahead of the page
  dirs, so resolution becomes deterministic).
- Delete the four SJP copies.
- Update the four existing `*.njk.test.ts` files' `createTestEnvironment` paths.
- The Crown directories then need **no** `.njk` files for the download journey.

**(b) The `CROWN_WARNED_LIST` registry key is not stable — #957 renames it.**
Issue #957 (still OPEN, targeted to merge "just before go-live on 1st October") states:

> The list name is changed from Crown Warned List to Crown Advance List … **and also an internal
> list type name change in the database** … List name in the database should be Crown Advanced
> PDDA list so it matches other Crown list nomenclature.

This confirms the spec's assumption ("Crown Advance List" = the Crown Warned List) **and** creates
a hard sequencing constraint: the third `EXCEL_GENERATOR_REGISTRY` key, and any test fixture that
asserts on it, must use whatever `name` #957 lands in `list-type-data.ts`. Land #674 after #957,
or land it against `CROWN_WARNED_LIST` and treat the rename as part of #957's own sweep. See
CLARIFICATIONS NEEDED.

#957 also removes the first preamble sentence and changes hearing types from Xhibit. Neither
affects the field set, so the column mappings in §3.3 survive it — but they must be re-verified
against the renderers once #957 merges.

**(c) `@hmcts/location` is an undeclared dependency in the Crown libs already.**
`crown-daily-list/src/rendering/renderer.ts` imports `getLocationById` from `@hmcts/location`, but
`crown-daily-list/package.json` does not list it (it currently resolves via workspace hoisting).
Add it alongside `exceljs` rather than leaving the gap. `@hmcts/azure-blob` is **not** needed —
`saveExcelToStorage` is re-exported from `@hmcts/list-types-common`, which already owns that
dependency (magistrates declares it unnecessarily).

---

## 2. TEMPLATE SOURCE

**n/a**

No new rendered list-type view is created. The three Crown list pages
(`crown-daily-cause-list`, `crown-firm-list`, `crown-warned-list`) already exist. The two
download-journey templates already exist in-repo as SJP pages and are promoted to
`libs/web-core/src/views/` — this is an in-repo move, not a pip-frontend migration.

---

## 3. Implementation Details

### 3.1 New files

| Path | Purpose |
|---|---|
| `libs/list-types/crown-daily-list/src/excel/excel-generator.ts` | `generateCrownDailyListExcel` |
| `libs/list-types/crown-daily-list/src/excel/excel-generator.test.ts` | Unit tests |
| `libs/list-types/crown-firm-list/src/excel/excel-generator.ts` | `generateCrownFirmListExcel` |
| `libs/list-types/crown-firm-list/src/excel/excel-generator.test.ts` | Unit tests |
| `libs/list-types/crown-warned-list/src/excel/excel-generator.ts` | `generateCrownWarnedListExcel` |
| `libs/list-types/crown-warned-list/src/excel/excel-generator.test.ts` | Unit tests |
| `libs/web-core/src/views/list-download-disclaimer.njk` | Moved from `sjp-press-list/` |
| `libs/web-core/src/views/list-download-files.njk` | Moved from `sjp-press-list/` |
| `apps/web/src/pages/(list-types)/list-download-shared.ts` | Renamed from `sjp-download-shared.ts`, plus the guard factory |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/list-download-disclaimer.ts` | Terms page (GET + POST) |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/list-download-files.ts` | File list page |
| `apps/web/src/pages/(list-types)/crown-daily-cause-list/download.ts` | Blob download route |
| …identical trio under `crown-firm-list/` and `crown-warned-list/` | 6 more files |
| Co-located `*.test.ts` for each new page module | Tests |

### 3.2 Changed files

| Path | Change |
|---|---|
| `libs/list-types/crown-{daily,firm,warned}-list/src/locales/en.ts` / `cy.ts` | Add `excelColumns`, `downloadCopy`, `disclaimer`, `downloadFiles` |
| `libs/list-types/crown-*/src/index.ts` (×3) | Export `generateCrown*Excel` |
| `libs/list-types/crown-*/package.json` (×3) | Add `"exceljs": "4.4.0"` and `"@hmcts/location": "workspace:*"` |
| `libs/publication/src/processing/service.ts` | Three imports + three `EXCEL_GENERATOR_REGISTRY` entries |
| `apps/web/src/pages/(list-types)/list-type-handler.ts` | Add `req` to `RenderCallback` params; thread it through both handler factories |
| `apps/web/src/pages/(list-types)/crown-*/index.ts` (×3) | Compute and pass `downloadDisclaimerUrl` |
| `apps/web/src/pages/(list-types)/crown-*/*.njk` (×3) | Render the "Download a copy" button |
| `apps/web/src/pages/(list-types)/sjp-{press,public,delta-*}-list/*.ts` | Update imports to `list-download-shared.js` |
| `apps/web/src/pages/(list-types)/sjp-{press,public}-list/list-download-*.njk` (×4) | **Delete** — moved to `web-core/src/views` |
| `apps/web/src/pages/(list-types)/sjp-{press,public}-list/list-download-*.njk.test.ts` (×4) | Point `createTestEnvironment` at the shared views dir |
| `apps/web/src/pages/(list-types)/sjp-press-list/list-download-disclaimer.ts` | Replace its inline copy of the guard with the shared factory |
| `apps/web/src/pages/(list-types)/sjp-press-list/require-verified-with-provenance.ts` | **Delete** — factory moves into `list-download-shared.ts` |
| `e2e-tests/tests/crown-list-download.spec.ts` | New — one journey per list type |

### 3.3 Excel generator contract

Identical to the magistrates reference:

```typescript
interface ExcelGenerationOptions {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  locale: string;
  jsonData: CrownDailyListData;   // per list type
}

interface ExcelGenerationResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}
```

Body, in order:

1. `const t = locale === "cy" ? cyLocale : enLocale; const cols = t.excelColumns;`
2. Call the existing renderer with `{ locale, locationId, contentDate }`.
3. `new ExcelJS.Workbook()`; `workbook.addWorksheet(t.title)`.
4. `const headerRow = worksheet.addRow([...]); headerRow.font = { bold: true };`
5. `worksheet.views = [{ state: "frozen", ySplit: 1 }];` — keeps headers visible; small accessibility
   win beyond the magistrates precedent.
6. Nested loops → one row per case; **every** cell `sanitiseCellValue(value ?? "")`.
7. `autoFitColumns(worksheet)`.
8. `const buffer = await workbook.xlsx.writeBuffer(); const { excelPath } = await saveExcelToStorage(artefactId, Buffer.from(buffer));`
9. `return { success: true, excelPath }`; `catch` → `{ success: false, error: "Failed to generate Crown Daily List Excel: <message>" }`.

#### Column mapping — `CROWN_DAILY_LIST`

Loop `listData.courtLists[] → courtHouse.courtRoom[] → session[] → sittings[] → hearing[] → case[]`.

| # | Header (`cols.*`) | Source |
|---|---|---|
| A | `courtHouse` | `courtList.courtHouse.courtHouseName` |
| B | `courtRoom` | `courtRoom.courtRoomName` |
| C | `judge` | `session.formattedJudiciaries` |
| D | `sittingAt` | `sitting.time` |
| E | `hearingTime` | `case.timeMarkingNote` |
| F | `caseRef` | `case.caseNumber` |
| G | `defendant` | `case.defendants` |
| H | `hearingType` | `hearing.displayHearingType` |
| I | `prosecutingAuthority` | `case.prosecutingAuthority` |
| J | `listingNotes` | `case.listingNotes` |

`session.hasListingNotes` gates the *PDF's* Listing Notes column. The Excel **always** emits
column J so the file shape is stable across artefacts.

#### Column mapping — `CROWN_FIRM_LIST`

Loop `groupedListData[] → sittings[] → hearing[] → case[]`.

| # | Header (`cols.*`) | Source |
|---|---|---|
| A | `date` | `dayGroup.day` |
| B | `courtHouse` | `dayGroup.courtHouseInfo.name` |
| C | `courtRoom` | `sitting.courtRoomName` |
| D | `judge` | `sitting.formattedJudiciaries` |
| E | `sittingAt` | `sitting.time` |
| F | `hearingTime` | `case.timeMarkingNote` |
| G | `caseNumber` | `case.caseNumber` |
| H | `defendant` | `case.defendants` |
| I | `hearingType` | `hearing.displayHearingType` |
| J | `representative` | `case.representative` |
| K | `prosecutingAuthority` | `case.prosecutingAuthority` |
| L | `listingNotes` | `case.listingNotes` |

#### Column mapping — `CROWN_WARNED_LIST` (the issue's "Crown Advance List")

Loop `groupedCategories[] → cases[]`.

| # | Header (`cols.*`) | Source |
|---|---|---|
| A | `hearing` | `group.category === TO_BE_ALLOCATED_KEY ? t.toBeAllocated : group.category` |
| B | `fixedFor` | `row.fixedFor` |
| C | `caseRef` | `row.caseNumber` |
| D | `defendant` | `` `${row.isInCustody ? "*" : ""}${row.defendants}` `` |
| E | `prosecutingAuthority` | `row.prosecutingAuthority` |
| F | `linkedCases` | `row.linkedCases` |
| G | `listingNotes` | `row.listingNotes` |

Note the `*` prefix runs through `sanitiseCellValue`, which does not treat `*` as an injection
character — no escaping surprise.

### 3.4 Registry wiring

```typescript
// libs/publication/src/processing/service.ts
const EXCEL_GENERATOR_REGISTRY: Partial<Record<string, ExcelGenerator>> = {
  CROWN_DAILY_LIST: (p) => generateCrownDailyListExcel({ ...p, jsonData: p.jsonData as CrownDailyListData }),
  CROWN_FIRM_LIST: (p) => generateCrownFirmListExcel({ ...p, jsonData: p.jsonData as CrownFirmListData }),
  CROWN_WARNED_LIST: (p) => generateCrownWarnedListExcel({ ...p, jsonData: p.jsonData as CrownWarnedListData }),
  // …existing entries unchanged
};
```

No change to `listTypeHasExcel`, `generatePublicationExcel` or `processPublication` — registration
alone activates generation.

**Pre-existing coupling to note in the PR (do not fix here):** `processPublication` passes
`listTypeName: pdfResult.listTypeName ?? ""`. If PDF generation throws before resolving the name,
`listTypeName` is `""`, no Excel generator matches, and Excel is silently skipped. This affects
every Excel list type today; flag it so it is not mistaken for a Crown-specific bug.

### 3.5 Promoting the SJP download journey

`sjp-download-shared.ts` → `list-download-shared.ts`. Its exports (`handleBlobDownload`,
`getAvailableFiles`, `formatFileSize`, `createListDownloadFilesHandler`) are already
list-type-agnostic. **Rename, do not fork.**

`createRequireVerifiedWithProvenance` already exists as a factory in
`sjp-press-list/require-verified-with-provenance.ts`. Move it into `list-download-shared.ts` and
delete the original. Also replace the **inline duplicate** of the same logic inside
`sjp-press-list/list-download-disclaimer.ts` with the factory.

Each Crown list type then gets three thin page modules:

```typescript
// crown-daily-cause-list/list-download-files.ts
import { crownDailyListCy as cy, crownDailyListEn as en } from "@hmcts/crown-daily-list";
import type { RequestHandler } from "express";
import { createListDownloadFilesHandler, requireVerifiedWithProvenance } from "../list-download-shared.js";

const getHandler = createListDownloadFilesHandler(en, cy, "downloadFiles");

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
```

```typescript
// crown-daily-cause-list/download.ts
export const GET: RequestHandler[] = [requireVerifiedWithProvenance, handleBlobDownload];
```

The disclaimer module's GET/POST handlers are also identical across list types except for the
locale import — factor them into `createListDownloadDisclaimerHandlers(en, cy)` in the shared file
rather than copying ~70 lines three times.

No `.njk` files in the Crown directories — see §1.3(a).

### 3.6 Crown list page changes

In each of the three controllers, inside the `render` callback:

```typescript
const isVerifiedUser = req.user?.role === "VERIFIED";
const [pdfProps, excelProps] = await Promise.all([
  getBlobProperties(`${artefact.artefactId}.pdf`),
  getBlobProperties(`${artefact.artefactId}.xlsx`)
]);
const downloadDisclaimerUrl =
  isVerifiedUser && (pdfProps || excelProps)
    ? `${req.path}/list-download-disclaimer?artefactId=${artefact.artefactId}`
    : null;
```

`RenderCallback` currently receives `{ artefact, jsonData, locale, res }` — add `req`. One type
change plus threading `req` through `createListTypeHandler` and `createSimpleListTypeHandler`.
Existing callbacks ignore the extra property, so this is non-breaking.

Template addition, after the header block and before the reporting-restrictions box, mirroring
`sjp-press-list.njk:45-49`:

```njk
{% if downloadDisclaimerUrl %}
  <a href="{{ downloadDisclaimerUrl }}" role="button" draggable="false" class="govuk-button" data-module="govuk-button">
    {{ t.downloadCopy }}
  </a>
{% endif %}
```

### 3.7 Locale additions

Column headers **reuse existing keys** wherever the string already exists, rather than re-typing
the text. That is what mechanically keeps Excel and PDF headers uniform.

Already present in the Crown locales (en **and** cy) — reference, don't retype:
`sittingAt`, `hearingTime`, `caseRef`, `caseNumber`, `defendant`, `hearingType`,
`prosecutingAuthority`, `listingNotes`, `representative`, `fixedFor`, `linkedCases`,
`toBeAllocated`, `title`.

Genuinely new keys needing Welsh: `courtHouse`, `courtRoom`, `judge` (all three libs), `date`
(firm — consider reusing the existing `day: "Diwrnod"` / `"Dyddiad"`), `hearing` (warned).

The **entire** download-journey block already has approved Welsh in
`libs/list-types/sjp-press-list/src/sjp-press-list/cy.ts:54-75` — `downloadCopy`, and the full
`disclaimer` and `downloadFiles` objects. Copy those strings verbatim; commission no new
translation for them.

Keep `Object.keys(en)` ≡ `Object.keys(cy)` including inside every nested object, and assert it:

```typescript
expect(Object.keys(en.excelColumns).sort()).toEqual(Object.keys(cy.excelColumns).sort());
```

### 3.8 API endpoints

Auto-discovered from the directory structure; `(list-types)` contributes no URL segment.

| Method | URL |
|---|---|
| GET/POST | `/crown-daily-cause-list/list-download-disclaimer` |
| GET | `/crown-daily-cause-list/list-download-files?artefactId=<uuid>` |
| GET | `/crown-daily-cause-list/download?artefactId=<uuid>&type=pdf\|xlsx` |
| GET/POST | `/crown-firm-list/list-download-disclaimer` |
| GET | `/crown-firm-list/list-download-files?artefactId=<uuid>` |
| GET | `/crown-firm-list/download?artefactId=<uuid>&type=pdf\|xlsx` |
| GET/POST | `/crown-warned-list/list-download-disclaimer` |
| GET | `/crown-warned-list/list-download-files?artefactId=<uuid>` |
| GET | `/crown-warned-list/download?artefactId=<uuid>&type=pdf\|xlsx` |

The shared handlers derive the sibling prefix from `req.path`, so the same code serves all three
directories with no configuration. Welsh is served on the same URLs via `?lng=cy`.

Blob keys (not URLs): `{artefactId}.pdf` and `{artefactId}.xlsx` in the `PUBLICATIONS` container.

### 3.9 Database schema changes

**None.** All three list types already exist and are seeded in
`libs/list-types/common/src/list-type-data.ts:45,55,65`. No migration, no new JSON schema, no new
validator — this ticket adds no upload path, so the CI guard in
`libs/list-types/common/src/validation/guard.test.ts` is unaffected.

---

## 4. Error Handling & Edge Cases

### Excel generation (server-side, no user input)

| Case | Behaviour |
|---|---|
| Missing optional string field | Coalesce `?? ""` before `sanitiseCellValue` — **required**, it throws on `undefined` |
| Cell starting `=`, `+`, `-`, `@` | `sanitiseCellValue` prefixes `'`. Applied to every cell without exception |
| Empty list (no court lists / no cases) | Emit a header-only workbook, upload it, report success. A header-only file is a valid answer to "no hearings" |
| Generator throws | Caught internally → `{ success: false, error }`; `generatePublicationExcel` logs and returns `{}`; publication completes; email falls back to the PDF-only template |
| Worksheet name | All six EN/CY titles are ≤31 chars with no illegal characters (longest: `Rhestr Rybuddiol y Goron`, 24). No sanitisation needed, but assert the sheet name in tests so a future title change that breaks the limit is caught |
| Large firm list | A week of sittings is tens of KB — well under the 2MB Notify threshold. No streaming or pagination |
| No case data in logs | Log only `artefactId` and the error message. Never defendant names or artefact JSON |

### Download journey (user input)

| Input | Rule | Failure |
|---|---|---|
| `artefactId` | Required, UUID regex | Guard → redirect `/sign-in`; handler → `400` render `errors/400` |
| `type` on `/download` | Exactly `pdf` or `xlsx` | `400 { error: "Invalid request" }` |
| `agreed` on disclaimer POST | Required | Re-render with error summary linked to `#agreed`; no redirect |
| Artefact exists | Required | Redirect `/sign-in` |
| `role === "VERIFIED"` and `provenance` set | Required | Set `session.returnTo`, redirect `/sign-in` |
| Provenance ∈ `listType.allowedProvenance` | Required | Redirect `/sign-in` |
| Requested blob exists | Required | `404 { error: "File not found" }` |
| At least one file exists | Required for the files page | `404` render `errors/404` |

The `type` allow-list is what prevents traversal into other blobs — the key is rebuilt as
`${artefactId}${extension}` from the validated UUID plus a value from a two-element set.

`/download` returns JSON errors rather than rendered pages. That matches existing SJP behaviour
for a file endpoint reached only from a generated link — do not change it.

### Edge cases specific to the Crown data

- Firm list: `renderCrownFirmListData` returns `listData: null`. Reading `listData` instead of
  `groupedListData` yields a silently empty spreadsheet — the most likely implementation slip here.
- Warned list: `TO_BE_ALLOCATED` is a sentinel category key, not a display string. Emitting it raw
  puts `"TO_BE_ALLOCATED"` in a user-facing cell.
- Daily list: each PDDA sitting becomes its own `session` with exactly one `sittings` entry and
  each hearing exactly one `case`. The loops must still handle the arrays generically.
- Multiple defendants are pre-joined by the renderer into a single `defendants` string — one cell,
  matching the PDF.

---

## 5. Acceptance Criteria Mapping

| Criterion | How it is satisfied | Verification |
|---|---|---|
| Excel and PDF available for the Crown hearing lists | PDF already registered; three new Excel generators + registry entries; download journey on all three pages | Unit: registry dispatch per list type. E2E: journey shows both links |
| Links to both file types in email notifications | **No code change.** `buildEmailDataWithFiles` already fetches `.xlsx`; `getSubscriptionTemplateId` already returns the PDF+Excel template when both exist under 2MB | Unit: template selection + `excel_link_to_file` personalisation for a Crown artefact. Config: confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in every environment — `getSubscriptionTemplateId` **throws** if it is missing |
| Uniform data fields across Excel and PDF | Both consume the same renderer output; `excelColumns` references existing locale keys rather than duplicating strings | Unit: column headers equal the locale values the PDF uses; values read off the rendered graph |
| Crown Daily fields (10 listed) | §3.3 mapping A–J | Unit: header row order and count |
| Crown Firm fields (12 listed) | §3.3 mapping A–L | Unit: header row order and count; Date repeated per day |
| Crown Advance fields (7 listed) | §3.3 warned mapping A–G | Unit: header row; `To be allocated` label; `*` custody prefix |
| Dependent on #957 | Sequencing constraint documented in §1.3(b); re-verify mappings after #957 merges | Manual: re-read the renderers post-#957 |

### Test scenarios

**Unit — each generator** (mock `saveExcelToStorage` and `getLocationById`; read rows back off the
ExcelJS worksheet, never assert on the buffer):

- Worksheet name equals the list title; column count and order match the spec
- Header row is bold; uses `en.excelColumns` values
- Welsh locale → Welsh worksheet name and Welsh headers
- One row per case, repeating court house / court room / judge / sitting time
- Firm list repeats the date on every row of that day and groups multiple rooms under one day
- Warned list maps `TO_BE_ALLOCATED` → the translated label
- Warned list prefixes `*` when `isInCustody`, and not when false
- Empty optional fields produce empty cells, never `undefined`
- A value starting `=`/`+`/`-`/`@` is apostrophe-prefixed
- No court lists → header-only workbook, still `success: true`
- Returns `{ success: true, excelPath: "<artefactId>.xlsx" }`; `saveExcelToStorage` called once
- Returns `{ success: false, error }` without throwing when the renderer or upload rejects

**Unit — registry** (`libs/publication/src/processing/service.test.ts`):

- `listTypeHasExcel` true for all three Crown names
- Dispatch reaches the right generator; `{ hasExcel: true }`
- Generator failure → `{}` + warning; `processPublication` still resolves with the PDF path
- `result.excelPath` set and passed into `sendPublicationNotificationsForArtefact`
- No registry key is a numeric id

**Unit — notifications:** PDF+Excel template selected for a non-SJP list type with both files
under 2MB; fallback to PDF-only when the Excel is absent; no-links when either is ≥2MB;
`excel_link_to_file` present when an Excel buffer exists.

**Unit — page controllers:** `downloadDisclaimerUrl` non-null only for a VERIFIED user with at
least one blob; disclaimer GET renders with `errors: null`; POST without `agreed` re-renders with
an error and does not redirect; POST with `agreed` redirects to the files page; files page lists
both files with sizes, only the PDF when the Excel is missing, 404 when neither exists;
`/download?type=xlsx` sets the spreadsheet content type, attachment disposition and no-store
cache headers; rejects a bad `type` and a malformed `artefactId` with 400; unverified access to
each new route redirects to `/sign-in` and sets `session.returnTo`.

**Template** (Cheerio structural assertions, per `.claude/rules/testing.md`): exactly one
`a.govuk-button` with the download text when `downloadDisclaimerUrl` is set and none when null;
disclaimer renders checkbox, label and Continue, with the error summary only when `errors` is
populated; files page renders one link per file with distinct PDF/Excel link text; Welsh render
shows translated headings; locale key parity for the new nested objects in all three libs.

**E2E** (`e2e-tests/`, one complete journey per list type, `@nightly`, validations + Welsh + Axe
inline — not one test per concern):

- Crown Daily download journey: verified sign-in → open a seeded list → assert the button →
  Continue without ticking → assert the error summary → switch to Welsh → Axe → tick and continue
  via keyboard → assert both links with sizes → download the Excel, assert content type and a
  non-empty body
- Crown Firm journey: as above, additionally asserting a Date value per seeded sitting day
- Crown Advance/Warned journey: as above, additionally asserting a "To be allocated" row
- Unverified: no download button, and a direct disclaimer request redirects to `/sign-in`

### Accessibility (WCAG 2.2 AA)

The new pages are the already-assessed SJP pages, so the job is not regressing: page title matches
`h1`; single `h1`; `govukErrorSummary` before the `h1` with `href="#agreed"`; `govukCheckboxes`
for label association; link text carries type and size ("Download this Microsoft Excel spreadsheet
(38.4KB) to your device"); button-styled link keeps `role="button"` / `data-module="govuk-button"`;
plain `<form method="post" novalidate>` with server-side validation so the journey works without
JavaScript.

For the spreadsheet itself: single bold header row frozen at row 1; no merged cells and no blank
spacer rows (this is *why* the data is flattened); every column has a non-empty header even when
the column is empty for a given artefact; no meaning carried by colour; a meaningful worksheet
name rather than `Sheet1`. The custody `*` has no legend in the Excel — see CLARIFICATIONS NEEDED.

---

## 6. CLARIFICATIONS NEEDED

1. **Scope: on-page download, or email-only?** The precedent is split. SJP has a full on-page
   disclaimer → files → download journey. The magistrates lists generate Excel purely for email
   attachment with **no** on-page download (verified: their page directories contain only
   `index.ts` and the `.njk`). This plan assumes the SJP-style on-page journey. If email-only is
   intended, §3.5 and §3.6 drop out and the ticket shrinks to three generators plus three registry
   entries — roughly a third of the work. Product call, needed before implementation starts.

2. **#957 sequencing and the registry key.** #957 explicitly changes the *database* list type name
   ("Crown Advanced PDDA list") and is scheduled to merge just before go-live on 1 Oct 2026. Should
   #674 (a) land after #957 and key on the new name, (b) land first on `CROWN_WARNED_LIST` and let
   #957's rename sweep pick up the Excel registry entry, or (c) block until #957 merges? Option (b)
   is lowest-risk if #957's author is told the registry key exists.

3. **Custody `*` legend in the Excel.** The PDF explains `*denotes a defendant in custody` in its
   preamble (`crown-warned-list` locale `preStatementSuffix4`). The spreadsheet has no preamble, so
   the asterisk is unexplained. Options: add a `Custody` Yes/No column (most accessible, but breaks
   strict parity with the seven fields the ticket lists), append the legend in a cell below the
   data, or accept the bare asterisk. Content/product decision.

4. **Crown Firm List: one sheet with a Date column, or one worksheet per sitting day?** This plan
   uses one sheet with a Date column, matching the specified field list and better for filtering.

5. **Welsh spreadsheets.** A Welsh `.xlsx` is only produced when the *artefact* is published with
   `locale: "cy"`. A user browsing in Welsh cannot download a Welsh spreadsheet of an
   English-published artefact — the same limitation as the PDF. Acceptable for Crown lists?

6. **`excel_link_text` is hardcoded English** (`"Download Excel version"`,
   `govnotify-client.ts:89`), so Welsh subscribers get English link text. Pre-existing across every
   list type. Raise as a separate ticket, or fold into this one?

7. **Audit logging for downloads.** The service has an `audit-log` domain, and a verified user
   downloading personal protected data looks auditable, but the existing SJP flow records nothing.
   Out of scope unless confirmed otherwise.

8. **Backfill.** Crown artefacts published before this change will have no `.xlsx` and therefore no
   Excel option. This plan specifies no backfill. Confirm that is acceptable.

9. **Notify template config.** Confirm `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` is set in
   every environment. `getSubscriptionTemplateId` **throws** when it is missing, which would fail
   Crown notifications outright the moment the first `.xlsx` appears.
