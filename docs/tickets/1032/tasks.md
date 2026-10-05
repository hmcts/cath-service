# Tasks: #1032 Replace B2C_IDAM provenance with PI_AAD

## Implementation Tasks

- [x] Confirm the open questions in `plan.md` (label stays "B2C", migration folder is allowed to contain the `B2C_IDAM` literal, `audit_log` left untouched; negative validation test uses a made-up value)
- [~] Capture `SELECT user_provenance, count(*) FROM "user" GROUP BY 1;` on local and STG before deploy (local captured: `SSO`=1, no `B2C_IDAM`/`PI_AAD` rows; STG not accessible from this environment, still needed)
- [x] Add data-only migration `apps/postgres/prisma/migrations/20261005000000_replace_b2c_idam_provenance_with_pi_aad/migration.sql` with an explanatory comment and `UPDATE "user" SET "user_provenance" = 'PI_AAD' WHERE "user_provenance" = 'B2C_IDAM';`
- [x] Run `yarn db:migrate:dev` locally and verify that no `B2C_IDAM` rows remain (ran `yarn db:migrate` / `migrate deploy` against local cath-postgres with a temporary `B2C_IDAM` probe row; it became `PI_AAD` and was then deleted)
- [x] `libs/account/src/repository/model.ts`: narrow `userProvenance` to `"SSO" | "CFT_IDAM" | "CRIME_IDAM" | "PI_AAD"`
- [x] `libs/account/src/repository/service.ts`: write `PI_AAD` in `createLocalMediaUser` and in the create branch of `updateLocalMediaUser`
- [x] `libs/account/src/repository/service.test.ts`: update the titles and assertions (lines 39, 46, 89) to `PI_AAD`
- [x] `libs/system-admin-pages/src/user-management/validation.ts`: replace `B2C_IDAM` with `PI_AAD` in `VALID_PROVENANCES`
- [x] `libs/system-admin-pages/src/user-management/validation.test.ts`: add a test that `PI_AAD` is accepted
- [x] `libs/system-admin-pages/src/user-management/queries.ts`: remove the `flatMap` shim and pass `filters.provenances` straight through
- [x] `libs/system-admin-pages/src/user-management/queries.test.ts`: add a test asserting `where.userProvenance = { in: ["PI_AAD"] }` with no expansion
- [x] `apps/web/src/pages/(system-admin)/find-users/index.njk`: change the checkbox value to `PI_AAD` (label stays `provenanceB2c`)
- [x] `apps/web/src/pages/(system-admin)/find-users/index.ts`: re-key both label maps to `PI_AAD`, drop `B2C_IDAM`, and hoist the shared map
- [x] `apps/web/src/pages/(system-admin)/find-users/index.test.ts` and `index.njk.test.ts`: cover the `PI_AAD` filter tag, the table label "B2C" and the checkbox value in en and cy
- [x] `apps/web/src/pages/(system-admin)/manage-user/[userId]/index.ts`: change to a module-level `PROVENANCE_DISPLAY = { PI_AAD: "B2C" }`
- [x] `apps/web/src/pages/(system-admin)/manage-user/[userId]/index.test.ts`: add a case where `PI_AAD` is displayed as "B2C"
- [x] `libs/publication/src/authorisation/service.test.ts`: rename the line 172 test, and make sure a `PI_AAD` + `CLASSIFIED` + `["PI_AAD"]` → `true` (SJP Press List) case exists
- [x] `libs/admin-pages/src/media-application/service.test.ts`: rename the line 200 test title so it no longer mentions `B2C_IDAM`
- [ ] (Optional, not done) Optionally extend the existing journey in `e2e-tests/tests/system-admin/user-management.spec.ts` to filter by the B2C checkbox and find a `PI_AAD` user (no new test)
- [x] Run a case-sensitive `grep -rn "B2C_IDAM"` (excluding node_modules, dist, docs, requirements) and confirm the only hit is the migration file
- [x] Run `yarn lint:fix`, `yarn test` and a type check/build from the repo root
- [ ] Tell MI report consumers that media accounts now export as `PI_AAD` (communication task, not something code can do)
