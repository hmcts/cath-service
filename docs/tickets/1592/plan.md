# #1592: Blob Explorer: separate actions to re-submit, send to Courtel, send to third party subscribers and send subscription email

Planned against `origin/master` at `d0790afc`. The local checkout is on `fix/1190-family-dcl-pdf-legal-advisor`, which is 29 commits behind its remote, so branch from an up-to-date `master`.

## 0. Specification

### Wireframes

The reference pages exist and have been checked: `apps/web/src/pages/(system-admin)/blob-explorer-json-file`, `blob-explorer-flat-file`, `blob-explorer-confirm-resubmission` and `blob-explorer-resubmission-success`. The sketches below show only what changes.

**Publication page (JSON file and flat file).** It is today's page. The single button becomes a button group:

```
Blob Explorer – JSON file                              (h1)

[ Re-submit subscription ] [ Send to Courtel ] [ Send to third party subscribers ] [ Send subscription email ]
   primary (green)            secondary          secondary                           secondary

Metadata                                                (h2)
| Artefact ID | ...                                    (summary list, unchanged)
...rest of the page unchanged (and the 1499 "Generated files" block if it has merged)
```

**Confirmation page (one per action).** Only the h1, the page title and the error message change with the action:

```
Confirm send to Courtel                                 (h1, from the ticket's §5.2 table)

┌ There is a problem ─────────────────────────────┐     (only after a failed or empty send)
│ Courtel is not subscribed to this list type,    │
│ so nothing was sent.                            │
└─────────────────────────────────────────────────┘
| Location Name    | ... |                              (table, unchanged)
| Publication Type | ... |
| ... Display To   | ... |

[ Confirm ]
Cancel                                                  (link back to the publication page)
```

**Success page (one per action).** It is today's page. Only the panel heading changes (§5.3 table):

```
┌──────────────────────────────────────┐
│     Publication sent to Courtel      │   (green confirmation panel)
└──────────────────────────────────────┘
What do you want to do next?
Blob explorer – Locations                (link)
```

### Accessibility

- The four actions sit in one `govuk-button-group`. Each is a `govukButton` with an `href`, so it renders as a link with `role="button"` that goes to its confirmation page. Only the first has the primary style. The other three use `govuk-button--secondary`. The order on screen and the tab order follow the AC: Re-submit, Courtel, third party, email.
- Every button label is unique and names its channel. Screen-reader users get the button list out of context, so none of them can be just "Send".
- When a send fails or has no recipients, the confirmation page renders the error summary above the table. Prefix the `<title>` with "Error: " (Welsh "Gwall:", which already exists as `errorLabel` in `libs/web-core/src/views/errors/cy.ts`). The layout's `page-title.njk` does not add the prefix itself. The summary and the Confirm button stay visible, so the admin can retry without starting the journey again.
- The error summary item has no `href` because no form field caused it. That is the existing pattern on these pages.
- The Cancel link goes back to the publication page the admin came from, not to Locations as it does today.

## 1. Technical Approach

### What exists today (verified)

| Concern | Where | State |
|---|---|---|
| Re-submit button | `blob-explorer-json-file/index.ts` and `blob-explorer-flat-file/index.ts`: a POST stores `req.session.resubmissionArtefactId` and redirects to the confirmation page | Session value is written but never read |
| Confirmation page | `blob-explorer-confirm-resubmission/index.ts` POST calls `sendPublicationNotifications(artefactId)` from `@hmcts/system-admin-pages` | **Stub**: `libs/system-admin-pages/src/services/service.ts` only does `console.log`. This is why "the button does not send anything" |
| Audit | `req.auditMetadata = { shouldLog: true, action: BLOB_EXPLORER_RESUBMISSION }`, picked up by `auditLogMiddleware` | Logged only on the success redirect. The failure render is logged by the middleware's `res.send` hook as a generic `BLOB_EXPLORER_CONFIRM_RESUBMISSION` entry saying "Completed successfully", which is wrong |
| Subscription emails | `sendPublicationNotificationsForArtefact` in `libs/publication/src/processing/service.ts`, which calls `@hmcts/notifications`: `sendLocationAndCaseSubscriptionNotifications` and `sendListTypePublicationNotifications` | Can be called per artefact. Returns `{ success, totalSubscriptions, sent, failed, skipped }`, but `totalSubscriptions`/`sent`/`failed` cover only the location and case emails. List-type results are logged and dropped |
| Courtel push | `sendThirdPartyPublications` in `libs/legacy-third-party-fulfilment/src/service.ts` (cert-based, `legacy_third_party_subscription` by `listTypeId`, writes `third_party_push_log`) | Can be called per artefact. Returns `void`. The "no subscribers" and "env not set" cases only log, and the push result goes only to the push log. `isUpdate` changes only the push-log `type` (CREATE/UPDATE). The headers do not carry it |
| Third-party (OAuth) push, #568 | `sendPublicationToThirdParties` in `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts` | **#568 is CLOSED. PR #1215 merged on 2026-11-20.** POSTs new publications and PUTs updates. Returns `void`. Skips publications **outside the display window**. Per-subscriber failures are caught and logged |
| Kill switches, #1494 | Issue is OPEN. No branch or PR. `isFeatureEnabled` exists only in `libs/system-admin-pages/src/feature-flags/launch-darkly.ts` | No channel checks a flag yet |
| Role guard | `requireRole([USER_ROLES.SYSTEM_ADMIN])` on GET and POST of all four pages | Already in place |
| Welsh | Every `cy.ts` on these pages is an English copy | Translations needed (see Clarifications) |

### Strategy

1. **One orchestration function in `@hmcts/publication`**: `resendPublication(artefactId, action)`. It loads the artefact once, then calls the existing channel senders directly. It does **not** go through `processPublication`, so it never regenerates the PDF or Excel files and never deletes them. `@hmcts/publication` already depends on all three channel libs, so there are no new package edges. The stub `sendPublicationNotifications` in `system-admin-pages` is deleted.
2. **The channel senders report an outcome instead of returning `void`.** Each of the three senders returns a small result. Existing fire-and-forget callers ignore it, so they keep working.
   - `ChannelOutcome = "sent" | "no-recipients" | "failed"`.
   - This is a change to #568's code, not a second push. Per Decision 1, #1592 calls the push that #568 delivered.
3. **Parameterise the existing pages with an `action` query value** (`resubmit | courtel | third-party | email`). Do not add three more page directories.
   - The confirmation and success pages pick their heading, title and error copy from a per-action map in `en.ts`/`cy.ts`.
   - An unknown or missing action redirects to `/blob-explorer-locations`, which is how a missing `artefactId` is already handled.
4. **"Re-submit" runs all three channels with `Promise.allSettled`**, so one failing channel does not stop the others (AC "Sending fails").
5. **Manual sends always send.** Per Decisions 2 and 4, they bypass the display window and any kill switch:
   - Add `ignoreDisplayWindow: true` to `sendPublicationToThirdParties`.
   - Courtel is pushed with `isUpdate: false`, which logs as CREATE (Decision 3).
   - #1494 has no code yet, so there is nothing to bypass today. The design keeps future flag checks out of the senders the manual path calls (see §2, "Kill switch coordination").
6. **Audit explicitly, on every attempt.** A helper `recordBlobExplorerResend` writes one entry per confirm with the action, the artefact, the user and the outcome. The handler sets `req.auditMetadata = { shouldLog: false }` so the middleware does not add a misleading duplicate. This is the same pattern as `recordBlobExplorerDownload` in the 1499 branch.
7. **The send runs synchronously in the request.** The outcome decides between the success page and the error message, so it cannot be fire-and-forget. This is a known risk for request time (see §3 and Clarifications).

## 2. Implementation Details

### TEMPLATE SOURCE

> TEMPLATE SOURCE: write fresh — the pages being changed already exist in cath-service (apps/web/src/pages/(system-admin)/blob-explorer-confirm-resubmission, blob-explorer-resubmission-success, blob-explorer-json-file, blob-explorer-flat-file — verify exact paths). The pip-frontend upstream only had the resubmit confirmation/confirmed pages (BlobViewSubscriptionResubmitConfirmationController / ConfirmedController), which are already migrated; the Courtel, third-party and email actions have no upstream equivalent. Extend/parameterise the existing cath-service pages rather than migrating.

The paths are verified. They are exactly as written above, under `apps/web/src/pages/(system-admin)/`.

### Action model: `libs/publication/src/resend/resend-action.ts` (new)

```ts
export const RESEND_ACTIONS = ["resubmit", "courtel", "third-party", "email"] as const;
export type ResendAction = (typeof RESEND_ACTIONS)[number];
export function parseResendAction(value: unknown): ResendAction | null;
```

Export it from `libs/publication/src/index.ts`. The pages use `RESEND_ACTIONS` to render the buttons in order and `parseResendAction` to validate `req.query.action`.

### Orchestration: `libs/publication/src/resend/service.ts` (new)

```ts
export async function resendPublication(artefactId: string, action: ResendAction): Promise<ResendResult>;
type ResendResult =
  | { status: "not-found" }
  | { status: "sent" | "no-recipients" | "failed"; channels: Partial<Record<Channel, ChannelOutcome>> };
```

1. `getArtefactById(artefactId)`. If there is no artefact, return `not-found`.
2. Load the JSON payload once for non-flat files: `getPublicationJson`, the blob in the artefact container. Courtel, third party and email all need it.
3. Run the channels for the action:
   - **email**: `sendPublicationNotificationsForArtefact`. Pass `locale` from `language` (`WELSH` gives `cy`, otherwise `en`, as the ingestion callers do) and `pdfFilePath: \`${artefactId}.pdf\``. `buildEmailDataWithFiles` downloads it and treats a missing blob as "no PDF". The Excel file is already found by artefactId.
   - **courtel**: `sendThirdPartyPublications` with `isUpdate: false`, `maxAttempts: 1` (Clarification 4, decided), metadata from the artefact (`sensitivity`, `language`, `displayFrom`/`displayTo`, `provenance`), and `jsonData`. Pass no `pdfPath` and no `flatFilePath`. See Clarification 5.
   - **third-party**: `sendPublicationToThirdParties({ artefactId, isUpdate: true, jsonData, ignoreDisplayWindow: true })`. `isUpdate: true` makes the existing sender `PUT {destinationUrl}/{artefactId}`, which replaces any copy the subscriber holds (Clarification 3, decided).
   - **resubmit**: all three through `Promise.allSettled`. A rejected promise counts as `failed`.
4. Work out the overall status. For a single channel it is that channel's outcome. For resubmit, any `failed` makes the overall status `failed`. If every channel is `no-recipients`, the status is `no-recipients`. Otherwise it is `sent`. For resubmit, `failed` and `no-recipients` both show the generic re-submit error, which does not name a channel (Clarification 1, decided). Within one channel, the channel is `sent` if at least one delivery succeeded (Clarification 2, decided).

Co-locate a `service.test.ts` with it.

### Channel changes (return outcomes, no change to the automatic path)

| File | Change |
|---|---|
| `libs/publication/src/processing/service.ts`, `sendPublicationNotificationsForArtefact` | Add the list-type result to the returned counts (`totalSubscriptions`, `sent`, `failed`, `skipped`), so "no one is subscribed" covers location, case **and** list-type subscribers. `processPublication` only reads `sent`/`failed`, which stays compatible. Mapping: `success: false` gives `failed`. A total of 0 gives `no-recipients`. `sent === 0 && failed > 0` gives `failed`. Anything else gives `sent` |
| `libs/legacy-third-party-fulfilment/src/service.ts`, `sendThirdPartyPublications` | Return a `ThirdPartyPushOutcome` of `"sent" \| "no-recipients" \| "failed"`. Missing `COURTEL_API_URL`/`COURTEL_CERTIFICATE` gives `failed`. No `legacy_third_party_subscription` row for the list type gives `no-recipients`. Otherwise the result comes from `pushWithRetry`'s `success`. Export the type from `index.ts`. `processPublication` and the delete flows ignore the value |
| `libs/third-party-subscription-fulfilment/src/fulfilment/service.ts`, `sendPublicationToThirdParties` | Add an optional `ignoreDisplayWindow?: boolean`, default `false`, so automatic behaviour does not change. Return `"sent" \| "no-recipients" \| "failed"`. Artefact not found gives `failed`. `findSubscribers` returning an empty list gives `no-recipients`. A missing content part (flat file or JSON missing) gives `failed`. For delivery, `deliverToSubscriber` returns a boolean, and at least one delivered gives `sent` while zero delivered gives `failed`. Export the type |

### Kill switch coordination (#1494)

#1494 has not been built. To meet Decision 2 without blocking on it:

- Keep the senders free of flag checks. #1494 should put its checks in `processPublication`, the automatic path, just before each `send*` call. Its "where the checks go" bullet says "each sending point checks its flag just before it sends", and `processPublication` is that point for automatic sends.
- If #1494 puts the checks inside the senders instead, it must add a `bypassKillSwitch` option. `resendPublication` would pass `true`, and the manual send would be audited as manual rather than "suppressed by flag".
- Whichever ticket merges second owns this wiring. Record it on #1494 as a note (Clarification 6).

### Pages (`apps/web/src/pages/(system-admin)/`)

**`blob-explorer-json-file/` and `blob-explorer-flat-file/`**

- `index.njk`: replace the `<form>` button with a `govuk-button-group` of four `govukButton({ href })`. Each href is `/blob-explorer-confirm-resubmission?artefactId=<enc>&action=<action>` plus `&lng=cy` when Welsh. The first button is primary and the rest are `govuk-button--secondary`.
- `index.ts`:
  - Build the four `{ text, href }` items in the controller, in `RESEND_ACTIONS` order, and pass them flat.
  - **Remove the POST handler.** Its only job was the redirect, and the session key it wrote was never read.
  - Remove `resubmissionArtefactId` from `libs/system-admin-pages/src/types/session.ts` and the `delete` in the confirmation page.
- `en.ts`/`cy.ts`: replace `jsonFileResubmitButton`/`flatFileResubmitButton` with `resubmitButton`, `sendToCourtelButton`, `sendToThirdPartyButton` and `sendSubscriptionEmailButton`.

**`blob-explorer-confirm-resubmission/`**

- `en.ts`/`cy.ts`:
  - Keep the shared summary labels.
  - Add `actions: { resubmit | courtel | third-party | email: { title, header, error, noRecipientsError? } }` with the ticket's §5.2 copy verbatim. `resubmit` has no no-recipients message.
  - Add `errorTitlePrefix` ("Error:" / "Gwall:").
- `index.ts`:
  - GET and POST: validate `artefactId` and `action`, otherwise redirect to `/blob-explorer-locations`. Load `getArtefactMetadata`.
  - Pass flat `title`, `header` and `error` for the action, `metadata`, and `cancelHref`. `cancelHref` is the json or flat-file page, worked out from `metadata.publicationType`/`getArtefactType`, with `lng` kept.
  - POST: call `resendPublication`, then `recordBlobExplorerResend(req.user, artefactId, action, result.status)`, and set `req.auditMetadata = { shouldLog: false }`.
    - `sent` redirects to `/blob-explorer-resubmission-success?action=<action>` with `lng` kept. Today the redirect drops it.
    - `no-recipients` re-renders with `noRecipientsError`.
    - `failed` and `not-found` re-render with `error`. For `not-found` that is the existing "We could not re-submit this publication. Try again later.", as the Validation bullet says.
    - A thrown error re-renders with `error`.
    - Re-renders include the metadata, so the table and Confirm stay. The title gets the error prefix.
- `index.njk`:
  - Show the error summary **above** the table instead of instead of it.
  - Render the table and Confirm only when `metadata` exists.
  - Cancel uses `cancelHref`, falling back to `/blob-explorer-locations` when there is no metadata.

**`blob-explorer-resubmission-success/`**

- `index.ts`: validate `action` and redirect to Locations if it is not valid. Render that action's `header`/`title`.
- `en.ts`/`cy.ts`: add `actions.<action>.header` with the §5.3 copy. Keep `successNextSteps` and `successLinkToLocations`.
- `successBanner` currently repeats the heading as body text ("Submission re-submitted."). Drop it, so the panel shows only the heading as §5.3 specifies.

### Audit: `libs/system-admin-pages/src/audit-log/`

- `logger.ts`: keep `BLOB_EXPLORER_RESUBMISSION` and add these to `AuditLogAction`:
  - `BLOB_EXPLORER_SEND_TO_COURTEL = "Blob explorer send to Courtel"`
  - `BLOB_EXPLORER_SEND_TO_THIRD_PARTY = "Blob explorer send to third party subscribers"`
  - `BLOB_EXPLORER_SEND_SUBSCRIPTION_EMAIL = "Blob explorer send subscription email"`
- `blob-explorer-resend.ts` (new): `recordBlobExplorerResend(user, artefactId, action, status)` calls `logAction`.
  - It uses the same normalised action name the middleware uses (for example `BLOB_EXPLORER_SEND_TO_COURTEL`).
  - Details are `Artefact ID: <id>; Status: Completed successfully | No recipients | Failed`. For resubmit, add the per-channel outcomes.
  - A failure to write the audit entry is logged and does not hide the send result from the admin.
- Export it from `libs/system-admin-pages/src/index.ts`.
- `services/service.ts`: delete the stub and its test, and remove `export * from "./services/service.js"` from `index.ts`.

### API endpoints and database

There are no new endpoints. There are no schema changes: the `audit_log`, `notification_audit_log` and `third_party_push_log` tables already record everything this story needs.

### Overlap with the 1499 worktree (`.claude/worktrees/1499-blob-explorer-downloads`, PR #1590, open)

`feature/1499-blob-explorer-downloads` changes the same files:

- `blob-explorer-json-file/index.ts`, where it adds `getGeneratedFileAvailability` and the download URLs
- `index.njk`, where it adds a "Generated files" block after Metadata
- `en.ts`/`cy.ts`, where it adds five keys
- `libs/system-admin-pages/src/audit-log/logger.ts`, the next line in the enum (`BLOB_EXPLORER_DOWNLOAD`)
- `libs/system-admin-pages/src/index.ts`
- `e2e-tests/tests/system-admin/blob-explorer.spec.ts`, which gains a beforeAll wait, download steps and Welsh axe scans in the same test

The changes do not conflict in what they do, but they will conflict in text. **Rebase #1592 onto #1590 after it merges**, or branch from it. Reuse its `recordBlobExplorerDownload` pattern and its normalised action name. 1499 leaves the POST handler in `blob-explorer-json-file/index.ts`, and this story removes it, so resolve that hunk in favour of this story.

## 3. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Missing `artefactId` or `action`, or an unknown `action` on the confirmation or success page | Redirect to `/blob-explorer-locations` |
| Artefact deleted between viewing and confirming | `not-found`: "We could not re-submit this publication. Try again later." (the Validation bullet). No table and no Confirm. Cancel goes to Locations. Audited as Failed |
| Courtel not subscribed to the list type | `no-recipients`: the Courtel no-recipients message. Nothing is pushed or written to the push log |
| `COURTEL_API_URL`/`COURTEL_CERTIFICATE` not set in the environment | `failed`: "We could not send this publication to Courtel. Try again later." |
| Courtel returns a 4xx, or a 5xx after 3 attempts | `failed`. A FAILED row goes to `third_party_push_log` |
| No ACTIVE third-party subscriber at a matching sensitivity | `no-recipients`. Inactive subscribers are skipped, as the #568 behaviour does |
| Third-party subscriber has no destination URL, or every delivery fails | `failed`. If at least one delivery succeeds the outcome is `sent` (Clarification 2) |
| No location, case or list-type email subscribers | `no-recipients`: "No one is subscribed to this publication, so no emails were sent." |
| Flat file missing from blob storage | email `failed` (the existing behaviour) and third-party `failed` |
| JSON blob missing for a JSON publication | email still sends, with no case summary. Third party `failed`. Courtel pushes an empty body. Log a warning |
| Publication outside its display window (expired or future) | All channels still send (Decision 4). Third party uses `ignoreDisplayWindow: true`. The email and Courtel paths have no window check |
| Kill-switch flag off (once #1494 lands) | Manual sends ignore it (Decision 2) |
| Email rate limit (`@hmcts/email-rate-limit` in `govuk-notify`) reached for a subscriber | That email counts as failed. A resend soon after the original can hit the limit for heavy subscribers. Treat this as a partial failure: the channel is still `sent` if any delivery succeeded (Clarification 2, decided) |
| Re-submit with one channel failing | The other channels still complete (`allSettled`). The page shows the re-submit error, and the audit entry records each channel's outcome |
| Admin double-clicks Confirm | govuk-frontend's `preventDoubleClick` on the Confirm button. Duplicates from a deliberate repeat are expected (Decision 5) |
| A large subscriber list or a slow Courtel makes the request exceed the gateway timeout | Known risk. The worst case for Courtel is about 3×30 s plus 3 s of backoff. Clarification 4 |
| Audit write fails | Log it and continue. The admin still sees the true send outcome |
| Welsh `lng=cy` | Kept on every button href, the Cancel link and both redirects |

## 4. Acceptance Criteria Mapping

| AC | How it is met | Verified by |
|---|---|---|
| Four actions shown, in order, primary then secondary | Button group built from `RESEND_ACTIONS` on both publication pages | `index.njk.test.ts` for json and flat file: order, classes, hrefs. E2E |
| Re-submit sends to every channel and shows the re-submit success page | `resendPublication(..., "resubmit")` runs all three channels | `resend/service.test.ts`, confirmation `index.test.ts` |
| Send to Courtel sends to Courtel only | Only `sendThirdPartyPublications` is called, with `isUpdate: false` | `resend/service.test.ts` asserts the other two are not called |
| Send to third party sends to third party only | Only `sendPublicationToThirdParties` with `ignoreDisplayWindow` is called. Sensitivity matching is #568's `findSubscribers` | `resend/service.test.ts`, fulfilment `service.test.ts` |
| Send subscription email sends emails only | Only `sendPublicationNotificationsForArtefact` is called | `resend/service.test.ts` |
| Cancel returns to the publication page and sends nothing | `cancelHref` points to the json or flat-file page. Cancel is a GET link, so nothing is sent | Confirmation `index.test.ts`, E2E |
| No recipients shows the action's message on the confirmation page | `no-recipients` status re-renders with `noRecipientsError` | Unit tests, and E2E for the email action on a fresh court |
| Sending fails: stay on the page with the error, other channels unaffected | `failed` re-renders with `error`. `allSettled` for re-submit | `resend/service.test.ts` (one channel rejects, the others are called), confirmation `index.test.ts` |
| Every action is audited with the action, the artefact and the user | `recordBlobExplorerResend` on every POST outcome | `blob-explorer-resend.test.ts`, confirmation `index.test.ts` |
| Only System Admins | Existing `requireRole([SYSTEM_ADMIN])` on GET and POST of the confirmation and success pages | Unit test that `GET`/`POST` arrays start with the role guard. Covered by the existing role e2e patterns |
| Welsh | Every new string in `cy.ts`, and `lng` kept throughout | `index.njk.test.ts` with the `cy` locale. E2E Welsh step with axe |

## 5. Test Scenarios

This follows CLAUDE.md and `.claude/rules/testing.md`: one scenario per journey, with the error paths inside the journey they belong to.

1. **Resend orchestration** (`libs/publication/src/resend/service.test.ts`). For each action, only that action's channels are called. Courtel gets `isUpdate: false`. Third party gets `isUpdate: true` (PUT) and `ignoreDisplayWindow: true`. Re-submit with one channel rejecting still calls the other two and returns `failed`. A missing artefact returns `not-found`. All channels empty returns `no-recipients`. An expired publication still sends.
2. **Channel outcomes**:
   - `legacy-third-party-fulfilment/src/service.test.ts`: env not set gives `failed`, no subscribers gives `no-recipients`, and push success or failure gives `sent` or `failed`.
   - `third-party-subscription-fulfilment/.../service.test.ts`: `ignoreDisplayWindow` sends outside the window while the default still skips, and the no-subscriber, all-failed and some-delivered outcomes.
   - `processing/service.test.ts`: list-type counts are included in the totals.
3. **Confirmation page journey** (`blob-explorer-confirm-resubmission/index.test.ts`):
   - GET renders the action's heading and the right Cancel href, and redirects on an unknown action.
   - POST `sent` redirects to success with `action` and `lng`.
   - POST `no-recipients` and `failed` re-render with the right message and the metadata.
   - POST `not-found` shows the Validation message.
   - Each POST writes one audit entry and sets `shouldLog: false`.
4. **Templates** (`*.njk.test.ts` for json-file, flat-file, confirm and success): the four buttons in order with the right classes and hrefs, the error summary above the table with Confirm still present, the success panel heading for each action, and Welsh rendering.
5. **Audit helper** (`blob-explorer-resend.test.ts`): action name, details for each status, and that a write failure is logged.
6. **E2E** (extend `e2e-tests/tests/system-admin/blob-explorer.spec.ts`, as one journey). On the JSON file page:
   - Assert the four buttons in order.
   - Open "Send to Courtel" and assert its heading, then Cancel and assert the publication page.
   - Open "Send subscription email" and Confirm on the test's own fresh court. Assert the no-recipients message, so no real email is sent.
   - Switch to Welsh and assert the buttons and the heading. Run axe on the publication page and the confirmation page with the error shown.

   The success path is not run end to end because it would send to real channels. It is covered by scenarios 1 and 3. Check during implementation that the e2e list type has no list-type email subscribers in that environment. If it does, use a list type that has none.

## 6. Open Questions

The questions are listed under CLARIFICATIONS NEEDED below.

## CLARIFICATIONS NEEDED

1. ~~**Re-submit outcome when channels disagree.**~~ **Decided 2026-11-24: keep the generic message.** If any channel fails during Re-submit, show "We could not re-submit this publication. Try again later." and stay on the confirmation page. The message does not name the failed channel. The audit entry records each channel's outcome. If every channel has no recipients, Re-submit shows the same generic message.
2. ~~**Partial failure within one channel.**~~ **Decided 2026-11-24: sent if at least one delivery succeeded.** Some emails send and some fail (including rate-limited addresses), or one of several third-party subscribers fails. The channel counts as `sent` and the admin sees the success page. The audit entry records the sent and failed counts. A channel is `failed` only when every delivery fails. Retrying only the failed recipients is out of scope.
3. ~~**Third-party resend: POST or PUT.**~~ **Decided 2026-11-24: PUT.** The third-party resend calls `sendPublicationToThirdParties` with `isUpdate: true`, which sends `PUT {destinationUrl}/{artefactId}` and replaces the copy a subscriber already holds, so there is no duplicate. Courtel still gets a new publication (Decision 3). This matches normal processing: a superseding upload keeps the artefact ID and already PUTs to third parties (`createArtefact` returns `isUpdate: true`). **Deferred:** a subscriber that never received the original (its first POST failed) may reject the PUT, which would show as a failed delivery. No POST fallback in this story.
4. ~~**Request time.**~~ **Decided 2026-11-24: cap Courtel retries for manual sends.** Today `pushWithRetry` makes 3 attempts with a 30 s request timeout and 1 s/2 s backoff (`libs/legacy-third-party-fulfilment/src/push/retry.ts`, `http-client.ts`), so up to about 93 s. Add an optional `maxAttempts` to `sendThirdPartyPublications`, passed through to `pushWithRetry` (default 3, unchanged for automatic processing). The resend passes `maxAttempts: 1`, so a manual Courtel send takes at most about 30 s. A failed attempt shows the Courtel error and the admin can press Confirm again.
5. ~~**Courtel attachments look broken on master.**~~ **Decided 2026-11-25: no change in this story, and no new bug.** It is Courtel only: the third-party and email channels already load flat files from blob storage. Open PR #1306 already fixes it: it downloads the PDF and flat file from blob storage, and fails the push instead of sending it empty. It does this through a new `loadFiles` callback on `sendThirdPartyPublications`, which replaces `pdfPath`/`flatFilePath`. Until #1306 merges, the resend behaves like automatic publishing: flat files go to Courtel with an empty body. **When #1306 merges, #1592 must:** (a) resolve conflicts in `libs/legacy-third-party-fulfilment/src/service.ts` and `push/retry.ts`. #1306 also adds a `ThirdPartyPushOutcome` type, `"sent" | "failed" | "skipped"`, and its `skipped` covers both missing secrets and no subscribers, which #1592 reports separately (`failed` and `no-recipients`). Keep both #1592 outcomes and the `maxAttempts` option. (b) Pass `loadFiles` from `resendPublication`, using the same loader `processPublication` uses after #1306, or the resend will still send no files.
6. **Kill-switch placement (#1494).** Can we agree that #1494 puts its flag checks in `processPublication` (the automatic path) rather than inside the senders? If it must be the senders, it needs a bypass option that this story passes. Who adds the note to #1494?
7. ~~**Welsh copy.**~~ **Decided 2026-11-24: placeholders for now.** Every new string goes into the `cy.ts` files as `[WELSH TRANSLATION REQUIRED: '...']` (the `CLAUDE.md` convention) until translations arrive. Existing English-only strings on these pages are not translated in this story. The AC "Welsh" stays partially met until the translations land.
8. **Ticket background is out of date.** It says the #568 third-party push "has not been built yet". #568 closed on 2026-11-20 (PR #1215), so "Send to third party subscribers" is not blocked. Update the ticket's dependency note.
9. **Merge order with #1499 (PR #1590).** Both change the JSON file page, the audit enum, the system-admin-pages index and the same e2e test. Can we confirm #1590 merges first and #1592 rebases onto it?
