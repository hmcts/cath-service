# Legacy data migration: pip-data-management + pip-account-management → cath-service

Facts about legacy come from reading pip-data-management, pip-account-management and pip-data-models at HEAD. Legacy Flyway migrations do not describe the full schema, because some tables (`media_application`, parts of `pi_user`) were created by Hibernate. Check column types and nullability against a prod snapshot (`\d+ <table>`) before building each domain.

## 1. Recommended approach

**One-way, idempotent, full-snapshot sync from legacy to new. Run it nightly while both systems are live, then do a final sync in a short write freeze at cutover.**

- **Legacy stays the only system of record until cutover.** The new prod service is not public and takes no user or publisher writes until then. If both systems accept writes, we need bidirectional sync and conflict resolution, and that is where these migrations go wrong. Don't build it.
- **Use full snapshots, not CDC or incremental deltas.** Most legacy tables have no `updated_at` (`pi_user`, `api_user`, `media_application`, `location_metadata`). Deletes are hard deletes (expired artefacts, deleted accounts, unsubscribes). Incremental sync would miss updates and deletes. The datasets are small enough (thousands to low hundreds of thousands of rows) to read in full every night. Debezium or logical replication would be over-engineering for a sync that stops being needed after cutover.
- **Keep legacy primary keys.** `artefactId`, `userId`, subscription `id`, `api_user.userId` and media application `id` are all UUIDs in both systems. Keeping them means a reload produces the same rows every night, keeps blob names lining up (`artefactId`), and keeps existing links such as `?artefactId=` working after cutover.
- **The sync is the rehearsal.** Each nightly run does the whole migration and produces a reconciliation report. By cutover it has run against real prod data many times, so the final sync is the same job we already trust.

### Alternative considered: dual-publish ingestion (forward publications to both systems)

Not recommended as the primary mechanism. The new service would mint different `artefactId`s, which breaks the "PK = identity" model and blob naming. It also doubles every publisher-facing failure mode, and it only covers publications, not accounts or subscriptions. The useful part, exercising the new renderers on real prod payloads, is covered more cheaply by validating and rendering every migrated payload (§7).

## 2. Where the job runs

There are two cron scripts, run through the existing `SCRIPT_NAME` mechanism as Kubernetes CronJobs. Each one reads one legacy database:

| Script | Reads | Domains |
|---|---|---|
| `legacy-sync` (accounts) | account-management DB, `files` container, legacy OAuth vault | users, subscriptions, list-type subscriptions, third parties, media applications, audit log |
| `legacy-sync-publications` | data-management DB, `artefact` and `publications` containers | location drift report, location metadata, list search config, artefacts, payloads, derived data |

A third script, `generate-location-data`, is a one-off: it reads legacy locations and prints a `location-data.ts` candidate for the parity PR (§3).

- **Schedule:** run accounts before publications, after the legacy expiry jobs (for example 02:00 and 03:00).
- **Code location:** mapping and transform logic lives in `libs/legacy-migration/`, following the repo rule of no business logic in apps. There is one pure transform module per domain (`user-transform.ts`, `subscription-transform.ts`, …), each returning the rows to load plus rejections with reasons.
- **Reading legacy:** legacy DBs are read through a **read-only** Postgres role, using raw `pg` queries inside one repeatable-read snapshot. Don't add the legacy schemas to Prisma. Writes go through the Prisma client.
- **Write directly to tables, never through the publication ingest path.** That path triggers subscription emails and third-party push. Derived data is built by calling the generators directly (§5.3), not `processPublication`.
- **Dry run is the default.** Nothing is written unless `LEGACY_SYNC_APPLY=true`.

## 3. Before running against new prod

These are not migration code, but no apply run is safe without them.

1. **Location parity.** `location-data.ts` has 27 locations (ids 1–27).
   - Legacy subscriptions and artefacts reference legacy P&I IDs, so anything for a location missing here is rejected.
   - The seeded `location_reference` rows are synthetic (`SNL`, `locationId + 100`), so real ingestion would not match them either.
   - Location ids in `location-data.ts` must equal legacy P&I IDs. Generate it from legacy once with `generate-location-data` (§5.2), then keep it aligned with the nightly drift report.
   - **Location references can't be carried yet.** `location-data.ts` has no field for them, so the generator reports each legacy reference and the seed keeps writing synthetic ones. Real ingestion matching needs a data-model change to `location-data.ts` and `generate-seed-sql.ts` before cutover.
2. **`OUTBOUND_ENABLED=false` (§10).** The guard is built. It must be set on any environment holding migrated subscriptions before the first apply run.
3. **Access.** The sync identity needs:
   - read-only roles on both legacy DBs
   - read on the legacy `artefact`, `publications` and `files` containers
   - `get` on the vault holding legacy OAuth secrets
   - write on the new storage and on `cath-tp-{env}`
   - a private network path to all of these
4. **Cron wiring.** Both jobs are in the umbrella chart (§13) but disabled. To turn them on:
   - create `legacy-account-database-url`, `legacy-publication-database-url` and `legacy-storage-account-name` in the `cath` vault. The CSI mount fails the pod if a listed secret is missing.
   - add `LEGACY_THIRD_PARTY_KEY_VAULT` once the legacy OAuth vault is confirmed (Q6). Until then the secret copy reports as skipped.
   - set `legacySync.enabled: true` (never on `aat`, §11)
   - add the Flux releases for the plain-name deployment

## 4. Sync algorithm

### Account domains and location metadata: replace

```
source  = SELECT * FROM legacy WHERE <scope>           -- full read, one snapshot
rows    = source.map(transform)                         -- pure; collects rejects with reasons
guard   = abort if rows would shrink the target table too far
BEGIN
  DELETE FROM target tables                             -- children first
  INSERT rows                                           -- parents first, createMany
COMMIT
report  { read, existing, loaded, rejected[reason] }
```

- **Replace, don't mirror.** Before cutover nothing but this job writes to new prod (§10), so there are no native rows worth keeping. Replacing the data wholesale removes the need for a ledger of migrated rows, upsert/delete diffing, and re-keying rows auto-created on sign-in. Each run leaves new prod an exact copy of the transformed legacy data.
- **One transaction.** Related domains are replaced in one transaction, so they are always consistent with each other and a failure leaves the previous night's data intact. Use `DELETE`, not `TRUNCATE`, so the running app keeps reading the old rows until commit.
- **Row-count guard.** A table may shrink by at most `max(50, ratio × existing rows)`, and a populated table is never emptied. This protects against a bad or empty source read.
- **After cutover the job is deleted**, not reconfigured. There is no mode in which it runs alongside native writes.
- **Shared non-prod environments.** An apply run wipes account data created there by testers or E2E runs, so apply runs don't target `aat` (§11).

### Artefacts: upsert and delete

Artefacts are the exception, because each one carries derived data (`artefact_search`, copied PDF and Excel files) that is wasteful to rebuild every night.

- **Writes.** Upsert rows by primary key, and delete rows whose id is not in the source. No ledger is needed, because before cutover every artefact in new prod came from the sync.
- **Change detection.** The legacy `last_received_date` is stamped as metadata (`legacylastreceived`) on the copied payload blob, but only after its derived data is built. An artefact whose stamp matches skips the payload copy and all derived work; one whose derived data failed has no stamp and is retried next run. This also needs no ledger.
- **Drop guard.** Artefacts may shrink by up to 50% in a run, not 5%. Displayable lists churn daily, and the set shrinks sharply over weekends and holidays. An empty read is still refused.
- **Blobs of removed artefacts** are deleted under the same row-count guard.

### Order

users → subscriptions and list-type subscriptions → third parties → media applications → audit log, then location drift report → location metadata → artefacts → payloads → derived data.

## 5. Entity mapping

### 5.1 pip-account-management

| Legacy | New | Treatment |
|---|---|---|
| `pi_user` | `user` | **Built.** Keep `userId`. Map `forenames`→`firstName`, `roles`→`role` (via the role mapping table, rejecting unmapped roles) and `provenanceUserId`→`userProvenanceId`. Lowercase `email`. Copy `createdDate` and `lastSignedInDate`. Only the sign-in provenances (`PI_AAD`, `SSO`, `CFT_IDAM`, `CRIME_IDAM`) are migrated. **Add a nullable `last_verified_date` column and copy it.** Nothing here uses it yet, but the media re-verification job will need it (§8), and it cannot be recovered once legacy is gone. |
| `subscription` | `subscription` | **Built.** Keep `id`→`subscriptionId`. Map `searchType`: `LOCATION_ID`, `CASE_NUMBER` and `CASE_NAME` as-is; `CASE_ID`→`CASE_NUMBER`; `CASE_URN`→`CASE_NUMBER` (**unconfirmed**, §9). Copy `caseName`/`caseNumber`. Drop `partyNames`, `urn` and `locationName`. Map `createdDate`→`dateAdded`. `API_COURTEL`-channel rows are Courtel, handled in the third-party row below. Legacy migration V1.16 copied `CASE_ID`/`CASE_URN` rows into `CASE_NUMBER` rows without deleting the originals, so duplicates on `(userId, searchType, searchValue)` are expected. Keep the oldest and report the rest. |
| `subscription_list_type` | `subscription_list_type` | **Built.** Map each legacy list type name → `list_types.id`, **resolved by name at run time**. Copy `list_language`. One row per user, rejecting extras. |
| `media_application` | `media_application` | Migrate `PENDING` only. Legacy deletes the proof-of-ID image on approve or reject, and its reporting job deletes approved and rejected rows. Keep `id`. Map `full_name`→`name`, lowercased `email`, `employer`, `request_date`→`applied_date`. Copy legacy `files/<image>` (a bare UUID) to new `files/<id><ext>`, with the lowercased extension taken from `image_name`. Set `proof_of_id_path` to that key and `proof_of_id_original_name` to `image_name`. Reject missing images and extensions the new upload would not accept. Delete orphaned `files` blobs under the guard. |
| `audit_log` | `audit_log` | A rolling 90-day copy: legacy keeps 90 days, hard-coded in `AuditService.java`. Keep `id`. Copy `user_id`, which is a string in both systems, plus `user_email`, `user_provenance`, `details` and `timestamp`. Copy `roles`→`user_role` and `action` **raw**, because these are historical records. Whether it is needed at all is a decision (§9). |
| `api_user` (OAuth subscribers) | `third_party_user` | **Decision needed (§9).** Keep `user_id`→`id`, `name`, `created_date`. Only `ACTIVE`: the new model has no status column, so a migrated `PENDING` or `SUSPENDED` user would look live. |
| `api_subscription` | `third_party_subscription` | Map list type name → id. Copy `sensitivity`, which is the subscriber's maximum clearance. Dedupe `(user, list type)`, because legacy has no constraint on it. |
| `api_oauth_configuration` + legacy vault | Secrets `third-party-<id>-{client-id,client-secret,scope,destination-url,token-url}` in `cath-tp-{env}` | Read the three secret **names** from the legacy row and the **values** from the legacy vault. The names are a slug of `name-userId-` followed by `client-id`, `client-secret` or `scope`. `destination_url` and `token_url` are plain columns in legacy but secrets here. Writes are idempotent sets, done outside the DB transaction. Delete secrets for removed users. Never log values. |
| Courtel: `pi_user` (`THIRD_PARTY`) + `subscription` (`API_COURTEL`) | `legacy_third_party_user` + `legacy_third_party_subscription` | These are the tables the live push reads today. Keep the user id; the name is legacy `provenance_user_id` (unconfirmed: check what the admin pages show). Only `LIST_TYPE` subscriptions are supported; map list type name → id and dedupe per list type. |
| `pi_user_archived`, errored/azure account models, MI views | — | Don't migrate. |

### 5.2 pip-data-management

| Legacy | New | Treatment |
|---|---|---|
| `location`, `location_reference` | `location-data.ts` | **Don't sync.** `location-data.ts` is the source of truth, and the deploy seed overwrites names from it. **One-off generator:** emit a `location-data.ts` candidate from legacy for the parity PR (§3). Legacy regions and jurisdictions are `text[]` names, so map them to ids by name; `jurisdiction_type` maps to sub-jurisdictions. **Nightly drift report:** compare id, name, Welsh name, regions, sub-jurisdictions, email, contact number and references (`provenance`, `provenance_location_id`, `provenance_location_type`). Legacy admins can upload location CSVs in prod, so drift will happen. Fix it with a PR. |
| `location_metadata` | `location_metadata` | Replace. Keep `location_metadata_id`. Trim the four messages, converting empty strings to null. Set `updated_at` explicitly (`@updatedAt` is a Prisma default only). Reject unknown locations, rows with no message, and messages that fail `libs/location/src/validation/location-metadata-validation.ts`. |
| `artefact` | `artefact` | Upsert and delete (§4). Scope: `display_to IS NULL OR display_to > now()`, which includes future `display_from` and `GENERAL_PUBLICATION` rows with no end date. Field rules are in the table below. Drop `search` (`artefact_search` replaces it) and `payload_size`. |
| artefact payloads (`artefact` container) | `artefact` container | Legacy `payload` holds `https://<account>/artefact/<random uuid>`. Copy it to `artefact/<artefactId>`, matching the ingest path. The copy goes through the sync pod (SDK download, then upload), not server-side, because the payload has to be read anyway to detect flat-file types and check the JSON. Stamp `legacylastreceived` metadata on the blob. Legacy V1.25 copied rows that kept the same `payload` URL; each such artefact gets its own copy under its own id, so a shared blob is copied once per artefact and is not reported. |
| `publications` container (PDF/xlsx) | `publications` container | **Copy, don't regenerate** (§5.3). Legacy names them `<artefactId>.pdf` and `<artefactId>.xlsx`, exactly what the new download pages read, so a copy is a drop-in. They are only needed until the migrated lists expire, a few days to two weeks after cutover; after that every file comes from the normal ingest path. The cost is that migrated lists offer the legacy-styled PDF for that window. Legacy's extra `<id>_cy.pdf` is not copied, because nothing here links to it. |
| `artefact_search` | `artefact_search` | **Regenerate** from the payload (§5.3). |
| `list_search_config` | `list_search_config` | Replace. It is admin-managed in both systems, not config in code: without it `artefact_search` is never populated, so migrated lists have no case search (found in the end-to-end run). Keep the id, map list type name → id, and reject a second config for one list type. |
| `artefact_archived`, MI views | — | Don't migrate (§9). |

Artefact field rules:

| Legacy | New | Rule |
|---|---|---|
| `artefact_id` | `artefact_id` | keep |
| `list_type` | `list_type_id` | name → id via `resolveListTypeId`; reject unknown |
| `location_id` (string) | `location_id` (string) | keep; reject a numeric id not in `location`; `NoMatch<id>` rows are kept or dropped by decision (§9) |
| `content_date` (timestamp) | `content_date` (date) | truncate |
| `type`, `sensitivity`, `language` | same | `type` must be `LIST`: new has no `JUDGEMENTS_AND_OUTCOMES` or `GENERAL_PUBLICATION`, so those are rejected and reported. `INTERNAL` sensitivity is rejected for the same reason. `BI_LINGUAL` → `BILINGUAL`. LCSU artefacts are never stored in legacy. |
| `display_from/to`, `last_received_date`, `superseded_count`, `provenance`, `is_flat_file` | same | copy |
| `source_artefact_id` | `source_artefact_id` | Copy. For flat files the new reader takes the extension from this field (default `.pdf`), and legacy stores neither the filename nor the content type. If it already ends in a served extension, keep it. Otherwise detect the type from the file's signature (`%PDF`, OLE for doc, ZIP for docx/xlsx, HTML, CSV) and append it, so `SNL-7` becomes `SNL-7.pdf` (Q7). An unidentifiable file is rejected. |

### 5.3 Derived publication data

This runs only for new or changed artefacts.

1. **Validate.** Run `validateListTypeJson` on each JSON payload. Failures are reported, and the artefact is still loaded (Q9).
2. **Search index.** Delete the artefact's `artefact_search` rows, then call `extractAndStoreArtefactSearch`. Delete first because the extractor swallows errors and leaves stale rows when it finds no cases.
3. **Files.** Copy legacy `publications/<id>.pdf` and `<id>.xlsx` into the new `publications` container. A file legacy doesn't have is deleted here, because a copy left over from an earlier version would be a superseded list.
   - Regenerating them was the first design. It was dropped (2026-10-09) because it needed Chromium in the crons image, was the slowest step, and only served lists that expire within days of cutover.
   - Checking the new generators against real payloads is still worth doing, but as a separate, report-only check, not as part of the migration.
   - Nothing here calls `processPublication`, so the job cannot send anything, whatever its flags.
4. **Report** failures per artefact, grouped by reason. A failed artefact gets no stamp and is retried next run.

### 5.4 Not migrated: new-only tables

`notification_audit_log`, `legacy_third_party_push_log`, `ingestion_log`, `third_party_secret` (local fallback for Key Vault).

### 5.5 Mapping tables (code, in `libs/legacy-migration`)

- **`LIST_TYPE_RENAMES`** (`libs/legacy-migration/src/value-mapping.ts`) maps legacy `ListType` enum names to new `list_types.name`. Names only, never numeric ids. **Identity is not a safe default.** Of the 104 legacy enum names (pip-data-models), 47 don't exist in `list-type-data.ts`:
  - **~23 are renames, now mapped:** `UT_IAC_JR_*`→`UTIAC_JR_*`, `RPT_*`→`FTT_RPT_*`, `UT_AAC/LC/T_AND_CC`→long names, `FTT_LR/TAX`, `CST`, `MAYOR_AND_CITY`, `INTERIM_APPLICATIONS_CHD`, `BRISTOL_AND_CARDIFF`.
    - `CROWN_DAILY/FIRM/WARNED_LIST`→`*_PDDA_LIST` is **unconfirmed**. Legacy has both, marks the non-PDDA ones deprecated, and this service renamed its rows to the PDDA names.
  - **~24 have no equivalent and need a product decision:**
    - the national CHD/KB lists (`ADMIRALTY_COURT_KB`, `PATENTS_COURT_CHD`, `COMMERCIAL_COURT_KB`, …), possibly folded into `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST`
    - `CROWN_ADVANCE_PDDA_LIST`, `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST(_ADDITIONAL_HEARINGS)`, `CIC_DAILY_HEARING_LIST`, `PRIMARY_HEALTH_LIST`, `CARE_STANDARDS_LIST`, `TECHNOLOGY_AND_CONSTRUCTION_COURT_*`
  - **Handling:** unmapped names are dropped from a user's list-type subscription and reported; a row with nothing mappable is rejected. Unmapped artefacts are rejected. The first prod dry run will show how many users and lists each one affects.
  - **Decision (2026-10-07):** list types are expected to reach parity with legacy by the end of development, so the unmapped set should shrink to zero. Before cutover, re-check the gap using the dry run's `unknown list type` lines; any remaining entry is a cutover blocker. If parity means adopting the legacy enum names (as the Crown PDDA rename did for the Inbound API), `LIST_TYPE_RENAMES` becomes redundant and can be deleted.
- **Other mappings:** role, provenance and search-type maps, in the same file.
- **Schema debt:** `subscription_list_type.list_type_ids` and `third_party_subscription.list_type_id` store numeric list type ids, which goes against the CLAUDE.md "never rely on listTypeId" rule. Migration copes by resolving ids at run time, but this is worth fixing before go-live rather than after.

## 6. User identity alignment

**Identity is the IdP subject, not our UUID or the email.** Both systems resolve a signed-in user by provenance ID and auto-create a row on first login if none exists. The new service does this in `createOrUpdateUser` (`libs/account/src/repository/query.ts`), keyed on `userProvenanceId`, which is globally `@unique`. So alignment comes down to three rules:

1. **Provenance IDs must be byte-identical** for the same person in both systems.
2. **Internal `userId` is the legacy UUID** for every migrated user, so subscriptions keep their FK unchanged.
3. **Nothing the new service auto-created survives a sync.** Pre-cutover the only such rows are testers', and each run replaces account data wholesale (§4), so there is never a duplicate to re-key.

### Provenance ID by IdP (legacy pip-frontend vs new)

| Provenance | Legacy `provenanceUserId` | New `userProvenanceId` | Aligned? | Action |
|---|---|---|---|---|
| `PI_AAD` (B2C media) | `oid` (`b2cAuthentication.ts`). Accounts are created via Graph, so it is the B2C objectId. | `payload.sub \|\| payload.oid` (`(auth)/login/return/index.ts:212`) | Only if the B2C policy's subject claim is objectId (the usual default, not guaranteed) | **Change to `oid \|\| sub`.** One-line fix that removes the dependency on policy config. Confirm with a decoded test token. |
| `SSO` | `oid` | `claims.oid \|\| …` (`passport-config.ts:17`) | Yes | None |
| `CFT_IDAM` | `uid` | `claims.uid` (`cft-idam/token-client.ts:78`) | Yes | None |
| `CRIME_IDAM` | `subname` from `/idp/oauth2/userinfo` | `` `CRIME_IDAM:${uid \|\| sub}` `` from the id token | **No.** Different claim, and a prefix. | Migration writes `CRIME_IDAM:${legacy.subname}`. Change the new crime login to use `subname` too, and verify it is in the id token (or call userinfo as legacy does). Until this is confirmed, rely on the claim-on-login fallback below. |

Confirmed: same B2C tenant as legacy (§9 Q1). This assumes the Entra SSO tenant and IDAM environments are shared too.

### Sync algorithm for users

Each legacy `pi_user` is transformed and inserted with `user_id = legacy user_id`, after `user`, `subscription` and `subscription_list_type` have been emptied in the same transaction (§4). If a tester signed in to new prod with a real provenance ID, their auto-created row is deleted and the legacy row takes its place. On their next sign-in, `createOrUpdateUser` finds the legacy row by `userProvenanceId`.

Pre-flight check on legacy: `SELECT provenance_user_id, count(*) FROM pi_user GROUP BY 1 HAVING count(*) > 1`. Duplicates would break the new global unique constraint and have to be resolved by hand first.

### Claim-on-login fallback (safety net)

This is for users whose provenance ID still doesn't match: Crime until the claim is verified, or B2C if the subject claim turns out to differ.

- **How it works.** Add one branch to `createOrUpdateUser`. If there is no row for this `userProvenanceId`, look for an **unclaimed migrated** row with the same `userProvenance` and the same lowercased email. If there is exactly one, overwrite its `userProvenanceId`, mark it claimed, and log it. Otherwise create as normal.
- **Claim marker.** It needs a nullable `legacyClaimedAt`, so a migrated row can only be claimed once.
- **Only works after cutover.** Before then, the nightly reload overwrites a claimed `userProvenanceId` with the legacy value, so the login fixes above are the real answer.
- **Never fall back on email across provenances.** The same address in CFT and B2C is two different accounts.
- Remove the branch once the claim count stops growing.

### Emails

Email is not an identity key, but it is used for lookups (`findUserByEmail`, media application approval, admin user search) and is shown to admins.

- Migration lowercases and trims emails. Legacy compares emails case-insensitively (`…IgnoreCase` repositories), but the new code mostly compares exactly, and only `createMediaApplication` lowercases.
- **Fix in new:** lowercase emails on every write path in `createUser`/`updateUser`, and update `email` from the IdP on login. Today `createOrUpdateUser` only updates `role` and `lastSignedInDate`, so an email changed at the IdP stays stale forever.
- ~~**Fix in new:** `createLocalMediaUser`/`updateLocalMediaUser` write `userProvenance: "B2C_IDAM"`.~~ **Done in #1052:** admin-created media users are now written as `PI_AAD`, matching B2C login and legacy data.

### Subscriptions must match

- Keep legacy `subscription.id` and `user_id` (the legacy UUID). Map `searchType` per §5.1. Resolve list type names to ids per environment.
- Subscriptions a tester created on the new side are removed by the next reload. Pre-cutover, legacy is the only source.
- **Row-level check (nightly):** per user, a hash of sorted `(searchType, searchValue)` on both sides, plus the list-type set and languages. Any mismatch is reported by userId.
- **Behavioural check (nightly, the one that matters):** for every artefact published in legacy that day, compute the **recipient set** with the new service's matching logic (`libs/notifications/src/notification/subscription-queries.ts`) against the migrated data. Compare it with who legacy actually emailed for that artefact, from pip-publication-services' notification records or legacy's subscriber-lookup endpoint. Equal row counts can still hide a broken search-type or list-type mapping. Recipient diffs can't.

## 7. Verification (every run)

1. **Write check** per table (**built**, `write-drift.ts`). Every legacy row either loads or is rejected with a reason, so drift is measured against the transformed rows, not the raw legacy count: rejected rows are expected not to be there. After the writes, still inside the transaction, each table is read back and compared field by field with the rows the run meant to write. Missing, unexpected and differing rows are reported by id only. Any drift throws, which rolls the run back and leaves the previous night's data in place. The error (`SyncAbortedError`) carries the report built before the abort, and the cron entry logs it before failing, so an aborted night still shows what was read and rejected. A row-count guard violation aborts the same way. This catches write-side loss the transforms cannot see, such as a value a column type truncates (building it surfaced one: `content_date` is a date column but the transform kept the legacy timestamp, which also made every artefact with a time part look changed each night; the transform now truncates it). Output to App Insights is not built yet.
   - **Rejections are classified** (**built**, `rejection-policy.ts`). Because each run reloads the full snapshot, permanent legacy data is re-rejected every night: the V1.16 duplicate subscriptions, non-`ACTIVE` OAuth subscribers and their subscriptions, `INTERNAL` sensitivity, non-`LIST` artefacts, and third parties routed to their own tables. These are **accepted**: reported and marked `(accepted)`, but not blocking. Every other reason is **blocking**, including any reason added later, so accepting one is a deliberate change to the list. A dry-run drop-limit violation is blocking too.
   - **The job fails on blocking issues** (**built**). The report ends with `blocking issues: N`, and the cron entry throws after logging it when N > 0, so the CronJob run shows as failed. This applies to dry runs as well, because the prod dry run is the rehearsal.
2. **Payload validity:** run `validateListTypeJson` on every migrated JSON payload. Legacy schemas may be looser than ours. Every failure is a real cutover risk, because that list would render badly or not at all on day one.
3. **Search and files:** report `artefact_search` and file-copy failures (§5.3).
4. **Orphans:** artefacts with unknown `locationId`, subscriptions to unknown locations or list types, users with unmapped roles.
5. **Location drift** (§5.2).
6. **Sample diff (weekly, manual):** pick N courts and compare the summary-of-publications page between legacy and new.

The aim is a report with no blocking issues and no recipient differences for a sustained period (for example two weeks) before go/no-go. Accepted rejections are expected in every report.

## 8. Parity gaps (outside migration, but they block cutover)

Legacy runs these as cron-triggered endpoints (`pip-cron-trigger`). New has no equivalent:

- **Artefact expiry.** Legacy archives and deletes when `display_to < now()`. New only filters at query time, so rows and blobs pile up forever. `hasActiveArtefacts` (`libs/location/src/repository/queries.ts`) also treats a null `displayTo` as inactive, unlike the other filters.
- **Media re-verification and inactive accounts.** These need `last_verified_date` (§5.1). Legacy thresholds:

  | Account type | Based on | Email | Delete |
  |---|---|---|---|
  | Media (`PI_AAD`, role `VERIFIED`) | `last_verified_date` | 350 days | 365 days |
  | AAD admins | `last_signed_in_date` | — | 90 days |
  | SSO | `last_signed_in_date` | — | 90 days |
  | CFT IDAM | `last_signed_in_date` | 118 days | 132 days |
  | Crime IDAM | `last_signed_in_date` | 180 days | 208 days |

- **Audit log retention.** Legacy keeps 90 days; new keeps everything.
- **Push to OAuth (`api_*`) third parties.** The `third_party_*` tables and their secrets are written by admin pages, but no push code reads them. Live push goes only to Courtel, through `legacy_third_party_*`.
- **Courtel push on the API pods.** `COURTEL_*` secrets are missing from `apps/api/helm/values.yaml`, so pushes from `POST /publication` are skipped. Check whether Flux sets them.
- **Courtel push PDF path.** It looks broken: `pdfPath` is a blob key but is read with `fs.readFile` (`libs/legacy-third-party-fulfilment/src/push/http-client.ts`).
- **Welsh PDF.** New has no equivalent of the extra Welsh PDF (`<id>_cy.pdf`) that legacy generates for non-English lists.

## 9. Open questions and decisions

1. ~~**B2C tenant.**~~ **Answered: same B2C tenant as legacy.** Media users' object IDs carry over, so no account or password migration is needed. Still to do: (a) confirm the SSO (Entra) tenant is also shared; (b) decode a real new-service B2C id token and check that `oid` equals the legacy `provenance_user_id` for that user (see §6).
2. **Same public domain?** Will cutover be a Front Door/DNS switch on the same hostname? This affects cookies, bookmarks, links in already-sent emails, and the B2C redirect URIs.
3. **Publisher routing.** Do all publishers (CFT, Crime, SNL, XHIBIT/PDDA, Courtel) reach legacy through APIM? If so, cutover is one APIM backend switch, since the API contract was aligned in #1026. Any that call pip-data-management directly need their own coordinated change.
4. **`CASE_URN` subscriptions.** The new service has no URN search type. Do they become `CASE_NUMBER`? That only works if `artefact_search.caseNumber` holds URNs for crime lists. Or do we drop them and email those users?
5. ~~**Location parity.**~~ **Decided (2026-10-09):** generate `location-data.ts` from legacy, with ids equal to legacy P&I IDs. The generator is built; the PR needs legacy access to run it.
6. **Third parties.** **Decided (2026-10-09):** Courtel to `legacy_third_party_*`, `ACTIVE` `api_*` rows only to `third_party_*`, with OAuth secrets copied. **Still open:** which vault holds the legacy OAuth secrets. It isn't named in the legacy repos and is probably pip-frontend's or publication-services'. Until the OAuth push exists (§8), migrated `api_*` data is unused.
7. ~~**Flat-file extension.**~~ **Decided (2026-10-09):** append the detected extension to legacy `source_artefact_id`, keeping the publisher's id as a prefix.
8. ~~**`NoMatch` artefacts.**~~ **Decided:** migrated as-is.
9. ~~**Invalid payloads.**~~ **Decided:** loaded and reported.
10. ~~**Audit log.**~~ **Decided (2026-10-09):** migrate the rolling 90 days.
11. **Historical MI.** Does anyone need `artefact_archived` / `pi_user_archived` data after decommission?
12. **Welsh PDF.** Accept that new publications lose legacy's extra `<id>_cy.pdf` (§8)? The migration doesn't copy it, because nothing here links to it.
13. **Volumes.** Get row counts and blob counts/sizes from prod to size batches and the freeze window.
14. **Data protection.** Is a DPIA or sign-off needed to copy prod PII between subscriptions or resource groups?

## 10. Parallel-run safeguards (new prod before cutover)

- **Disable everything outbound** in new prod with one env flag, `OUTBOUND_ENABLED=false`. Users must not get duplicate emails, and the new service must not delete migrated accounts. Outbound is off only when the value is exactly `"false"`, so environments that don't set it behave as before. It is set through `${OUTBOUND_ENABLED:-true}` in `helm/cath-service/values.template.yaml` for web and api. Any automated job added before cutover (§8) must check it too.
- **Built** (`@hmcts/outbound`, `isOutboundEnabled()`). When off, each chokepoint skips the call, logs one line without PII, and returns something its callers already handle:
  - **Subscription and system-admin emails** (`sendEmail`, `libs/notifications`): skipped before attachments are uploaded. The notification audit row is marked `Skipped`, never a false `Sent` or `Failed`.
  - **Media emails** (`libs/notification`): skipped; approval and rejection still complete.
  - **Courtel push** (`libs/legacy-third-party-fulfilment`): skipped at the existing "not configured" point, so there are no retries and no `FAILED` push-log rows.
  - **Graph user create/update** (`libs/auth`): fails deliberately, so a media approval stops before any local write and the application stays `PENDING` to approve after cutover.
  - **LCSU S3 upload** (`libs/pdda-html-upload`): skipped; the publisher still gets 201.
- **No public access** to new prod (IP allow-list or private beta), so no user writes land there.

## 11. Cutover runbook

### Rehearsal environments

New has no `stg` environment; `aat` is staging. It deploys to the `DCD-CFTAPPS-STG` cluster (`.github/workflows/stage.infrastructure.yml`). Legacy maps `aat` to `stg` and `perftest` to `test` (`pip-data-management/infrastructure/main.tf`).

| Legacy (PIP) | New (cath) | Use |
|---|---|---|
| `stg` | `aat` | **Dry runs only.** They write nothing, so E2E data on `aat` is safe. |
| `test` or `stg` | `perftest` (or `demo`) | **Apply runs.** These are the full nightly cycle, including blob and vault copies. Kept off `aat` because the reload wipes E2E users and subscriptions. |
| prod snapshot | `perftest` | **Prod-sized dress rehearsal** of this runbook (subject to Q14). |
| `prod` (read-only) | new prod | **Dry run.** This is the only run that proves identity alignment and real mapping gaps. |

- **Non-prod runs prove the mechanics:** network path, read-only roles, blob and vault copies, cron wiring, dry run vs apply, run time and mapping gaps in legacy data.
- **They do not prove identity alignment or scale.** Staging accounts are test identities.
- **First checks** before the first non-prod run:
  - the sync pod can reach the legacy `stg` database and storage
  - the legacy databases there hold data
  - read-only access is in place. The "DTS PIP Non-Prod" group already has access to `cath-aat`, so one team likely owns both sides.
- **The `OUTBOUND_ENABLED` guard (§10) must be in place before any apply run.** Otherwise migrated subscriptions email real staging users when a test publication goes through.

### Runbook

**T-2 weeks:** clean reconciliation reports for 14 consecutive days. Dress rehearsal of the full runbook, including rollback, against a prod snapshot on `perftest` (subject to Q14).

**T-0:**
1. Legacy frontend into maintenance or read-only mode. Pause legacy admin uploads.
2. Stop legacy scheduled jobs: notifications, expiry, account deletion, media.
3. Hold inbound publications: switch APIM to return 503 with retry, or queue. Confirm publishers retry. Keep the window short, because morning cause lists are time-critical, so do it in the evening.
4. Run the final `legacy-sync` and `legacy-sync-publications`. Reconciliation must be clean. Sign off on the report.
5. Delete both sync CronJobs. Enable outbound on new.
6. Switch Front Door/DNS and APIM backend to new.
7. Smoke test: sign in as each provenance, check a subscription email fires on a test publication, check third-party push to a test subscriber, check flat-file and JSON list rendering.
8. Lift the freeze.

**Rollback:** possible cleanly only until step 8 (point of no return). After that, new-only writes (publications, sign-ups, subscription changes) would be lost on rollback.
- Recommendation: **don't build reverse sync.** Hold go/no-go at step 7.
- If you have to roll back later, replay publications from `ingestion_log` and blob storage into legacy, and accept losing account and subscription changes made in the window.

**Post-cutover:** keep legacy DBs read-only for N weeks for audit, then decommission. Delete `libs/legacy-migration` and the cron scripts.

## 12. Delivery order

| # | Ticket | Depends on | Status (2026-10-09) |
|---|---|---|---|
| 1 | `OUTBOUND_ENABLED` guard (§10) | — | Built |
| 2 | Access, cron helm and secrets for both scripts; dry run on `aat` against legacy `stg`, then a prod dry run | — | Helm built and disabled; access and vault secrets not done |
| 3 | Location generator, parity PR and nightly drift report | — | Generator and drift report built; PR needs legacy access; references need a data-model change (§3) |
| 4 | `last_verified_date`, location metadata, media applications + proof of ID, audit log | 2, 3 | Built |
| 5 | Third parties + vault copy | Q6 vault | Built; secret copy skipped until the legacy vault is known |
| 6 | Artefact rows, payload copy, blob cleanup, list search config | 3 | Built |
| 7 | Derived data: validation, `artefact_search`, PDF/Excel copy | 6 | Built |
| 8 | Verification: recipient diff, counts, App Insights, failing the job on drift | 6 | Write check, rejection classification and failing the job built (2026-10-12); recipient diff and App Insights not started |
| 9 | Parity gaps (§8), each as its own ticket | — | Not started |
| 10 | Cutover rehearsal on `perftest` (prod snapshot), then go-live | all | Not started |

## 13. Implementation (branch `vibe-653`)

Scope: every domain in §5. Not built yet: verification beyond per-run reports (§7, ticket 8) and the parity gaps (§8).

| Piece | Location (`libs/legacy-migration/src` unless stated) |
|---|---|
| Legacy readers (one read-only repeatable-read snapshot each, timestamps read as UTC) | `legacy-account-source.ts`, `legacy-publication-source.ts` |
| Legacy storage and OAuth vault readers (read only) | `legacy-storage-source.ts`, `legacy-secret-source.ts` |
| Value mappings (roles, provenance ID, search types, list type renames, email) | `value-mapping.ts` |
| Account transforms (pure; rows + rejections) | `user-`, `subscription-`, `list-type-subscription-`, `courtel-`, `oauth-third-party-`, `media-application-`, `audit-log-transform.ts` |
| Publication transforms | `location-metadata-`, `list-search-config-`, `artefact-transform.ts`, `artefact-plan.ts`, `flat-file-type.ts` |
| File and secret steps | `proof-of-id-copy.ts`, `oauth-secret-copy.ts`, `artefact-payload.ts`, `artefact-derived-data.ts` |
| Locations | `location-drift.ts` (nightly report), `location-data-generator.ts` (one-off candidate) |
| Row-count guard | `row-count-guard.ts` |
| Write check and rejection classification | `write-drift.ts`, `rejection-policy.ts`, `findBlockingIssues` in `sync-report.ts` |
| Orchestrators | `run-legacy-sync.ts` (accounts: nine tables in one transaction), `run-publication-sync.ts` |
| Cron entries | `apps/crons/src/legacy-sync.ts`, `legacy-sync-publications.ts`, `generate-location-data.ts` |
| Deployment | `helm/cath-service`: two more releases of the crons chart (`cath-crons-legacy-sync` at 02:00, `cath-crons-legacy-sync-publications` at 03:00) behind `legacySync.enabled` (default `false`). The `example` cron is unchanged. |
| Schema | `user.last_verified_date`, migration `20261008000000_add_user_last_verified_date` |
| Supporting changes | `setBlobMetadata` and blob metadata on `getBlobProperties` (`@hmcts/azure-blob`); the `validateLocationMetadataInput` export (`@hmcts/location`) |

Config:
- `LEGACY_ACCOUNT_DATABASE_URL` / `LEGACY_PUBLICATION_DATABASE_URL`: read-only roles on the two legacy DBs.
- `LEGACY_STORAGE_ACCOUNT_NAME` (managed identity) or `LEGACY_STORAGE_CONNECTION_STRING`: legacy storage, read only.
- `LEGACY_THIRD_PARTY_KEY_VAULT`: the legacy OAuth vault. Optional; when unset the secret copy reports as skipped.
- `THIRD_PARTY_KEY_VAULT`: where secrets are written (`cath-tp-{env}`). When unset they fall back to the `third_party_secret` table, as the admin pages do.
- `LEGACY_SYNC_APPLY=true`: needed to write. Anything else is a dry run.
- `LEGACY_SYNC_MAX_DROP_RATIO`: default `0.05`. An applied run aborts, with no writes, if any table would shrink by more than `max(50, ratio × existing rows)` or be emptied. A dry run reports the same check as `WOULD BE REFUSED` and carries on. Exceptions: artefacts allow 50% (§4), and `media_application` may be emptied, because every pending application can be approved.

Transforms and orchestrators are unit tested (110 tests, plus 14 for the cron entries). The orchestrators use mocked transactions that read back what was written, to check write order, dry run, the guard, the write check, and the file and secret steps.

History: the prototype first used a ledger-based mirror. It was replaced by the wholesale reload once it was confirmed that no real user writes to new prod before cutover.

**End-to-end check (2026-10-09).** This run predates the switch from regenerating PDF and Excel files to copying them. Everything except the file step is unchanged; the copy step is covered by unit tests.

Setup:
- Scratch databases on the local Postgres: the new schema was migrated and seeded through the deploy path, and two legacy fixture databases were loaded.
- Two throwaway Azurite instances served as new and legacy storage.
- The real cron entry points were run with `TZ=Europe/London`.
- `prisma migrate diff` confirmed the migrations match the schema.

Account sync:
- **Dry run:** reported every rejection and wrote nothing.
- **Apply:**
  - users and subscriptions as in the earlier check (legacy UUIDs, normalised emails, mapped roles, Crime prefix, `last_verified_date`)
  - the pending application's proof of ID copied to `files/<id>.png` as `image/png`
  - Courtel and its renamed list type loaded into `legacy_third_party_*`
  - only the `ACTIVE` OAuth subscriber and its `PUBLIC` subscription loaded
  - only the audit entry inside 90 days loaded
- **Rejected and reported:** approved applications were not read; a `.gif` proof and a proof missing from storage; a `PENDING` subscriber; an `INTERNAL` subscription; an unknown Courtel list type. The secret copy reported as skipped.
- **Removal:** approving the application in legacy removed the row and its file. The table was emptied, which the guard allows for this table.

Publication sync:
- **Dry run:** expired artefacts were not read. The planned rejections were reported: `JUDGEMENTS_AND_OUTCOMES`, `INTERNAL`, unknown location, unidentifiable flat file. Location drift showed the legacy-only location and the seeded locations missing from legacy. Nothing was written.
- **Apply:**
  - payloads copied under the artefact id with the right content type
  - the flat PDF's source id became `SNL-7.pdf`, and the no-match artefact was loaded as `BILINGUAL`
  - its schema failure was reported, and it was still stamped
  - the Civil Daily Cause List artefact's PDF generation failed (no Chromium locally), so it got no stamp and was retried on the next run. This is what showed regeneration was the wrong approach.
  - migrated `list_search_config` produced its `artefact_search` row on that retry
- **Re-run:** stamped artefacts were not re-copied or rebuilt; their blobs were unchanged.
- **Legacy expiry:** removed the row and its payload.
- **Empty legacy read:** refused, with no writes.

Location generator: reproduced the current file exactly for the matching location, mapped the legacy-only location by name, and reported its reference as not carried. The output typechecks as a drop-in `location-data.ts` and needs `biome format --write` before review.

Open items surfaced:
1. Location references need a data-model change before cutover (§3).
2. The Courtel user name source is unconfirmed (§5.1).
3. The `createdDate` fallback for legacy rows with a null date is the epoch. Check prod for nulls in the first dry run.
4. Payload copies and derived data run one artefact at a time. Check run time against prod volumes (Q13) before adding concurrency.
5. The file copy has not run against real Azure storage; check the legacy `publications` container is readable by the sync identity.

Next steps: ticket 2 (access, vault secrets, dry runs), the location parity PR, ticket 8 (verification), and the login-side fixes from §6 (B2C `oid` first, Crime `subname`, email lowercase and refresh).
