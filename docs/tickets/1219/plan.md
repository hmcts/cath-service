# Technical Plan — #1219: Turn off Courtsdesk API Integration with CaTH

## 1. Technical Approach

This is a **gated operational revoke**, not a feature build. Nothing in this repo needs new
behaviour to satisfy either acceptance criterion. The expected code deliverable is
documentation under `docs/` and nothing else — unless Phase 1 lands on the legacy branch,
which does require a reviewed database change (see below).

### The dominant uncertainty is not technical, it is "which mechanism serves Courtsdesk"

The string "Courtsdesk" appears **nowhere in this repository** except this ticket's own
`docs/tickets/1219/ticket.md`. There is no Courtsdesk-specific code, config, Helm value or
Key Vault reference. Therefore the codebase cannot tell us how Courtsdesk is served, and no
amount of further reading will answer it. The answer must come from two external sources:

1. The **PUB-3328 implementation record** (what was actually built/configured at onboarding).
2. A **live-environment check** of `third_party_user` and `legacy_third_party_user` at the
   time this ticket is actioned.

There are **three** possible findings, not two. The pre-existing specification only
considered two:

| Finding | What it means | Work required |
|---|---|---|
| **A. Modern subscriber** — row in `third_party_user` | CaTH has **never pushed to Courtsdesk from this codebase**. The only dispatcher reads legacy tables (below). This is data hygiene + credential revocation at the identity provider. | No code. Admin UI journey only. |
| **B. Legacy subscriber** — row in `legacy_third_party_user` | Courtsdesk was bolted onto the shared Courtel path. There is **no admin UI for legacy records**, so this needs a direct, reviewed database change. | A reviewed Prisma migration or a DBA-executed statement under change control. A real PR. |
| **C. Not in this service at all** | Courtsdesk was onboarded via the legacy `pip-*` estate or some mechanism outside this repo. | Establish that, record the evidence, and redirect the ticket to the owning team. Close as not-actionable here. |

Finding C is a realistic outcome and the plan must not treat it as a failure state.

### Architecture decision: the off-switch is subscription rows, not credentials

Both dispatch functions return early when `findSubscribersByListType()` yields an empty
array. Clearing subscription rows is the authoritative off-switch. Deleting Key Vault
secrets is defence-in-depth, not the switch.

Verified dispatch facts:

- `sendThirdPartyPublications()` — `libs/legacy-third-party-fulfilment/src/service.ts:47`,
  called from `libs/publication/src/processing/service.ts:867`.
- `sendThirdPartyDeletion()` — `service.ts:85`, called from
  `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:131`.
- Both are fired **without `await`** (`.catch()` only).
- `findSubscribersByListType(listTypeId)`
  (`libs/legacy-third-party-fulfilment/src/queries.ts:3-8`) queries
  `prisma.legacyThirdPartySubscription` **only**.
- Skip log messages **differ** between the two paths:
  - publication: `Third-party push skipped: no subscribers for listTypeId <n>`
  - deletion: `Third-party deletion push skipped: no subscribers for listTypeId <n>`

### The modern model is wired to nothing outbound

`findAllThirdPartyUsers`, `findThirdPartyUserById`, `createThirdPartyUser`,
`updateThirdPartySubscriptions` and `deleteThirdPartyUser` all hit `prisma.thirdPartyUser` /
`prisma.thirdPartySubscription` exclusively. Nothing in the repo reads or writes
`legacyThirdPartyUser` / `legacyThirdPartySubscription` except `findSubscribersByListType`
(a read, for dispatch). There is **no legacy fallback in the System Admin UI**.

Two consequences that the plan hangs on:

- **A subscriber that exists only in the modern tables receives no pushes from this service
  today.** If Phase 1 finds Courtsdesk as a modern subscriber only, the honest conclusion to
  write on the issue is that CaTH was never pushing to it from this codebase. Do not claim a
  live connection was severed.
- **A subscriber that exists only in the legacy tables is not visible or manageable in
  `/third-party-subscribers` at all.** The legacy branch therefore cannot be executed
  "via the subscriptions/manage journey" — that journey cannot see the record.

### No automatic expiry mechanism is being built

There is no `expiresAt` or licence-status concept on `ThirdPartyUser`, and this ticket does
not add one. One vendor, one date, a revoke path that already exists and is E2E-covered — a
scheduled expiry job is speculative infrastructure for a single event (YAGNI). If a second
time-limited licence is onboarded, raise a separate ticket for licence-expiry metadata.

### Hard precondition

**Gate 0 blocks everything.** No data, config, credential or code change is made until
written confirmation of licence status is attached to the issue. Deletion of a subscriber is
irreversible (cascade), so acting on an unverified date is expensive to undo.

---

## 2. Implementation Details

`TEMPLATE SOURCE: n/a`

No rendered page or list type is involved. This is an operational/configuration revoke plus
documentation.

### Modules touched

| Area | Role in this ticket | Changed? |
|---|---|---|
| `libs/legacy-third-party-fulfilment` | The only outbound dispatcher. Read for understanding; its skip-log lines are the verification evidence. | No |
| `libs/third-party-user` | `updateThirdPartySubscriptions`, `deleteThirdPartyUser`, `deleteSecrets` — the modern revoke primitives. | No |
| `libs/system-admin-pages/src/pages/third-party-subscribers/` | The UI used to execute the modern revoke (`index`, `create/*`, `[id]/manage`, `[id]/oauth-config/*`, `[id]/subscriptions/manage`, `[id]/subscriptions/success`, `[id]/delete/confirmation`, `[id]/delete/success`). Every handler is wrapped in `requireRole([USER_ROLES.SYSTEM_ADMIN])`. All ship `en.ts` + `cy.ts`. | No |
| `apps/web/helm/values.yaml:84-86`, `values.dev.yaml:59-61`, `helm/cath-service/values.preview.template.yaml:100-102` | Map `auto-pip-stg-courtel-api` → `COURTEL_API_URL` and `courtel-certificate` → `COURTEL_CERTIFICATE` from Key Vault, under the comment "Third-party push secrets (Courtel)". A **single shared URL + cert**, not per-vendor. | **No — must not be touched** |
| `docs/` | The documentation deliverable. | **Yes** |
| `libs/postgres-prisma/prisma/schema/` | Legacy branch only: a reviewed migration to remove Courtsdesk's legacy rows. | Conditional |

### API endpoints

**None.** No endpoint is added, changed or removed. `apps/api/src/routes/v1/publication.ts`
is the *inbound* ingestion endpoint used by data providers and is out of scope.

### Database schema changes

- **Finding A (modern):** none. Rows are removed through the existing admin journey.
- **Finding B (legacy):** no *schema* change, but a **data** change is required to tables
  that no application code can write. Deliver this as either a reviewed Prisma migration
  (committed, PR-reviewed, applied via `yarn db:migrate`) or a statement executed by a DBA
  under change control. Scope it to Courtsdesk's `user_id` only.
- **Finding C:** none.

### Relevant schema facts (legacy field names differ from the modern model)

```
LegacyThirdPartyUser          id, name, createdDate        → legacy_third_party_user
LegacyThirdPartySubscription  id, userId, listTypeId,
                              createdDate                   → legacy_third_party_subscription
ThirdPartyPushLog             id, artefactId, listTypeId,
                              type, status, statusCode,
                              createdAt                     → legacy_third_party_push_log
```

Note `createdDate`, not `createdAt`, on both legacy models, and **no `sensitivity` column**
on `LegacyThirdPartySubscription`. The per-list-type Public/Private/Classified matrix exists
**only** on the modern `ThirdPartySubscription`.

### Push log cannot attribute rows to a subscriber

`ThirdPartyPushLog` is mapped to **`legacy_third_party_push_log`**
(`libs/postgres-prisma/prisma/schema/third-party-push-log.prisma:12`). All verification
queries must target that table name.

Its columns carry **no third-party user reference** — only `artefact_id`, `list_type_id`,
`type`, `status`, `status_code`, `created_at`. Therefore:

> "Zero rows attributable to Courtsdesk" is **not provable from this table.** The only
> available filter is `list_type_id`. If Courtel subscribes to any of the same list types, a
> zero-row check is impossible by construction.

Verification must be defined around what the schema can actually produce:

1. **Primary evidence:** zero rows for Courtsdesk's `user_id` in
   `legacy_third_party_subscription` (or `third_party_subscription`), and no subscriber row.
2. **Supporting evidence:** the skip log line, captured for list types that **no** vendor
   subscribes to after the revoke. For list types still subscribed by Courtel, continued
   push-log rows are *expected and correct* and prove nothing either way.
3. **Negative control:** remaining subscribers still listed with unchanged subscriptions.

Do not promise evidence the schema cannot produce.

### Ordered execution phases

**Gate 0 — Licence decision (blocks everything).** Written confirmation from the contract
owner of either (a) expired, no extension → proceed, or (b) extended to a stated date →
stop, re-date the issue, comment the evidence, return to backlog, make **no** change.

**Phase 1 — Read-only identification.** Establish which of findings A / B / C applies, from
the PUB-3328 record plus a live check of both tables. Record the before-state on the issue:
subscriber `id`, name, creation date, every subscribed list type (with sensitivity if
modern), which of the five secrets are populated (presence only, never values), which table
holds the record, and a 7-day `legacy_third_party_push_log` baseline by `list_type_id`.
Nothing is changed in this phase.

**Phase 2 — Revoke in CaTH, branch per finding.**

- *A (modern):* `/third-party-subscribers/<id>/subscriptions/manage` → set every list type to
  `Unselected` and save (`updateThirdPartySubscriptions` filters out `UNSELECTED`/`""` and,
  in a transaction, deletes all rows for the user then recreates the selected ones —
  `libs/third-party-user/src/third-party-user-service.ts:33-59`). Then
  `/third-party-subscribers/<id>/delete/confirmation` → `deleteSecrets(id)` then
  `deleteThirdPartyUser(id)`; `ThirdPartySubscription.thirdPartyUser` is
  `onDelete: Cascade`. Audit actions written: `UPDATE_THIRD_PARTY_SUBSCRIPTIONS`
  ("Update third party subscriptions") and `DELETE_THIRD_PARTY_USER`
  ("Delete third party user").
- *B (legacy):* a reviewed migration or DBA statement deleting Courtsdesk's
  `legacy_third_party_subscription` rows, then its `legacy_third_party_user` row. **Do not**
  unset, blank or re-point `COURTEL_API_URL` / `COURTEL_CERTIFICATE`, and do not remove
  their Helm aliases — they are shared with Courtel and would cut off that vendor too. No
  audit-log row is produced by a direct database change, so the change record *is* the
  change-control ticket plus the PR.
- *C (absent):* nothing to revoke here. Record the evidence and redirect.

**Phase 3 — Revoke outside CaTH.** Disable or delete the OAuth client registration at the
issuing identity provider, so a cached `client_id`/`client_secret` cannot mint new tokens —
deleting CaTH's Key Vault copy removes CaTH's ability to *send*, it does not invalidate the
credential. Confirm with the infrastructure owner whether any network allow-list, firewall
rule or private endpoint exists for the Courtsdesk destination and route its removal through
the normal infrastructure change process. Confirm who owns the vendor's obligation to delete
previously supplied restricted data (out of scope here, but must be named).

**Phase 4 — Verification.** Per the constraints above. Rehearse in a lower environment
first, then check the live environment at cut-off, +48 hours and +7 days.

**Phase 5 — Documentation.** The only expected code deliverable in findings A and C. Add a
short runbook under `docs/` covering: how third-party access is granted and revoked; that
the off-switch is subscription-driven; that the modern tables are wired to no dispatcher; the
absence of any legacy admin UI; the `COURTEL_*` shared-secret hazard; and that
`legacy_third_party_push_log` cannot attribute rows to a subscriber. Written so the next
licence expiry does not require this investigation again.

### Decision and execution flow

```
                     ┌────────────────────────────────┐
                     │ Gate 0: licence status          │
                     │ confirmed in writing?           │
                     └───────────────┬────────────────┘
          extended                   │                  expired, no extension
   ┌──────────────────────┬──────────┴─────────────────────────┐
   v                      │                                    v
┌──────────────────────┐  │                 ┌─────────────────────────────────┐
│ Re-date issue to new │  │                 │ Phase 1: identify the mechanism │
│ expiry, comment the  │  │                 │ (read-only)                     │
│ evidence, return to  │  │                 │ PUB-3328 record + live check of │
│ backlog. NO change.  │  │                 │ BOTH subscriber tables          │
│         (AC2)        │  │                 └────────────────┬────────────────┘
└──────────────────────┘  │                                  │
                          │        ┌─────────────────────────┼─────────────────────────┐
                          │   A: modern only           B: legacy only            C: neither
                          │        v                         v                         v
             ┌────────────────────────────┐ ┌──────────────────────────┐ ┌─────────────────────────┐
             │ Phase 2A (admin UI)        │ │ Phase 2B (DB change)     │ │ No CaTH-side revoke     │
             │ 1. subscriptions → all     │ │ reviewed migration or    │ │ possible. Record that   │
             │    "Unselected" (THE       │ │ DBA statement deleting   │ │ Courtsdesk is not in    │
             │    off-switch)             │ │ Courtsdesk's legacy rows │ │ this service; redirect  │
             │ 2. delete subscriber       │ │ — NO admin UI exists for │ │ the ticket to the       │
             │    → deleteSecrets()       │ │ legacy records           │ │ owning team.            │
             │    → cascade subscriptions │ │                          │ └─────────────────────────┘
             │ Audit rows written.        │ │ DO NOT touch             │
             │                            │ │ COURTEL_API_URL /        │
             │ NOTE: no dispatcher reads  │ │ COURTEL_CERTIFICATE —    │
             │ the modern tables, so no   │ │ shared with Courtel.     │
             │ live push was being made.  │ │ No audit row produced.   │
             └─────────────┬──────────────┘ └─────────────┬────────────┘
                           └──────────────┬───────────────┘
                                          v
                        ┌───────────────────────────────────────────┐
                        │ Phase 3: disable OAuth client at the IdP  │
                        │ + remove any network allow-list           │
                        └──────────────────┬────────────────────────┘
                                           v
                        ┌───────────────────────────────────────────┐
                        │ Phase 4: verify (within schema limits)    │
                        │ • zero subscription rows for the user     │
                        │ • skip log for list types no vendor holds │
                        │ • other subscribers unaffected            │
                        │ • re-check at +48h and +7 days            │
                        └──────────────────┬────────────────────────┘
                                           v
                        ┌───────────────────────────────────────────┐
                        │ Phase 5: document under docs/ + close     │
                        │                  (AC1)                    │
                        └───────────────────────────────────────────┘
```

### Where the off-switch sits in the dispatch pipeline

```
  Publication processed                        List removed by admin
            │                                            │
            v                                            v
  libs/publication/src/processing/        apps/web/src/pages/(admin)/
  service.ts:867                          remove-list-confirmation/index.ts:131
            │  (fired WITHOUT await — .catch() only)      │
            v                                            v
  sendThirdPartyPublications()                sendThirdPartyDeletion()
  service.ts:47                               service.ts:85
            │                                            │
            ├── resolveCourtelSecrets()  ─ COURTEL_API_URL or
            │   (service.ts:29-45)         COURTEL_CERTIFICATE missing
            │                              ──> console.error + return
            │
            ├── findSubscribersByListType(listTypeId)
            │   queries.ts:3-8 — reads prisma.legacyThirdPartySubscription ONLY
            │        │
            │        └── []  ──>  <<< TARGET STATE >>>
            │               publication path logs:
            │                 "Third-party push skipped:
            │                  no subscribers for listTypeId <n>"
            │               deletion path logs (DIFFERENT message):
            │                 "Third-party deletion push skipped:
            │                  no subscribers for listTypeId <n>"
            │
            v
  pushWithRetry(url, certPem, headers, body)
            │
            v
  writePushLog() ──> legacy_third_party_push_log
                     (artefact_id, list_type_id, type, status,
                      status_code, created_at — NO subscriber reference)

  third_party_user / third_party_subscription  ──X  nothing reads these outbound.
```

### Access required

System Admin role in the target environment (`USER_ROLES.SYSTEM_ADMIN`); read access to the
application database for the subscription and push-log checks; reader access to the
third-party Key Vault; and, for the legacy branch, database change-control approval.

### No user-facing content changes

No new pages, labels, hint text or error messages. The System Admin journey already ships
`en.ts` and `cy.ts` for every page used. **No Welsh content work.**

---

## 3. Error Handling & Edge Cases

**Courtsdesk not found in either subscriber table.** The most likely single outcome, given
the name appears nowhere in the repo. Do not escalate to a code change hunting for a hidden
integration. Record the queries run and their empty results, state that Courtsdesk is not
served by this service, and redirect the ticket to whoever owns the estate that does serve
it. Leave the CaTH documentation deliverable in place — it still has value.

**Courtsdesk found in both tables.** Treat the legacy row as the live one, because it is the
only one a dispatcher reads. Revoke both, legacy first. Do not assume the two rows share an
`id`; match on `name` and verify the subscribed `list_type_id` sets before deleting
anything.

**Licence extended after revocation.** Subscriber deletion is **irreversible** — cascade
removes the subscription rows and, in the modern model, the entire sensitivity matrix.
Key Vault secrets are *soft*-deleted via `beginDeleteSecret`, so they are recoverable **only
within the vault's retention window**; after that the vendor must supply credentials again.
This is why Phase 1's before-state record is a hard prerequisite, not documentation for its
own sake. Re-onboarding is a fresh `/third-party-subscribers/create` plus re-entry of the
OAuth config and the recorded subscription matrix.

**In-flight push at cut-off.** Dispatch is fired without `await` from both call sites, so a
push can be mid-flight while subscriptions are being cleared. A single publication may be
delivered moments after the recorded cut-off timestamp. Agree the cut-off so it falls outside
a publishing window, and treat the Phase 4 checks — not the clock — as the evidence that
delivery has stopped.

**`THIRD_PARTY_KEY_VAULT` unset.** `createSecretClient()` returns `undefined` and
`deleteSecrets()` instead runs `prisma.thirdPartySecret.deleteMany()` against the
**plaintext `third_party_secret` table** (`libs/third-party-user/src/key-vault-service.ts`).
Confirm which path the target environment is on before claiming "Key Vault secrets deleted".
If it is the plaintext path, the secrets were stored in cleartext in the database and that
fact belongs in the incident/record, not just the verification note.

**`deleteSecrets()` swallows errors.** Both the Key Vault and plaintext branches catch and
ignore failures. A successful page render is **not** evidence the secrets are gone. Verify
secret state independently in the vault (or in `third_party_secret`) rather than inferring it
from the admin UI.

**Shared `COURTEL_*` config.** Unsetting or re-pointing `COURTEL_API_URL` /
`COURTEL_CERTIFICATE` to revoke Courtsdesk would silently stop **all** legacy third-party
delivery, including Courtel's. These are a single shared URL and certificate. Forbidden in
every branch. If — and only if — Phase 1 proves Courtsdesk was the sole consumer, raise a
**separate** ticket to retire the `COURTEL_*` configuration and the dispatch call site.

**Subscriptions cleared but identity-provider credentials still live, or the reverse.**
Either on its own leaves a hole: a recovered Key Vault secret or a re-created subscription
silently resumes delivery. Phases 2 and 3 are both required, in that order.

**Deleting the audit trail.** `legacy_third_party_push_log` is the only record of what was
sent and when; `audit_log` is the only record of who revoked access. Both will be needed if
the disclosure period is ever questioned. Historical rows must be left intact — no "tidying
up" forms part of this ticket.

**Credentials surfacing in the wrong place.** The OAuth-config page reads the stored client
secret back into the form and session. During Phase 1 record only the *presence* of secrets,
never their values, and keep them out of issue comments, screenshots and PR descriptions.

**No enforcement of the licence date exists.** There is no `expiresAt` on `ThirdPartyUser`
and no scheduled cut-off. Access persists indefinitely until a human acts. A ticket in the
backlog is not a control; a calendar reminder owned by a named person, set at least two weeks
before expiry and independent of this issue's backlog position, is.

---

## 4. Acceptance Criteria Mapping

### AC1 — "Licensing expiry (without extension) is confirmed and CaTH API connection with Courtsdesk is turned off/suspended"

*Satisfied by:* Gate 0 written expiry confirmation, then Phase 1 identification, then the
Phase 2 branch matching the finding, then Phase 3 external revocation.

*Evidence that counts, given the push-log limitation:*

- Written expiry confirmation attached to the issue, naming who confirmed it and when.
- Phase 1 before-state comment on the issue (subscriber id, list types, secret presence,
  which table, 7-day push-log baseline by `list_type_id`).
- A query showing **zero rows** for Courtsdesk's `user_id` in `legacy_third_party_subscription`
  (finding B) or `third_party_subscription` (finding A), and **no subscriber row**. This is
  the primary evidence — it is the condition the dispatcher actually tests.
- Audit log viewer showing `Update third party subscriptions` and `Delete third party user`
  for the acting System Admin (finding A only — a direct database change in finding B
  produces no audit row, so the PR and change-control record stand in its place).
- Independent confirmation of the five `third-party-<id>-*` secrets' state in the vault (or
  of their absence from `third_party_secret`).
- Confirmation from the identity-provider owner that the OAuth client is disabled or deleted.
- Skip-log capture from the lower-environment rehearsal.
- For finding C: the queries and their empty results, plus the redirect decision. AC1 is then
  satisfied by establishing that there is no CaTH connection to turn off — stated explicitly,
  not implied.

*Evidence that does NOT count:* "zero rows in `legacy_third_party_push_log` attributable to
Courtsdesk". The table has no subscriber reference and can only be filtered by
`list_type_id`. Where Courtel shares any of those list types, continued rows are expected and
prove nothing. Where no vendor holds a given list type after the revoke, zero new rows plus
the skip log line is meaningful — claim it only for those list types.

*Framing requirement for finding A:* because no dispatcher reads the modern tables, the
closing comment must say that CaTH was **not** pushing to Courtsdesk from this codebase, and
that the revoke was data hygiene plus credential revocation at the identity provider. Do not
write that a live connection was severed.

### AC2 — "Where the licensing contract is extended, then the API connection is sustained for the specified extension timeframe"

*Satisfied by:* Gate 0 terminating on the extension branch. Update the issue title and body
to the new expiry date, attach the written extension confirmation as a comment, reset the
calendar reminder to the new date with a named owner, and return the ticket to the backlog.

*Evidence:* the extension confirmation on the issue; the updated title/body; the new reminder
with its owner named; and a positive check that the integration is untouched — subscriber row
and subscription rows still present, secrets still populated, `COURTEL_*` config unchanged,
and push-log rows still accruing for the subscribed list types. **No data, config, credential
or code change is made on this branch**, which is itself the strongest evidence.

---

## 5. Test Scenarios

Existing automated coverage is sufficient. **No new automated tests are expected.** If the
implementer finds themselves writing one, scope has drifted into building something.

### Existing tests that prove the mechanism being relied on

| Test file | What it proves |
|---|---|
| `libs/legacy-third-party-fulfilment/src/service.test.ts` | Early return and the skip log when `findSubscribersByListType` returns `[]`; early return when `COURTEL_API_URL` / `COURTEL_CERTIFICATE` is missing. This is the off-switch. |
| `libs/legacy-third-party-fulfilment/src/queries.test.ts` | `findSubscribersByListType` reads `legacyThirdPartySubscription` only. |
| `libs/third-party-user/src/third-party-user-service.test.ts` | `updateThirdPartySubscriptions` filters `UNSELECTED`/`""` and deletes-then-recreates in a transaction; `deleteThirdPartyUser` removes the subscriber row. |
| `libs/third-party-user/src/key-vault-service.test.ts` | `deleteSecrets` targets all five `third-party-<userId>-*` names and falls back to `third_party_secret` when `THIRD_PARTY_KEY_VAULT` is unset. |
| `e2e-tests/tests/system-admin/third-party-user-management.spec.ts` | The create / manage-subscriptions / delete journeys end to end, including Welsh and accessibility assertions. |

Regression bar: `yarn test` and `yarn test:e2e:all` pass **unchanged**.

### Scenario 1 — Lower-environment rehearsal of the off-switch (manual)

In a lower environment, with a test subscriber standing in for Courtsdesk: record the
subscribed list types, execute the Phase 2 branch, then publish an artefact for a list type
that was previously subscribed **and that no other vendor subscribes to**. Confirm the
application log records `Third-party push skipped: no subscribers for listTypeId <n>` and
that no new `legacy_third_party_push_log` row appears for that `list_type_id`. Then remove a
list for the same list type and confirm the **deletion** path's distinct message:
`Third-party deletion push skipped: no subscribers for listTypeId <n>`. This rehearses the
sequence and produces the skip-log evidence for AC1.

### Scenario 2 — No other subscriber lost access (manual)

After the revoke, confirm `/third-party-subscribers` still lists every remaining subscriber
with subscriptions unchanged against the Phase 1 record, that `COURTEL_API_URL` and
`COURTEL_CERTIFICATE` are still set and their Helm aliases untouched, and that Courtel's
push-log rows (if Courtel is still active) are still accruing for its list types. This is the
negative control for the shared-secret hazard.

### Scenario 3 — Live-environment persistence check (manual)

At cut-off, +48 hours and +7 days: re-run the zero-subscription-rows query and the
list-type-filtered push-log query for list types no vendor holds. Attach the output to the
issue each time. Confirms the revoke did not get silently reverted.

### Scenario 4 — Extension branch, no-change check (manual)

If Gate 0 returns an extension: confirm the subscriber row, subscription rows, secret
presence and `COURTEL_*` config are all unchanged, and that push-log rows are still accruing
for the subscribed list types. Satisfies AC2.

Every scenario above has a matching task in `tasks.md`.

---

## 6. CLARIFICATIONS NEEDED

1. **Which mechanism or estate actually serves Courtsdesk, and who holds the PUB-3328
   implementation record?** "Courtsdesk" appears nowhere in this repository. The whole
   procedure branches on this answer and it cannot be derived from the code. Name the person
   or team who can produce the onboarding record.

2. **What are the exact licence start and expiry dates?** The issue title says "review by
   March 2027"; the body says six months from the date of API connection. Those do not
   obviously agree, and **nobody has stated the connection date**. A six-month licence
   reaching March 2027 implies connection around September 2026 — confirm or correct.

3. **Who is the named owner of the calendar reminder?** The backlog ticket is not a control.
   Nothing in CaTH enforces the licence end date, so access persists until a human acts.
   Name the owner and the reminder date (at least two weeks before expiry).

4. **Is soft-delete of the Key Vault secrets acceptable, or is a purge required?**
   `deleteSecrets()` uses `beginDeleteSecret`, which leaves secrets recoverable by anyone
   with recover permission for the vault's retention period. A purge forecloses the rollback
   path. The security owner must decide explicitly.

5. **Which identity provider issued Courtsdesk's OAuth client, and who can disable it?**
   CaTH only stores a copy of the credentials; deleting them stops CaTH sending but does not
   invalidate the credential itself.

6. **Which environment is "live" by the expiry date?** There is currently **no prod
   deployment** of this service. If one exists by then, it is the subject of the +48-hour and
   +7-day checks; if not, state which environment carries real restricted data, if any.

7. **Does Courtel still exist as an active vendor on the shared `COURTEL_*` config?** This
   determines whether the shared-secret hazard is live, and whether a follow-up ticket to
   retire the `COURTEL_*` configuration and the `legacy-third-party-fulfilment` dispatch call
   site is appropriate.

8. **Who owns the vendor's obligation to delete previously supplied restricted data?**
   Revoking future access does not address data already sent. Out of scope for this ticket,
   but the owner must be named before it closes.

9. **If the finding is that CaTH never pushed to Courtsdesk from this codebase (modern-only
   or absent), does that satisfy the ticket, or does it reopen a question about how
   Courtsdesk was actually receiving data?** The second is a materially different
   investigation and probably a different ticket.
