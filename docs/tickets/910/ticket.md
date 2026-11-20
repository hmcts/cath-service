# #910: Verify GOV.UK Notify email download links end to end for all list types

**State:** OPEN
**Assignees:** 
**Author:** junaidiqbalmoj
**Labels:** enhancement, priority:3-medium, type:story
**Created:** 2026-07-30T15:57:12Z
**Updated:** 2026-09-11T16:20:36Z

## Description

## Problem

We have no systematic end-to-end verification that subscription emails render the correct
GOV.UK Notify document download links. Coverage today is ad hoc: four hand-written blocks
inside `e2e-tests/tests/api/subscription-notifications.spec.ts` cover Civil & Family, SJP
Public and SJP Press, and every other list type registered in the email pipeline has no
email-content assertion at all.

This matters because the download URL is minted at send time by `prepareUpload()`
(`libs/notifications/src/govnotify/govnotify-client.ts:73-88`) and set as
`personalisation.pdf_link_to_file` / `excel_link_to_file`. It is never persisted — the
`notification_audit_log` row records only `govNotifyId`. Fetching the sent notification
back from the Notify API is therefore the **only** way to assert that a link actually
rendered. A regression in `prepareUpload` handling, in PDF/Excel generation, in the
2&nbsp;MB size cap, or in the template-selection logic would ship silently for any list
type not in that ad hoc set.

## Template-selection rules under test

`getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:16`)
routes on three inputs — `isSjp`, which buffers exist, and whether files are under 2&nbsp;MB
— giving four outcomes with distinct expected link counts:

| Case | Template | Expected `documents.service.gov.uk` links |
|---|---|---|
| Non-SJP, PDF, under 2 MB | `..._NON_SJP_PDF` | exactly 1 |
| SJP, PDF + Excel, under 2 MB | `..._SJP_PDF_EXCEL` | at least 2 |
| SJP, Excel only, under 2 MB | `..._SJP_EXCEL_ONLY` | exactly 1 |
| No PDF/Excel, or over 2 MB | `..._NO_LINKS` | exactly 0 |

The expected link count for any list type is derivable from these rules, so the
verification should be data-driven rather than re-written per list type.

## What the 2 MB limit actually is — a link limit, not a generation limit

Worth stating explicitly, because it changes what the over-2 MB case can assert.

Files over 2 MB **are still generated and still stored**. `savePdfToStorage`
(`libs/list-types/common/src/pdf/pdf-utilities.ts:32-42`) uploads the PDF to blob storage
unconditionally and only *flags* the size:

```ts
const exceedsMaxSize = sizeBytes > MAX_PDF_SIZE_BYTES;
await uploadBlob(blobKey, pdfBuffer, "application/pdf", CONTAINER.PUBLICATIONS);
return { success: true, pdfPath: blobKey, sizeBytes, exceedsMaxSize };
```

The cap is applied later, at **send** time, in
`libs/notifications/src/notification/notification-service.ts:512-528`, against the
downloaded buffers:

```ts
const pdfUnder2MB   = hasPdf   && pdfBuffer.length   < MAX_PDF_SIZE_BYTES;
const excelUnder2MB = hasExcel && excelBuffer.length < MAX_PDF_SIZE_BYTES;
const filesUnder2MB = (hasPdf ? pdfUnder2MB : true) && (hasExcel ? excelUnder2MB : true);
```

So for an oversized publication the file **exists and remains downloadable from the
website**; only the email link is withheld and the `NO_LINKS` template is used. The
over-2 MB test case must therefore assert *"the file was generated and stored, and the
email contains zero links"* — not *"no file was generated"*.

## Four defects found while checking the current code

These are in addition to the two below, and are cheap to fix in the same change.

**A. `exceedsMaxSize` is computed and plumbed but never read.**
`pdf-utilities.ts:33` computes it, `publication/src/processing/service.ts:435` passes it on,
and `:635` assigns `result.pdfExceedsMaxSize`. Nothing consumes either. The notification
path independently recomputes the size from the downloaded buffer instead, so the flag is
dead. Either use it in the notification decision (avoiding a re-download-and-measure) or
delete it — but do not leave a size flag that looks authoritative and is ignored.

**B. The 2 MB boundary is inconsistent between the two checks.**
Storage uses `>` (`sizeBytes > MAX_PDF_SIZE_BYTES`), notifications use `<`
(`length < MAX_PDF_SIZE_BYTES`). At exactly 2,097,152 bytes a file is therefore **not
flagged as oversized** by storage yet **not treated as under 2 MB** by the notification
path. The two disagree on precisely one value. Pick one comparison and share it; the
data-driven test should pin the boundary rather than only testing well clear of it.

**C. `MAX_PDF_SIZE_BYTES` is duplicated rather than imported.**
`pdf-utilities.ts:6` exports it; `notification-service.ts:122` declares its own identical
literal instead of importing it. Change one and they silently drift, which would split the
generation and link decisions apart. Import the exported constant.

**D. The limit is named for PDFs but applied to Excel too.**
`MAX_PDF_SIZE_BYTES` gates `excelUnder2MB` as well. Fine behaviourally, misleading by name.

## Existing infrastructure to reuse

The Notify read-back capability already exists and needs no new plumbing:

- `e2e-tests/utils/notification-helpers.ts:99` — `getGovNotifyEmail(notificationId)` wraps
  `NotifyClient.getNotificationById()` and returns `{ body, email_address, status }`
- `e2e-tests/utils/notification-helpers.ts:65` — `waitForNotifications(publicationId,
  maxRetries, delayMs, waitForGovNotifyId, waitForTerminalStatus)`; pass
  `waitForTerminalStatus = true` because `processPublication` is fire-and-forget after the
  API returns 201
- `e2e-tests/tests/api/subscription-notifications.spec.ts:19` —
  `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN = /https:\/\/documents\.service\.gov\.uk\/d\/[A-Za-z0-9_-]+/`
- `createTestUser` / `createTestSubscription` / `cleanupTest*` in the same helper module
- `createUniqueTestLocation` in `e2e-tests/utils/dynamic-test-data.ts`
- Spec-local `generatePublicationDates` (line 33), `waitForPdfGeneration` (line 21),
  `waitForFileGeneration` (line 49)

## Proposed change

**1. Extract a shared, list-type-agnostic assertion helper** into
`e2e-tests/utils/notification-helpers.ts`, e.g.

```ts
export async function assertEmailDownloadLinks(govNotifyId: string, expectedLinkCount: number)
```

which fetches the email via `getGovNotifyEmail` and asserts the number of matches of the
document-link pattern. Move `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` out of the spec and into
the helper module so it has a single home.

**2. Make the notification test data-driven over list types.** Replace the duplicated
per-list-type blocks with a table of cases — list type name, payload builder, expected
generated file extensions, expected link count — and iterate. Adding a new list type then
means adding one row plus a payload builder, not copying 50 lines of assertions.

Each case should assert: recipient equals `CFT_VALID_TEST_ACCOUNT`, body contains the
list type's friendly name / location name / formatted content date, the expected link
count, and `status` matching `/delivered|sending|pending|created|permanent-failure/`.

**3. Cover every list type registered in the email pipeline.** The set is enumerable from
`EMAIL_BUILDER_REGISTRY` (`libs/notifications/src/notification/notification-service.ts`)
and `PDF_GENERATOR_REGISTRY` (`libs/publication/src/processing/service.ts`). Payloads must
satisfy each list type's JSON schema — reuse the fully-hydrated fixtures already proven by
the `src/validation/json-validator.test.ts` files under `libs/list-types/*`, which by
convention satisfy every nested `required` array.

**Run in the PR-gate suite (untagged)**, matching the existing untagged `notification
delivery to single and multiple subscribers` test. Note Puppeteer PDF generation takes
40-60s on a CI cold start and notifications are only sent afterwards, so cases need
`test.setTimeout(120_000)` as that test already does at line 408. If total runtime proves
unacceptable, split so that a representative case per template branch stays in the PR gate
and the long tail moves to `@nightly` — but do not default to `@nightly`.

## Two further defects in the test setup

**1. The existing Notify assertions are soft and pass without verifying anything.**

At `subscription-notifications.spec.ts:449`, `:578`, `:634` and `:687` the assertions sit
inside:

```ts
if (process.env.GOVUK_NOTIFY_API_KEY && sentNotification?.govNotifyId) {
```

With no API key these blocks are skipped and the tests report green having verified no
email at all. Replace with `test.skip(!process.env.GOVUK_NOTIFY_API_KEY, "...")` — the
pattern already used correctly at
`e2e-tests/tests/api/blob-ingestion-notifications.spec.ts:83`.

**2. `playwright.config.ts` does not forward the newer Notify template env vars.**

Lines 45-46 forward only `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` and
`..._SUBSCRIPTION_PDF_ONLY`. The newer `..._SJP_PDF_EXCEL`, `..._SJP_EXCEL_ONLY`,
`..._NO_LINKS` and `..._NON_SJP_PDF` are absent, so `getSubscriptionTemplateId` throws on
the SJP branches when Playwright starts its own dev server. `..._NO_LINKS` and
`..._NON_SJP_PDF` silently fall back to the two that *are* forwarded
(`template-config.ts:4-6`), which masks the gap. Forward all six.

These template ids come from `.env`, not Key Vault — they are not in `SECRET_MAPPINGS` in
`e2e-tests/run-with-credentials.js`. `apps/web/.env.example:66-68` documents **three** of the
six (`..._SUBSCRIPTION`, `..._SUBSCRIPTION_PDF_EXCEL`, `..._SUBSCRIPTION_PDF_ONLY`) and is
missing `..._SJP_EXCEL_ONLY`, `..._NO_LINKS` and `..._NON_SJP_PDF`. It should list all six.

## Acceptance criteria

- [ ] `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)` exists in
      `notification-helpers.ts`, with `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` relocated there
- [ ] The notification test is data-driven over a table of list-type cases; adding a list
      type requires one table row plus a payload builder
- [ ] All four template branches in the table above are covered with their expected link
      counts
- [ ] Every list type in `EMAIL_BUILDER_REGISTRY` has a case, or a documented reason it is
      excluded
- [ ] The four soft `if (process.env.GOVUK_NOTIFY_API_KEY && ...)` guards are converted to
      `test.skip(...)`
- [ ] `playwright.config.ts` forwards all six `GOVUK_NOTIFY_TEMPLATE_ID_*` vars, and
      `apps/web/.env.example` documents all six
- [ ] The over-2 MB case asserts the file **was** generated and stored in blob storage while
      the email contains zero document links — not that generation was skipped
- [ ] A case pins the 2 MB boundary, and the storage and notification comparisons agree on it
- [ ] `MAX_PDF_SIZE_BYTES` is defined once and imported, not duplicated
- [ ] `exceedsMaxSize` / `pdfExceedsMaxSize` is either consumed by the notification decision
      or removed
- [ ] Test data is cleaned up via the existing `afterEach` accumulator
- [ ] `yarn test:e2e` passes



## Comments

No comments on this issue.
