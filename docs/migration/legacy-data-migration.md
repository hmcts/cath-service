# Legacy data migration: pip-data-management + pip-account-management → cath-service

The legacy CaTH databases, storage and OAuth secrets are copied into this service with SQL scripts run by hand. If traffic has to go back to legacy, a rollback copies whatever cath has added, changed or deleted since then back into the legacy databases. The cath database reaches legacy directly through `postgres_fdw`, so one transaction reads one side and writes the other.

Two scripts in `apps/postgres/legacy-migration/` do it:

| Script | Does |
|---|---|
| `pip-to-cath-migration.sql` | pip → cath. Migrates, saves a baseline of what it wrote, reports, and writes `pip-to-cath-files.sh` to copy the files and secrets |
| `cath-to-pip-migration.sql` | cath → pip. Writes back what cath changed since the baseline, reports, and writes `cath-to-pip-files.sh` to copy the files |

Each is a dry run unless given `-v apply=1`. Each connects to pip at the start and disconnects before it commits, so the pip passwords are never stored in the cath database. Blobs and Key Vault secrets can't be copied from SQL, so an applied run writes a shell script of `azcopy` and `az` commands next to where psql runs.

## 1. Running it

Run from anywhere that can reach the cath database, for example a laptop on the VPN. The pip reads and writes go from the cath Postgres server to the pip servers, not from your machine. The passwords are read from the environment, so they stay out of shell history and the process list.

```bash
cd apps/postgres/legacy-migration
read -rsp 'Account password: ' PIP_ACCOUNT_PASSWORD && export PIP_ACCOUNT_PASSWORD
read -rsp 'Publication password: ' PIP_PUBLICATION_PASSWORD && export PIP_PUBLICATION_PASSWORD

PIP=(-v account_host=flexible-pip-account-management-<env>.postgres.database.azure.com
     -v account_dbname=accountmanagement -v account_user=<login>
     -v publication_host=flexible-pip-data-management-<env>.postgres.database.azure.com
     -v publication_dbname=datamanagement -v publication_user=<login>
     -v legacy_storage=<pip storage account> -v cath_storage=<cath storage account>)
```

### pip → cath

```bash
# Dry run: prints the report and rolls back. Repeat as often as needed.
psql "$DATABASE_URL" -f pip-to-cath-migration.sql "${PIP[@]}" -v env=<env> -v cath_vault=cath-tp-<env> -v legacy_vault=<pip OAuth vault>

# Apply, then copy the files and secrets.
psql "$DATABASE_URL" -f pip-to-cath-migration.sql "${PIP[@]}" -v env=<env> -v cath_vault=cath-tp-<env> -v legacy_vault=<pip OAuth vault> -v apply=1
azcopy login && az login && bash pip-to-cath-files.sh
```

- **Don't apply to `aat`**: an applied run would wipe E2E users and subscriptions. The script needs `-v env=<env>` and refuses to apply when it is `aat`. Dry runs there are allowed.
- **Applying twice replaces what cath wrote in between.** A second apply refuses to run unless given `-v replace=1`. Before cutover that's fine. After cutover, run `cath-to-pip-migration.sql` first if those changes must reach pip.
- **Emails:** rows are written straight to the tables, never through the publication ingest path, so the migration itself sends nothing. From then on, cath emails the migrated subscribers about every list it receives. If pip is still receiving lists too, users get both emails.
- `-v legacy_vault` is optional. Without it the secret commands are left out and the script says so.
- The files script carries on past failures and prints `FAILED:` for each secret it couldn't read or write. A secret whose pip value can't be read is skipped, never written empty. Secret values are passed to `az` in a temporary file readable only by you, not on the command line.

### cath → pip

Stop cath taking traffic first. The script reads one snapshot of cath, so anything written after it starts is missed until it is run again. Use logins that can write to pip.

```bash
# Dry run: prints what it would write and what it can't, then rolls back.
psql "$DATABASE_URL" -f cath-to-pip-migration.sql "${PIP[@]}"

# Apply, then copy the files.
psql "$DATABASE_URL" -f cath-to-pip-migration.sql "${PIP[@]}" -v apply=1
azcopy login && bash cath-to-pip-files.sh
```

- **Rerunning is safe.** A row an earlier run wrote is found and left alone, and the report lists it as `already in legacy`.
- **The two pip databases commit one after the other.** If the second commit fails, the first has still happened. Rerun to finish.
- **New third parties** are written without an OAuth configuration, and the report lists them. Set their configuration up in pip by hand.
- pip's materialised MI views (`sdp_mat_view_*`) only show the written rows after their next refresh.

### What it needs

- **Network:** the cath Postgres server must reach both legacy servers on 5432. Cath is on the CFT network and legacy on SDS, so this needs a hub firewall rule from the cath Postgres subnet to the SDS Postgres subnet.
- **psql 15 or later**, for `\getenv`.
- **`postgres_fdw`** on the cath server's extension allow-list. `infrastructure/postgres.tf` sets `azure.extensions = POSTGRES_FDW`. Creating the extension, which the first run does, needs a member of `azure_pg_admin`.
- **Legacy logins:** a password-authenticated role on each legacy database, because `postgres_fdw` can't use Entra tokens. Read-only is enough for pip → cath. cath → pip needs `INSERT`, `UPDATE` and `DELETE`.
- **For the files scripts:** `azcopy` and `az` signed in as someone who can read the source containers (`artefact`, `publications`, `files`) and write the target ones. `pip-to-cath-files.sh` also needs the pip OAuth vault and `cath-tp-<env>`.

## 2. How the scripts work

### `pip-to-cath-migration.sql`

Everything runs in one transaction. Legacy is read as one snapshot: `postgres_fdw` holds a repeatable-read transaction open on each legacy server for the length of the local one. A failure anywhere leaves cath untouched. A dry run does all the work, prints the report and rolls back.

1. **Transform.** Builds a temp table per target, holding every legacy row in scope with the values to load and a `reject_reason`, which is null for rows that load. Duplicates are then marked: the rows are ordered by created date, then id, and every row after the first is rejected. The same row wins on every run.
2. **Write.** Deletes children first and inserts parents first. It uses `DELETE`, not `TRUNCATE`, so the running app keeps reading the old rows until commit.
   - **Users.** Users created in this service (testers who signed in) are kept with their subscriptions. The exception is a local user whose `user_provenance_id` matches a legacy user: that column is unique, so the local row is deleted and the legacy row takes its place. Previously migrated users (`is_legacy_migrated`) are replaced.
   - **Every other table** is replaced in full, including artefacts, third parties and media applications created in this service.
3. **Baseline.** Copies the migrated tables, as they will be committed, into `legacy_migration_baseline`. `cath-to-pip-migration.sql` compares cath with it later. Keep the schema for as long as a rollback might be needed.
4. **Report.** For each table it shows rows in scope in legacy, loaded, rejected, and cath's count before the migration. Then it shows rejections grouped by reason, with up to five legacy ids each.

**Time zones.** Cath stores UTC. Legacy account management writes UTC too. Legacy data management runs in `Europe/London` and stores `display_from`, `display_to` and `last_received_date` as London wall-clock time, so the migration converts them to UTC, and the rollback converts them back. `content_date` is a London midnight cut to a date, so it needs no conversion.

### `cath-to-pip-migration.sql`

It reads one repeatable-read snapshot of cath and writes to both legacy databases in one transaction. A dry run does all the work and rolls back on all three databases.

1. **Diff.** For each table it compares cath with the baseline by id. A row only in cath was **added** since the migration, a row only in the baseline was **deleted**, and a row in both that differs was **changed**.
2. **Write**, as legacy needs it: deletes children first, because legacy's foreign keys don't cascade, then updates, then inserts parents first.
   - **Changes are written column by column.** Only the columns cath changed are written; the rest keep their legacy value. So values the migration couldn't carry are kept unless cath changed them: super-admin roles, `CASE_ID`/`CASE_URN` search types, and legacy list types with no cath equivalent. For example, a super admin migrated as `INTERNAL_ADMIN_CTSC` stays `INTERNAL_SUPER_ADMIN_CTSC` in legacy after signing in to cath.
   - **Deletes follow the migration's merges.** Deleting a cath subscription deletes every legacy row it stood for, such as both the `CASE_ID` and `CASE_URN` copies of one case. A deleted account takes all of its legacy subscriptions with it.
   - **Rows that can't be written are skipped and reported:**
     - a value legacy has no enum constant for, such as a cath-only list type or a cath audit action like `USER_LOGIN` (legacy fails to load a row with an unknown enum value);
     - a child of a user that isn't in legacy, such as a cath tester's subscription;
     - a second account for a user legacy already has under the same provenance id;
     - a publication that clashes with a legacy one on `(location, content_date, language, list_type, provenance)`, which legacy keeps unique.
   - **Audit log and user archive** only get new rows; legacy prunes them itself.
3. **Report.** Rows written per table and operation, then rows not written, grouped by reason.

Cath values are mapped back with the same tables as the migration; each script has a copy, to be kept in step. A list type goes back under its own name if legacy has it, otherwise under the legacy name that maps to it. The Warned lists, which legacy V1.26 removed, are never written back. Each publication written to legacy points at a new blob named by its artefact id, `artefact/<artefactId>`, because legacy V1.25 left some artefacts sharing one blob. `cath-to-pip-files.sh` copies cath's payload there, along with `<artefactId>.pdf` and `.xlsx`. Cath makes no `_cy.pdf`, so Welsh and bilingual lists go back without one.

## 3. Entity mapping

Legacy primary keys are kept throughout. List type names are mapped to `list_types.id` by name at run time, against list types that aren't soft-deleted. Locations are checked against the `location` table.

### 3.1 Accounts

| Legacy | New | Treatment |
|---|---|---|
| `pi_user` | `user` | Sign-in provenances only (`PI_AAD`, `SSO`, `CFT_IDAM`, `CRIME_IDAM`). Keep `user_id`. Map `forenames`→`first_name`, `roles`→`role` (unmapped roles are rejected) and `provenance_user_id`→`user_provenance_id`. Crime IDs are written as `CRIME_IDAM:<subname>`. Lowercase and trim `email`. Copy `created_date`, `last_signed_in_date` and `last_verified_date`. Set `is_legacy_migrated`. A second user with the same provenance id is rejected. |
| `subscription` | `subscription` | Keep `id`. Map `search_type`: `LOCATION_ID`, `CASE_NUMBER` and `CASE_NAME` as they are; `CASE_ID` and `CASE_URN` → `CASE_NUMBER`. Copy `case_name`/`case_number` and `created_date`→`date_added`. Reject unknown locations. Duplicates on `(user_id, search_type, search_value)`, left by legacy V1.16, keep the oldest; the rest are rejected. `API_COURTEL` rows go to the Courtel tables. |
| `subscription_list_type` | `subscription_list_type` | Map list type names. Copy `list_language`. One row per user; extras are rejected. Unmapped names are dropped and reported, and a row with nothing mappable is rejected. A row with an empty `list_type` array is skipped: legacy reads that as every list type at the user's locations, which here means having no row. Its language filter is lost. |
| `pi_user` (`THIRD_PARTY`) + `subscription` (`API_COURTEL`) | `legacy_third_party_user` + `legacy_third_party_subscription` | Courtel. Keep the user id; the name comes from `provenance_user_id`. `LIST_TYPE` subscriptions only, mapped and deduped per list type. |
| `api_user` | `third_party_user` | `ACTIVE` only. Keep `user_id`→`id`, `name` and `created_date`. |
| `api_subscription` | `third_party_subscription` | Subscriptions of migrated subscribers only. Map list type name, copy `sensitivity`, dedupe `(user, list type)`, keeping the duplicate that grants the least access (`PUBLIC`, then `PRIVATE`, then `CLASSIFIED`). |
| `api_oauth_configuration` + legacy vault | `third-party-<id>-{client-id,client-secret,scope,destination-url,token-url}` in `cath-tp-<env>` | Done by the copy script. Secret names come from the legacy row and values from the legacy vault; `destination_url` and `token_url` come from the legacy columns. A subscriber with several configurations gets the newest. |
| `media_application` | `media_application` | `PENDING` only. Keep `id`. Map `full_name`→`name`, lowercased `email`, `employer`, `request_date`→`applied_date`. Set `proof_of_id_path` to `<id><ext>`, with the lowercased extension from `image_name`, and `proof_of_id_original_name` to `image_name`. Reject a missing image and extensions the upload page would not accept. The copy script copies legacy `files/<image>` to `files/<id><ext>`. |
| `audit_log` | `audit_log` | The rolling 90 days legacy keeps. Keep `id`. Copy `user_id`, `user_email`, `user_provenance`, `details` and `timestamp`. Copy `roles`→`user_role` and `action` raw. |
| `pi_user_archived` | `user_archive` | All rows; legacy purges them after 90 days. Keep `user_id`. Copy every column raw, including provenances not migrated as users, so the deleted-accounts MI report shows what legacy recorded. Reject rows with no `archived_date`. |

### 3.2 Publications

| Legacy | New | Treatment |
|---|---|---|
| `location_metadata` | `location_metadata` | Keep the id. Trim the four messages, converting empty strings to null. Set `updated_at`. Reject unknown locations and rows with no message. |
| `list_search_config` | `list_search_config` | Keep the id. Map list type name. A config may set one field name; the other is stored as blank, which the extractor skips. Reject a config with neither, a field name over 100 characters, or a second config for the same list type. |
| `artefact` | `artefact` | Only artefacts still displayed: `display_to IS NULL OR display_to > now()`. Field rules are below. |
| `artefact_search` | `artefact_search` | Copied for the migrated artefacts, so case search works without rebuilding. |
| `artefact` container | `artefact/<artefactId>` | Done by the copy script. The legacy `payload` URL points to a randomly named blob, copied to the artefact id. |
| `publications` container | `publications` | Done by the copy script: `<artefactId>.pdf` and `<artefactId>.xlsx` for migrated artefacts only, so files of rejected and expired artefacts stay in legacy. `<artefactId>_cy.pdf` isn't copied, because nothing here serves it. Welsh and bilingual lists lose their Welsh PDF. |

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
| `display_from/to`, `last_received_date`, `superseded_count`, `provenance`, `is_flat_file`, `source_artefact_id` | same | copy |

### 3.3 Mappings

The mappings are temp tables near the top of both scripts: `role_map`, `search_type_map` and `list_type_rename`. #1077 renamed most list types here to their legacy `ListType` enum names, so a list type is matched by its own name first. `list_type_rename` only covers the names that still differ: `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST`→`INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`, and the Crown lists, where both `CROWN_ADVANCE_PDDA_LIST` and `CROWN_WARNED_PDDA_LIST` map to `CROWN_ADVANCED_PDDA_LIST`. Legacy V1.25/V1.26 renamed the Crown Warned List to the Crown Advance List, and #957 renamed it here. Names with no match either way are reported as `unknown list type`.

### 3.4 Not migrated

`location` (`location-data.ts` is maintained by hand here), `artefact_archived`, `location_reference`, the legacy MI views, and the tables only this service has (`notification_audit_log`, `legacy_third_party_push_log`, `ingestion_log`, `third_party_secret`).

### 3.5 Not checked

Without the TypeScript sync, these checks are gone. Do them by hand on the dry run if they matter:

- JSON payloads aren't validated against the list type schemas. The payloads aren't in the database.
- Location metadata markup isn't checked against the HTML allowlist. Disallowed tags are still dropped when the page renders.
- Flat files whose `source_artefact_id` has no file extension aren't given one. Those files may not be served with the right type.
- Legacy locations aren't compared with `location-data.ts`. Artefacts, subscriptions and metadata for locations missing here are rejected, and the report shows them as `unknown location`.
- Missing blobs show up as failed `azcopy` commands, not in the report.

## 4. Schema and supporting changes

- `user.last_verified_date` (migration `20261008000000_add_user_last_verified_date`). Copied from legacy; not yet written by this service.
- `user.is_legacy_migrated` (migration `20261014000000_add_user_is_legacy_migrated`). Default `false`; set only by the migration.
- `infrastructure/postgres.tf`: `postgres_fdw` allowed on the cath server.

## 5. Testing the scripts

```bash
apps/postgres/legacy-migration/test/run.sh
```

It creates three scratch databases in the `cath-postgres` container: `lm_cath` from the Prisma migrations, and `lm_account` and `lm_publication` with the production legacy schema, from the fixtures in `test/`. It never touches the dev database.

It then checks:
- the `env`, `aat` and second-apply guards, and a migrate dry run that changes nothing;
- the mapping rules after an apply, including the London-time conversion;
- `pip-to-cath-files.sh`, run against stub `az` and `azcopy`;
- the changes in `test/cath-changes.sql` written back by `cath-to-pip-migration.sql`, with the rules in §2 (super-admin role kept, merged subscriptions deleted, unknown enum values skipped);
- a cath → pip dry run that changes nothing, a rerun that changes nothing, and no pip connection or password left behind after any run;
- `cath-to-pip-files.sh`.

Extend the fixtures when a mapping rule changes.

`legacy-migration/list-type-mapping.test.ts` runs with `yarn test` and needs no database. It fails if the two scripts' mappings differ, if a rename points at a list type `list-type-data.ts` doesn't have, or if the pip list types with no target here change. That catches a list type being added or renamed here without the scripts being updated.

## 6. What's left

Checked against open `hmcts/cath-service` issues on 2026-10-15. "No ticket" means no open issue covers it. Project board statuses were not checked.

### Before any run, dry runs included

| Need | Ticket |
|---|---|
| Logins on both legacy DBs (read-only to migrate, read-write to roll back), and a hub firewall rule from the cath Postgres subnet to the legacy Postgres servers (§1) | No ticket |
| `postgres_fdw` allowed on the cath server (`infrastructure/postgres.tf`), and an `azure_pg_admin` member for the first run | Terraform change in this branch |
| Every legacy list type mapped to a list type here. Unmapped ones are rejected, with their artefacts and subscriptions. | No ticket for a parity check; list types are built one ticket each |
| `location-data.ts` matching the legacy locations. Rows for unknown locations are rejected. | No ticket |

### Before apply runs

| Need | Ticket |
|---|---|
| Read access to the legacy `artefact`, `publications` and `files` containers, and write access to the cath storage and `cath-tp-{env}`, for whoever runs the copy script | No ticket |
| The legacy OAuth vault identified and `get` access to it. Until then, leave out `-v legacy_vault`; the secret commands are skipped, which doesn't block anything else. | No ticket |
| A non-prod environment to apply to | Perftest is available. Ithc is blocked until 2026-12-21 (#1067). |

### Open from the coverage audit (2026-10-15)

The legacy enums were first rebuilt from pip-frontend's `listLookup.json`. `cath-to-pip-migration.sql` takes them from the pip-data-models 2.3.58 jar.

| Need | Notes |
|---|---|
| Decide how list-type subscriptions behave | In legacy, `subscription_list_type` narrows a user's location subscriptions, and a user with no row gets no location emails (`SubscriptionRepository.findSubscriptionsByLocationSearchValue`). Here a row is a national subscription and turns the user's location subscriptions off. Migrated users would get their list types from every court. |
| Courtel sensitivity | Legacy only sends CLASSIFIED lists to third parties whose role allows them. `legacy_third_party_user` has no role, and fulfilment pushes by list type only. |
| 23 legacy list types with no target | Checked against `list-type-data.ts` on 2026-10-27. The 15 Rolls Building CHD/KB sub-lists, `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS`, both Technology and Construction Court lists, `CARE_STANDARDS_LIST`, `CIC_DAILY_HEARING_LIST` and `PRIMARY_HEALTH_LIST`. Legacy V1.12 removed CIC subscriptions, so that one may already be retired. Each needs a list type, a rename or an accepted drop. |
| Location email and contact number | `location-data.ts` and the seed have no contact details, so legacy values are lost. |
| Prod data checks | Whether a null or empty `subscription_list_type.list_language` means every language in legacy; those rows are rejected as `unsupported list language`. Counts of `PENDING` `api_user` rows, `CASE_ID`/`CASE_URN` subscriptions with no `CASE_NUMBER` twin, `LIST_TYPE` subscriptions on the email channel, subscribers with more than one OAuth configuration, and artefacts that would share `(location, content_date, language, list_type, provenance)`, which legacy keeps unique and this service doesn't. |

### Before cutover

| Need | Ticket |
|---|---|
| Prod environment | #1097 |
| Artefact expiry and audit log retention | #352 |
| Inactive accounts and media re-verification, which use `last_verified_date` | #351, with #894 and #918 for the deleted-accounts archive. Once this service archives accounts itself, `pip-to-cath-migration.sql` must stop replacing the whole of `user_archive`. Nothing writes it here yet; `cath-to-pip-migration.sql` already copies new archive rows back. |
| B2C login using `oid` before `sub`, so media users match their migrated row | No ticket. #1032 (`PI_AAD` provenance) was partly done in #1052 and is still open. |
| Crime login using `subname`, to match migrated `CRIME_IDAM:<subname>` ids | No ticket. #624 covers Crime OIDC setup, not this. |
| Lowercasing emails on every write, and refreshing them from the IdP on login | No ticket |
| Real location references in place of the synthetic seeded ones, so ingestion matches | No ticket |
| Push to OAuth third parties, which nothing reads `third_party_*` for yet | Epic #836, but no ticket for the push itself |
| Check that migrated subscriptions email the same people legacy does | No ticket |
| Traffic switch to this service | #655 (proxy). This differs from a Front Door/APIM switch, so pick one. |
