#!/usr/bin/env bash
# Tests the legacy migration scripts against scratch databases in the local cath-postgres
# container: migrate legacy into cath, make changes in cath, then roll them back into legacy.
# See docs/migration/legacy-data-migration.md §5. Never touches the dev database.
set -euo pipefail

CONTAINER=${CONTAINER:-cath-postgres}
PGUSER=${PGUSER:-hmcts}
HERE=$(cd "$(dirname "$0")" && pwd)
MIGRATIONS="$HERE/../../prisma/migrations"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

psql_in() { local db=$1; shift; docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$CONTAINER" psql -U "$PGUSER" -d "$db" -X -q -v ON_ERROR_STOP=1 "$@"; }
fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok: $*"; }
check() { # <db> <sql> <expected> <description>
  local actual
  actual=$(psql_in "$1" -At -c "$2")
  [ "$actual" = "$3" ] || fail "$4: expected '$3', got '$actual'"
  pass "$4"
}
snapshot() { # <db> <tables...>
  local db=$1; shift
  for t in "$@"; do
    echo "$t $(psql_in "$db" -At -c "SELECT count(*) || ' ' || md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) FROM $t x")"
  done
}
legacy_snapshot() {
  snapshot lm_account pi_user subscription subscription_list_type media_application audit_log pi_user_archived api_user api_subscription api_oauth_configuration
  snapshot lm_publication location_metadata list_search_config artefact artefact_search
}
connect_args=(-v account_host=localhost -v account_dbname=lm_account -v account_user=lm_legacy
              -v publication_host=localhost -v publication_dbname=lm_publication -v publication_user=lm_legacy
              -v legacy_storage=legacysa -v cath_storage=cathsa)
run_script() { # <script> <args...>; output only, because several runs are expected to fail
  local script=$1; shift
  docker exec -i -e PGOPTIONS="-c client_min_messages=warning" -e PIP_ACCOUNT_PASSWORD=lm_legacy -e PIP_PUBLICATION_PASSWORD=lm_legacy \
    "$CONTAINER" psql -U "$PGUSER" -d lm_cath -X -q -v ON_ERROR_STOP=1 -f "/tmp/legacy-migration/$script" "$@" 2>&1 || true
}
migrate() { run_script pip-to-cath-migration.sql "${connect_args[@]}" -v cath_vault=cath-tp-test -v legacy_vault=legacy-kv \
  -v files_script=/tmp/legacy-migration/pip-to-cath-files.sh "$@"; }
rollback() { run_script cath-to-pip-migration.sql "${connect_args[@]}" -v files_script=/tmp/legacy-migration/cath-to-pip-files.sh "$@"; }
no_connection_left() { check lm_cath "SELECT count(*) FROM pg_foreign_server" "0" "$1 leaves no pip connection or password behind"; }

# Setup
docker exec "$CONTAINER" rm -rf /tmp/legacy-migration
docker cp "$HERE/.." "$CONTAINER:/tmp/legacy-migration"
# The container has no TLS; the real servers do.
docker exec "$CONTAINER" sh -c "sed -i \"s/sslmode 'require'/sslmode 'disable'/\" /tmp/legacy-migration/*.sql"
for db in lm_cath lm_account lm_publication; do
  psql_in postgres -c "DROP DATABASE IF EXISTS $db WITH (FORCE)" -c "CREATE DATABASE $db"
done
for f in "$MIGRATIONS"/*/migration.sql; do psql_in lm_cath < "$f" > /dev/null 2>&1; done
psql_in lm_cath < "$HERE/cath-seed.sql"
psql_in lm_account < "$HERE/legacy-account.sql"
psql_in lm_publication < "$HERE/legacy-publication.sql"
psql_in postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lm_legacy') THEN CREATE ROLE lm_legacy LOGIN PASSWORD 'lm_legacy'; END IF; END \$\$"
for db in lm_account lm_publication; do psql_in "$db" -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lm_legacy"; done

# Migrate: guards and dry run
run_script pip-to-cath-migration.sql | grep -q "pass -v env=<value>" || fail "migration ran without its settings"
no_password=$(docker exec -i "$CONTAINER" psql -U "$PGUSER" -d lm_cath -X -q \
  -f /tmp/legacy-migration/pip-to-cath-migration.sql "${connect_args[@]}" -v env=perftest -v cath_vault=v 2>&1 || true)
grep -q "export PIP_ACCOUNT_PASSWORD" <<<"$no_password" || fail "migration ran without the pip passwords"
pass "migration lists missing settings and passwords"
migrate -v env=aat -v apply=1 | grep -q "refusing to apply to aat" || fail "migration applied to aat"
pass "migration refuses to apply to aat"
rollback | grep -q "legacy_migration_baseline does not exist" || fail "cath-to-pip ran before a migration"
pass "cath-to-pip needs an applied migration"

cath_tables='"user" subscription subscription_list_type notification_audit_log legacy_third_party_user
             legacy_third_party_subscription third_party_user third_party_subscription media_application audit_log
             user_archive location_metadata list_search_config artefact artefact_search ingestion_log'
# shellcheck disable=SC2086
snapshot lm_cath $cath_tables > "$WORK/cath-before"
migrate -v env=perftest > "$WORK/dry-run"
grep -q "Dry run: nothing was written" "$WORK/dry-run" || fail "dry run did not finish: $(cat "$WORK/dry-run")"
# shellcheck disable=SC2086
snapshot lm_cath $cath_tables | diff -q "$WORK/cath-before" - > /dev/null || fail "migrate dry run changed cath"
pass "migrate dry run changes nothing"
no_connection_left "migrate dry run"

# Migrate: apply
migrate -v env=perftest -v apply=1 > "$WORK/migrate"
grep -q "Applied." "$WORK/migrate" || fail "migrate apply failed: $(cat "$WORK/migrate")"
no_connection_left "migrate apply"
check lm_cath "SELECT email FROM \"user\" WHERE user_id = '11111111-0000-0000-0000-000000000001'" "media@example.com" "email lowercased and trimmed"
check lm_cath "SELECT role FROM \"user\" WHERE user_id = '11111111-0000-0000-0000-000000000002'" "INTERNAL_ADMIN_CTSC" "super admin role mapped"
check lm_cath "SELECT user_provenance_id FROM \"user\" WHERE user_id = '11111111-0000-0000-0000-000000000003'" "CRIME_IDAM:sub-3" "Crime IDAM id namespaced"
check lm_cath "SELECT count(*) FROM \"user\" WHERE user_id IN ('11111111-0000-0000-0000-000000000005')" "0" "unmapped role rejected"
check lm_cath "SELECT count(*) FROM \"user\" WHERE user_id = 'cccccccc-0000-0000-0000-000000000001'" "1" "local tester kept"
check lm_cath "SELECT count(*) FROM \"user\" WHERE user_id = 'cccccccc-0000-0000-0000-000000000002'" "0" "local user with a legacy provenance id replaced"
check lm_cath "SELECT count(*) FROM subscription WHERE user_id = '11111111-0000-0000-0000-000000000001'" "2" "CASE_ID and CASE_URN copies collapsed"
check lm_cath "SELECT sensitivity FROM third_party_subscription" "PUBLIC" "duplicate third-party subscription keeps the least access"
check lm_cath "SELECT language || ' ' || display_from FROM artefact WHERE artefact_id = 'aaaaaaaa-0000-0000-0000-000000000001'" \
  "BILINGUAL 2026-07-01 11:00:00" "London time converted to UTC"
check lm_cath "SELECT string_agg(t.name, ',' ORDER BY t.name) FROM artefact a JOIN list_types t ON t.id = a.list_type_id" \
  "CIVIL_DAILY_CAUSE_LIST,CST_WEEKLY_HEARING_LIST,INTERIM_APPLICATIONS_DAILY_CAUSE_LIST" "list types matched by name first, then through the rename table"
check lm_cath "SELECT proof_of_id_path FROM media_application" "44444444-0000-0000-0000-000000000001.jpg" "proof of ID path"
check lm_cath "SELECT count(*) FROM legacy_migration_baseline.\"user\"" "4" "baseline saved"
migrate -v env=perftest -v apply=1 | grep -q "a migration was already applied" || fail "second apply was not refused"
pass "second apply refused without -v replace"

# Forward file copy script
docker exec "$CONTAINER" cat /tmp/legacy-migration/pip-to-cath-files.sh > "$WORK/copy.sh"
bash -n "$WORK/copy.sh" || fail "copy script is not valid bash"
grep -q "aaaaaaaa-0000-0000-0000-000000000002" "$WORK/copy.sh" && fail "copy script copies a rejected artefact"
pass "copy script only copies migrated artefacts"
PATH="$HERE/stub:$PATH" bash "$WORK/copy.sh" > "$WORK/copy.out" 2>&1 || fail "copy script failed: $(cat "$WORK/copy.out")"
grep -q "client-secret=" "$WORK/copy.out" && fail "a secret that could not be read was written"
grep -q "FAILED: could not read csecret-key" "$WORK/copy.out" || fail "unreadable secret not reported"
pass "unreadable secret reported and skipped"
grep -q "client-id=value-of-cid-key mode=600" "$WORK/copy.out" || fail "secret not written through a private file: $(cat "$WORK/copy.out")"
grep -q "destination-url=https://dest.example/it's" "$WORK/copy.out" || fail "quoted URL not passed through intact"
pass "secrets written through a private file"

# Cath carries on, then traffic goes back to legacy
psql_in lm_cath < "$HERE/cath-changes.sql"

legacy_snapshot > "$WORK/legacy-before"
rollback > "$WORK/rollback-dry-run"
grep -q "Dry run: nothing was written" "$WORK/rollback-dry-run" || fail "rollback dry run did not finish: $(cat "$WORK/rollback-dry-run")"
legacy_snapshot | diff -q "$WORK/legacy-before" - > /dev/null || fail "rollback dry run changed legacy"
pass "rollback dry run changes nothing"
no_connection_left "rollback dry run"

rollback -v apply=1 > "$WORK/rollback"
grep -q "Applied." "$WORK/rollback" || fail "rollback apply failed: $(cat "$WORK/rollback")"
no_connection_left "rollback apply"
check lm_account "SELECT roles || ' ' || last_signed_in_date FROM pi_user WHERE user_id = '11111111-0000-0000-0000-000000000002'" \
  "INTERNAL_SUPER_ADMIN_CTSC 2026-10-27 09:05:00" "sign-in copied back, super admin role kept"
check lm_account "SELECT email FROM pi_user WHERE user_id = '11111111-0000-0000-0000-000000000001'" " Media@Example.com " "unchanged columns left as legacy had them"
check lm_account "SELECT count(*) FROM pi_user WHERE user_id = '11111111-0000-0000-0000-000000000003'" "0" "deleted account deleted"
check lm_account "SELECT count(*) FROM subscription WHERE id = '22222222-0000-0000-0000-000000000005'" "0" "deleted account's subscriptions deleted"
check lm_account "SELECT string_agg(search_type, ',' ORDER BY search_type) FROM subscription WHERE user_id = '11111111-0000-0000-0000-000000000001'" \
  "LOCATION_ID,LOCATION_ID" "CASE_ID and CASE_URN copies of a deleted subscription both deleted"
check lm_account "SELECT channel || ' ' || location_name FROM subscription WHERE id = 'eeeeeeee-0000-0000-0000-000000000011'" "EMAIL Other Court" "new court subscription written"
check lm_account "SELECT array_to_string(list_type, ',') FROM subscription_list_type WHERE user_id = '11111111-0000-0000-0000-000000000001'" \
  "CIVIL_DAILY_CAUSE_LIST,CST_WEEKLY_HEARING_LIST,FAMILY_DAILY_CAUSE_LIST,INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST,SSCS_DAILY_LIST" \
  "list types merged under pip names, pip-only kept, cath-only left out"
check lm_account "SELECT provenance_user_id || ' ' || roles FROM pi_user WHERE user_id = 'eeeeeeee-0000-0000-0000-000000000001'" "cft-new VERIFIED" "new account written"
check lm_account "SELECT count(*) FROM subscription WHERE id = 'eeeeeeee-0000-0000-0000-000000000012'" "1" "new account's subscription written"
check lm_account "SELECT count(*) FROM pi_user WHERE provenance_user_id = 'oid-5'" "1" "second account for an existing legacy user not written"
check lm_account "SELECT count(*) FROM subscription WHERE id = 'eeeeeeee-0000-0000-0000-000000000013'" "0" "local tester's subscription not written"
check lm_account "SELECT status FROM media_application WHERE id = '44444444-0000-0000-0000-000000000001'" "APPROVED" "media approval copied back"
check lm_account "SELECT image || ' ' || image_name FROM media_application WHERE id = 'eeeeeeee-0000-0000-0000-000000000003'" \
  "eeeeeeee-0000-0000-0000-000000000003 id.pdf" "new media application written"
check lm_account "SELECT string_agg(action, ',') FROM audit_log WHERE \"timestamp\" > '2026-10-27'" "MANAGE_USER" "audit entries written, unknown action left out"
check lm_account "SELECT status FROM api_user WHERE name = 'NewSub'" "ACTIVE" "new third party written"
check lm_account "SELECT list_type FROM api_subscription WHERE id = 'eeeeeeee-0000-0000-0000-000000000008'" "FAMILY_DAILY_CAUSE_LIST" "new third-party subscription written"
check lm_publication "SELECT display_to FROM artefact WHERE artefact_id = 'aaaaaaaa-0000-0000-0000-000000000001'" "2026-12-01 10:00:00" "display end copied back"
check lm_publication "SELECT display_from FROM artefact WHERE artefact_id = 'aaaaaaaa-0000-0000-0000-000000000001'" "2026-07-01 12:00:00" "unchanged artefact times left as legacy had them"
check lm_publication "SELECT language || ' ' || display_from || ' ' || payload FROM artefact WHERE artefact_id = 'eeeeeeee-0000-0000-0000-000000000004'" \
  "BI_LINGUAL 2026-08-01 11:00:00 https://legacysa.blob.core.windows.net/artefact/eeeeeeee-0000-0000-0000-000000000004" "new publication written in London time"
check lm_publication "SELECT case_number FROM artefact_search WHERE artefact_id = 'eeeeeeee-0000-0000-0000-000000000004'" "F1" "new publication's case search written"
check lm_publication "SELECT count(*) FROM artefact WHERE artefact_id = 'eeeeeeee-0000-0000-0000-000000000005'" "0" "publication with a cath-only list type not written"
check lm_publication "SELECT list_type FROM artefact WHERE artefact_id = 'eeeeeeee-0000-0000-0000-000000000009'" \
  "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST" "list type written back under the pip name"
check lm_publication "SELECT caution_message FROM location_metadata WHERE location_id = 1" "New caution" "court message copied back"
grep -q "action USER_LOGIN is not in legacy" "$WORK/rollback" || fail "rejected audit entry not reported"
pass "rows not written are reported"

legacy_snapshot > "$WORK/legacy-after"
rollback -v apply=1 | grep -q "Applied." || fail "rollback rerun failed"
legacy_snapshot | diff "$WORK/legacy-after" - || fail "rollback rerun changed legacy"
pass "rollback rerun changes nothing"

# Reverse file copy script
docker exec "$CONTAINER" cat /tmp/legacy-migration/cath-to-pip-files.sh > "$WORK/copy-back.sh"
bash -n "$WORK/copy-back.sh" || fail "copy-back script is not valid bash"
grep -q "cathsa.blob.core.windows.net/artefact/eeeeeeee-0000-0000-0000-000000000004' 'https://legacysa.blob.core.windows.net/artefact/eeeeeeee-0000-0000-0000-000000000004'" "$WORK/copy-back.sh" \
  || fail "new publication payload not copied back: $(cat "$WORK/copy-back.sh")"
grep -q "eeeeeeee-0000-0000-0000-000000000004.pdf" "$WORK/copy-back.sh" || fail "new publication files not copied back"
grep -q "aaaaaaaa-0000-0000-0000-000000000001" "$WORK/copy-back.sh" && fail "copy-back script copies a migrated publication"
grep -q "files/eeeeeeee-0000-0000-0000-000000000003.pdf' 'https://legacysa.blob.core.windows.net/files/eeeeeeee-0000-0000-0000-000000000003'" "$WORK/copy-back.sh" \
  || fail "new proof of ID not copied back"
pass "cath-to-pip file script copies only what was written to pip"

echo "All checks passed."
