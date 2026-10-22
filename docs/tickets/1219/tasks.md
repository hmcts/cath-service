# Tasks — #1219: Turn off Courtsdesk API Integration with CaTH

Conditional tasks are tagged **[A]** modern subscriber, **[B]** legacy subscriber,
**[C]** not present in this service. Phase 1 determines which apply.

## Implementation Tasks

### Gate 0 — licence decision (blocks everything below)

- [ ] Obtain **written** confirmation from the contract/commercial owner of either (a) licence expired with no extension, or (b) licence extended to a stated date. Attach it to the issue naming who confirmed it and when
- [ ] Resolve the date conflict before acting: issue title says "review by March 2027", body says six months from the connection date, and the connection date is unstated
- [ ] **If extended:** update the issue title and body to the new expiry date, comment the extension evidence, reset the calendar reminder to the new date with a named owner, return the ticket to the backlog. Make **no** data, config, credential or code change. Then run the AC2 no-change check below and stop
- [ ] **If expired:** record the agreed effective cut-off date and time on the issue, and agree it with the Courtsdesk relationship owner so the cut does not land mid-publishing-window
- [ ] Confirm the named owner of the calendar reminder is recorded on the issue (the backlog ticket is not a control)

### Phase 1 — read-only identification (no changes)

- [ ] Obtain the PUB-3328 implementation record and establish which mechanism was configured at onboarding
- [ ] In the target environment, query `third_party_user` for a Courtsdesk row (match on `name`) and record `id`, `name`, `created_at`
- [ ] Query `legacy_third_party_user` for a Courtsdesk row and record `id`, `name`, `created_date`
- [ ] Decide the finding: **[A]** modern only, **[B]** legacy only, **[C]** neither, or both (treat as [B] first, then [A])
- [ ] **[A]** Record every row in `third_party_subscription` for that `third_party_user_id` — `list_type_id` and `sensitivity`. This is the rollback record
- [ ] **[B]** Record every row in `legacy_third_party_subscription` for that `user_id` — `list_type_id` and `created_date`. Note there is **no** `sensitivity` column, so this vendor had no sensitivity filtering
- [ ] **[A]** Open `/third-party-subscribers/<id>/oauth-config` and record which of the five secrets are populated — **presence only, never values**
- [ ] Confirm whether the environment has `THIRD_PARTY_KEY_VAULT` set, or whether secrets are in the plaintext `third_party_secret` table
- [ ] Capture a 7-day baseline from **`legacy_third_party_push_log`** grouped by `list_type_id` for the recorded list types. Note in the comment that this table has no subscriber reference, so the baseline is per-list-type only
- [ ] Identify which of the recorded list types are subscribed by **any other** vendor — only list types held by no other vendor can yield meaningful zero-row evidence later
- [ ] Confirm whether anything other than `libs/third-party-user/src/third-party-user-service.ts` reads `thirdPartySubscription`. If nothing does, state on the issue that no dispatcher serves the modern tables
- [ ] Post all Phase 1 findings as a comment on the issue **before** changing anything
- [ ] **[C]** Record the empty query results, state explicitly that Courtsdesk is not served by this service, redirect the ticket to the owning team, and skip Phase 2 entirely

### Phase 2A — revoke, modern subscriber **[A]**

- [ ] `/third-party-subscribers/<id>/subscriptions/manage` — set every list type to `Unselected` and save
- [ ] Confirm `Update third party subscriptions` appears in the Audit log viewer for the acting System Admin
- [ ] Confirm `third_party_subscription` has zero rows for that `third_party_user_id`
- [ ] `/third-party-subscribers/<id>/delete/confirmation` — select "Yes" and confirm
- [ ] Confirm `Delete third party user` appears in the Audit log viewer with the recorded name and ID
- [ ] Verify independently (in the vault, or in `third_party_secret`) that all five `third-party-<id>-{destination-url,token-url,scope,client-id,client-secret}` secrets are gone — `deleteSecrets()` swallows errors, so a successful page render is not evidence
- [ ] Confirm `/third-party-subscribers` no longer lists Courtsdesk

### Phase 2B — revoke, legacy subscriber **[B]**

- [ ] Confirm that no admin UI can manage legacy records, so a direct database change is required. Raise it through database change control
- [ ] Prepare a reviewed Prisma migration (or a DBA-executed statement) deleting Courtsdesk's `legacy_third_party_subscription` rows, scoped to its `user_id` only, then its `legacy_third_party_user` row
- [ ] Open a PR for the change, referencing this issue and the change-control record. Note on the PR that no audit-log row is produced by a direct database change, so the PR plus the change record is the change evidence
- [ ] Apply the change in a lower environment first, then in the target environment at the agreed cut-off
- [ ] Confirm `legacy_third_party_subscription` has zero rows for that `user_id` and the `legacy_third_party_user` row is gone
- [ ] **Do not** unset, blank, re-point or remove `COURTEL_API_URL` / `COURTEL_CERTIFICATE` or their Helm aliases (`apps/web/helm/values.yaml:84-86`, `values.dev.yaml:59-61`, `helm/cath-service/values.preview.template.yaml:100-102`) — shared with Courtel
- [ ] Only if Phase 1 proved Courtsdesk was the sole consumer of those env vars, raise a **separate** ticket to retire the `COURTEL_*` config and the dispatch call site. Do not fold it into this ticket

### Phase 3 — revoke outside CaTH **[A][B]**

- [ ] Identify the identity provider that issued Courtsdesk's OAuth client and the person who can disable it
- [ ] Disable or delete the OAuth client registration, so cached credentials cannot mint new tokens. Attach confirmation to the issue
- [ ] Confirm with the infrastructure owner whether any network allow-list, firewall rule or private endpoint exists for the Courtsdesk destination; route removal through the normal infrastructure change process
- [ ] Get an explicit decision from the security owner on whether Key Vault soft-delete is sufficient or a purge is required. If purge: execute it as a deliberate recorded step, accepting it forecloses rollback
- [ ] Record who owns the vendor's obligation to delete previously supplied restricted data (out of scope here, but must be named)

### Phase 4 — verification

- [ ] **Scenario 1 (rehearsal, lower environment):** after executing the branch, publish an artefact for a previously-subscribed list type that no other vendor holds; capture `Third-party push skipped: no subscribers for listTypeId <n>` from the application log and confirm no new `legacy_third_party_push_log` row for that `list_type_id`
- [ ] **Scenario 1 (deletion path):** remove a list for the same list type and capture the distinct message `Third-party deletion push skipped: no subscribers for listTypeId <n>`
- [ ] **Scenario 2:** confirm `/third-party-subscribers` still lists every remaining subscriber with subscriptions unchanged against the Phase 1 record
- [ ] **Scenario 2:** confirm `COURTEL_API_URL` and `COURTEL_CERTIFICATE` are still set and their Helm aliases untouched, and that Courtel's push-log rows (if Courtel is active) are still accruing
- [ ] **Scenario 3:** at cut-off, re-run the zero-subscription-rows query and the list-type-filtered `legacy_third_party_push_log` query; attach output to the issue
- [ ] **Scenario 3:** repeat the Scenario 3 checks at +48 hours and attach output
- [ ] **Scenario 3:** repeat the Scenario 3 checks at +7 days and attach output
- [ ] **Scenario 4 [extension branch only]:** confirm the subscriber row, subscription rows, secret presence and `COURTEL_*` config are all unchanged, and push-log rows are still accruing for the subscribed list types
- [ ] Confirm historical `legacy_third_party_push_log` and `audit_log` rows are intact — nothing deleted to tidy up
- [ ] Run `yarn test` and `yarn test:e2e:all` and confirm they pass unchanged. No new automated tests are expected

### Phase 5 — documentation (the only expected code deliverable in **[A]** and **[C]**)

- [ ] Add a short third-party access runbook under `docs/` covering: how access is granted and revoked; that the off-switch is subscription rows, not credentials; that the modern `third_party_user` / `third_party_subscription` tables are read by **no** outbound dispatcher; that there is **no** admin UI for legacy records; the `COURTEL_*` shared-secret hazard; that `legacy_third_party_push_log` carries no subscriber reference and cannot attribute rows to a vendor; and the two distinct skip-log messages
- [ ] Run `yarn lint:fix` and `yarn format` on the docs change
- [ ] Open the documentation PR referencing this issue
- [ ] Close the issue with an explicit statement of what was turned off, when (timestamp), in which environments, and by whom. **[A]** must state that CaTH was not pushing to Courtsdesk from this codebase and the revoke was data hygiene plus identity-provider credential revocation — do not claim a live connection was severed. **[C]** must state that Courtsdesk is not served by this service and name the team the ticket was redirected to
