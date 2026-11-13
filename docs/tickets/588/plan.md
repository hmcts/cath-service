# Technical Plan: #588 Add bespoke logic for publication subscription triggers

## 1. Technical Approach

### What exists on this branch

This branch is stacked on `feature/1272-cron-subscription-triggers` (PR #1306). That work adds two crons, which decide what is due as follows (`libs/publication/src/subscription-schedule/queries.ts`):

| Cron | Selects | Sends |
|---|---|---|
| `display-from-subscriptions` (`0 1 * * *` UTC) | `displayFrom` in `[londonDay.start, londonDay.end)`, `displayTo` null or `> now`, `lastReceivedDate < londonDay.start`, `listType.name` **not in** `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES` (`queries.ts:16-29`) | Email |
| `scheduled-list-type-subscriptions` (`30 10 * * *` UTC) | `listType.name` **in** the scheduled names, `contentDate` = London today, `displayTo` null or `> now`; no `displayFrom` check (`queries.ts:31-42`) | Email |

Both are email only as of `17892728`. 1272 left third-party (Courtel) push out of scope (`docs/tickets/1272/plan.md:22`). **Decided 2026-11-09:** PR #1306 will be updated, before #588 is implemented, so the display-from cron also pushes to third parties (see Clarifications Q4). #588 depends on that update.

### Upload-time triggers

Every upload path funnels into one function, `processPublication` (`libs/publication/src/processing/service.ts:801`). It always does two things:

- **Email**: `sendPublicationNotificationsForArtefact`, unless `skipNotifications` is set (`service.ts:887-903`).
- **Third-party (API subscriber) push**: `sendThirdPartyPublications` from `@hmcts/legacy-third-party-fulfilment`, fire-and-forget, unless `skipThirdPartyPush` is set (`service.ts:905-925`). It looks up `legacyThirdPartySubscription` rows by list type and pushes to Courtel (`libs/legacy-third-party-fulfilment/src/service.ts:47-87`).

No caller sets either skip flag. The callers are:

| Caller | Call |
|---|---|
| Manual upload (JSON or flat file) | `apps/web/src/pages/(admin)/manual-upload-summary/index.ts:135` |
| Non-strategic (Excel) upload | `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts:168` |
| `POST /v1/publication` JSON (`apps/api/src/routes/v1/publication.ts` -> `processBlobIngestion`) | `libs/api/src/blob-ingestion/repository/service.ts:51` -> `fireAndForgetPublication` -> `processPublication` at `:166` |
| `POST /v1/publication` flat file (`processFlatFileBlobIngestion`) | `libs/api/src/blob-ingestion/repository/service.ts:86` -> `:166` |

No-match uploads are already excluded, but only on the API path (`service.ts:50-54,85-87`). Manual uploads always pick a real location.

`sendPublicationNotifications` in `libs/system-admin-pages/src/services/service.ts:1`, called from blob-explorer resubmission (`apps/web/src/pages/(system-admin)/blob-explorer-confirm-resubmission/index.ts:56`), is a mock that only logs. It is not an upload trigger, and this ticket leaves it alone.

**API subscriber triggering exists on this branch.** It is the `sendThirdPartyPublications` call at `service.ts:906`, so the ticket's rules apply to it too. Two existing defects in it are being fixed in the PR #1306 update, not here (Clarifications Q5):
- `apps/api/helm/values.yaml` has no Courtel secrets, and only `apps/web` has them (`apps/web/helm/values.yaml:82-86`). `resolveCourtelSecrets` returns null when they are missing (`legacy-third-party-fulfilment/src/service.ts:31-45`), so in deployed environments the push from the API path currently logs "COURTEL_API_URL is not set" and sends nothing.
- `executePush` reads `pdfPath` with `fs.readFile` (`push/http-client.ts:22`), but `processPublication` passes the PDF's blob key (`libs/list-types/common/src/pdf/pdf-utilities.ts:34-40`).

**OAuth third-party push (PR #1215, #568).** Approved and mergeable, not yet on this branch. It adds `sendPublicationToThirdParties` to `processPublication` and applies its own display-window check before sending (`docs/tickets/568/plan.md:66,213` on that branch), date-based like legacy. #588 does not need to gate it. If #1215 merges first, rebase onto it.

### Strategy

1. **Put one pure decision function in the 1272 domain folder**: `libs/publication/src/subscription-schedule/upload-decision.ts`. It is built from the same helpers the crons use, so the upload path and the crons cannot drift apart:
   - `getLondonDay(now)` (`london-day.ts`) gives London "today". "Displayable today or earlier" means `displayFrom < londonDay.end`. That is the complement of the display-from cron's `displayFrom >= londonDay.start` window for future days.
   - `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES` (`scheduled-list-types.ts`), derived from `isScheduledSubscription` in `libs/list-types/common/src/list-type-data.ts:11,723,744`. Matching is by `listType.name`, never by numeric id.
   - Expiry is by London date, as the ticket says (Clarifications Q3): expired when `displayTo < londonDay.start`, so a display-to of today still notifies. This is legacy's upload rule and #1215's. It differs from the crons' and the public site's instant-based `displayTo > now` (see section 3).
2. **Gate both channels inside `processPublication`** with that decision, so all four callers are covered at once. No caller changes.
3. **Rely on the display-from cron for deferred third-party pushes.** The upload path now holds back future-dated pushes. The PR #1306 update adds a third-party pass to the display-from cron for artefacts whose `displayFrom` falls on London today and that were received before today. That work is not part of #588.

### Rules per channel

| Rule | Email at upload | Third-party push at upload | Who sends instead |
|---|---|---|---|
| `displayFrom` on a London date after today | skip | skip | display-from cron, on that London date (email: non-scheduled types; third-party: all types, once PR #1306 is updated) |
| `displayTo` not null and on a London day before today (expired) | skip | skip | nobody (expired) |
| list type in `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES` | skip | **send** (if the display rules pass) | scheduled-list-type cron (email only) |
| otherwise (`displayFrom` null or not after London today, not expired, not scheduled) | send | send | — |

Checks run in the order shown. The first rule that matches gives the logged reason.

**Why the scheduled rule does not apply to third-party push** (decided, Clarifications Q1): the scheduled-list-type cron is email only, the same as legacy's scheduled branch. Legacy's display-from branch sends scheduled list types to API subscribers only (`docs/tickets/1272/plan.md:50-51`). If upload skipped the third-party push for scheduled list types, no cron would ever push them. So they follow the display-window rules: pushed at upload when displayable now, and by the display-from cron when deferred.

### Why the two sides stay consistent (no double or missed send)

Each case below lists what the upload path does, then what the cron does on London day D.

| Case (upload on London day U, publication's `displayFrom` on London day D) | Upload path | Display-from cron on day D |
|---|---|---|
| D > U | skip | `lastReceivedDate` (day U) `< start(D)`, so it sends. Sent once. |
| D = U | send | `lastReceivedDate` (day U) `>= start(D)`, so it skips. Sent once. |
| D < U, or `displayFrom` null | send | not selected (the date is not today). Sent once. |
| Supersede on day S >= D | send | `lastReceivedDate` = S, so it skips. Sent once per upload, as today. |
| Supersede on day S < D | skip | sends on D. Sent once. |

This only holds because both sides use the **London** day. A UTC "today" would break it between 23:00Z and 00:00Z in BST.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### File structure

```
libs/publication/src/subscription-schedule/
├── upload-decision.ts            # NEW: getUploadSubscriptionDecision (pure)
└── upload-decision.test.ts       # NEW
libs/publication/src/processing/
├── service.ts                    # MODIFY: processPublication applies the decision
└── service.test.ts               # MODIFY
e2e-tests/tests/api/subscription-notifications.spec.ts   # MODIFY: displayable dates; new deferral journey
e2e-tests/tests/api/blob-ingestion-notifications.spec.ts # MODIFY: replace expired 2024 dates
```

There are no new modules, no routes, no pages, no DB schema changes and no migration. `getUploadSubscriptionDecision` is internal to `@hmcts/publication`, so `index.ts` does not change.

### `upload-decision.ts`

```typescript
import { getLondonDay } from "./london-day.js";
import { SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES } from "./scheduled-list-types.js";

export function getUploadSubscriptionDecision(publication: UploadedPublication, now: Date): UploadSubscriptionDecision
// const { start, end } = getLondonDay(now)
// if (publication.displayFrom && publication.displayFrom >= end)  -> { notifyEmail: false, pushThirdParty: false, reason: "FUTURE_DISPLAY_FROM" }
// if (publication.displayTo && publication.displayTo < start)     -> { notifyEmail: false, pushThirdParty: false, reason: "EXPIRED" }
// if (SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES.includes(publication.listTypeName)) -> { notifyEmail: false, pushThirdParty: true, reason: "SCHEDULED_LIST_TYPE" }
// otherwise                                                        -> { notifyEmail: true, pushThirdParty: true }

interface UploadedPublication { displayFrom?: Date | null; displayTo?: Date | null; listTypeName: string }
export interface UploadSubscriptionDecision { notifyEmail: boolean; pushThirdParty: boolean; reason?: UploadSkipReason }
type UploadSkipReason = "FUTURE_DISPLAY_FROM" | "EXPIRED" | "LIST_TYPE_UNKNOWN" | "SCHEDULED_LIST_TYPE";
```

### `processPublication` changes (`processing/service.ts:801`)

- Capture `const decisionTime = new Date()` as the **first** statement, before PDF and Excel generation. Background PDF rendering can take seconds, and the decision must be made against a time as close as possible to the `lastReceivedDate` that `createArtefact` just wrote. Otherwise an upload at 23:59:59 London could pass midnight during rendering, be notified at upload, and then be selected by the cron as well.
- Resolve `listTypeName` once:
  - Reuse the name already found by the PDF step (`pdfResult.listTypeName`) or the large-payload branch (`service.ts:861-862`).
  - Otherwise run a single `prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } })`. That covers flat files and missing `jsonData`, where neither branch runs.
  - Pull this into a small local `resolveListTypeName(listTypeId, known)` helper.
- `const decision = getUploadSubscriptionDecision({ displayFrom, displayTo, listTypeName }, decisionTime)`.
- Email block: `if (!skipNotifications && decision.notifyEmail)`.
- Third-party block: `if (!skipThirdPartyPush && decision.pushThirdParty)`.
- When a channel is skipped, log `console.info(`${logPrefix} Subscription notifications not sent at upload:`, { artefactId, listTypeName, reason, email: decision.notifyEmail, thirdParty: decision.pushThirdParty })`. Log no payloads and no emails.
- PDF and Excel generation, artefact search and the delete-on-update step are unchanged. Deferred publications still need their files when the cron runs.

### Moved to PR #1306 (decided 2026-11-09)

These were in the first draft of this plan and now belong to the PR #1306 update:
- A third-party pass in the display-from cron (`triggerDisplayFromSubscriptions`), so deferred publications reach Courtel on their display-from day. Legacy's display-from branch sends to all subscribers (`docs/tickets/1272/plan.md:51`). Once #1215 merges, the same pass should call the OAuth push.
- Courtel Key Vault secrets for `apps/crons/helm/values.yaml` and `apps/api/helm/values.yaml`.
- The `pdfPath` blob-key versus local-file defect in `legacy-third-party-fulfilment`.

### Release dependency

**#588 must not go live before the updated 1272 CronJobs are deployed (hmcts/cnp-flux-config#48744).** Otherwise future-dated publications and scheduled-list-type publications would never be notified, by email or to third parties. `docs/tickets/1272/review.md:19` records the same dependency from the other side, so the two go out together. Rules:
- Merge order: PR #1306 (1272, including the third-party update), then cnp-flux-config#48744 deployed to each environment, then #588.
- The #588 PR description must state this, and the PR must stay draft until #48744 is live in prod.
- 1272 accepted the "scheduled list type uploaded after the 10:30 run" gap only because the upload path still emailed it (`docs/tickets/1272/plan.md:235`). #588 removes that safety net, and the gap is accepted (Clarifications Q2).

## 3. Error Handling & Edge Cases

- **London midnight boundary**: `displayFrom === londonDay.end` counts as future (strict `<`). That matches the cron's `lt: day.end`.
- **Manual-upload dates** are stored at UTC midnight (`libs/web-core/src/utils/date-utils.ts:34`).
  - In GMT, "tomorrow" is exactly `end`, so it is deferred. In BST, "tomorrow" 00:00Z is 01:00 London tomorrow, so it is deferred.
  - "Today" 00:00Z is always inside today's London day, so it is sent.
- **Upload between 23:00Z and 00:00Z in BST**: London "today" is already the next UTC date. `getLondonDay` handles this. Unit-test both sides.
- **Clock-change days** (23-hour and 25-hour days): handled by luxon in `getLondonDay`, which 1272 already tests.
- **`displayFrom` later today** (for example 14:00): sent at upload, before it is publicly visible. This matches the ticket's "today or earlier" and the cron's date-based selection.
- **Missing `displayFrom`**: treated as displayable now. API headers are optional (`display-window.ts:1-5`).
- **Missing `displayTo`**: never expires, so it is sent.
- **`displayTo` on a London day before today**: expired, so it is skipped on both channels (`displayTo < londonDay.start`).
  - A manual upload with `displayTo` = today is stored as 00:00Z today, which is inside today's London day in both GMT and BST. So it is not expired and is notified, as in legacy and #1215, even though the public site hides it from that instant (Q3).
  - `displayTo` exactly `londonDay.start` is today, so it notifies. `displayTo` one millisecond earlier is yesterday, so it is expired.
- **Upload and cron disagree on expiry for one shape, as in legacy**: a future-dated publication whose `displayTo` is the start of its own display-from day. Upload defers it as future, and on that day the display-from cron excludes it because `displayTo > now` is already false at 01:00 UTC. So it is never notified. Legacy behaves the same way (date-based upload, instant-based cron). Accepted.
- **Midnight race**: the decision uses `decisionTime`, captured at the start of `processPublication`. There is still a gap of a few milliseconds after `lastReceivedDate` is written. Accepted: the worst case is one duplicate email at exactly midnight.
- **Re-upload / supersede**: `createArtefact` resets `lastReceivedDate` (`repository/queries.ts:59`). The decision uses the new `displayFrom`/`displayTo`. See the consistency table in section 1. A supersede that moves `displayFrom` from today to tomorrow, after the cron already sent it today, is sent again tomorrow. That is normal supersede behaviour.
- **No-match uploads**: the API path already excludes them before `processPublication`.
- **List type name lookup fails**, because of a DB error or a missing row:
  - Catch the error, log `{ artefactId, listTypeId, error }`, and skip email for this upload. The email send itself needs the same DB, so it would fail anyway.
  - The third-party decision does not depend on the name, so it still follows the display rules.
  - Neither a lookup failure nor a skip changes the upload outcome. `processPublication` is fire-and-forget for every caller.
- **Scheduled list type uploaded after the 10:30 UTC run on its content date, or with a past content date**: never emailed. Legacy has the same gap. This is a new exposure now that upload does not email; accepted (Q2).
- **`skipNotifications` / `skipThirdPartyPush`**: still respected, and they override the decision.

## 4. Acceptance Criteria Mapping

| Ticket rule | How it is satisfied | Verified by |
|---|---|---|
| Do not trigger if `displayFrom` is tomorrow onwards; notify if displayable today or earlier; future-dated handled by the cron | `FUTURE_DISPLAY_FROM` in `getUploadSubscriptionDecision` using `getLondonDay(now).end`, applied to both channels in `processPublication`. The display-from cron sends email and third-party push (PR #1306). | Scenarios 1, 2, 4 |
| Skip if already expired ("the displayedTo date is before the current date") | `EXPIRED` rule: `displayTo` on a London day before today (Q3) | Scenarios 1, 2, 4 |
| Skip for list types flagged as scheduled subscription (the two `MAGISTRATES_*_DAILY`); handled by the scheduled cron | `SCHEDULED_LIST_TYPE` rule via `SCHEDULED_SUBSCRIPTION_LIST_TYPE_NAMES`, matched by name. Applies to email; third-party push follows the display rules (Q1). | Scenarios 1, 3 |
| Applies to email **and** API subscribers | Both blocks in `processPublication` are gated. The OAuth push (#1215) gates itself. Deferred third-party pushes come from the cron (PR #1306) | Scenarios 2, 3 |
| No-match still excluded | Existing API-path guard unchanged | Existing tests |

## 5. Test Scenarios

1. **Decision rules** (`upload-decision.test.ts`, `it.each`). Each case states `now`, the publication fields and the expected decision:
   - `displayFrom` null, `displayTo` null, non-scheduled: send both.
   - `displayFrom` yesterday, today 00:00Z, and later today: send both.
   - `displayFrom` exactly `londonDay.end`, and next week: `FUTURE_DISPLAY_FROM`, neither channel.
   - BST late night (`now` = `2026-06-01T23:30Z`, `displayFrom` = `2026-06-02T00:00Z`): sent, because London is already 2 June.
   - BST evening (`now` = `2026-06-01T22:30Z`, same `displayFrom`): deferred.
   - `displayTo` yesterday, and one millisecond before `londonDay.start`: `EXPIRED`. `displayTo` exactly `londonDay.start`, earlier today than `now`, and today 00:00Z in both GMT and BST: send.
   - `MAGISTRATES_ADULT_COURT_LIST_DAILY` and `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, displayable: `SCHEDULED_LIST_TYPE`, email false, third-party true.
   - `MAGISTRATES_ADULT_COURT_LIST_FUTURE`: send both.
   - A scheduled list type that is also future-dated: `FUTURE_DISPLAY_FROM`, neither channel.
2. **Upload of a future-dated or expired publication** (`processing/service.test.ts`):
   - A future `displayFrom` generates the PDF but does not call `sendPublicationNotificationsForArtefact` or `sendThirdPartyPublications`, and logs the reason.
   - The same holds for an expired `displayTo`.
   - The existing "today" test still sends both.
   - Existing tests get a `prisma.listType.findUnique` mock where needed.
3. **Upload of a scheduled list type** (`processing/service.test.ts`):
   - No email.
   - `sendThirdPartyPublications` is called.
   - A flat-file upload with no `jsonData` resolves the name through the lookup.
   - If the lookup rejects, email is skipped with a logged error, and the third-party push still follows the display rules.
4. **E2E: displayable versus deferred upload journey** (`e2e-tests/tests/api/subscription-notifications.spec.ts`, `@nightly`). A subscribed user uploads three publications via `POST /v1/publication`:
   - `displayFrom` now: a notification is sent. The existing journey keeps its email assertions.
   - `displayFrom` tomorrow: once the PDF exists, there are no `notification_audit_log` rows.
   - `displayTo` in the past: there are no rows.
   - Existing helpers are fixed so that `displayFrom` is now. `contentDate` stays offset, which keeps uploads unique. The expired 2024 headers in `blob-ingestion-notifications.spec.ts` are also replaced, or those journeys would stop receiving emails.

The upload path has no user-facing pages that change, so there are no template, accessibility or Welsh tests.

## CLARIFICATIONS NEEDED

None outstanding. Q1, Q2, Q4 and Q5 were decided with the assignee on 2026-11-09, and Q3 on 2026-11-11.

1. **Scheduled-list-type rule and API subscribers. Decided:** skip **email** for scheduled list types at upload, and keep the third-party push (subject to the display rules), as legacy does.
2. **Scheduled list types that miss the 10:30 UTC run. Decided:** accept the gap, as legacy does. A scheduled list type uploaded after that day's run, or with a past content date, is not emailed.
3. **Expiry semantics. Decided: by date, as the ticket says.** "The displayedTo date is before the current date" sits next to a day-based displayFrom rule ("from tomorrow onwards", "today or earlier"), and together they match legacy's upload check. A publication is expired at upload when its `displayTo` falls on a London day before today (`displayTo < londonDay.start`). A display-to-today upload still notifies, even though the public site hides it from that midnight, as legacy did. Evidence considered:
   - Legacy is split. At upload it is date-based: `displayTo.toLocalDate().isAfter(LocalDate.now().minusDays(1))` (`pip-data-management` `PublicationSubscriptionService.checkAndTriggerPublicationSubscription`). In its cron it is instant-based: `display_to > :curr_datetime` (`ArtefactRepository.findArtefactsByDisplayFrom`).
   - The 1272 cron and CaTH's public site are instant-based (`subscription-schedule/queries.ts:45`, `display-window.ts`).
   - The OAuth push in PR #1215 is date-based, like legacy at upload (`docs/tickets/568/plan.md:213` on that branch).
   - Effect: a manual upload with display-to = today is stored as 00:00Z. Instant-based, it gets no email or Courtel push and is already hidden from the public, but date-based OAuth subscribers still receive it. Date-based, all channels notify it, though the public site hides it.
4. **Third-party push from the cron. Decided:** moves to the PR #1306 update, which lands before #588. See "Moved to PR #1306" in section 2.
5. **Existing Courtel defects. Decided:** fixed in the PR #1306 update. `apps/api/helm/values.yaml` has no Courtel secrets, so API-ingested publications are not pushed today, and `executePush` reads `pdfPath` from the local filesystem while callers pass a blob key.
