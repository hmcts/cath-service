# Plan: #1382 Updates - Employment Tribunal

TEMPLATE SOURCE: n/a

## 1. Technical Approach

Three acceptance criteria, each a small change:

1. **Rename (display names only).** Change the English and Welsh friendly names, the shortened names and the locale `title`/`pageTitle` for both ET list types. Keep the internal names `ET_DAILY_LIST` and `ET_FORTNIGHTLY_PRESS_LIST`, the URL paths `et-daily-list` and `et-fortnightly-list`, and the package names as they are. Changing them would break:
   - stored artefacts, subscriptions and links
   - the Courtel `x-list-type` header, which `libs/legacy-third-party-fulfilment/src/push/headers.ts` builds from `list_types.name`
2. **Courtel feed.** Moved to #1761, and the AC has been removed from #1382. The ET lists arrive through the API, and the API pod cannot push to Courtel today for any list type. #1761 fixes that and subscribes Courtel to both ET list types (see section 2.3).
3. **Sensitivity Public.** Both entries already have `defaultSensitivity: "Public"`, so no change is needed. We add a unit test to lock it in.

Reference data reaches existing environments without a migration:
- **Deploy:** `apps/postgres/start.sh` runs `generate-seed-sql.ts` on every deploy. `generateListTypesSql` emits `INSERT ... ON CONFLICT (name) DO UPDATE SET friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, ...`, so renamed rows are updated in place.
- **Local:** `seedListTypes()` (`libs/location/src/seed-list-types.ts`) upserts the same fields.

Where the names are shown:
- **Database `friendly_name`:** emails (`hearingListName`, read in `libs/publication/src/processing/service.ts`), the summary of publications, subscriptions and the system-admin pages all read it. Updating the seed data updates all of these.
- **Database `shortened_friendly_name`:** the manual-upload list picker (`apps/web/src/pages/(admin)/manual-upload/index.ts`) reads it.
- **Lib locale `title`:** the page `<h1>` (`et-*-list.njk`, through `createCauseListRender`, `t.title`) and the PDF `<title>`/`<h1>` (`pdf-template.njk`, `loadTranslations`) read it.

## 2. Implementation Details

### 2.1 Names in code

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts` | `ET_DAILY_LIST`: set `englishFriendlyName` to "Employment Tribunal Daily Hearing List", `welshFriendlyName` to "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cyflogaeth" and `shortenedFriendlyName` to "ET Daily Hearing List". `ET_FORTNIGHTLY_PRESS_LIST`: set `englishFriendlyName` to "Employment Tribunal Advance Hearing List", `welshFriendlyName` to "Rhestr Gwrandawiadau Ymlaen llaw y Tribiwnlys Cyflogaeth" and `shortenedFriendlyName` to "ET Advance Hearing List". Leave `defaultSensitivity: "Public"` unchanged. |
| `libs/list-types/et-daily-list/src/locales/en.ts` | Set `title` to "Employment Tribunal Daily Hearing List" and `pageTitle` to "Employment Tribunal Daily Hearing List for". Remove the stale "listLookup.json" comment. |
| `libs/list-types/et-daily-list/src/locales/cy.ts` | Set `title` to "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cyflogaeth" and `pageTitle` to "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cyflogaeth ar gyfer". Remove the stale comment. |
| `libs/list-types/et-fortnightly-list/src/locales/en.ts` | Set `title` to "Employment Tribunal Advance Hearing List" and `pageTitle` to "Employment Tribunal Advance Hearing List for". |
| `libs/list-types/et-fortnightly-list/src/locales/cy.ts` | Set `title` to "Rhestr Gwrandawiadau Ymlaen llaw y Tribiwnlys Cyflogaeth" and `pageTitle` to "Rhestr Gwrandawiadau Ymlaen llaw y Tribiwnlys Cyflogaeth ar gyfer". |
| `libs/list-types/et-daily-list/src/validation/json-validator.ts`, `libs/list-types/et-fortnightly-list/src/validation/json-validator.ts` | Update the JSDoc list name. This is a comment only. |

The fortnightly locale currently has a different title from the database: the locale says "Employment Tribunals Fortnightly List" and the database says "Employment Tribunals Fortnightly Press List". This change aligns them.

### 2.2 Welsh catalogue

The ticket supplies the Welsh, so both Welsh names change in this ticket.

- `templates/tech-spec-references/welsh-translations-catalogue.json`: add the two new English-to-Welsh entries. It is used by `.github/scripts/translate-welsh.mjs`.
- `welsh/catalogue.csv`: add two rows with status `approved` and source = this ticket. The row `id` is a 10-character hash produced by the dtsse-agent-hub Welsh plugin, so generate it with that tool rather than by hand.
- Leave the old rows (lines 154-155 in the CSV, 143-144 in the JSON) in place. They are translation memory, not runtime data.

### 2.3 Courtel feed

How the push works, from `libs/legacy-third-party-fulfilment/src/service.ts`:
- `sendThirdPartyPublications` is called from `processPublication` (`libs/publication/src/processing/service.ts:909`).
- It returns early if `COURTEL_API_URL` or `COURTEL_CERTIFICATE` is missing from the pod's environment.
- It also returns early if `findSubscribersByListType(listTypeId)` finds no `legacy_third_party_subscription` rows.
- It does not run if the list type `is_hidden`.
- Successful pushes are logged to `third_party_push_log`. The Prisma model is `thirdPartyPushLog`. The ticket's name `legacy_third_party_push_log` is wrong.

**Moved to #1761: the API pod cannot push to Courtel.** Both ET list types have `allowedProvenance: ["CFT_IDAM"]`, so they arrive through the API: `apps/api/src/routes/v1/publication.ts` → `@hmcts/blob-ingestion` → `processPublication`.

- **Which pods have the secrets:** the web chart mounts both Courtel secrets. These are `apps/web/helm/values.yaml` lines 86-89 (`auto-pip-<ENV>-courtel-api`, `courtel-certificate`), `values.dev.yaml` and the `cath-web` section of the preview template.
- **What the API pod lacks:** the **API chart does not**. They were removed in commits `8d4e4bd68` and `202236b86`, and were never restored when #1097 re-enabled them for web.
- **Effect:** every API-ingested publication of any list type (all CFT_IDAM and CRIME_IDAM lists, not only ET) logs "Third-party push skipped: COURTEL_API_URL is not set", and nothing reaches Courtel even with subscriptions in place. Only manual uploads made through the web pod push.

Because this affects every API-ingested list type, it is handled in #1761 and is **out of scope for #1382**. #1382 does not wait for it. #1761 covers:
- Adding the Courtel secrets to `apps/api/helm/values.yaml` (`auto-pip-<ENV>-courtel-api` as `COURTEL_API_URL`, `courtel-certificate` as `COURTEL_CERTIFICATE`) and `values.dev.yaml` (`auto-pip-stg-courtel-api`).
- Confirming that the secrets exist in every `cath-<env>` vault first. If one is missing, the CSI driver cannot mount it and the API pod will not start, as commit `444942829` records happening on web.
- Finding out why the secrets were removed from the API chart in April 2026.
- Auditing the existing `legacy_third_party_subscription` rows per environment. Every API list type already subscribed will start pushing as soon as the secrets land.
- Agreeing the cutover with PIP so that Courtel does not receive duplicates.

**Subscriptions are per-environment data, not seed data.**
- `legacy_third_party_subscription` is keyed on the autoincrement `list_type_id`, which differs between environments.
- Nothing in `generate-seed-sql.ts` or `seedListTypes` seeds third-party users or subscriptions.
- They are managed through the system-admin pages `/manage-third-party-users` → `/manage-third-party-subscriptions` (`updateThirdPartySubscriptions` in `libs/system-admin-pages/src/third-party-user/queries.ts`). That route also writes an audit log entry.
- So: a system admin adds `ET_DAILY_LIST` and `ET_FORTNIGHTLY_PRESS_LIST` to the Courtel third-party user in each environment. No code is needed.

### 2.4 Sensitivity

- **Manual upload:** `defaultSensitivity` only sets the default in the manual-upload picker (`listTypeSensitivityMap`).
- **API ingestion:** the sensitivity comes from the per-publication `x-sensitivity` header. `libs/api/src/blob-ingestion/publication-headers.ts:100` defaults it to `PUBLIC` only when the header is absent. So CFT can still send a non-Public value per publication.
- **Change:** none. We add a unit test that both list types default to Public. A non-Public value sent by CFT for a publication is kept, which is correct.

### 2.5 Not changed

- **No Prisma schema change, migration or API endpoint.**
- **`apps/postgres/prisma/generate-seed-sql.test.ts`:** leave it alone. The ticket draft says to update it, but its `LIST_TYPES` fixture is self-contained and synthetic: it deliberately uses non-real Welsh, `isNonStrategic: true` and `defaultSensitivity: null`. It does not read `list-type-data.ts`.
- **E2E tests:** no file in `e2e-tests/` references either ET list or the old names.
- **Email templates:** no template hardcodes the names; they use the database friendly name.

## 3. Error Handling & Edge Cases

- **Rows renamed by a system admin (edit-list-type):** the next deploy seed overwrites them with the `list-type-data.ts` values. This is intended.
- **Soft-deleted rows:** the seed clears `deleted_at` on these list types, as it already does.
- **Hidden list types:** if either list type is hidden (`is_hidden`) in an environment, there is no Courtel push and no emails. Check both are shown.
- **Subscriptions added before the split-out ticket merges:** this is harmless. The API skips the push until it has the secrets, then pushes from that point on. Earlier publications are not re-sent.
- **Courtel down:** `pushWithRetry` retries, and a failure is logged as `FAILED` in `third_party_push_log`. Publication is not blocked because the push is fire-and-forget.
- **Duplicate pushes:** if PIP is still pushing ET lists to Courtel, enabling CaTH sends duplicates. The cutover is owned by the split-out ticket (clarification).
- **Existing artefacts:** they keep their `list_type_id`, so they show the new name immediately. PDFs already in blob storage keep the old title until the list is republished. This is acceptable.
- **Welsh and English parity:** the locale key sets in en and cy are unchanged.

## 4. Acceptance Criteria Mapping

| AC | Satisfied by | Verified by |
|---|---|---|
| Fortnightly renamed to "Employment Tribunal Advance Hearing List"; daily renamed to "Employment Tribunal Daily Hearing List" (with the supplied Welsh) | `list-type-data.ts` and the four locale files; deploy seed `ON CONFLICT DO UPDATE` | Lib `index.test.ts` title assertions (EN and CY); new `list-type-data.test.ts`; lower-environment check of the page h1, PDF, manual-upload picker, summary of publications and subscription email |
| Courtel feed turned on | Moved to #1761. The AC has been removed from #1382 | n/a |
| Sensitivity Public for both lists | Already `defaultSensitivity: "Public"`; database `default_sensitivity` reasserted by the seed | New `list-type-data.test.ts`; check that `artefact.sensitivity` is `PUBLIC` after publishing |

## 5. Test Scenarios

There is one scenario per journey. The change adds no new page or user journey, so there is no new E2E spec. Existing ET pages have no E2E coverage, and nothing references the old names.

1. **The ET list pages and PDFs show the new names in English and Welsh (unit).** Update `libs/list-types/et-daily-list/src/index.test.ts` and `libs/list-types/et-fortnightly-list/src/index.test.ts` to assert the new `title` in EN and CY. Update the mocked `title` in both `pdf-generator.test.ts` files so they match; they are mock values, not assertions.
2. **Reference data defines both ET list types with the new names and Public sensitivity (unit).** Add `libs/list-types/common/src/list-type-data.test.ts`. Use AAA. Find each entry by `name` (never by id) and assert `englishFriendlyName`, `welshFriendlyName`, `shortenedFriendlyName`, `urlPath` (unchanged) and `defaultSensitivity === "Public"`.
3. **A CFT publication of each ET list is pushed to Courtel and shown under its new name (manual, lower environment).**
   - Precondition: the split-out API Courtel ticket is deployed to the environment.
   - Steps: add the subscriptions through system admin, then POST one `ET_DAILY_LIST` and one `ET_FORTNIGHTLY_PRESS_LIST` to `/v1/publication`.
   - Check: the new names in the summary of publications, page h1 and PDF, in both EN and `?lng=cy`; the artefact is Public; a `SUCCESS` row in `third_party_push_log`; receipt at mock-courtel in preview or Courtel in aat/stg.
4. **Regression.** Run `yarn test` from the root. This covers common, et-daily-list, et-fortnightly-list, and apps/postgres. No Helm values change in this ticket.

## DECISIONS (agreed with the ticket author, 2026-11-27)

- **Split-out ticket.** Agreed. Courtel pushes from the API go to a separate ticket (section 2.3), which owns vault secrets, why they were removed, auditing existing subscriptions and the cutover from PIP. Raised as #1761 (related, not blocking). The Courtel AC moved there.
- **Shortened names.** "ET Daily Hearing List" and "ET Advance Hearing List".
- **Sensitivity.** No change. A non-Public `x-sensitivity` sent by CFT for a publication is correct behaviour and is kept. AC3 is met by `defaultSensitivity: "Public"`.
- **Welsh catalogue.** Add the two new rows and leave the old rows as they are.

## CLARIFICATIONS NEEDED

1. **Courtel third-party user.** Does the Courtel legacy third-party user exist in each environment, and who (which system admin) will add the two subscriptions? This must be done per environment through `/manage-third-party-subscriptions`, because it cannot be seeded.
2. **Duplicate pushes for ET from PIP.** Is PIP still pushing ET lists to Courtel? If so, the ET subscriptions should not be added until PIP stops.
3. **Courtel endpoint per environment.** Is a Courtel test endpoint (or mock-courtel) available in aat/stg to receive the verification push, and does Courtel accept ET lists from CaTH there?
4. **Hidden list types (self-check).** Confirm neither ET list type is hidden (`is_hidden`) in any environment. If one is, Courtel pushes and emails are suppressed.
