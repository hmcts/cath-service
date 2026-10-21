# Legacy data migration: pip-data-management + pip-account-management → cath-service

A one-way, full-snapshot sync from the legacy CaTH databases and storage into this service. It runs nightly as two cron jobs while legacy is still live, and a final run at cutover does the migration. Each run reads all of legacy, transforms it, writes it (unless it is a dry run), checks what it wrote and reports the results.

Code lives in `libs/legacy-migration`. The cron entry points are in `apps/crons`.

## 1. Jobs

| Script (`SCRIPT_NAME`) | Reads | Writes |
|---|---|---|
| `legacy-sync` (accounts) | account-management DB, legacy `files` container, legacy OAuth vault | `user`, `subscription`, `subscription_list_type`, `legacy_third_party_user`, `legacy_third_party_subscription`, `third_party_user`, `third_party_subscription`, `media_application`, `audit_log`, proof-of-ID files, third-party secrets |
| `legacy-sync-publications` | data-management DB, legacy `artefact` and `publications` containers | `location_metadata`, `list_search_config`, `artefact`, `artefact_search`, payload blobs, PDF and Excel files; location drift report |

- Legacy DBs are read with raw `pg` queries, inside one read-only, repeatable-read snapshot per run, with timestamps read as UTC. Legacy schemas are not in Prisma. All writes go through the Prisma client.
- Rows are written straight to the tables, never through the publication ingest path, so a run cannot send emails or third-party pushes.
- **Dry run is the default.** Nothing is written unless `LEGACY_SYNC_APPLY=true`.

### Config

| Variable | Purpose |
|---|---|
| `LEGACY_ACCOUNT_DATABASE_URL` / `LEGACY_PUBLICATION_DATABASE_URL` | Read-only roles on the two legacy DBs. Required by each job. |
| `LEGACY_STORAGE_ACCOUNT_NAME` (managed identity) or `LEGACY_STORAGE_CONNECTION_STRING` | Legacy storage, read only. |
| `LEGACY_THIRD_PARTY_KEY_VAULT` | Legacy OAuth vault. Optional: when unset, the secret copy is reported as skipped. |
| `THIRD_PARTY_KEY_VAULT` | Where third-party secrets are written (`cath-tp-{env}`). When unset they fall back to the `third_party_secret` table, as the admin pages do. |
| `LEGACY_SYNC_APPLY` | `true` to write. Anything else is a dry run. |
| `LEGACY_SYNC_MAX_DROP_RATIO` | Row-count guard ratio (§2). Default `0.05`. |

### Deployment

`helm/cath-service` has two more releases of the crons chart, both behind `legacySync.enabled` (default `false`):

- `cath-crons-legacy-sync`, at 02:00 UTC
- `cath-crons-legacy-sync-publications`, at 03:00 UTC

On demo, ithc and perftest, `job.helm-deploy.yml` moves the two runs to 06:00 and 07:00 UTC instead. Those clusters are auto-shut down from about 19:15 to 05:35 UTC, and the job chart skips any run more than 20 minutes late, so a night-time run would never happen there. Aat and prod stay up overnight.

Both are set to `LEGACY_SYNC_APPLY: "false"`. They read `legacy-account-database-url` / `legacy-publication-database-url` and `legacy-storage-account-name` from the `cath` vault. The CSI mount fails the pod if one of those secrets is missing.

They keep the chart's active-cluster check on, so they run only where `global.activeCronCluster` is true (set in `values.template.yaml`) and are suspended everywhere else. This stops two clusters racing delete-and-reload transactions against one database.

Don't enable them on `aat`: an applied run would wipe E2E users and subscriptions.

## 2. How a run works

### Accounts: replace

All nine account tables are replaced in one transaction: delete children first, then insert parents first with `createMany`. A failure rolls back and leaves the previous night's data in place. `DELETE` is used, not `TRUNCATE`, so the running app keeps reading the old rows until commit.

- **Users.** Every user the sync writes has `is_legacy_migrated = true`. Only those users and their subscriptions are replaced. Users created in this service (for example testers who signed in) are kept with their subscriptions, unless their `userProvenanceId` matches a legacy user. `userProvenanceId` is unique, so in that case the local row is deleted and the legacy row takes its place. The user picks it up by provenance ID on their next sign-in.
- **Other account tables** are replaced in full.
- **After the transaction:** proof-of-ID files no longer referenced by a migrated application are deleted, OAuth secrets are copied, and secrets for removed third parties are deleted.

### Publications: replace, plus upsert and delete for artefacts

`location_metadata` and `list_search_config` are replaced in full. For artefacts:

- **Rows.** Rows are inserted or updated by `artefactId`, and rows not in the source are deleted. Deleting cascades to `artefact_search`.
- **Change detection.** After an artefact's derived data is built, its copied payload blob is stamped with legacy `last_received_date` (metadata `legacylastreceived`). An artefact whose stamp matches skips the payload copy and the derived-data step. If the derived data fails, the artefact gets no stamp and is retried next run.
- **Blobs.** Payloads and generated files of removed artefacts are deleted.

### Row-count guard

`row-count-guard.ts`. A table may shrink by at most `max(50, ratio × existing rows)`, and a populated table is never emptied. On an applied run a violation aborts the run with no writes. A dry run reports it as `WOULD BE REFUSED` and carries on. There are two exceptions:

- **Artefacts** use a ratio of at least 0.5, because displayable lists churn daily and drop sharply over weekends.
- **`media_application`** may be emptied, because every pending application can be approved or rejected.

For `user`, `subscription` and `subscription_list_type`, the guard counts migrated users' rows only.

### Write check

`write-drift.ts`. After an applied run writes, still inside the transaction, each table is read back and compared field by field with the rows the run meant to write. Any missing, unexpected or differing row is reported by id and aborts the run, which rolls it back.

### Report, rejections and failure

Every legacy row is either loaded or rejected with a reason. The report lists, per table, rows read, existing, loaded and rejected, grouped by reason, plus the step results (location drift, derived data, secret copy).

Rejections are classified by `rejection-policy.ts`:

- **Accepted.** Reported but not blocking. These are rejections that recur every night by design:
  - third parties routed to their own tables
  - legacy V1.16 duplicate subscriptions
  - non-`ACTIVE` OAuth subscribers and their subscriptions
  - `INTERNAL` sensitivity
  - `JUDGEMENTS_AND_OUTCOMES`, `GENERAL_PUBLICATION` and `LCSU` artefacts
  - empty legacy list type filters (see `subscription_list_type` in §3.1)
- **Blocking.** Every other reason, including any reason added later. A drop-limit violation is blocking too.

The report ends with `blocking issues: N`. `run-sync-job.ts` fails the job when N > 0, dry runs included, so the CronJob run shows as failed.

If a run aborts (guard or write check), it throws `SyncAbortedError`, which carries the report built before the abort. The report is logged before the job fails.

### Run history in App Insights

Every run sends one `LegacySyncRun` custom event: clean, blocking, aborted and failed runs, dry runs included. Its properties are:

- `sync` (`accounts` or `publications`)
- `outcome` (`clean`, `blocking`, `aborted` or `failed`)
- `isDryRun`, `blockingIssues`, `blockingReasons` (reason → count), and `abortReason` on aborts
- `<table>.read/existing/loaded/rejected` and `<step>.processed/rejected/skipped`

Properties hold counts, reasons and ids only, never emails or names. The crons runner passes its `MonitoringService` to each script.

```kusto
customEvents
| where name == "LegacySyncRun"
| extend sync = tostring(customDimensions.sync), outcome = tostring(customDimensions.outcome), isDryRun = tostring(customDimensions.isDryRun)
| summarize arg_max(timestamp, outcome, isDryRun) by sync, night = startofday(timestamp)
| order by night desc, sync asc
```

## 3. Entity mapping

Legacy primary keys are kept throughout. List type names are mapped to `list_types.id` at run time, by name. Locations are checked against the `location` table.

### 3.1 Accounts

| Legacy | New | Treatment |
|---|---|---|
| `pi_user` | `user` | Sign-in provenances only (`PI_AAD`, `SSO`, `CFT_IDAM`, `CRIME_IDAM`). Keep `userId`. Map `forenames`→`firstName`, `roles`→`role` (unmapped roles are rejected) and `provenanceUserId`→`userProvenanceId`. Crime IDs are written as `CRIME_IDAM:<subname>`. Lowercase and trim `email`. Copy `createdDate`, `lastSignedInDate` and `last_verified_date`. Set `is_legacy_migrated`. |
| `subscription` | `subscription` | Keep `id`. Map `searchType`: `LOCATION_ID`, `CASE_NUMBER` and `CASE_NAME` as-is; `CASE_ID` and `CASE_URN` → `CASE_NUMBER`. Copy `caseName`/`caseNumber` and `createdDate`→`dateAdded`. Reject unknown locations. Duplicates on `(userId, searchType, searchValue)`, left by legacy V1.16, keep the oldest; the rest are rejected. `API_COURTEL` rows go to the Courtel tables. |
| `subscription_list_type` | `subscription_list_type` | Map list type names. Copy `list_language`. One row per user; extras are rejected. Unmapped names are dropped and reported, and a row with nothing mappable is rejected. A row with an empty `list_type` array is skipped: legacy reads that as every list type at the user's locations, which here means having no row. Its language filter is lost. |
| `pi_user` (`THIRD_PARTY`) + `subscription` (`API_COURTEL`) | `legacy_third_party_user` + `legacy_third_party_subscription` | Courtel. Keep the user id; the name comes from `provenance_user_id`. `LIST_TYPE` subscriptions only, mapped and deduped per list type. |
| `api_user` | `third_party_user` | `ACTIVE` only. Keep `user_id`→`id`, `name` and `created_date`. |
| `api_subscription` | `third_party_subscription` | Subscriptions of migrated subscribers only. Map list type name, copy `sensitivity`, dedupe `(user, list type)`. |
| `api_oauth_configuration` + legacy vault | `third-party-<id>-{client-id,client-secret,scope,destination-url,token-url}` in `THIRD_PARTY_KEY_VAULT` | Secret names come from the legacy row and values from the legacy vault. `destination_url` and `token_url` come from the legacy columns. Writes are idempotent sets, done outside the transaction. Values are never logged. |
| `media_application` | `media_application` | `PENDING` only. Keep `id`. Map `full_name`→`name`, lowercased `email`, `employer`, `request_date`→`applied_date`. Copy legacy `files/<image>` to `files/<id><ext>`, with the lowercased extension taken from `image_name`. Set `proof_of_id_path` to that key and `proof_of_id_original_name` to `image_name`. Reject missing images and extensions the upload page would not accept. |
| `audit_log` | `audit_log` | The rolling 90 days legacy keeps. Keep `id`. Copy `user_id`, `user_email`, `user_provenance`, `details` and `timestamp`. Copy `roles`→`user_role` and `action` raw. |

### 3.2 Publications

| Legacy | New | Treatment |
|---|---|---|
| `location` | — (report only) | Not synced: `location-data.ts` is hand-maintained. The `location_drift` step compares by id: name, Welsh name, regions and sub-jurisdictions (from `jurisdiction_type`), all by name. It reports ids missing on either side, and any legacy `email` or `contact_no`, which `location-data.ts` cannot hold. Drift is blocking. |
| `location_metadata` | `location_metadata` | Keep the id. Trim the four messages, converting empty strings to null. Set `updated_at`. Reject unknown locations, rows with no message, and messages that fail `validateLocationMetadataInput`. |
| `list_search_config` | `list_search_config` | Keep the id. Map list type name. A config may set one field name; the other is stored as blank, which the extractor skips. Reject a config with neither, a field name over 100 characters, or a second config for the same list type. |
| `artefact` | `artefact` | Scope: `display_to IS NULL OR display_to > now()`. Field rules are below. |
| `artefact` container | `artefact/<artefactId>` | The legacy `payload` URL points to a randomly named blob. The sync pod downloads it and uploads it under the artefact id with the right content type. A blob shared by several artefacts is copied once per artefact. |
| `publications/<id>.pdf`, `<id>.xlsx` | `publications` container | Copied for JSON artefacts, not regenerated. If legacy doesn't have a file, any existing copy is deleted. `<id>_cy.pdf` is not copied, because nothing here serves it, so Welsh and bilingual lists lose their Welsh PDF. |
| — | `artefact_search` | Rebuilt from the copied payload: delete the artefact's rows, then call `extractAndStoreArtefactSearch`. |

Artefact field rules:

| Legacy | New | Rule |
|---|---|---|
| `artefact_id` | `artefact_id` | keep |
| `list_type` | `list_type_id` | name → id; reject unknown |
| `location_id` | `location_id` | keep; reject a numeric id not in `location`. `NoMatch<id>` is kept. |
| `content_date` | `content_date` | truncate to a date |
| `type` | `type` | `LIST` only; reject `JUDGEMENTS_AND_OUTCOMES`, `GENERAL_PUBLICATION` and `LCSU` |
| `sensitivity` | `sensitivity` | reject `INTERNAL` |
| `language` | `language` | `BI_LINGUAL` → `BILINGUAL` |
| `display_from/to`, `last_received_date`, `superseded_count`, `provenance`, `is_flat_file` | same | copy |
| `source_artefact_id` | `source_artefact_id` | Flat files only: if the id doesn't already end in a served extension, append one detected from the file's signature (`%PDF`, OLE for doc, ZIP for docx/xlsx, HTML, CSV). For example, `SNL-7` becomes `SNL-7.pdf`. An unidentifiable file is rejected. |

The derived-data step runs only for new or changed JSON artefacts:

1. Validate the payload with `validateListTypeJson`. An invalid payload is still loaded, and the failure is reported.
2. Rebuild `artefact_search`.
3. Copy the PDF and Excel files.

Flat files are only stamped. An artefact whose step fails is reported and retried next run.

### 3.3 Mappings

`value-mapping.ts` holds the role, provenance, search type and email mappings, and `LIST_TYPE_RENAMES`. `LIST_TYPE_RENAMES` maps legacy `ListType` enum names to `list_types.name` where they differ, for example `UT_IAC_JR_*`→`UTIAC_JR_*`, `RPT_*`→`FTT_RPT_*` and `CROWN_ADVANCE_PDDA_LIST` and `CROWN_WARNED_PDDA_LIST`→`CROWN_ADVANCED_PDDA_LIST` (legacy V1.25/V1.26 renamed the Crown Warned List to the Crown Advance List, and #957 renamed it here). Names with no mapping and no matching list type are reported as `unknown list type`.

Legacy reads are ordered (by created date, then id), so wherever two legacy rows collapse into one, the same row wins every night.

### 3.4 Not migrated

`pi_user_archived`, `artefact_archived`, `location_reference`, legacy MI views, and the new-only tables (`notification_audit_log`, `legacy_third_party_push_log`, `ingestion_log`, `third_party_secret`).

## 4. Outbound switch

While legacy is live, an environment holding migrated data must not email users, push to third parties or write to B2C. `@hmcts/outbound` exports `isOutboundEnabled()`, which returns false only when `OUTBOUND_ENABLED` is exactly `"false"`. Web and api set it through `${OUTBOUND_ENABLED:-true}` in `helm/cath-service/values.template.yaml`, so environments that don't set it behave as before.

When it is off:

| Chokepoint | Behaviour |
|---|---|
| Subscription and system-admin emails (`libs/notifications`) | Skipped before attachments are uploaded. The notification audit row is marked `Skipped`. |
| Media emails (`libs/notification`) | Skipped. Approval and rejection still complete. |
| Courtel push (`libs/legacy-third-party-fulfilment`) | Skipped, with no retries and no push-log rows. |
| Graph user create/update (`libs/auth`) | Throws, so a media approval stops before any local write and the application stays `PENDING`. |
| LCSU S3 upload (`libs/pdda-html-upload`) | Skipped. The publisher still gets 201. |

Each skip logs one line, with no PII.

## 5. Schema and supporting changes

- `user.last_verified_date` (migration `20261008000000_add_user_last_verified_date`). Copied from legacy; not yet written by this service.
- `user.is_legacy_migrated` (migration `20261014000000_add_user_is_legacy_migrated`). Default `false`; set only by the sync.
- `@hmcts/azure-blob`: `setBlobMetadata`, and `getBlobProperties` now returns blob metadata.
- `@hmcts/location`: exports `validateLocationMetadataInput`.
- `apps/crons`: the runner passes its `MonitoringService` to the script's default export.

## 6. Code layout (`libs/legacy-migration/src`)

| Folder | Contents |
|---|---|
| `account/` | Account-management reader (`legacy-account-source.ts`), the account transforms (`user-`, `subscription-`, `list-type-subscription-`, `courtel-`, `oauth-third-party-`, `media-application-`, `audit-log-transform.ts`; pure, returning rows and rejections) and the accounts orchestrator (`run-legacy-sync.ts`) |
| `publication/` | Data-management reader (`legacy-publication-source.ts`), the publication transforms (`location-metadata-`, `list-search-config-`, `artefact-transform.ts`, `artefact-plan.ts`, `flat-file-type.ts`), `location-drift.ts` and the publications orchestrator (`run-publication-sync.ts`) |
| `blob/` | Legacy storage reader (`legacy-storage-source.ts`), payload copy (`artefact-payload.ts`), derived data (`artefact-derived-data.ts`) and proof-of-ID copy (`proof-of-id-copy.ts`) |
| `key-vault/` | Legacy vault reader (`legacy-secret-source.ts`) and the OAuth secret copy (`oauth-secret-copy.ts`) |
| `sync/` | Shared by both jobs: `value-mapping.ts`, `row-count-guard.ts`, `write-drift.ts`, `rejection-policy.ts`, `sync-report.ts`, and the job wrapper `run-sync-job.ts` (logging, failing, App Insights) |

The cron entries are `apps/crons/src/legacy-sync.ts` and `apps/crons/src/legacy-sync-publications.ts`.

Transforms and orchestrators are unit tested. The orchestrator tests use mocked transactions that read back what was written, to check write order, dry run, the guard, the write check, and the file and secret steps.

## 7. What's left

Checked against open `hmcts/cath-service` issues on 2026-10-15. "No ticket" means no open issue covers it. Project board statuses were not checked.

### Before any run, dry runs included

| Need | Ticket |
|---|---|
| Read-only roles on both legacy DBs, and a private network path to them from the cath clusters | No ticket |
| Read access to the legacy `artefact`, `publications` and `files` containers for the sync identity | No ticket |
| `legacy-account-database-url`, `legacy-publication-database-url` and `legacy-storage-account-name` in the `cath` vault | No ticket |
| Every legacy list type mapped to a list type here. Unmapped ones are blocking rejections, so no run is clean until they are. | No ticket for a parity check; list types are built one ticket each |
| `location-data.ts` matching the legacy locations. Drift and unknown locations are blocking. | No ticket |
| `legacySync.enabled: true`, with `global.activeCronCluster: true` on exactly one cluster | No ticket |

### Before apply runs

| Need | Ticket |
|---|---|
| `OUTBOUND_ENABLED=false` on the target environment | Config only; the switch is built (§4) |
| Write access to the new storage and to `cath-tp-{env}` | No ticket |
| The legacy OAuth vault identified, `get` access to it, and `LEGACY_THIRD_PARTY_KEY_VAULT` set. Until then the secret copy is skipped, which doesn't block anything else. | No ticket |
| A non-prod environment to apply to | Perftest is available. Ithc is blocked until 2026-12-21 (#1067). |

### Open from the coverage audit (2026-10-15)

The legacy enums live in `pip-data-models`, which wasn't available, so they were rebuilt from pip-frontend's `listLookup.json` and their use in legacy code.

| Need | Notes |
|---|---|
| Decide how list-type subscriptions behave | In legacy, `subscription_list_type` narrows a user's location subscriptions, and a user with no row gets no location emails (`SubscriptionRepository.findSubscriptionsByLocationSearchValue`). Here a row is a national subscription and turns the user's location subscriptions off. Migrated users would get their list types from every court. Blocks re-enabling outbound. |
| Courtel sensitivity | Legacy only sends CLASSIFIED lists to third parties whose role allows them. `legacy_third_party_user` has no role, and fulfilment pushes by list type only. |
| 20 legacy list types with no target | The 15 Rolls Building CHD/KB sub-lists, `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS`, and both Technology and Construction Court lists. Each needs a list type, a rename or an accepted drop. |
| Location email and contact number | `location-data.ts` and the seed have no contact details, so legacy values are reported as drift. |
| Prod data checks | Whether `display_from/to` hold UTC or London wall-clock time (legacy runs in Europe/London; the sync reads UTC). Counts of `PENDING` `api_user` rows, `CASE_ID`/`CASE_URN` subscriptions with no `CASE_NUMBER` twin, `LIST_TYPE` subscriptions on the email channel, subscribers with more than one OAuth configuration, and artefacts that would share `(location, content_date, language, list_type, provenance)`, which legacy keeps unique and this service doesn't. |

### Before cutover

| Need | Ticket |
|---|---|
| Prod environment | #1097 |
| Artefact expiry and audit log retention | #352 |
| Inactive accounts and media re-verification, which use `last_verified_date` | #351, with #894 and #918 for the deleted-accounts archive |
| B2C login using `oid` before `sub`, so media users match their migrated row | No ticket. #1032 (`PI_AAD` provenance) was partly done in #1052 and is still open. |
| Crime login using `subname`, to match migrated `CRIME_IDAM:<subname>` ids | No ticket. #624 covers Crime OIDC setup, not this. |
| Lowercasing emails on every write, and refreshing them from the IdP on login | No ticket |
| Real location references in place of the synthetic seeded ones, so ingestion matches | No ticket |
| Push to OAuth third parties, which nothing reads `third_party_*` for yet | Epic #836, but no ticket for the push itself |
| Check that migrated subscriptions email the same people legacy does | No ticket |
| Traffic switch to this service | #655 (proxy). This differs from a Front Door/APIM switch, so pick one. |
