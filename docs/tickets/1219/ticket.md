# #1219: Review by March 2027 - Turn off Courtsdesk API Integration with CaTH

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** Post-Migration
**Created:** 2026-10-22T15:06:18Z
**Updated:** 2026-10-22T15:21:50Z

## Description

**PROBLEM STATEMENT**
This ticket is a follow on from [PUB-3328] 3rd Party - Courtsdesk API Integration with CaTH - Jira to turn off/suspend the API connection with CaTH. This ticket will remain in the backlog and will only be implemented at the end date of the approved 6 months licensing timeframe, starting from the date of API connection, unless an extension is officially approved upon which the implementation of this ticket will be updated to the new licensing expiry date. 

 

**AS A** Service
**I WANT** to turn off CaTH API connection with Courtsdesk upon licensing expiry 
**SO THAT** Courtsdesk no longer has access to restricted hearing information

 
 

**ACCEPTANCE CRITERIA**
- Licensing expiry (without extension) is confirmed and CaTH API connection with Courtsdesk is turned off/suspended
- Where the licensing contract is extended, then the API connection is sustained for the specified extension timeframe. 

[PUB-3328]: https://hmcts.atlassian.net/browse/PUB-3328?atlOrigin=eyJpIjoiNWRkNTljNzYxNjVmNDY3MDlhMDU5Y2ZhYzA5YTRkZjUiLCJwIjoiZ2l0aHViLWNvbS1KU1cifQ

## Comments

### Comment by OgechiOkelu on 2026-10-22T15:09:15Z

@spec technical-task

### Comment by hmctsclaudecode on 2026-10-22T15:14:22Z

# Technical Specification — Issue #1219: Turn off Courtsdesk API Integration with CaTH

## 1. Goal

**System/Component:** Third-party fulfilment (outbound publication push) — `libs/legacy-third-party-fulfilment`, `libs/third-party-user`, System Admin "Third party subscribers" journey (`libs/system-admin-pages/src/pages/third-party-subscribers/`), Azure Key Vault, `apps/web/helm` secret mapping.

**Objective:** On confirmed expiry of the 6-month Courtsdesk licence (review date March 2027), revoke Courtsdesk's access to CaTH publication data: remove its list-type subscriptions, delete its stored OAuth credentials from Key Vault, remove its subscriber record, and verify no further outbound pushes occur. If the licence is extended, take no action and re-date this ticket to the new expiry.

This is a **gated configuration and operational change executed through existing System Admin functionality**, not a feature build. The revoke path already exists and is covered by tests; the engineering work is confirming which dispatch path serves Courtsdesk at execution time, executing the revoke in the correct order, and proving the data flow has actually stopped.

## 2. Technical Context

Courtsdesk is a commercial third party granted time-limited access to CaTH publications — including publications at `PRIVATE` and `CLASSIFIED` sensitivity — under a 6-month licence (originating ticket PUB-3328). When the licence lapses, continued access is an unlawful disclosure of restricted hearing information, so revocation must be provable, not assumed.

### How third-party access is modelled today

CaTH **pushes** publications out to third parties; third parties do not pull from the CaTH API. (`apps/api/src/routes/v1/publication.ts` is the *inbound* ingestion endpoint used by data providers, and is not in scope.)

There are two outbound mechanisms in the codebase, and they are not equivalent:

| | Modern subscriber model | Legacy Courtel model |
|---|---|---|
| Subscriber table | `third_party_user` / `third_party_subscription` (`libs/postgres-prisma/prisma/schema/third-party-user.prisma`) | `legacy_third_party_user` / `legacy_third_party_subscription` |
| Admin UI | `/third-party-subscribers/*` (`libs/system-admin-pages`) | same UI, legacy records readable via `prisma.legacyThirdPartyUser` fallbacks |
| Credentials | Per-subscriber OAuth client credentials in Azure Key Vault — `third-party-<userId>-{destination-url,token-url,scope,client-id,client-secret}` (`libs/third-party-user/src/key-vault-service.ts`) | Single shared mTLS cert + URL from env: `COURTEL_API_URL`, `COURTEL_CERTIFICATE` (`libs/legacy-third-party-fulfilment/src/service.ts:7-8`) |
| Per-list-type sensitivity | Yes — `Public` / `Private` / `Classified` / `Unselected` | No |
| Dispatch code | **None in this repo** — only the admin UI reads/writes these tables | `sendThirdPartyPublications()` / `sendThirdPartyDeletion()` |

The only live outbound dispatch is the legacy path. `sendThirdPartyPublications` is fired from `libs/publication/src/processing/service.ts:867` on every publication (and `sendThirdPartyDeletion` from `apps/web/src/pages/(admin)/remove-list-confirmation/index.ts:131` on removal). It resolves subscribers via `findSubscribersByListType(listTypeId)`, which queries **`legacyThirdPartySubscription` only** (`libs/legacy-third-party-fulfilment/src/queries.ts:3-8`), then pushes to the single `COURTEL_API_URL` endpoint.

### The consequence for this ticket

**Which mechanism serves Courtsdesk determines the whole procedure, and the answer cannot be read off today's codebase.** Two cases:

- **Courtsdesk is a modern subscriber** (expected — the OAuth-per-subscriber model with per-list-type sensitivity exists precisely to onboard subscribers like this). Revocation is entirely contained: delete its subscriptions and its Key Vault secrets. Note that if the modern dispatcher still does not exist when this ticket is actioned, Courtsdesk was never receiving data through CaTH-initiated push and the revoke is a data-hygiene exercise — state that plainly in the ticket rather than claiming a connection was severed.
- **Courtsdesk was bolted onto the legacy Courtel path.** Then `COURTEL_API_URL` / `COURTEL_CERTIFICATE` are **shared with Courtel, a different vendor**. Removing those Helm secret aliases (`apps/web/helm/values.yaml:84-86`, `values.dev.yaml:59-61`, `helm/cath-service/values.preview.template.yaml:100-102`) would cut off Courtel too. In this case revocation must be done by deleting Courtsdesk's `legacy_third_party_subscription` rows, never by unsetting the shared env vars.

Confirming the mechanism is the first task, before any change is made.

### Why no automatic expiry mechanism is being built

There is no `expiresAt` / licence-status concept on `ThirdPartyUser`, and this ticket does not add one. One vendor, one date, a known manual revoke path already built and E2E-covered — a scheduled expiry job would be speculative infrastructure for a single event (YAGNI). If a second or third time-limited licence is onboarded, raise a separate ticket for licence-expiry metadata and an automated cut-off; do not pre-build it here.

### References

- `docs/ARCHITECTURE.md` — service architecture
- Jira PUB-3328 — 3rd Party: Courtsdesk API Integration with CaTH (the onboarding ticket; its implementation record is the authoritative source for which mechanism was used)

## 3. Scope of Work

### Gate 0 — Licence decision (blocks everything below)

* [ ] Obtain **written** confirmation from the contract/commercial owner of one of: (a) licence expired, no extension — proceed; (b) licence extended to a stated date — stop.
* [ ] If extended: update the issue title and body to the new expiry date, record the extension confirmation as an issue comment, and return the ticket to the backlog. **No code, config, data or credential change is made.** This satisfies AC2.
* [ ] If expired: record the confirmed effective cut-off date/time in the issue, and agree it with the Courtsdesk relationship owner so the vendor is not surprised by a mid-day cut.

### Phase 1 — Identify the live integration (read-only, no changes)

* [ ] In the target environment, sign in as System Admin and open `/third-party-subscribers`. Record the Courtsdesk subscriber's `id`, `name` and creation date.
* [ ] Open `/third-party-subscribers/<id>/subscriptions/manage` and record every subscribed list type and its sensitivity (`Public` / `Private` / `Classified`). This is the before-state evidence and the list used for the Phase 4 verification test.
* [ ] Open `/third-party-subscribers/<id>/oauth-config` and record which of the five secrets are populated (values are not needed; presence is).
* [ ] Confirm which table holds the record: present in `third_party_user`, or only in `legacy_third_party_user`.
* [ ] Query `third_party_push_log` for rows attributable to Courtsdesk's list types over the preceding 7 days, to establish whether traffic is actually flowing and to give the post-revoke check a meaningful baseline.
* [ ] Confirm whether a modern (OAuth) dispatcher exists by then — i.e. whether anything other than `libs/third-party-user/src/third-party-user-service.ts` reads `thirdPartySubscription`. If nothing does, note it in the issue.
* [ ] Record the findings as a comment on the issue before changing anything.

### Phase 2 — Revoke in CaTH (modern subscriber case)

Execute in this order; each step narrows access further, so an interruption still leaves access reduced, never widened.

* [ ] `/third-party-subscribers/<id>/subscriptions/manage` — set every list type to `Unselected` and save. This alone stops dispatch: `updateThirdPartySubscriptions` filters out `UNSELECTED`/`""` and deletes the subscription rows in a transaction (`libs/third-party-user/src/third-party-user-service.ts:34-59`), and dispatch is subscription-driven.
* [ ] Confirm the audit entry `Update third party subscriptions` appears in the Audit log viewer.
* [ ] `/third-party-subscribers/<id>/delete/confirmation` — select "Yes" and confirm. This calls `deleteSecrets(id)` then `deleteThirdPartyUser(id)`, which soft-deletes all five Key Vault secrets (`beginDeleteSecret`) and removes the subscriber row; `ThirdPartySubscription` cascades via `onDelete: Cascade`.
* [ ] Confirm the audit entry `Delete third party user` appears in the Audit log viewer with the recorded name and ID.
* [ ] Confirm in the Azure Key Vault (`THIRD_PARTY_KEY_VAULT`) that `third-party-<id>-destination-url`, `-token-url`, `-scope`, `-client-id` and `-client-secret` are in the deleted state. Note that `beginDeleteSecret` on a soft-delete-enabled vault leaves them recoverable — if the security requirement is irrecoverable removal, purge them explicitly as a separate, deliberate step.

### Phase 2a — Revoke in CaTH (legacy Courtel path case — only if Phase 1 found this)

* [ ] Delete only Courtsdesk's rows from `legacy_third_party_subscription` (via the `/third-party-subscribers/<id>/subscriptions/manage` journey for that record), then delete the `legacy_third_party_user` row.
* [ ] **Do not** remove or blank `COURTEL_API_URL` or `COURTEL_CERTIFICATE`, and do not remove their Helm secret aliases — they are shared with Courtel and would cut off that vendor as well.
* [ ] If, and only if, Phase 1 proves Courtsdesk was the sole consumer of those env vars, raise a separate ticket to retire the `COURTEL_*` configuration and the `legacy-third-party-fulfilment` dispatch call site. Do not fold that cleanup into this ticket.

### Phase 3 — Revoke outside CaTH

* [ ] Disable or delete the OAuth client registration used by Courtsdesk in the identity provider that issued it, so a cached `client_id`/`client_secret` cannot mint new tokens. Deleting the CaTH-side Key Vault copy removes CaTH's ability to *send*; it does not invalidate the credential itself.
* [ ] Confirm with the infrastructure owner whether any network allow-list, firewall rule or private endpoint was created for the Courtsdesk destination, and raise removal through the usual infrastructure change route.
* [ ] Confirm the vendor's data-retention/deletion obligations on previously supplied restricted data are handled by the contract owner. Out of scope for this ticket; record who owns it.

### Phase 4 — Verify the connection is actually off

* [ ] Publish a test artefact in the lower environment for a list type Courtsdesk was previously subscribed to, and confirm the application log records the skip (`Third-party push skipped: no subscribers for listTypeId <n>`) and that no new `third_party_push_log` row is created for that subscriber.
* [ ] After the cut-off in the live environment, query `third_party_push_log` and confirm zero rows attributable to Courtsdesk's former list types from the cut-off timestamp onwards. Re-check after 48 hours and at 7 days.
* [ ] Confirm `/third-party-subscribers` no longer lists Courtsdesk.
* [ ] Attach the verification output to the issue and close it with an explicit statement of what was turned off, when, in which environments, and by whom.

### Phase 5 — Documentation

* [ ] Record the revocation in `docs/` (architecture notes or a short runbook under `docs/`) covering: how third-party access is granted and revoked, that revocation is subscription-driven, and the shared-secret hazard on the `COURTEL_*` path. Written so the next licence expiry does not require this investigation again.

## 4. Implementation Details

* **Service:** `apps/web` (System Admin journey executes the revoke); `libs/publication` processing pipeline is the dispatch call site; `apps/postgres` holds the subscriber data.

* **Expected code change: none.** Every capability required by the acceptance criteria already exists and is tested. The deliverable is an executed, evidenced configuration change plus documentation. A PR is only expected for Phase 5 (docs) and, in the legacy-path case, a follow-up cleanup ticket. Resist the temptation to add an `expiresAt` column or a scheduled job to make this feel like development work.

* **Dependency:** Gate 0 written licence confirmation. There is no code dependency and no PR that must merge first.

* **Mechanism of revocation — subscription rows, not credentials.** Both dispatch functions return early when `findSubscribersByListType` yields an empty array, logging `Third-party push skipped: no subscribers for listTypeId <n>` (`libs/legacy-third-party-fulfilment/src/service.ts:68-72` and `:91-95`). Clearing subscriptions is therefore the authoritative off-switch. Deleting Key Vault secrets is defence-in-depth, not the switch itself.

* **Impacted areas:**
  * `third_party_user`, `third_party_subscription`, `third_party_secret` (local/non-Key-Vault fallback) — rows removed for one subscriber only.
  * Azure Key Vault `THIRD_PARTY_KEY_VAULT` — five secrets soft-deleted.
  * `audit_log` — two new rows (`Update third party subscriptions`, `Delete third party user`).
  * `third_party_push_log` — stops accruing rows for the affected list types. Historical rows are retained as evidence; **do not** delete them.
  * No impact on CaTH public-facing pages, subscriber email notifications, or the inbound publication ingestion API.

* **Other third parties are unaffected.** The modern model is per-subscriber (subscriptions keyed on `thirdPartyUserId`, secrets namespaced `third-party-<userId>-*`), so revoking Courtsdesk cannot disturb another subscriber — *provided* the legacy shared-secret trap in Phase 2a is respected.

* **Environments:** execute in a lower environment (local or STG) first to rehearse the sequence and capture the skip log, then in the live environment at the agreed cut-off. There is currently no prod deployment of this service; if one exists by March 2027, treat the live environment as the one carrying real restricted data and make it the subject of Phase 4's 48-hour and 7-day checks.

* **Rollback.** If the licence is extended *after* revocation, re-onboarding is a fresh create: `/third-party-subscribers/create`, re-enter OAuth config (the vendor must supply credentials again, or the Key Vault secrets must be recovered from soft-delete within the vault's retention window), and re-apply the subscription/sensitivity matrix recorded in Phase 1. This is why Phase 1's before-state record is mandatory rather than nice to have.

* **Access required:** System Admin role in the target environment (`USER_ROLES.SYSTEM_ADMIN` — every `/third-party-subscribers/*` handler is wrapped in `requireRole`), read access to the application database for the push-log checks, and reader access to the third-party Key Vault.

* **No user-facing content changes**, and therefore no Welsh content work: no new pages, labels, hint text or error messages are introduced. The existing System Admin journey already ships `en.ts`/`cy.ts` for every page used here.

### Decision and execution flow

```
                    ┌───────────────────────────────┐
                    │  Gate 0: licence status        │
                    │  confirmed in writing?         │
                    └───────────────┬───────────────┘
                     extended        │        expired, no extension
            ┌────────────────────────┴────────────────────────┐
            v                                                 v
  ┌─────────────────────┐                     ┌─────────────────────────────┐
  │ Re-date issue to    │                     │ Phase 1: identify the live   │
  │ new expiry, comment │                     │ integration (read-only)      │
  │ evidence, back to   │                     └──────────────┬──────────────┘
  │ backlog. NO change. │                                     │
  │        (AC2)        │              ┌──────────────────────┴──────────┐
  └─────────────────────┘      modern  │                          legacy │
                                       v                                 v
                        ┌──────────────────────────┐   ┌──────────────────────────────┐
                        │ Phase 2                   │   │ Phase 2a                      │
                        │ 1. subscriptions →         │   │ delete Courtsdesk rows from   │
                        │    all "Unselected"        │   │ legacy_third_party_*          │
                        │    (THE off-switch)        │   │                               │
                        │ 2. delete subscriber       │   │ DO NOT touch COURTEL_API_URL  │
                        │    → deleteSecrets()       │   │ / COURTEL_CERTIFICATE —       │
                        │    → cascade subscriptions │   │ shared with Courtel           │
                        └──────────────┬───────────┘   └──────────────┬───────────────┘
                                       └────────────┬─────────────────┘
                                                    v
                                 ┌──────────────────────────────────────┐
                                 │ Phase 3: disable OAuth client in IdP │
                                 │ + remove any network allow-list      │
                                 └──────────────────┬───────────────────┘
                                                    v
                                 ┌──────────────────────────────────────┐
                                 │ Phase 4: verify                       │
                                 │ • "push skipped: no subscribers" log  │
                                 │ • zero new third_party_push_log rows  │
                                 │ • re-check at 48h and 7 days          │
                                 └──────────────────┬───────────────────┘
                                                    v
                                 ┌──────────────────────────────────────┐
                                 │ Phase 5: document + close (AC1)      │
                                 └──────────────────────────────────────┘
```

### Where the off-switch sits in the publication pipeline

```
  Publication received / removed
             │
             v
  libs/publication/src/processing/service.ts:867   (and remove-list-confirmation:131)
             │
             v
  sendThirdPartyPublications() / sendThirdPartyDeletion()
             │
             ├── resolveCourtelSecrets() ── env missing ──> skip (logs error)
             │
             ├── findSubscribersByListType(listTypeId)
             │        │
             │        └── [] ──> skip:  "Third-party push skipped: no subscribers
             │                           for listTypeId <n>"      <<< TARGET STATE
             │
             v
  pushWithRetry(url, cert, headers, body) ──> third_party_push_log row
```

## 5. Definition of Done (Technical)

* [ ] Written licence-expiry (or extension) confirmation is attached to the issue, naming who confirmed it and when.
* [ ] Phase 1 before-state is recorded on the issue: subscriber ID, every subscribed list type with its sensitivity, which secrets were populated, which table held the record, and the 7-day baseline push-log counts.
* [ ] Courtsdesk has zero rows in `third_party_subscription` (or `legacy_third_party_subscription`), and no subscriber row remains.
* [ ] All five `third-party-<id>-*` Key Vault secrets are confirmed deleted; if irrecoverable removal was required, the purge is evidenced separately.
* [ ] The OAuth client registration is disabled or deleted in the issuing identity provider, evidenced by the infrastructure owner.
* [ ] Lower-environment rehearsal captured the `Third-party push skipped: no subscribers for listTypeId <n>` log line for a previously subscribed list type.
* [ ] Live-environment push-log checks at cut-off, +48 hours and +7 days all return zero rows for the affected list types; output attached to the issue.
* [ ] Audit log viewer shows `Update third party subscriptions` and `Delete third party user` entries for the acting System Admin with the correct subscriber name and ID.
* [ ] Historical `third_party_push_log` rows are intact — nothing was deleted to "tidy up".
* [ ] No other third-party subscriber lost access: `/third-party-subscribers` still lists the remaining subscribers with their subscriptions unchanged, and Courtel traffic (if any) is still flowing in the push log.
* [ ] `docs/` updated with the grant/revoke procedure, the subscription-driven off-switch, and the `COURTEL_*` shared-secret hazard.
* [ ] Existing automated tests still pass unchanged — `yarn test` and `yarn test:e2e:all`. Specifically `libs/legacy-third-party-fulfilment/src/service.test.ts` (early-return on no subscribers / missing env) and `e2e-tests/tests/system-admin/third-party-user-management.spec.ts` (create, manage subscriptions, delete journeys, including Welsh and accessibility assertions) already cover the mechanism being relied on. **No new tests are required**; if the implementer finds themselves writing one, that is a signal the scope has drifted into building something.
* [ ] Issue closed with an explicit statement of what was turned off, when (timestamp), in which environments, and by whom.
* [ ] Coverage and performance DoD items from the standard template are **not applicable** — no business logic is added and the change strictly reduces outbound work per publication.

## 6. Security & Risks

**Unlawful disclosure of restricted data by silent overrun.** Courtsdesk's subscriptions may include `PRIVATE` and `CLASSIFIED` list types. Nothing in CaTH enforces the licence end date — there is no `expiresAt` on `ThirdPartyUser` and no scheduled cut-off — so access persists indefinitely until a human acts. A ticket sitting in the backlog is the only control. Mitigation: a calendar reminder owned by a named person, set at least two weeks before the expiry date and independent of this issue's backlog position; the ticket alone is not a control.

**Cutting off the wrong vendor.** `COURTEL_API_URL` and `COURTEL_CERTIFICATE` are a single shared endpoint and certificate, mapped from Key Vault in `apps/web/helm/values.yaml:84-86`, `values.dev.yaml:59-61` and `helm/cath-service/values.preview.template.yaml:100-102`. Unsetting or re-pointing them to revoke Courtsdesk would silently stop all legacy third-party delivery, including Courtel's. Mitigation: Phase 1 identification is mandatory before any change; Phase 2a forbids touching the shared config; the DoD requires positive confirmation that remaining subscribers still have access.

**Revoking credentials but not the data flow, or the reverse.** Deleting the Key Vault secrets stops CaTH *sending* but leaves the vendor's `client_id`/`client_secret` valid at the identity provider; clearing subscriptions stops dispatch but leaves credentials live. Either on its own leaves a hole — a restored secret or a re-created subscription silently resumes delivery. Mitigation: Phases 2 and 3 are both required, in that order, and both are DoD items.

**Soft-deleted secrets are recoverable.** `deleteSecrets()` calls `beginDeleteSecret`, which on a soft-delete-enabled vault leaves recoverable secrets for the retention period. Anyone with Key Vault recover permission can restore Courtsdesk's destination URL and credentials. Mitigation: decide explicitly, with the security owner, whether soft-delete is sufficient; if not, purge as a deliberate recorded step, accepting that it forecloses the rollback path in Section 4.

**Irreversibility of subscriber deletion.** `ThirdPartySubscription` cascades on delete and `deleteSecrets()` runs before `deleteThirdPartyUser()`. Once confirmed, the subscription/sensitivity matrix is gone. If the licence is extended a week later, the configuration must be rebuilt from whatever was written down. Mitigation: Phase 1's before-state record is a hard prerequisite, not documentation for its own sake.

**Acting on an unverified expiry date.** Revoking while an extension is in fact being signed breaks a paying vendor's service and, because deletion is irreversible, is expensive to undo. Conversely, accepting a verbal "I think it's been extended" leaves restricted data flowing without authority. Mitigation: Gate 0 requires written confirmation either way; neither branch proceeds on an assumption.

**Deleting the audit trail.** `third_party_push_log` is the only record of what was sent to Courtsdesk and when, and `audit_log` is the only record of who revoked access. Both will be needed if the disclosure period is ever questioned. Mitigation: the DoD explicitly requires historical push-log rows to be left intact; no cleanup of either table forms part of this ticket.

**Mid-publication cut-off.** Dispatch is fired without `await` (`.catch()` only) from the processing pipeline, so a push can be in flight while subscriptions are being cleared. A single publication may be delivered moments after the recorded cut-off. Mitigation: agree the cut-off with the vendor so it falls outside a publishing window, and treat the Phase 4 checks — not the clock — as the evidence that delivery has stopped.

**Credentials surfacing in the wrong place.** The admin OAuth-config page reads the stored `clientSecret` back into the form and session, and locally secrets fall back to the `third_party_secret` table in plain text (`libs/third-party-user/src/key-vault-service.ts:16-28`). During Phase 1, record only the *presence* of secrets, never their values, and keep them out of issue comments, screenshots and PR descriptions.


### Comment by OgechiOkelu on 2026-10-22T15:21:50Z

@plan 

