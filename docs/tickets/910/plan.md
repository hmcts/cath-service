# Plan: #910 Verify GOV.UK Notify email download links end to end for all list types

TEMPLATE SOURCE: n/a

## 1. Technical Approach

### Summary

Three strands, delivered together:

1. **Production clean-up of the 2 MB rule** (defects A-D): one constant, one comparison, no dead flag.
2. **Test infrastructure fixes**: shared `assertEmailDownloadLinks` helper, a working file-existence helper, hard `test.skip` guards, and complete Notify template env config (local *and* deployed).
3. **Data-driven e2e coverage**: one table row per list type in `EMAIL_BUILDER_REGISTRY` (plus the four SJP types, which are not in it), each asserting recipient, body content and the exact number of document links.

### Ticket claims verified against the current branch

Line numbers have drifted and several claims are wrong or incomplete. The plan is based on what the code actually does.

| Ticket claim | Actual state on `feature/940-rcj-excel-download` |
|---|---|
| `govnotify-client.ts:73-88` `prepareUpload` | Correct. |
| `template-config.ts:16` `getSubscriptionTemplateId` | Correct. Fallbacks are at lines **3-5**, not 4-6. |
| `pdf-utilities.ts:6`, `:32-42`, `:33` | Correct (block runs to `:44`). |
| `publication/src/processing/service.ts:435` and `:635` | Stale. Now **`:477`** (`exceedsMaxSize` passed through) and **`:679`** (`result.pdfExceedsMaxSize`). Confirmed nothing reads either. `pdfSizeBytes` is also set and never read. |
| `notification-service.ts:122` duplicate constant | Correct. Size checks are at **`:515-527`**. `@hmcts/notifications` already depends on `@hmcts/list-types-common`, so no new dependency edge is needed. |
| `notification-helpers.ts:65`, `:99` | Correct. |
| Spec `:19`, `:21`, `:33`, `:49` | Correct. |
| Spec `test.setTimeout(120_000)` at `:408` | Stale. It is at **`:395`**. |
| Soft guards at `:449`, `:578`, `:634`, `:687` | Stale. They are at **`:436`, `:565`, `:621`, `:674`**. |
| `blob-ingestion-notifications.spec.ts:83` uses `test.skip` | Stale. It is at **`:88`**. |
| `playwright.config.ts:45-46` forwards only two template vars | Correct. **But** the PR-gate e2e job (`.github/workflows/job.e2e-test.yml`) runs against a deployed preview (`CATH_SERVICE_WEB_URL` is set, so `webServer` is `undefined`). The Playwright change only affects local runs. In the PR gate, the template ids come from **`apps/api/helm/values*.yaml`** and **`apps/web/helm/values.yaml`**. Both list only `SUBSCRIPTION`, `SUBSCRIPTION_PDF_ONLY` and `SUBSCRIPTION_PDF_EXCEL`. The ticket does not mention this. |
| `apps/web/.env.example:66-68` documents three of six | Correct. |
| Env var `..._SJP_PDF_EXCEL` | **Does not exist.** The code uses `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` for **both** SJP and non-SJP PDF+Excel. The six vars are: `SUBSCRIPTION`, `SUBSCRIPTION_PDF_ONLY`, `SUBSCRIPTION_PDF_EXCEL`, `SJP_EXCEL_ONLY`, `NO_LINKS`, `NON_SJP_PDF`. |
| "Four outcomes" table | **Incomplete.** `getSubscriptionTemplateId` also sends **non-SJP PDF + Excel** to `SUBSCRIPTION_PDF_EXCEL` (2 links), and **SJP PDF only** to `NON_SJP_PDF` (1 link). `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` has an Excel generator, so the existing "non-SJP PDF" test actually hits the PDF+Excel template. Its expected count is 2, not 1. |
| "Four hand-written blocks cover Civil & Family, SJP Public, SJP Press" | Partly right. The fourth block is the large-file test. **Three of the four are `@nightly`**, and only the C&F one is in the PR gate. |
| `EMAIL_BUILDER_REGISTRY` is "the set" | It has **67** entries. It **excludes all four SJP types**, which go through `buildFallbackEmailData`. Template selection (`buildEmailDataWithFiles`) is the same for registry and fallback types. Registry membership only changes the case-summary text. |
| Reuse fixtures from `json-validator.test.ts` | Those fixtures are file-local `const VALID_DATA` (not exported), and `e2e-tests` has no `@hmcts/*` dependencies. They have to be **copied**, not imported. |

### Defects the ticket does not mention, found while verifying

1. **`documentLinks!.length >= 2` can never pass.** `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` has no `/g` flag, so `body.match(...)` returns a one-element array. Both SJP tests (`:575`, `:630`) would fail whenever their guard actually ran.
2. **`listFlatFiles` is broken.** The server route `libs/test-support/src/routes/test-support/flat-files.ts` ignores `all=true` and returns a single `{ exists, filename, sizeBytes }`. So `fileList.files` is `undefined`, and `waitForFileGeneration` throws a `TypeError`. The route does support `?extension=.xlsx`.
3. **The link regex only matches the service-id segment.** Notify links look like `https://documents.service.gov.uk/d/<service-id>/<document-id>?key=...`. The current pattern `/d\/[A-Za-z0-9_-]+/` stops at the service id, which is the same for every document. So a de-duplicated count would merge the PDF and Excel links into one. The pattern must include the document-id segment.
4. **The large-file test is non-deterministic.** At `:680` it branches on the measured size and asserts *links present* if the PDF is under 2 MB. 200 C&F hearings almost certainly produce well under 2 MB, so the `NO_LINKS` branch is very likely never exercised.
5. **The guard also hides `Failed` notifications.** The tests accept `status === "Sent" || "Failed"`. When Notify fails (for example, a missing template id), `govNotifyId` is null, the guard is false, and the test passes.
6. **`getListTypeByName` uses `contains`.** For example, `FAMILY_DAILY_CAUSE_LIST` matches `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`, and `IAC_DAILY_LIST` matches `IAC_DAILY_LIST_ADDITIONAL_CASES`. Do not use it to look up friendly names.
7. **`event.excelPath` is passed in and never read.** `buildEmailDataWithFiles` always downloads `${artefactId}.xlsx`. This is out of scope (not size related), but it is the same kind of dead plumbing as defect A and is worth a follow-up.

### Architecture decisions

**2 MB rule (defects A-D)**

- **Delete `exceedsMaxSize` / `pdfExceedsMaxSize`; do not consume them.** Consuming them saves nothing: the notification path still has to download both buffers, because `prepareUpload` needs the bytes. The flag also only covers PDFs, not Excel. Deleting leaves exactly one comparison, so storage and notification cannot disagree on the boundary.
- **One constant, renamed for what it is (defect D).** The limit belongs to Notify file attachments, not to PDF generation. Once the flag is gone, `list-types-common` has no use for the constant. So:
  - Remove `MAX_PDF_SIZE_BYTES` from `libs/list-types/common/src/pdf/pdf-utilities.ts` and its re-export in `libs/list-types/common/src/index.ts`. Its only importer is its own test.
  - Define it once as `MAX_NOTIFY_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024` in `libs/notifications/src/govnotify/template-config.ts`, next to the other Notify config. Use it from `notification-service.ts` through a single predicate, `isWithinNotifyAttachmentLimit(buffer)`, used for both PDF and Excel.
- **Boundary semantics: `size <= 2,097,152` gets a link.** This matches `notifications-node-client`, which throws only when `file.length > 2 * 1024 * 1024` (`client/notification.js:183`). Today's `<` withholds a link from a file Notify would accept. See CLARIFICATIONS #1.

**Pinning the boundary**

An exactly-2,097,152-byte Puppeteer PDF cannot be produced from a JSON payload. PDF size is not controllable to the byte, and there is no window between generation and send in which to swap the blob: `processPublication` generates and then notifies in the same async chain. The test-support `POST /flat-files` also writes to `CONTAINER.ARTEFACT`, not `PUBLICATIONS`. So:

- **Pin the boundary in unit tests** in `notification-service.test.ts`. Mock `downloadBlob` to return `Buffer.alloc(MAX)` and `Buffer.alloc(MAX + 1)`, for both PDF and Excel, and assert which buffers reach `sendEmail` and which template id is chosen.
- **Use e2e for the "well over 2 MB" case only.** See CLARIFICATIONS #2. The AC "a case pins the 2 MB boundary" is met at unit level.

**Producing a file over 2 MB in e2e**

- Text PDFs compress well, so volume alone needs a very large list. Use **high-entropy text**: deterministic pseudo-random alphanumeric case names and party names, generated in the builder. Flate compresses this poorly, so far fewer rows are needed than with repeated text.
- Use `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST`. It already has a large-payload builder, and the API accepts bodies up to 100 MB (`apps/api/src/app.ts:33`). Calibrate the row count locally so the stored PDF lands around 2.5-3 MB.
- **Hard precondition, no branching:** read the stored size via the test-support `GET /test-support/flat-files?artefactId=...` (it downloads the blob and returns `sizeBytes`), then `expect(sizeBytes).toBeGreaterThan(MAX)`. If the calibration drifts, the test fails loudly instead of quietly testing the wrong branch.
- C&F also generates an Excel. With the PDF over 2 MB, `filesUnder2MB` is false, so the template is `NO_LINKS` whatever the Excel size. Assert both `.pdf` and `.xlsx` exist in storage, and that the email has **0** links.

**Verifying blob storage presence**

- Extend `checkFlatFileExists(artefactId, extension = ".pdf")` in `e2e-tests/utils/test-support-api.ts` to pass the route's existing `extension` query param.
- Delete the broken `listFlatFiles`, `FlatFileListItem` and `FlatFileListResponse`. Replace the spec-local `waitForPdfGeneration` and `waitForFileGeneration` with one `waitForStoredFiles(artefactId, extensions)` that polls `checkFlatFileExists` per extension. No server change is needed.
- Every case asserts its expected extensions are present with `sizeBytes > 0`. Cases expected to have **no** Excel assert `.xlsx` is absent. That proves the link count is not hiding a generation failure.

**Data-driven table**

```ts
interface EmailLinkCase {
  listTypeName: string;            // stable name, never the numeric id
  buildPayload: PayloadBuilder;    // (ctx: { contentDate, locationName }) => unknown
  expectedFiles: (".pdf" | ".xlsx")[];
  expectedLinkCount: 0 | 1 | 2;
}
```

- Derive `expectedLinkCount` from `expectedFiles` and the template rules with a tiny local function, rather than hand-typing it. 2 files gives 2 links, 1 file gives 1, 0 files gives 0. Oversize is a separate case and always 0.
- Read friendly names once from `GET /test-support/list-types` (returns all rows) and match by **exact** `name`. Do not hardcode them, and do not use `getListTypeByName`.
- **One unique location per case** (`createUniqueTestLocation`). The spec runs `fullyParallel` with 4 CI workers. Each publication also triggers list-type subscription emails to other users in the shared environment, so always pick the notification by `subscriptionId`, not just by publication.

**Runtime budget**

- **73 cases**: 67 registry types, 4 SJP types, 1 flat-file, 1 oversize.
- Each case costs about 15-30 s warm (PDF render, notification poll, `getGovNotifyEmail`'s 2 s initial delay), plus a 40-60 s Puppeteer cold start per worker.
- Across 4 workers that adds roughly **6-10 minutes** to the PR gate, and puts 4 concurrent Puppeteer renders on one preview API pod.
- Plan: per the ticket, ship all cases **untagged**, with `test.setTimeout(120_000)` per case (180 s for the oversize case). Record the job duration from the first CI run. If it is over the agreed budget (CLARIFICATIONS #4), apply the ticket's fallback: keep one representative per **template branch × generator family** in the PR gate and tag the rest `@nightly`. The table carries an optional `nightly?: true` flag so this split is a data change, not a rewrite.

## 2. Implementation Details

### Files to change

| File | Change |
|---|---|
| `libs/list-types/common/src/pdf/pdf-utilities.ts` | Remove `MAX_PDF_SIZE_BYTES`, `exceedsMaxSize` from `PdfGenerationResult`, and the computation in `savePdfToStorage`. |
| `libs/list-types/common/src/index.ts` | Drop the `MAX_PDF_SIZE_BYTES` re-export. |
| `libs/list-types/common/src/pdf/pdf-utilities.test.ts` | Remove the flag and constant tests; keep upload and size tests. |
| `libs/list-types/*/src/pdf/pdf-generator.test.ts` (and others; 32 test files reference `exceedsMaxSize`) | Remove `exceedsMaxSize` from mocks and expectations. Delete the "exactly 2MB / exceeds" generator tests in `rcj-standard-daily-cause-list` and `civil-and-family-daily-cause-list`, which only re-test the removed flag. |
| `libs/publication/src/processing/service.ts` | Remove `exceedsMaxSize` from `GeneratePdfResult`/`PdfResult` (`:97`, `:105`), the pass-through (`:477`), `pdfExceedsMaxSize` (`:625`, `:679`). |
| `libs/publication/src/processing/service.test.ts` | Update expectations (`:1305`). |
| `libs/notifications/src/govnotify/template-config.ts` | Add `export const MAX_NOTIFY_ATTACHMENT_SIZE_BYTES` and `export function isWithinNotifyAttachmentLimit(file: Buffer): boolean` (`<=`). |
| `libs/notifications/src/notification/notification-service.ts` | Delete the local constant (`:122`). Use the predicate for PDF and Excel in `buildEmailDataWithFiles`. |
| `libs/notifications/src/notification/notification-service.test.ts` | Boundary tests: PDF at `MAX`, PDF at `MAX + 1`, Excel at `MAX`, Excel at `MAX + 1`, SJP Excel-only (PDF blob null). |
| `libs/notifications/src/govnotify/template-config.test.ts` | Predicate tests at `MAX - 1`, `MAX`, `MAX + 1`. |
| `e2e-tests/utils/notification-helpers.ts` | Add `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` (moved; extended to include the document-id segment) and `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)`. |
| `e2e-tests/utils/test-support-api.ts` | `checkFlatFileExists(artefactId, extension?)`; delete `listFlatFiles` and its types. |
| `e2e-tests/utils/list-type-email-cases.ts` (new) | The `EmailLinkCase[]` table and payload builders. Builders load copied fixtures and patch `contentDate`/venue names. |
| `e2e-tests/fixtures/list-types/<package>.json` (new, about 40 files) | One fully hydrated payload per distinct schema, copied from each package's `json-validator.test.ts` `VALID_DATA`. List types that share a schema (RCJ ×8, admin court ×4, SSCS ×7, FTT RPT ×6, UTIAC JR ×5, SIAC/POAC/PAAC, IAC ×2, magistrates pairs) share one file. |
| `e2e-tests/tests/api/subscription-notifications.spec.ts` | Replace the SJP, large-file and C&F email blocks with a `for (const c of EMAIL_LINK_CASES) test(...)` loop, plus the flat-file and oversize cases. Convert the soft guards to `test.skip`. Keep the multi-subscriber part and the `@nightly` "no subscriptions" test. Keep the `afterEach` accumulator. |
| `e2e-tests/playwright.config.ts` | Build the Notify env prefix from a `NOTIFY_TEMPLATE_ENV_VARS` array (all six) and use it in both the CI and local `command` strings. This removes the duplicated literal. |
| `apps/web/.env.example` | List all six `GOVUK_NOTIFY_TEMPLATE_ID_*` subscription vars. |
| `apps/api/helm/values.yaml`, `apps/api/helm/values.dev.yaml`, `apps/web/helm/values.yaml` | Add `GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY`, `..._NO_LINKS`, `..._NON_SJP_PDF`. Needs real UUIDs (CLARIFICATIONS #3). Without this, the PR gate tests the fallbacks, not the intended templates. |

No new API endpoints. No DB schema changes. No new libs.

### Helper signature

```ts
export const GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN = /https:\/\/documents\.service\.gov\.uk\/d\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+/;

export async function assertEmailDownloadLinks(govNotifyId: string, expectedLinkCount: number): Promise<GovNotifyEmail>
```

- Count **distinct** matches using `body.matchAll(new RegExp(PATTERN.source, "g"))`. Do not use a shared `/g` regex: `.test()` on a global regex is stateful through `lastIndex`.
- Assert with `expect(links).toHaveLength(expectedLinkCount)`.
- Return the fetched email so the caller can assert recipient, body and status without a second Notify call.

### Per-case assertions

1. `POST /publication` returns 201.
2. `waitForNotifications(id, 90, 1000, false, true)`. Pick the notification for this case's `subscriptionId`, and expect `status === "Sent"` and a non-null `govNotifyId`. These are hard checks; `Failed` no longer passes.
3. `waitForStoredFiles`: the expected extensions are present with `sizeBytes > 0`, and unexpected `.xlsx` is absent.
4. `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)`.
5. `email_address === CFT_VALID_TEST_ACCOUNT`. The body contains the friendly name, the location name and `formattedContentDate`. `status` matches `/delivered|sending|pending|created|permanent-failure/`.

### Enumerated cases

Expected outcomes for publications made via `POST /publication` with a JSON body. The API never passes `uploadedExcel`, so the "uploaded Excel" generators delete any stale blob and produce no Excel. SSCS is the exception: its generator reformats an uploaded workbook when there is one and otherwise builds the Excel from JSON.

The 31 regional and court variants (RCJ ×8, administrative court ×4, SSCS ×7, SIAC/POAC/PAAC ×3, FTT RPT ×6, UT ×3) only became publishable as JSON through `PACKAGE_ALIASES`; see section 6. One row per package runs in the PR gate and the other variants are `@nightly`.

**A. PDF + Excel: `SUBSCRIPTION_PDF_EXCEL`, exactly 2 links (20)**

| List type | Source |
|---|---|
| CIVIL_AND_FAMILY_DAILY_CAUSE_LIST | registry |
| CIVIL_DAILY_CAUSE_LIST | registry |
| FAMILY_DAILY_CAUSE_LIST | registry |
| MAGISTRATES_PUBLIC_LIST | registry |
| MAGISTRATES_STANDARD_LIST | registry |
| MAGISTRATES_ADULT_COURT_LIST_DAILY | registry |
| MAGISTRATES_ADULT_COURT_LIST_FUTURE | registry |
| MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY | registry |
| MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE | registry |
| SJP_PUBLIC_LIST | not in registry (fallback path), `isSjp` |
| SJP_DELTA_PUBLIC_LIST | not in registry, `isSjp` |
| SJP_PRESS_LIST | not in registry, `isSjp` |
| SJP_DELTA_PRESS_LIST | not in registry, `isSjp` |
| SSCS_LONDON_DAILY_HEARING_LIST, SSCS_MIDLANDS_DAILY_HEARING_LIST, SSCS_SOUTH_EAST_DAILY_HEARING_LIST, SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST, SSCS_SCOTLAND_DAILY_HEARING_LIST, SSCS_NORTH_EAST_DAILY_HEARING_LIST, SSCS_NORTH_WEST_DAILY_HEARING_LIST | registry; Excel generated from JSON |

**B. PDF only: `NON_SJP_PDF`, exactly 1 link (51, all in the registry)**

- **Uploaded-Excel generators, which produce no Excel via the JSON API:** CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST, COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST, COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST, FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST, KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST, KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST, MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST, SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST, LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST, COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST
- **No Excel generator:**
  - ET_DAILY_LIST, ET_FORTNIGHTLY_PRESS_LIST, COP_DAILY_CAUSE_LIST, CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST, SEND_DAILY_HEARING_LIST, CIC_WEEKLY_HEARING_LIST, AST_DAILY_HEARING_LIST, PHT_WEEKLY_HEARING_LIST
  - IAC_DAILY_LIST, IAC_DAILY_LIST_ADDITIONAL_CASES
  - BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST, INTERIM_APPLICATIONS_DAILY_CAUSE_LIST
  - CROWN_DAILY_PDDA_LIST, CROWN_FIRM_PDDA_LIST, CROWN_ADVANCED_PDDA_LIST
  - BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST, LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST, BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST, MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST
  - SIAC_WEEKLY_HEARING_LIST, POAC_WEEKLY_HEARING_LIST, PAAC_WEEKLY_HEARING_LIST
  - FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST, FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST
  - FTT_RPT_EASTERN_WEEKLY_HEARING_LIST, FTT_RPT_LONDON_WEEKLY_HEARING_LIST, FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST, FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST, FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST, FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST
  - GRC_WEEKLY_HEARING_LIST, WPAFCC_WEEKLY_HEARING_LIST
  - UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST, UTIAC_JR_LONDON_DAILY_HEARING_LIST, UTIAC_JR_LEEDS_DAILY_HEARING_LIST, UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST, UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST, UTIAC_JR_CARDIFF_DAILY_HEARING_LIST
  - UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST, UT_LANDS_CHAMBER_DAILY_HEARING_LIST, UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST

That is 20 + 51 = 71. All 67 `EMAIL_BUILDER_REGISTRY` entries have a case; none are excluded.

**C. `NO_LINKS`, exactly 0 links, and `SJP_EXCEL_ONLY`, exactly 1 link (3 non-list-type cases)**

| Case | How |
|---|---|
| No files | Flat-file `POST /publication` (multipart `file`, as in `flat-file-ingestion.spec.ts`). `jsonData` is undefined, so no PDF or Excel is generated, and `pdfFilePath` is undefined. Assert no `.pdf`/`.xlsx` in `PUBLICATIONS` and 0 links. |
| Over 2 MB | High-entropy C&F payload (about 4 MB). It is above the 256 KB PDF payload gate, so no PDF is generated; the stored Excel is about 3.1 MB. Assert `.xlsx` is over 2 MB, `.pdf` is absent, and the email has 0 links. |
| Excel only (`SJP_EXCEL_ONLY`) | High-entropy C&F payload of about 430 KB: above the PDF payload gate, so only the Excel (about 330 KB) is generated. Assert the payload is over 256 KB, `.xlsx` is at most 2 MB, `.pdf` is absent, and the email has 1 link. Despite its name, the template has no SJP-specific wording and is selected for any list with an Excel and no PDF. |

**D. Excluded from e2e, with reasons**

| Branch / type | Reason | Covered by |
|---|---|---|
| Exactly 2,097,152 bytes | Not producible end to end (see above). | New unit boundary tests |
| BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST, CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST, HIGH_COURT_CIVIL_DAILY_CAUSE_LIST, HIGH_COURT_FAMILY_DAILY_CAUSE_LIST, MENTAL_HEALTH_TRIBUNAL_HEARING_LIST, PCOL_DAILY_CAUSE_LIST | In `list-type-data.ts` but in neither registry; they always produce `NO_LINKS`. Outside the AC scope. | The flat-file `NO_LINKS` case exercises the same code path |

## 3. Error Handling & Edge Cases

- **Missing API key:** `test.skip(!process.env.GOVUK_NOTIFY_API_KEY, "GOVUK_NOTIFY_API_KEY not set")` at the top of every Notify-verifying test. When the key is present, `Failed` notifications and null `govNotifyId` fail the test.
- **Missing template id in the deployed env:** `getSubscriptionTemplateId` throws, the notification is `Failed`, and the new hard assertion surfaces it. This is intended; it is the gap the soft guards hid.
- **Fallback masking:** while `NO_LINKS`/`NON_SJP_PDF` are unset in helm, cases still pass through the `SUBSCRIPTION`/`SUBSCRIPTION_PDF_ONLY` fallbacks, as long as those Notify templates render the same placeholders. If the legacy `SUBSCRIPTION` template references `((link_to_file))`, the no-links cases will fail with a Notify personalisation error. Treat that as a real finding.
- **Notify read-back latency:** `getGovNotifyEmail` already retries 5 times at 2 s intervals. Keep it.
- **Cross-talk in shared environments:** a unique location per case, and select the notification by `subscriptionId`. List-type subscribers elsewhere in the environment may also get emails for these publications. They are not asserted on, and they are cleaned up by `cleanupTestNotifications(publicationIds)`.
- **Stale Excel on republish:** each case uses a new location, so artefact ids are not reused. The uploaded-Excel generators delete stale `.xlsx` anyway.
- **Fixture drift:** copied fixtures can fall out of date with schema changes. A schema-invalid fixture fails at `POST /publication` with a 400 and a validation message, which is visible and easy to fix.
- **Oversize calibration drift:** if a template or CSS change shrinks the PDF, the hard size precondition fails with the measured size in the message.
- **Puppeteer contention:** concurrent renders on one preview pod may push cases past 120 s. Watch the first CI run before tuning workers or the timeout.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verified by |
|---|---|---|
| `assertEmailDownloadLinks` exists, pattern relocated | Added to `notification-helpers.ts`; the spec imports both | Code review; used by every case |
| Data-driven table; one row plus a builder per list type | `EMAIL_LINK_CASES` in `list-type-email-cases.ts`; the spec loops over it | Adding a row produces a new test with no spec edits |
| All four template branches covered | `PDF_EXCEL` (A), `NON_SJP_PDF` (B), `NO_LINKS` (C, both causes) and `SJP_EXCEL_ONLY` (C, payload over the PDF gate) in e2e, plus unit tests | e2e and unit tests |
| Every `EMAIL_BUILDER_REGISTRY` type has a case or a documented exclusion | All 67 have cases (section 2), 31 of them through the new `PACKAGE_ALIASES` entries; the SJP types are added on top | Optional cheap guard: a unit test in `libs/notifications` cannot see the e2e table, so this relies on review. See CLARIFICATIONS #6 |
| Soft guards converted to `test.skip` | All four (`:436`, `:565`, `:621`, `:674`) replaced; hard `Sent`/`govNotifyId` asserts added | `grep` shows no `GOVUK_NOTIFY_API_KEY &&` left in the spec |
| Playwright forwards six vars; `.env.example` documents six | Shared array in the config; `.env.example` updated. Helm values updated so the PR gate also gets them | Local run with only `.env` set; CI preview |
| Over-2 MB: file generated and stored, zero links | Hard `sizeBytes > MAX` precondition on the stored `.xlsx` via test-support; `.pdf` absent (payload gate); `assertEmailDownloadLinks(id, 0)` | e2e oversize case |
| Boundary pinned; storage and notification agree | Storage comparison deleted, so one predicate (`<=`) remains. Unit tests at `MAX` and `MAX + 1` for PDF and Excel | `notification-service.test.ts`, `template-config.test.ts` |
| `MAX_PDF_SIZE_BYTES` defined once | Replaced by a single `MAX_NOTIFY_ATTACHMENT_SIZE_BYTES` in `template-config.ts` | `grep "2 \* 1024 \* 1024"` in `libs/notifications` and `libs/list-types/common` |
| `exceedsMaxSize`/`pdfExceedsMaxSize` consumed or removed | Removed throughout | `grep -r exceedsMaxSize libs` returns nothing |
| Clean-up via the existing `afterEach` accumulator | Every case pushes user, subscription and publication ids to `testData` | Inspection; `global-teardown` removes the prefixed locations |
| `yarn test:e2e` passes | Plus `yarn test`, `yarn lint` | Local: the spec passes 76/76 and the full `yarn test:e2e` passes 104/0 (30 skips are pre-existing `.skip` blocks). CI timing still to record |

## 5. CLARIFICATIONS NEEDED

1. **Boundary semantics.** Should exactly 2,097,152 bytes get a link (`<=`)? That matches the Notify Node client, which rejects only `> 2MB`, and is my recommendation. Or should it be withheld (`<`, today's notification behaviour)? Notify's docs say "smaller than 2MB", but the client allows exactly 2 MB. Needs confirmation, ideally by a one-off send of an exactly-2 MB buffer from the test key.
2. **"A case pins the 2 MB boundary".** Is a unit-level pin acceptable? An exactly-2 MB file cannot be produced end to end without a test-only seam, such as a configurable size cap or a test-support hook that runs between generation and send. I recommend against adding either to production code.
3. **Notify template UUIDs** for `SJP_EXCEL_ONLY`, `NO_LINKS` and `NON_SJP_PDF`. They are not in any helm values or `.env.example`. Do these templates exist in the Notify service behind `gov-uk-notify-test-api-key`? Without them, the PR gate tests the fallbacks, not the intended templates.
   - **Resolved:** all four subscription template ids were fetched from the Notify API with the local key and match the helm values. `NO_LINKS` and `NON_SJP_PDF` are the existing "No link" and "PDF only" templates. Every placeholder they use is supplied by the code. The e2e run read emails back with the Key Vault test key, so both keys reach the same service. The production key is still to be confirmed.
4. **PR-gate runtime budget.** *Applied:* one row per shared package runs in the PR gate and the other 23 variants are `@nightly`, which leaves 52 untagged tests in the spec. Locally the spec takes 2.8 minutes; record the CI duration from the first run. Original question: about 73 cases adds roughly 6-10 minutes and puts concurrent Puppeteer load on the preview API pod. What added time is acceptable before applying the ticket's representative-per-branch split? A full run per list type is also largely redundant for the 30+ list types that share a generator and extractor (RCJ ×8, SSCS ×7, FTT RPT ×6, UTIAC JR ×5, admin court ×4, and so on).
5. **"All four template branches" vs the real router.** The ticket's table is missing the non-SJP PDF+Excel route and names a nonexistent `..._SJP_PDF_EXCEL` var. Please confirm that `SJP_EXCEL_ONLY`, which is unreachable through a real publication, may be covered by unit tests only.
   - **Superseded:** it is reachable. Any payload over the 256 KB PDF payload gate gets an Excel and no PDF, so it now has an e2e case (section 2, C).
6. **Registry coverage guard.** Do you want an automated check that every `EMAIL_BUILDER_REGISTRY` key has an e2e row? It would mean exporting the registry keys from `@hmcts/notifications` and adding that package as a dependency of `e2e-tests`, which goes against CLAUDE.md's "don't export for testing". The default is review-only.
7. **Fixture duplication.** Copying about 40 `VALID_DATA` fixtures into `e2e-tests/fixtures/list-types/` duplicates them. Is that acceptable, or should each list-type package ship its example payload as a non-test JSON file (`src/fixtures/example.json`) that both the validator test and e2e read? The second option avoids drift but touches 40 packages.
8. **Link pattern.** Please confirm against a real test-key email body that links have the form `/d/<service-id>/<document-id>`, and that each personalisation link appears once in the body, so that exact distinct counts are right rather than "at least".
9. **Helm/apps scope.** Updating `apps/api/helm/*` and `apps/web/helm/values.yaml` is deployment config, not feature code, but it is in `apps/`. Is it OK to include here, or should it be raised separately with platform?

## 6. Changes made after review

- **JSON publishing for 31 regional and court variants.** `validateListTypeJson` resolves `@hmcts/<kebab-name>`, and none of these names matched a package, so `POST /publication` rejected their JSON with "No JSON schema available" even though the packages ship schemas and validators. `PACKAGE_ALIASES` in `libs/list-types/common/src/validation/list-type-validator.ts` now maps each variant to its package (RCJ, administrative court, SSCS, SIAC/POAC/PAAC, FTT RPT and the three Upper Tribunal lists). This changes production behaviour: these list types now accept JSON through `POST /publication` and admin manual upload, so it needs product sign-off. Known differences from the Excel upload path:
  - RCJ and London Administrative Court send a PDF-only email for JSON but PDF and Excel for an Excel upload.
  - The schemas set no minimum row count, so admin manual upload accepts an empty list.
  - The RCJ schema's time pattern is looser than the Excel converter's.
- **Fixtures:** eight new files in `e2e-tests/fixtures/list-types/`, copied from each package's `VALID_DATA`.
- **Test-support location ids (separate commit, not #910 scope).** `POST /test-support/locations` upserted on a random id, so parallel tests that drew the same id overwrote each other's locations. It now creates with a generated id and retries only when the clash is on `location_id`; explicit ids still upsert.
- **Local e2e runs** need `PUPPETEER_EXECUTABLE_PATH` pointing at a working Chromium. In the arm64 devcontainer, `/usr/bin/chromium-browser` is a snap stub; Playwright's `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome` works.
