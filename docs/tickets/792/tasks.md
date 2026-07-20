# Tasks: #792 Mental Health Tribunal Daily Hearing List

## Implementation Tasks

- [x] Add `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST` entry to `listTypeData[]` in `libs/list-types/common/src/list-type-data.ts` (provenance `CFT_IDAM`, `isNonStrategic: false`, `defaultSensitivity: "Public"`, `shortenedFriendlyName` = full name, `subJurisdictionIds: [20]`, English + Welsh friendly names from ticket)
- [x] Add prod seed row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` (empty `url`, `'Public'`, `'CFT_IDAM'`, `false`)
- [x] Add sub-jurisdiction link row (`'MENTAL_HEALTH_TRIBUNAL_HEARING_LIST', 20`) to the Step 2 `VALUES` block in `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql`
- [x] Create `libs/list-types/common/src/list-type-data.test.ts` asserting the new entry's fields and `listTypeData[].name` uniqueness (AAA pattern)
- [x] Add `mentalHealthNotice` (English) to `apps/web/src/pages/(public)/summary-of-publications/en.ts`
- [x] Add `mentalHealthNotice` Welsh placeholder to `apps/web/src/pages/(public)/summary-of-publications/cy.ts`
- [x] Update `apps/web/src/pages/(public)/summary-of-publications/index.ts`: import `getAllSubJurisdictions`, resolve Mental Health Tribunal sub-jurisdiction id by stable name, set `showMentalHealthNotice` from `location.subJurisdictions`, pass `mentalHealthNotice` to `res.render`
- [x] Add conditional `govukInsetText` block for `mentalHealthNotice` in `apps/web/src/pages/(public)/summary-of-publications/index.njk` (after the `cautionMessage` block)
- [x] Update `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` and `index.njk.test.ts` to cover notice shown / not shown based on location sub-jurisdiction (mock `getAllSubJurisdictions` + `getLocationById`)
- [~] Run `yarn db:generate` then re-seed locally (`libs/location/src/seed-list-types.ts`) and verify the list appears in the `/manual-upload` dropdown as "Mental Health Tribunal Daily Hearing List" with sensitivity defaulting to Public — CANNOT be done in headless env (no live DB). Catalogue + prod-seed SQL updated; manual upload dropdown auto-populates from `findStrategicListTypes()` so no code change needed. Requires local/STG DB re-seed + browser check to confirm.
- [~] Verify AC5 notice renders in English and with `?lng=cy` on a Mental Health Tribunal location's summary of publications page — controller/template/tests done; live browser render at `?lng=cy` requires a running app + seeded MHT location, not possible headless.
- [x] Run `yarn lint:fix`, `yarn test`, and confirm no JSON-schema guard test is triggered (flat file has no schema)
- [x] Resolve open items in plan CLARIFICATIONS: (1) provenance = `CFT_IDAM`; (2) AC5 trigger = location linked to Mental Health Tribunal sub-jurisdiction; (3) region "National" is a location-level attribute — no list-type change; (4) Welsh notice remains a `[WELSH TRANSLATION REQUIRED: ...]` placeholder; (5) no dedicated list page — flat file served via existing `/hearing-lists/...` link.
