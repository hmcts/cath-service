# Implementation Plan — #1106: 'Traffic Virtual Courts List' to be created in CaTH

## 1. Summary

This is a **one-entry reference-data addition**. A new Crime / Magistrates Court list type (`TRAFFIC_VIRTUAL_COURTS_LIST`) is added to `libs/list-types/common/src/list-type-data.ts`, which is the single source of truth for list types. Every consumer — the `/manual-upload` dropdown, the Courtel third-party subscription checkboxes, summary-of-publications, the flat-file viewer, verified-user subscriptions — reads list types from the database, so all of them pick the new entry up with **zero code change**.

It is **not** a new list-type page. The publishing route is manual upload and the file type is flat file, so there is no rendered view, no JSON schema, no validator, no PDF generator and no Excel converter. There is also no database schema change — `list_types` and `list_types_sub_jurisdictions` already exist.

The largest risks in this ticket are not technical. `defaultSensitivity` is unspecified in the issue and controls who can read the list; Poole Magistrates' Court is claimed to exist but is absent from `location-data.ts`; and AC3 (Courtel enablement) cannot be satisfied by code at all. See §7.

## 2. Technical Approach

**Template source: n/a (flat-file / manual-upload list type — no rendered page, no .njk)**

Why this is data, not code:

- Flat-file artefacts are routed by `publication.isFlatFile` in `summary-of-publications/index.njk`, which is tested **before** `urlPath`, and link to the generic viewer at `/hearing-lists/{locationId}/{artefactId}`. `isFlatFile` is a per-artefact property set from the uploaded file, not a property of the list type. A `urlPath` would therefore be a dead route.
- The `/manual-upload` dropdown is populated by `findStrategicListTypes()` (`libs/system-admin-pages/src/list-type/queries.ts:241`), which selects every row with `isNonStrategic: false, deletedAt: null` ordered by `shortenedFriendlyName`. Adding a row is sufficient; the query needs no change.
- Both seed paths read the same TypeScript source: locally `yarn db:seed` → `seedListTypes()`; on deploy `apps/postgres/start.sh` → `generate-seed-sql.ts`, which emits idempotent `INSERT ... ON CONFLICT` SQL. No hand-written `.sql` file is permitted.

The whole change is one object literal plus tests.

## 3. Implementation Details

### 3.1 The entry to add

**File:** `libs/list-types/common/src/list-type-data.ts`

```typescript
{
  name: "TRAFFIC_VIRTUAL_COURTS_LIST",
  englishFriendlyName: "Traffic Virtual Courts List",
  welshFriendlyName: "Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol",
  provenance: "CRIME_IDAM,PI_AAD",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]
}
```

| Field | Value | Rationale |
|---|---|---|
| `name` | `TRAFFIC_VIRTUAL_COURTS_LIST` | SCREAMING_SNAKE_CASE, `@unique`, stable across environments. The only identifier code may reference — never `ListType.id`. |
| `englishFriendlyName` | `Traffic Virtual Courts List` | Verbatim from the issue. Proper noun — do not sentence-case or abbreviate. |
| `welshFriendlyName` | `Rhestr y Llys ar gyfer Achosion Traffig sydd i'w cynnal yn rhithiol` | Supplied and signed off by the requester. Used verbatim; no `[WELSH TRANSLATION REQUIRED]` placeholder. |
| `provenance` | `CRIME_IDAM,PI_AAD` | Matches `MAGISTRATES_PUBLIC_LIST` (line 35) and `MAGISTRATES_STANDARD_LIST` (line 656). Only consulted for `CLASSIFIED` artefacts; `PI_AAD` keeps legacy media accounts able to read a classified upload. |
| `urlPath` | **omitted** | Flat files route via `/hearing-lists/{locationId}/{artefactId}`; `urlPath` is never read for them. Only 2 of 77 entries omit it (`PCOL_DAILY_CAUSE_LIST`, `MENTAL_HEALTH_TRIBUNAL_HEARING_LIST`), so this is precedented but rare — it is deliberate, not an oversight. Both seed paths coerce an absent value to `""`. |
| `isNonStrategic` | `false` | Required to reach `findStrategicListTypes()` and therefore the `/manual-upload` dropdown. `true` would route it to `/non-strategic-upload`, which only accepts `.xlsx`. |
| `defaultSensitivity` | `"Public"` | **Assumption — see §7.** Pre-fills the Sensitivity dropdown client-side; the uploader can override. |
| `shortenedFriendlyName` | **omitted** | Defaults to `englishFriendlyName` in both seed paths. 27 characters fits the dropdown. |
| `subJurisdictionIds` | `[7]` | Magistrates Court, `jurisdictionId: 3` (Crime) — `libs/location/src/location-data.ts:330`. |

**Placement:** put it next to the other Crime / Magistrates entries for readability. Array order has no behavioural effect — every consumer orders by friendly name.

### 3.2 Location prerequisite — Poole Magistrates' Court

Poole is **not** in `libs/location/src/location-data.ts` (a 27-location development subset). Two branches:

- **If STG locations come from `location-data.ts`** — add an entry with `subJurisdictions: [7]` and the correct region.
- **If STG locations come from the reference-data CSV upload** (`/reference-data-upload`, System Admin) — no code change; Poole just needs to be present in the uploaded CSV with the Magistrates Court sub-jurisdiction.

Either way the hard requirement is identical: **Poole must carry `subJurisdictionId: 7`**. Without it the list type will not appear on `/subscription-configure-list` for Poole subscribers — manual upload will still work, because it does not cross-check the location's sub-jurisdiction against the chosen list type, so this failure is silent.

### 3.3 Consumers that work with zero code change

| Surface | Mechanism |
|---|---|
| `/manual-upload` list type dropdown | `findStrategicListTypes()`; new `<option>`, placed alphabetically |
| `/manual-upload-summary` | Renders `shortenedFriendlyName` from the stored form |
| `/manage-third-party-subscriptions` | `findAllListTypes()`; new Courtel checkbox |
| `/summary-of-publications` | New entry; flat-file branch links to the generic viewer |
| `/hearing-lists/{locationId}/{artefactId}` | Generic flat-file viewer renders the upload as-is |
| `/subscription-configure-list` | New checkbox, grouped by first letter of the **localised** name (T in English, R in Welsh — existing, correct behaviour) |

### 3.4 Out of scope

- No `libs/list-types/traffic-virtual-courts-list` package
- No `src/schemas/*.json`, no `validate*` wrapper, no validator test — the CI guard at `libs/list-types/common/src/validation/guard.test.ts` is unaffected because no schema directory is added
- No `.njk` template, no `apps/web/src/pages/(list-types)/…` directory, no `urlPath`
- No `PDF_GENERATOR_REGISTRY` entry, no `registerConverterByName` call
- No locale (`en.ts` / `cy.ts`) changes — the name comes from `list_types.friendly_name` / `welsh_friendly_name`
- No API endpoints, no Prisma schema change, no migration, no hand-written `.sql`
- No scheduling / "expected publication" feature for the Wed-Fri (later Mon-Wed-Fri) cadence

## 4. Error Handling & Edge Cases

No new validation logic and no new error strings. `validateManualUploadForm` (`libs/admin-pages/src/manual-upload/validation.ts`) applies unchanged.

| Case | Behaviour | Note |
|---|---|---|
| `.json` uploaded for this list type | `validateListTypeJson` catches the failed dynamic import and returns `"Invalid JSON file format. No JSON schema available for Traffic Virtual Courts List. This list type does not support JSON uploads."` in the error summary against `#file` | Must be a clean error summary, **not a 500**. This is the one behaviour worth a test, so it cannot regress into a stack trace. |
| Flat files (`.pdf`, `.doc`, `.docx`, `.htm`, `.html`, `.csv`) | Pass through — `validateJsonFileSchema` short-circuits on a non-`.json` filename | |
| Seed re-run / concurrent pods | `ON CONFLICT (name) DO UPDATE` for `list_types`; `ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING` for the link row, with `list_type_id` resolved by a `WHERE name = …` subquery | Resolved atomically inside Postgres, so no P2002 race |
| Apostrophe in `i'w` | `sqlStr()` escapes `'` → `''` (`generate-seed-sql.ts:159`) | No manual escaping; do not "pre-escape" in the data file |
| Soft-delete reconciliation | `generateSoftDeleteReconciliationSql` soft-deletes any active row whose name is absent from `listTypeData` | The entry must **stay in the file** for as long as the list type is live |
| Sub-jurisdiction 7 missing | `seedListTypes` throws `No sub-jurisdictions resolved for list type "TRAFFIC_VIRTUAL_COURTS_LIST"`; the generated SQL orders sub-jurisdiction inserts first | Sub-jurisdiction 7 already exists |
| Courtel unreachable / not subscribed / unconfigured | Push skipped or logged as `FAILED` in `third_party_push_log`; the publication still succeeds | Fire-and-forget by design. Do not change this — the upload must never fail because a third party is down. |

The accessibility of the **uploaded document** is outside CaTH's control: a scanned or untagged PDF will be inaccessible and the service cannot detect it. That is a pilot onboarding action for Poole, identical for every existing flat-file list type, not a defect in this ticket.

## 5. Testing

Scale to the change. One data entry does not justify a new spec file, a template test or a validator test.

**Add `libs/list-types/common/src/list-type-data.test.ts`** (no existing file is a sensible home — `config.test.ts` only asserts module paths):

- `TRAFFIC_VIRTUAL_COURTS_LIST` exists with the exact English and Welsh names
- `isNonStrategic` is `false` (proves it reaches the manual upload route, not the `.xlsx` route)
- `subJurisdictionIds` is `[7]` only
- `urlPath` is `undefined` (documents the deliberate omission)
- Every `name` in `listTypeData` is unique — a cheap guard against a copy-paste duplicate

**`apps/postgres/prisma/generate-seed-sql.test.ts`** — this suite uses a **synthetic** `LIST_TYPES` fixture, not the real `listTypeData`, so do **not** assert on `TRAFFIC_VIRTUAL_COURTS_LIST` there. Apostrophe escaping is already covered. The one genuine gap: both fixture entries set `urlPath`, so the `url = ''` coercion for an omitted `urlPath` is untested. Add a fixture entry without `urlPath` and assert the emitted SQL contains an empty-string `url`.

**`libs/admin-pages/src/manual-upload/validation.test.ts`** — confirm (or add, if absent) a case asserting that a `.json` upload for a list type with no validator package returns the "No JSON schema available for …" message rather than throwing.

**Controller tests** — `apps/web/src/pages/(admin)/manual-upload/index.test.ts` already mocks `findStrategicListTypes` and asserts that every returned list type becomes an option and that `defaultSensitivity` reaches `listTypeSensitivityMap`. These are list-type-agnostic; **confirm they exist and say so in the PR** rather than adding near-identical tests keyed to this name.

**E2E — be honest about this.** `e2e-tests/tests/admin/manual-upload.spec.ts` is `test.describe.skip(...)`, so any assertion added there **will not run in CI**. Adding one line ("offers 'Traffic Virtual Courts List' in the dropdown") is fine for when the skip is lifted, but it is not evidence. Re-enabling the spec is out of scope. Flag the skip in the PR.

### Manual verification (this is where the confidence comes from)

**Local**

1. `yarn db:seed`, then confirm in `yarn db:studio` that `list_types` has the row with both friendly names, `is_non_strategic = false`, `default_sensitivity = 'Public'`, `url = ''`, `deleted_at IS NULL`, plus one `list_types_sub_jurisdictions` row for sub-jurisdiction 7.
2. Run `yarn db:seed` again — no error, no duplicate (idempotency).
3. `tsx apps/postgres/prisma/generate-seed-sql.ts` — inspect the output for the new row, the escaped `i''w`, and the new name being present in the soft-delete `NOT IN (...)` list (i.e. it is excluded from deletion).
4. `/manual-upload` as System Admin: option present and alphabetically placed; selecting it pre-fills Sensitivity to Public.
5. Upload a small PDF against Poole (or a test location) and complete through `/manual-upload-success`.
6. `/summary-of-publications?locationId={id}`: entry links to `/hearing-lists/{locationId}/{artefactId}` and the PDF renders. Repeat with `?lng=cy` and confirm the Welsh name.
7. Attempt a `.json` upload for this list type — error summary, not a 500.
8. `/manage-third-party-subscriptions?id={courtelUserId}`: tick, save, confirm persistence and redirect.
9. As a verified user subscribed to Poole, `/subscription-configure-list` — present in English (T) and Welsh (R).

**STG (post-deploy)**

10. Postgres deploy pod applied the generated seed SQL with no P2002 errors.
11. Poole Magistrates' Court exists **and** carries sub-jurisdiction 7.
12. Option present in `/manual-upload` and in the Courtel checkboxes.
13. With Courtel subscribed, publish a test flat file and confirm a `third_party_push_log` row with `type = 'CREATE'`, `status = 'SUCCESS'`. On failure, capture `status_code` for the Courtel team.

**Regression:** `yarn test` from root (the validator guard test must still pass), dropdown option count increases by exactly one with no existing option displaced or renamed, no existing list type soft-deleted as a side effect, then `yarn lint:fix` and `yarn format`.

## 6. Acceptance Criteria Mapping

| AC | Satisfied by | Verified by |
|---|---|---|
| The Traffic Virtual Courts List is created in CaTH | `listTypeData` entry → seeded `list_types` row + `list_types_sub_jurisdictions` link to sub-jurisdiction 7 | `list-type-data.test.ts`; manual steps 1-3 and 10 |
| The list name is added to the drop-down options in the manual upload form | Automatic via `findStrategicListTypes()` (`isNonStrategic: false`) — no code change | Manual steps 4 and 12 (E2E assertion exists but is skipped) |
| Courtel is enabled to receive the list | **Not satisfied by code.** The checkbox appears automatically, but a System Admin must tick it on **each environment** after deploy | Manual steps 8, 12, 13 |

**AC3 requires a post-deploy human action and must go in the release notes** — otherwise the ticket will be closed with Courtel silently receiving nothing. Courtel should also be given advance notice before the box is ticked (see §7).

## 7. CLARIFICATIONS NEEDED

### Blocking — answer before merging

1. **`defaultSensitivity` is unspecified in the issue.** This plan assumes `"Public"`. The two existing magistrates list types disagree: `MAGISTRATES_PUBLIC_LIST` is `Public`, `MAGISTRATES_STANDARD_LIST` is `Classified`. Sensitivity controls **who can read the list** (`canAccessPublication`), and the default is what the uploading court will accept without thinking. If the flat file contains defendant addresses or dates of birth, `Public` exposes them to the open internet. Confirm with the Crime Service Manager what the file actually contains; if it carries personal data beyond name and case reference, change the value to `"Classified"`.

2. **Poole Magistrates' Court is claimed to be "already available in CaTH" but is absent from `location-data.ts`.** Confirm (a) it exists on STG, and (b) it carries `subJurisdictionId: 7`. Without (b), Poole subscribers will never see the list type on `/subscription-configure-list`, and the failure is silent because manual upload does not cross-check. §3.2 gives both remediation branches.

3. **Has Courtel been given advance notice, and can they ingest this list?** Pushing to an unprepared recipient produces `FAILED` rows in `third_party_push_log` with **no user-visible symptom** — nobody will notice for weeks.

4. **Is the list name final?** It is baked into a `@unique` DB column. Renaming later means either a new `name` row (leaving the old row to be soft-deleted, orphaning its artefacts' `listTypeId`) or a data migration. Note also that "Traffic Virtual Courts List" does not identify the court or the days it covers — if the pilot extends beyond Poole, or runs alongside a non-virtual traffic list, the name will not distinguish them.

### Non-blocking assumptions — proceed, correct if wrong

- The Welsh name is used **verbatim** as supplied and treated as signed off.
- `/manual-upload` is English-only by design (`hideLanguageToggle: true`, `locale` hardcoded to `"en"`), so the Welsh name will not appear there. Pre-existing and correct for an internal admin tool — do not "fix" the two hardcoded English JSON-validation messages as part of this ticket.
- Flat file is the only delivery format. If the pilot later moves to JSON publishing, that is a substantially larger ticket (new package, schema, validator + test, template, locales, PDF generator, Excel converter).
- Publication cadence is operational and **unenforced**: CaTH has no scheduling or expected-publication feature, and nothing will detect or alert on a missed upload.
- The 26 October 2026 cadence change requires **no code** — it is purely a change in how often the court uploads.
- No prod deployment exists; the seed covers local and STG only. Do not add prod branching to `generate-seed-sql.ts` pre-emptively.
