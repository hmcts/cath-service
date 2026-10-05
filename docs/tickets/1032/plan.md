# Technical Plan: #1032 Replace the non-standard B2C_IDAM provenance with PI_AAD

## 1. Technical Approach

### Strategy

Rename the account provenance value `B2C_IDAM` to the platform-standard `PI_AAD` everywhere it is stored, typed, validated, filtered or displayed. This is a data-consistency fix: internal value changes, user-facing labels ("B2C") do not.

The service is not live, so we do the change in one release rather than the staged "accept both → migrate → write only PI_AAD → remove shim" sequence from the ticket notes:

1. A data-only Prisma migration rewrites existing `user.user_provenance = 'B2C_IDAM'` rows to `PI_AAD`.
2. Writers (`createLocalMediaUser`, `updateLocalMediaUser`) write `PI_AAD`.
3. The `User` type drops `B2C_IDAM`.
4. Admin validation accepts `PI_AAD` and rejects `B2C_IDAM`.
5. The `flatMap` shim in `searchUsers` is deleted.
6. The find-users checkbox and label maps, and manage-user display map, key on `PI_AAD` and keep the "B2C" label.
7. Tests are renamed/updated so no `B2C_IDAM` literal remains outside the migration file.

`apps/postgres/start.sh` runs `prisma migrate deploy` before anything else, so by the time the new web code runs, no `B2C_IDAM` rows remain.

### Findings from codebase investigation

- **The "live impact" in the ticket does not happen at runtime today.** `canAccessPublication` is always called with the session user (`req.user`). Its `provenance` is hardcoded to `"PI_AAD"` in `extractUserProfile` (`apps/web/src/pages/(auth)/login/return/index.ts:216`). B2C sign-in never reads or writes the `user` table, and `logout/index.ts:39` already branches on `PI_AAD`. So verified users are **not** denied SJP Press Lists by this bug today. `B2C_IDAM` only exists in the `user` table, where it is written by media-application approval (`libs/admin-pages/src/media-application/service.ts` → `libs/account/src/repository/service.ts`). It is only read by System Admin features: find-users filtering, manage-user display and the MI report CSV export. The fix is still worth doing because it makes the DB match the session and the platform, and lets admin filtering on `PI_AAD` work. But it is not a production access outage, and the ticket should be corrected to say so.
- **No other table holds `B2C_IDAM`.**
  - `audit_log.user_provenance` is only written from `req.user?.provenance || "azure-ad"`. For B2C users that is `PI_AAD`, and audit actions are System Admin (SSO) actions anyway.
  - `artefact.provenance` and `location_reference.provenance` are publisher provenances (`MANUAL_UPLOAD`, `SNL`, `PDDA` and so on), not account provenances.
  - `list_types.allowed_provenance` already uses `PI_AAD`.
  - Subscription and third-party tables have no provenance column.
  - No seed or reference data (`list-type-data.ts`, `location-data.ts`, `generate-seed-sql.ts`) contains `B2C_IDAM`.
- **`libs/test-support` already defaults test users to `PI_AAD`** (`libs/test-support/src/routes/test-support/users.ts:20`). `e2e-tests/tests/system-admin/delete-court.spec.ts:204` creates a `PI_AAD` user. No e2e test uses `B2C_IDAM`, and none filters by the B2C checkbox.
- **The manage-user page shows `PI_AAD` rows raw today.** `PROVENANCE_DISPLAY` only maps `B2C_IDAM`, so rows already holding `PI_AAD` show as `PI_AAD`, not "B2C". Re-keying the map fixes this.
- **The MI report shows the change.** `libs/system-admin-pages/src/mi-report/queries.ts` exports raw `user_provenance`, so media accounts will appear as `PI_AAD` instead of `B2C_IDAM` in the CSV. That is the intended outcome, but it is a visible change to report consumers.

### Migration conventions (verified)

- Migrations live in `apps/postgres/prisma/migrations/` (configured in `apps/postgres/prisma.config.ts`), not in `libs/postgres-prisma/prisma/`. That directory only holds `schema/`.
- Folder naming is `YYYYMMDDHHMMSS_snake_case_description`. Hand-written migrations use a rounded timestamp, for example `20260914120000_rename_crown_list_types_to_pdda` and `20260924000000_allowed_provenance_to_text_array`.
- There is a precedent for data-only migrations. `20260914120000_rename_crown_list_types_to_pdda/migration.sql` is a pure `UPDATE`, with a leading SQL comment explaining why the change is done in place. A data-only `UPDATE "user" ...` fits this convention. No schema change is needed: `user_provenance` stays `VARCHAR(20)`, and `PI_AAD` fits.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

### Database migration (data-only)

**New:** `apps/postgres/prisma/migrations/20261005000000_replace_b2c_idam_provenance_with_pi_aad/migration.sql`

```sql
-- B2C_IDAM was this service's own name for the platform-standard PI_AAD provenance
-- (pip-data-models UserProvenances). Media accounts were written with B2C_IDAM while the
-- B2C sign-in session and list-type allowed_provenance use PI_AAD. Normalise stored rows.
-- Idempotent: re-running matches no rows.
UPDATE "user" SET "user_provenance" = 'PI_AAD' WHERE "user_provenance" = 'B2C_IDAM';
```

- No `schema.prisma` change, so `yarn db:generate` is not strictly needed. `prisma migrate dev` will not try to diff a data-only migration.
- `user_provenance_id` is the unique key, not `user_provenance`, so the update cannot cause a conflict.
- `audit_log` is left alone. It is historical, and investigation found no `B2C_IDAM` writers for it.

### `libs/account`

- `src/repository/model.ts`: change `userProvenance` to `"SSO" | "CFT_IDAM" | "CRIME_IDAM" | "PI_AAD"`.
- `src/repository/service.ts:24,40`: change `userProvenance: "B2C_IDAM"` to `"PI_AAD"` in both `createLocalMediaUser` and the create branch of `updateLocalMediaUser`. Optionally extract `const MEDIA_USER_PROVENANCE = "PI_AAD";` at the top of the module so the value is not duplicated (DRY).
- `src/repository/service.test.ts:39,46,89`: rename the test title to "...with PI_AAD provenance..." and assert `userProvenance: "PI_AAD"`.

### `libs/system-admin-pages`

- `src/user-management/validation.ts:6`: change to `VALID_PROVENANCES = ["CFT_IDAM", "SSO", "PI_AAD", "CRIME_IDAM"]`.
- `src/user-management/validation.test.ts`: add `it("should return null when PI_AAD is submitted")` and `it("should return error when B2C_IDAM is submitted")`. The second test needs the rejected literal, so build it so the source does not contain `B2C_IDAM`. Better, assert that a generic unknown value is rejected and treat the `PI_AAD` acceptance test as sufficient (see Open Question 5).
- `src/user-management/queries.ts:54-57`: delete the `flatMap` and use `whereClause.userProvenance = { in: filters.provenances };`.
- `src/user-management/queries.test.ts`: there is no provenance test today. Add one asserting that `searchUsers({ provenances: ["PI_AAD"] })` calls `prisma.user.findMany`/`count` with `where: { userProvenance: { in: ["PI_AAD"] } }`, with no expansion.

### `apps/web` (System Admin pages; composition-layer edits limited to these value keys)

- `src/pages/(system-admin)/find-users/index.njk:96`: checkbox `{ value: "PI_AAD", text: provenanceB2c, checked: filters.provenances and "PI_AAD" in filters.provenances }`.
- `src/pages/(system-admin)/find-users/index.ts:119`: in the selected-filter tag label map, change the `B2C_IDAM` key to `PI_AAD: content.provenanceB2c`.
- `src/pages/(system-admin)/find-users/index.ts:141-147`: in the table label map, remove the `B2C_IDAM` entry and keep `PI_AAD: content.provenanceB2c`. The two maps are now identical, so hoist a single `provenanceLabels` built from `content` and reuse it in both places (DRY).
- `en.ts` / `cy.ts`: no change. `provenanceB2c: "B2C"` is kept in both.
- `src/pages/(system-admin)/find-users/index.test.ts`: add a case where `provenances: ["PI_AAD"]` produces a selected-filter tag with label "B2C". Add a case where a user row with `userProvenance: "PI_AAD"` renders "B2C" in the table.
- `src/pages/(system-admin)/find-users/index.njk.test.ts`: the checkbox count stays 4. Add an assertion that `input[name='provenances'][value='PI_AAD']` exists with label "B2C" (en and cy).
- `src/pages/(system-admin)/manage-user/[userId]/index.ts:24`: change to `{ PI_AAD: "B2C" }`. Move it to a module-level `const PROVENANCE_DISPLAY` per the module-ordering convention.
- `src/pages/(system-admin)/manage-user/[userId]/index.test.ts`: add a case where `getUserById` returns `userProvenance: "PI_AAD"` and the rendered `user.userProvenance` is `"B2C"`.
- `manage-user/[userId]/index.njk.test.ts`: already uses the display value `"B2C"`, so no change.

### `libs/publication`

- `src/authorisation/service.test.ts:172`: rename to `"should deny PI_AAD user when list type only allows CRIME_IDAM"`. The body is already correct.
- Add a test: VERIFIED `PI_AAD` user, `CLASSIFIED` artefact, list type `allowedProvenance: ["PI_AAD"]` (the `SJP_PRESS_LIST` shape) → `true`. Similar tests exist at lines 112-150. Confirm one matches the SJP shape exactly, and only add it if missing.

### `libs/admin-pages`

- `src/media-application/service.test.ts:200`: rename the title to "should create local user record via createLocalMediaUser". The test only asserts the `createLocalMediaUser` call, and the provenance assertion lives in `libs/account`.

### No changes

- `libs/auth` and `login/return` (already `PI_AAD`), `logout` (already `PI_AAD`), `list-type-data.ts` (handled by #698), and the B2C config names (out of scope).

## 3. Error Handling & Edge Cases

- **Stale find-users filters.** Filters are stored in the session (`session.userManagement.filters`), not in query strings. They are validated on POST only and are not revalidated on GET.
  - A session created before deploy that holds `provenances: ["B2C_IDAM"]` will query `in: ["B2C_IDAM"]` and return zero rows. It shows the "no results" error and a "B2C_IDAM" raw tag, which can be removed via remove-filter or clear-filters.
  - Nothing crashes. Sessions are short-lived and the service is not live, so we accept this rather than add translation code (YAGNI).
- **A crafted POST with `provenances=B2C_IDAM`** now fails validation with "Invalid provenance selection". This is the intended behaviour.
- **Mixed data.** Some rows are already `PI_AAD`, as the shim implies. The migration only touches `B2C_IDAM` rows. Rows already holding `PI_AAD` are unaffected and now display "B2C" on manage-user, which fixes the current raw display.
- **Rollback.** Code rollback after the migration leaves rows as `PI_AAD`. The old code's shim still returns them when filtering by `B2C_IDAM`, and the old find-users table map already includes `PI_AAD`. Only the old manage-user page would show `PI_AAD` raw. Rollback is safe, and no down-migration is needed.
- **Labels.** The en/cy label is unchanged ("B2C" in both). Only the internal value key changes.
- **MI report.** The CSV `user_provenance` column switches from `B2C_IDAM` to `PI_AAD` for media users. This is expected, but tell any downstream consumers.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| New media accounts written with `PI_AAD` | `service.ts:24,40` changed | `libs/account/src/repository/service.test.ts` asserts `PI_AAD` for both create paths |
| Existing accounts migrated | Data-only migration `UPDATE "user" ... WHERE user_provenance = 'B2C_IDAM'` | Run `yarn db:migrate:dev` locally against a DB seeded with a `B2C_IDAM` user, then check `SELECT count(*) FROM "user" WHERE user_provenance='B2C_IDAM'` = 0. Get per-environment counts before and after deploy (OQ2) |
| Type no longer admits `B2C_IDAM` | `model.ts` union narrowed | `yarn tsc`/build passes. A literal `"B2C_IDAM"` assigned to `User["userProvenance"]` fails to compile |
| `PI_AAD` valid for admin filtering | Added to `VALID_PROVENANCES`; checkbox value is `PI_AAD` | `validation.test.ts`, `find-users/index.test.ts`, `index.njk.test.ts`. Optionally extend `e2e-tests/tests/system-admin/user-management.spec.ts` to tick the B2C checkbox inside the existing journey (no new test) |
| Shim removed | `flatMap` deleted | `queries.test.ts` asserts `in: ["PI_AAD"]` is passed through unchanged |
| Verified users can open SJP Press Lists | Already true at runtime (session provenance is `PI_AAD`); unaffected by this change | `authorisation/service.test.ts` case: PI_AAD + CLASSIFIED + `["PI_AAD"]` → true. Existing `e2e-tests/tests/sjp-press-list.spec.ts` continues to pass |
| No `B2C_IDAM` remains | All 14 occurrences changed | `grep -rn "B2C_IDAM" --exclude-dir={node_modules,dist,docs,requirements} .` returns only the migration file (see OQ5) |
| Welsh/English labels unchanged | `provenanceB2c` untouched; maps re-keyed | find-users and manage-user unit/njk tests render "B2C" for a `PI_AAD` user in en and cy |

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **User-facing label.** We recommend keeping "B2C" as the ticket suggests. It describes the sign-in method admins recognise, and keeping it means no Welsh copy change. The plan assumes the label is unchanged. Please confirm.
2. **Row counts per environment.** Please run `SELECT user_provenance, count(*) FROM "user" GROUP BY 1;` on local and STG before deploy, to size the migration and confirm both values coexist. The migration is idempotent and safe whatever the result.
3. **Other tables.** Investigation found no `B2C_IDAM` outside `user.user_provenance`. `audit_log.user_provenance` is written from session provenance only (`PI_AAD` for B2C users, `azure-ad` fallback). Artefact and location-reference provenances are publisher values, and subscription and third-party tables have no provenance column. We propose leaving `audit_log` untouched as historical record. Please confirm that is acceptable. A defensive `SELECT count(*) FROM audit_log WHERE user_provenance='B2C_IDAM'` on STG would close this off.
4. **External callers.** No API route in this repo accepts or returns account provenance. The only outward exposure is the System Admin MI report CSV, which will now show `PI_AAD`. Please confirm nobody downstream parses `B2C_IDAM` from that export. If someone does, we need a transition note, not code.
5. **AC "no `B2C_IDAM` anywhere" conflicts with the migration.** The migration SQL must contain the literal `'B2C_IDAM'` in its `WHERE` clause. Please agree that `apps/postgres/prisma/migrations/` is an allowed exception, alongside `requirements/` and `docs/tickets/`. Obfuscating the literal (`'B2C' || '_IDAM'`) would be worse. For the same reason, the negative validation test should use a generic invalid value, not `B2C_IDAM`.
6. **Ticket "live impact" claim.** As described in Section 1, verified users are not currently denied SJP Press Lists, because `canAccessPublication` uses the session provenance, which is already `PI_AAD`. Please update the ticket description so this is not treated as a production access incident. The "Verified users can open SJP Press Lists" AC is satisfied as a regression guard, not as a fix.
