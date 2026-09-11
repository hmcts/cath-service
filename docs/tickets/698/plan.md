# Plan — #698: Add/Update provenance for all lists

## 1. Technical Approach

The ticket asks for four separable things. Only the first three are code changes; the fourth is a decision record.

1. **Represent provenance as a list in the source of truth.** `ListTypeData.provenance` becomes `string[]`. All 77 entries in `libs/list-types/common/src/list-type-data.ts` become arrays. The comma-delimited form exists only in the database column, produced at exactly two write boundaries (the local Prisma seed and the generated deploy SQL) and consumed at exactly one read boundary (`libs/publication/src/authorisation/service.ts`).

2. **Put the delimiter and the allowed set in one module.** A new zero-dependency module `libs/list-types/common/src/user-provenance.ts` owns `USER_PROVENANCES`, `PROVENANCE_DELIMITER`, `formatProvenance()`, `parseProvenance()` and `assertValidProvenances()`. Everything that currently hardcodes `","` or `["CFT_IDAM", "PI_AAD", "CRIME_IDAM"]` imports from it. Today those literals are duplicated in seven places (two seed writers, one validation module, four `checkedProvenance` blocks) plus two `.njk` files with hardcoded checkbox items.

3. **Fail loudly on bad data.** `assertValidProvenances()` is called from both seed writers, so a typo or an unknown provenance value aborts the deploy before any SQL is applied (`apps/postgres/start.sh` uses `set -e` and generates to `/tmp/seed.sql` *before* `prisma db execute`, so a throw in the generator means nothing is applied). A unit test over the whole of `listTypeData` gives the same guarantee in CI, ahead of deploy.

4. **Fix the data.** Add `PI_AAD` to the four `MAGISTRATES_*_ADULT_COURT_LIST_*` types. Change `PHT_WEEKLY_HEARING_LIST` from `MANUAL_UPLOAD` to `CFT_IDAM` (flagged for sign-off, see §5 Q1). Add a parity test against a committed reference fixture with reason-annotated allowed divergences.

**Deliberate non-goals inside this ticket** (beyond the ticket's own out-of-scope list): no rename of `ListType.provenance` in `libs/publication/src/authorisation/service.ts` to `provenances: string[]`. Only two production sites construct that interface (`authorisation/service.ts:16` and `authorisation/middleware.ts:90-94`) but ~40 test files under `apps/web/src/pages/(list-types)/` mock `resolveListType` with `{ id, provenance: "CFT_IDAM", isNonStrategic: false }`. Renaming buys nothing behaviourally — the value read out of the DB is a delimited string either way — and would churn 40 unrelated test files. Instead the inline `.split(",")` at `service.ts:34` is replaced with `parseProvenance(...)`, which trims. That is the entire fix for the whitespace class of bug on the read side.

### Corrections to the brief

Five things in the research brief are wrong or incomplete. They change the work, so they are recorded here rather than in a footnote.

| Brief said | Verified reality |
|---|---|
| "#1029 blocks this: a `PI_AAD` publisher whose `UserProfile.provenance` is still `B2C_IDAM` will not gain access until #1029 lands." | **Wrong.** `canAccessPublication` compares `user.provenance` taken from the session `UserProfile`, and `apps/web/src/pages/(auth)/login/return/index.ts:216` already sets `provenance: "PI_AAD"` for B2C media users. `B2C_IDAM` survives only in the admin *user-search* filter (`libs/system-admin-pages/src/user-management/validation.ts:6` and `user-management/queries.ts:55`, which expands `B2C_IDAM` → `["B2C_IDAM", "PI_AAD"]`). Neither touches `list_types.allowed_provenance`. This ticket takes effect on merge; #1029 is not a blocker. See §5 Q7. |
| "The hardcoded checkbox items are in `configure-list-type-enter-details/index.njk` lines 100-128." | The block exists, but that page's controller is `export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), (_req, res) => res.redirect(301, "/manage-list-types")]` — **the template is dead code**, reachable only from `index.njk.test.ts`. The same is true of `view-list-types/index.njk` (which renders a provenance column). The live checkbox UI is `add-list-type/index.njk:100-106` and `edit-list-type/index.njk:100-106`. |
| "`MAGISTRATES_PUBLIC_LIST` is the only entry already carrying `CRIME_IDAM,PI_AAD`." | **Two** entries do: `MAGISTRATES_PUBLIC_LIST` (`list-type-data.ts:38`) and `MAGISTRATES_STANDARD_LIST` (`list-type-data.ts:659`). |
| "One `.njk` file and one `checkedProvenance` block need changing." | Three `.njk` files contain hardcoded provenance checkbox items (two live, one dead) and there are **four** `checkedProvenance` object literals across the two live controllers: `add-list-type/index.ts:18` and `:80-84`, `edit-list-type/index.ts:47-51` and `:125-129`. |
| "Confirm whether `libs/test-support/src/routes/test-support/list-types.ts:78` needs changing." | **It does not.** `listType.provenance` there is an untyped element of `req.body.listTypes` (E2E seeding payload), not a `ListTypeData`. `@hmcts/test-support` has no dependency on `@hmcts/list-types-common`. Leave it alone. |

Two further facts that constrain implementation:

- **Root `tsconfig.json` does not set `resolveJsonModule`.** A JSON parity fixture cannot be `import`ed from a `.ts` test. It must be read with `readFileSync` + `JSON.parse` at test runtime.
- **The deploy image constraint is real.** `apps/postgres/Dockerfile` runs `yarn workspaces focus @hmcts/postgres` at runtime, so `@hmcts/list-types-common`'s own deps (`nunjucks`, `exceljs`, `ajv`) are absent. That is why the seed imports the `./list-type-data` subpath and not the barrel. The new provenance module must therefore be reachable via its own subpath and must import nothing.

---

## 2. Implementation Details

**TEMPLATE SOURCE:** `n/a`

*(Recorded verbatim as instructed. This ticket is data, type and validation work — no new rendered page and no new list-type view — so there is no pip-frontend template to migrate. Do not copy migration steps from other tickets into this one.)*

### 2.1 New shared module — `libs/list-types/common/src/user-provenance.ts`

Zero imports. Named `user-provenance.ts` (not `provenance.ts`) to keep it distinct from `libs/publication/src/provenance.ts`, which is the unrelated *artefact* provenance enum (`MANUAL_UPLOAD`, `SNL`, `COMMON_PLATFORM`, `CP_CATH`, `PDDA` — used for PDF header labels in ~40 pdf-generator files). Conflating the two would be a real bug: `MANUAL_UPLOAD` is a valid *artefact* provenance and is **not** a valid *user* provenance.

Exported API:

```ts
// Declaration order is also the System Admin checkbox order — see §5 Q9.
export const USER_PROVENANCES = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;
export type UserProvenance = (typeof USER_PROVENANCES)[number];

export const PROVENANCE_DELIMITER = ",";
export const ALLOWED_PROVENANCE_MAX_LENGTH = 255;

export function isUserProvenance(value: string): value is UserProvenance;

/** Array -> the single delimited form stored in list_types.allowed_provenance. */
export function formatProvenance(provenances: readonly string[]): string;

/** Delimited DB value -> array. Trims each part and drops empties. */
export function parseProvenance(value: string | null | undefined): string[];

/** Throws with the offending list type name and value. Used by both seed writers and the CI test. */
export function assertValidProvenances(listTypeName: string, provenances: readonly string[]): void;
```

Behaviour that must be nailed down by tests:

- `formatProvenance` de-duplicates while preserving declaration order, and throws if given an empty array (an empty `allowed_provenance` means "nobody can publish this", which is never intentional and the column is `NOT NULL`).
- `parseProvenance` trims: `parseProvenance("CRIME_IDAM, PI_AAD")` → `["CRIME_IDAM", "PI_AAD"]`. Returns `[]` for `null`, `undefined` and `""`.
- `assertValidProvenances` throws on: empty array, any value not in `USER_PROVENANCES`, duplicates, and a formatted length exceeding `ALLOWED_PROVENANCE_MAX_LENGTH`.

Wiring:

- `libs/list-types/common/package.json` — add a `"./user-provenance"` entry to `exports`, matching the existing `"./list-type-data"` shape (`production` → `./dist/user-provenance.js`, `default` → `./src/user-provenance.ts`).
- `libs/list-types/common/src/index.ts` — re-export the module from the barrel so app/lib consumers that already depend on the barrel (e.g. `system-admin-pages`) do not need the subpath.
- `libs/list-types/common/src/list-type-data.ts` — import `UserProvenance` relatively (`./user-provenance.js`) and type the field as `UserProvenance[]`. This keeps the subpath import in the seed self-contained: `./list-type-data` pulls in only `./user-provenance`, which pulls in nothing.

### 2.2 `libs/list-types/common/src/list-type-data.ts`

- Line 5: `provenance: string;` → `provenance: UserProvenance[];`.
- All 77 entries converted. Current distribution, verified by parsing the file: 61 × `"CFT_IDAM"`, 8 × `"CRIME_IDAM"`, 2 × `"CRIME_IDAM,PI_AAD"`, 1 × `"MANUAL_UPLOAD"`, 5 × `"PI_AAD"`.
- Mechanical conversions: `"CFT_IDAM"` → `["CFT_IDAM"]`, `"CRIME_IDAM"` → `["CRIME_IDAM"]`, `"PI_AAD"` → `["PI_AAD"]`, `"CRIME_IDAM,PI_AAD"` → `["CRIME_IDAM", "PI_AAD"]` (two entries: `MAGISTRATES_PUBLIC_LIST` line 38, `MAGISTRATES_STANDARD_LIST` line 659).
- **Data change 1** — add `PI_AAD` to these four, which currently hold `["CRIME_IDAM"]` only:
  - `MAGISTRATES_ADULT_COURT_LIST_DAILY`
  - `MAGISTRATES_ADULT_COURT_LIST_FUTURE`
  - `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`
  - `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`
- **Data change 2** — `PHT_WEEKLY_HEARING_LIST` (lines 698-708): `"MANUAL_UPLOAD"` → `["CFT_IDAM"]`. Recommended, flagged for sign-off (§5 Q1). Behavioural consequence: today the only `user.provenance` that can publish PHT is the literal string `MANUAL_UPLOAD`, which **no login path ever produces** (`login/return/index.ts:216` → `PI_AAD`; `cft-login/return/index.ts:51` → `CFT_IDAM`; `crime-login/return/index.ts:61` → `CRIME_IDAM`; `libs/auth/src/config/passport-config.ts:21` → `SSO`). So PHT is currently unpublishable by any real user via the authorised route, and the change turns it on for CFT publishers. `PHT_WEEKLY_HEARING_LIST` also has `defaultSensitivity: null`, which is worth checking with the product owner in the same conversation — but note `defaultSensitivity` does **not** determine artefact sensitivity: the uploading admin picks it, and `non-strategic-upload/index.ts` builds a `listTypeSensitivityMap` only to pre-select a radio client-side. A PHT artefact can therefore already be `Classified`, so widening who may publish it is a real change in exposure, not a no-op.
- After conversion, `MANUAL_UPLOAD` no longer appears anywhere in `list-type-data.ts` and `USER_PROVENANCES` does not need to contain it (§5 Q2).

### 2.3 Seed write boundary 1 — `libs/location/src/seed-list-types.ts`

- `allowedProvenance: listType.provenance` at line 48 (create) and line 57 (update) → `allowedProvenance: formatProvenance(listType.provenance)`.
- Import `formatProvenance` and `assertValidProvenances` from `@hmcts/list-types-common/user-provenance` (subpath, matching the existing `./list-type-data` import discipline documented in the file's header comment at lines 1-3).
- Call `assertValidProvenances(listType.name, listType.provenance)` per entry before writing, inside the existing loop.

### 2.4 Seed write boundary 2 — `apps/postgres/prisma/generate-seed-sql.ts`

- Line 133, inside `generateListTypesSql`: `${sqlStr(lt.provenance)}` → `${sqlStr(formatProvenance(lt.provenance))}`.
- Call `assertValidProvenances(lt.name, lt.provenance)` for every entry before emitting the row. A throw here aborts before `/tmp/seed.sql` is complete, and `set -e` in `apps/postgres/start.sh` stops the deploy before `prisma db execute` runs (`start.sh:89-90`). This is the "fails at seed time rather than silently denying access" acceptance criterion.
- Import via the `@hmcts/list-types-common/user-provenance` subpath only — the barrel would drag in `nunjucks`/`exceljs`/`ajv`, which are not installed in the postgres deploy image.

### 2.5 Authorisation read boundary — `libs/publication/src/authorisation/service.ts`

Line 34:

```ts
// before
return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
// after
return !!user.provenance && parseProvenance(listType.provenance).includes(user.provenance);
```

`ListType.provenance` (the interface at the top of the file) stays `string` — it holds the raw DB column value. `libs/publication` gains a dependency on `@hmcts/list-types-common`; verify this does not create a cycle (`list-types-common` must not depend on `publication`). If it does, the import must use the `/user-provenance` subpath and the check should be repeated as a build-time assertion, not worked around with a local copy of the delimiter.

### 2.6 System Admin UI — remove the duplicated literals

| File | Change |
|---|---|
| `libs/system-admin-pages/src/list-type/validation.ts:2` | Delete `const PROVENANCE_OPTIONS = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;`. `validateProvenance` (lines 66-86) uses `isUserProvenance` from the shared module instead. Note the current order differs from `USER_PROVENANCES` — irrelevant for validation, but it determines checkbox order in the UI (§2.7), so pick one order and use it everywhere. Recommend keeping the UI order `CFT_IDAM, PI_AAD, CRIME_IDAM` by declaring `USER_PROVENANCES` in that order. |
| `libs/system-admin-pages/src/list-type/queries.ts:119, 142, 170` | `data.allowedProvenance.join(",")` → `formatProvenance(data.allowedProvenance)`. Three sites: the soft-deleted-row revive path (119), `createListType` (142), `updateListType` (170). `CreateListTypeData`/`UpdateListTypeData` already type the field as `string[]` — no type change needed. |
| `apps/web/src/pages/(system-admin)/edit-list-type/index.ts:39` | `existingListType.allowedProvenance.split(",")` → `parseProvenance(existingListType.allowedProvenance)`. This is the fix for legacy rows that contain `"CRIME_IDAM, PI_AAD"` with a space: today such a row renders with `PI_AAD` unchecked, and saving the form would silently drop it. |
| `apps/web/src/pages/(system-admin)/add-list-type/index.ts:18, 80-84` and `edit-list-type/index.ts:47-51, 125-129` | Replace the four hand-written `checkedProvenance` object literals with a single helper that builds the GOV.UK checkbox `items` array from `USER_PROVENANCES`. Recommended shape: a `buildProvenanceItems(selected: string[])` function exported from `@hmcts/system-admin-pages` returning `[{ value, text, checked }]`, passed to the template as `provenanceItems`. |
| `apps/web/src/pages/(system-admin)/add-list-type/index.njk:100-106` and `edit-list-type/index.njk:100-106` | Replace the three hardcoded `items:` entries with `items: provenanceItems`. |
| `apps/web/src/pages/(system-admin)/add-list-type/index.ts:27-32` and `edit-list-type/index.ts:72-77` | The duplicated "array-or-string" normalisation of `req.body.allowedProvenance` stays behaviourally identical but should be factored into one exported helper (`normaliseCheckboxValues`) rather than duplicated. This is the Express-body edge case in §3. |

**No change** to `apps/web/src/pages/(system-admin)/configure-list-type-preview/index.njk:128`, which renders `data.allowedProvenance | join(", ")`. That is display formatting with a deliberate space, not the storage delimiter.

**No change** to the two dead templates (`configure-list-type-enter-details/index.njk`, `view-list-types/index.njk`) or their `.njk.test.ts` files. They are unreachable behind 301-redirect controllers. Removing them is tempting but is unrelated cleanup — raise it separately rather than smuggling it into this ticket.

### 2.7 Parity test and reference fixture

- Fixture: **move** `docs/tickets/698/reference-list-types.json` to `libs/list-types/common/src/reference/pip-data-models-list-types.json`. 102 entries of shape `{ "name": string, "provs": string[], "deprecated": boolean }`. (The ticket says the shared model declares 101; the parsed file has 102. Trust the file, and record the count in the test so a re-parse that changes it is visible.)
- Test: `libs/list-types/common/src/reference/parity.test.ts`. Because `resolveJsonModule` is off, read the fixture with `readFileSync(new URL("./pip-data-models-list-types.json", import.meta.url), "utf8")` and `JSON.parse`.
- Divergence structure, co-located in the test file (not a `types.ts`, not a separate config):

```ts
/** Ours -> shared model. Names differ; provenance agrees. Renames are out of scope for #698 (see ticket "Out of Scope"). */
const NAME_ALIASES: Record<string, string> = { /* the 19 pairs from the ticket */ };

/** Provenance divergences we accept, each with a reason. Anything not listed here must match the reference exactly. */
const ALLOWED_PROVENANCE_DIVERGENCES: Record<string, { provenances: string[]; reason: string }> = {};

/** Ours only — no reference entry. Must be empty unless a CaTH-specific list type is deliberately added. */
const CATH_ONLY: string[] = [];
```

Assertions:

1. For every entry in `listTypeData`, resolve its reference name via `NAME_ALIASES` (identity if absent). If there is a reference entry, its `provs` must equal ours (order-insensitive) unless the name appears in `ALLOWED_PROVENANCE_DIVERGENCES`, in which case ours must equal the recorded divergence.
2. Every key in `ALLOWED_PROVENANCE_DIVERGENCES` and `NAME_ALIASES` must correspond to a real entry in `listTypeData` — so stale entries fail rather than rot silently.
3. Ours with no reference entry after aliasing must be listed in `CATH_ONLY`. With the 19 aliases applied, verified: **zero** such entries — all 77 of ours map to a reference name (58 exact matches + 19 aliases). `CATH_ONLY` therefore starts empty, which is the strongest possible form of this assertion.
4. **Reference entries absent from ours** are asserted as a *recorded count and list*, not as a failure: `expect(absentFromCath.sort()).toEqual(EXPECTED_ABSENT.sort())`. Adding one of the absent list types (a separate ticket per the out-of-scope list) then requires deleting it from `EXPECTED_ABSENT`, which is the right amount of friction. Verified count after aliasing: **25**, not the ticket's 24 — the ticket's table omits `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` [`CFT_IDAM`], which exists upstream alongside `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST`. Of the 25, only 22 are live upstream: `CARE_STANDARDS_LIST`, `PRIMARY_HEALTH_LIST` and `CIC_DAILY_HEARING_LIST` are marked deprecated in the reference and are superseded by `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`, `PHT_WEEKLY_HEARING_LIST` and `CIC_WEEKLY_HEARING_LIST`, all of which we already have. Annotate those three in `EXPECTED_ABSENT` so #5's product decision is not re-litigated.
5. After the two data changes, the parity check passes with `ALLOWED_PROVENANCE_DIVERGENCES` **empty** — that is the argument for making the PHT change rather than recording it as a divergence. Exactly 5 provenance mismatches exist today (PHT plus the four magistrates lists); both changes clear all 5.

Regeneration: add a short `README.md` next to the fixture stating the upstream source (`hmcts/pip-data-models`, `src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java`), the commit/date it was taken from, and that it is refreshed by hand — the second constructor argument is the `List.of(...)` of `UserProvenances`, and `@Deprecated` annotations map to `"deprecated": true`. Do not build a fetch-and-parse script; the file changes a few times a year and a script that silently produces an empty list is worse than a stale file with a date on it.

### 2.8 Database / migration changes

`libs/postgres-prisma/prisma/schema/location.prisma`, `ListType` model:

```prisma
allowedProvenance String @map("allowed_provenance") @db.VarChar(50)
```

**Recommendation: widen to `VARCHAR(255)` now**, in this ticket.

Rationale, stated honestly: today's longest value is `"CRIME_IDAM,PI_AAD"` (17 chars) and the longest plausible combination of the three real user provenances is `"CFT_IDAM,CRIME_IDAM,PI_AAD"` (26 chars). `VARCHAR(50)` is not going to overflow tomorrow. But the failure mode if it ever does is bad in a specific way: Postgres `varchar(n)` **errors** on over-length inserts rather than truncating, so the deploy seed would fail loudly — however the System Admin form has no length validation on this field at all, so an admin selecting a hypothetical fifth and sixth provenance would get a 500 from Prisma rather than a validation message. Widening costs one additive migration; not widening leaves a sharp edge with no user-facing guard. `assertValidProvenances` also enforces `ALLOWED_PROVENANCE_MAX_LENGTH` so the two stay in step.

Migration: new directory `apps/postgres/prisma/migrations/<timestamp>_widen_allowed_provenance/migration.sql` (migrations live only in `apps/postgres/prisma/migrations/`; the latest existing is `20260818000000_remove_location_soft_delete`):

```sql
ALTER TABLE "list_types" ALTER COLUMN "allowed_provenance" TYPE VARCHAR(255);
```

Widening a `varchar` in Postgres is a catalog-only change — no table rewrite, no lock beyond a brief `ACCESS EXCLUSIVE`, and fully backward compatible with the currently-deployed code. Safe to ship ahead of the application change.

**Explicit recommendation on a real array column or join table: defer, do not do it here.** A `text[]` column or a `list_type_allowed_provenance` join table would delete the delimiter bug class outright, and it is the right long-term shape. It is also a data migration touching `list_types`, the `authorisation` read path, `system-admin-pages` queries, both seed writers, the test-support seeding route and ~40 test fixtures — with no user-visible benefit once §2.1-2.6 have reduced the delimiter to one module with tests. Raise it as a follow-up with the argument "the delimiter is now contained, so this is cleanup, not a fix". Record that decision in the ticket rather than leaving Q6 open (§5 Q6).

---

## 3. Error Handling & Edge Cases

| Case | Where it arises | Handling |
|---|---|---|
| **Empty provenance array** in `list-type-data.ts` | Developer edits an entry to `[]` | `assertValidProvenances` throws at seed time and the CI unit test fails first. `formatProvenance([])` also throws — an empty string in a `NOT NULL` column means "nobody may publish", which is never intended. |
| **Unknown provenance value** (typo, or a value like `MANUAL_UPLOAD` / `SSO` / `B2C_IDAM`) | `list-type-data.ts`; System Admin form POST | Seed: `assertValidProvenances` throws with the list type name and the offending value. UI: `validateProvenance` returns "Select valid provenance options" (existing message, existing error-summary wiring — no new copy, no new Welsh strings needed). |
| **Whitespace around the delimiter** | Legacy DB rows written before this change; a hand-run SQL fix | Never produced going forward (`formatProvenance` joins on a bare `,` from an array). Tolerated on read: `parseProvenance` trims, so both `authorisation/service.ts:34` and `edit-list-type/index.ts:39` handle `"CRIME_IDAM, PI_AAD"` correctly. This is the actual bug the ticket describes: today `" PI_AAD"` never matches and the publisher is denied with no error anywhere. |
| **Duplicate values** (`["CFT_IDAM", "CFT_IDAM"]`) | `list-type-data.ts`; an admin cannot produce this via checkboxes, but a crafted POST can | `assertValidProvenances` throws for seed data. `formatProvenance` de-duplicates, so the DB never stores a repeat. `validateProvenance` deliberately does **not** reject duplicates in the UI — silently de-duplicating a crafted POST is the correct behaviour and needs no error message. |
| **Truncation / over-length** | Only if a fourth+ provenance is added upstream | `ALLOWED_PROVENANCE_MAX_LENGTH` in the shared module, asserted by `assertValidProvenances`, and the column widened to 255. Note Postgres raises `22001 value too long` rather than truncating, so this was never a *silent* truncation risk — but it was an unguarded 500 in the admin UI, and the effect of a wrong `allowed_provenance` is a silent authorisation failure, which is why it is worth guarding. |
| **Single checkbox ticked → Express gives a string, not an array** | `add-list-type/index.ts:27-32`, `edit-list-type/index.ts:72-77` | Already handled by the existing array-or-string normalisation; `add-list-type/index.test.ts:142` covers it ("should handle single string for allowedProvenance"). Preserve this behaviour when factoring the two copies into one helper, and keep that test. |
| **No checkbox ticked → the key is absent from `req.body` entirely** | Both controllers | Normalisation yields `[]`, `validateProvenance` returns "Select at least one allowed provenance", form re-renders with the error summary and the user's other input preserved. Already correct; add a test if one is missing. |
| **Legacy DB rows with a delimited value containing spaces** | `edit-list-type` GET; `authorisation` | Handled on read by `parseProvenance` (above). No data migration to clean up existing rows is proposed: the deploy seed rewrites `allowed_provenance` for every seeded list type on every deploy via `INSERT ... ON CONFLICT ... DO UPDATE`, so seeded rows self-heal. Rows created by an admin through the UI are written by `formatProvenance` from an array and cannot contain spaces. |
| **`allowed_provenance` for a list type not in `listTypeData`** (admin-created, or a `TEST_`/`E2E_` fixture) | `authorisation` | Unchanged. The parity test only covers `listTypeData`. `TEST_`/`E2E_`-prefixed names remain exempt from seed soft-delete reconciliation. |

---

## 4. Acceptance Criteria Mapping

| # | Acceptance criterion | How satisfied | How verified |
|---|---|---|---|
| 1 | `ListTypeData.provenance` is `string[]`; every entry declares a list | §2.2 — field typed `UserProvenance[]`, all 77 entries converted | `tsc` across the workspace; existing `libs/location/src/seed-list-types.test.ts` and `apps/postgres/prisma/generate-seed-sql.test.ts` fixtures updated to arrays and passing |
| 2 | Seed joins the list into `list_types.allowed_provenance`; nothing outside the seed handles the delimited form | §2.3, §2.4 — `formatProvenance` at both write boundaries; §2.6 removes the `.join(",")` calls from `system-admin-pages/queries.ts` and the `.split(",")` from `edit-list-type` | New unit tests on `formatProvenance`/`parseProvenance`; a grep-style assertion is not proposed — instead the delimiter constant lives only in `user-provenance.ts` and reviewers check for stray `","` in the diff. Seed tests assert the emitted SQL/Prisma arg contains `'CRIME_IDAM,PI_AAD'` for `MAGISTRATES_PUBLIC_LIST`. Read path is `parseProvenance`, which is inside the shared module — the AC's "nothing outside the seed" is satisfied in spirit: no *caller* handles the delimiter. |
| 3 | The four `MAGISTRATES_*_ADULT_COURT_LIST_*` types allow both `CRIME_IDAM` and `PI_AAD` | §2.2 data change 1 | Parity test (§2.7) passes with no divergence recorded for these four; explicit unit test in the parity file naming all four; E2E unaffected |
| 4 | Provenance values validated against a known set; an unrecognised value fails at build or seed time rather than silently denying access | §2.1 `assertValidProvenances`, called from §2.3 and §2.4, plus a CI unit test iterating all of `listTypeData` | New test `libs/list-types/common/src/user-provenance.test.ts` (unit behaviour incl. throw cases) and a test in the same file iterating `listTypeData` and calling `assertValidProvenances` per entry. Deploy-time failure verified by inspection of `apps/postgres/start.sh:89-90` (`set -e`, generate-then-execute) |
| 5 | Whitespace around the delimiter cannot break matching | Never produced (array → `formatProvenance` joins on bare `,`) **and** tolerated on read (`parseProvenance` trims) — both halves of the AC's "either/or", which is the right call given legacy rows may already contain spaces | `parseProvenance("CRIME_IDAM, PI_AAD")` unit test; `authorisation/service.test.ts` gains a case where the DB value has a space and access is still granted; `edit-list-type/index.test.ts` gains a case where a spaced DB value renders both checkboxes checked |
| 6 | A test asserts, for every list type, that declared provenances match the shared model, or the divergence is explicitly recorded with a reason | §2.7 parity test with `NAME_ALIASES`, `ALLOWED_PROVENANCE_DIVERGENCES` (reason-annotated), `CATH_ONLY` and `EXPECTED_ABSENT` | `libs/list-types/common/src/reference/parity.test.ts`. Passes with `ALLOWED_PROVENANCE_DIVERGENCES` empty once both data changes land — if the PHT change is rejected at sign-off, one reason-annotated entry is added instead and the test still passes |
| 7 | Provenance for all lists can be added/updated through the System Admin dashboard, for multiple provenances per list | Already works; §2.6 removes the duplicated hardcoded option lists so the checkbox set is derived from `USER_PROVENANCES` | Existing `add-list-type/index.test.ts` and `edit-list-type/index.test.ts` updated for the `provenanceItems` prop; existing `@nightly` E2E journey in `e2e-tests/tests/system-admin/manage-list-types.spec.ts` extended (§4 note below) |
| 8 | Existing publisher authorisation is unchanged for every list type whose provenance set is unchanged | The only authorisation code change is `.split(",")` → `parseProvenance(...)`, which is behaviour-preserving for values with no whitespace. Only 5 list types change data (4 gain a provenance, none lose one; PHT changes from an unreachable value) | Existing `libs/publication/src/authorisation/service.test.ts` and `middleware.test.ts` pass unmodified except for added cases; the ~40 `(list-types)` page tests that mock `resolveListType` with `provenance: "CFT_IDAM"` are untouched, which is itself the regression check |

**E2E:** `e2e-tests/tests/system-admin/manage-list-types.spec.ts` already has three `@nightly` tests covering add (line 13), edit (line 102) and delete (line 161), and the add journey already does `await page.getByLabel("CFT_IDAM").check()` at line 55. **Do not add a new spec file.** Extend the existing add journey to tick two provenances (`CFT_IDAM` and `PI_AAD`) and assert both appear on the preview page's summary row, and extend the existing edit journey to assert the previously-saved provenances come back checked. That covers multi-provenance round-tripping through the UI within the existing journeys, per `CLAUDE.md`'s "one test per complete journey" rule. `e2e-tests/tests/system-admin/configure-list-type.spec.ts` is a 2-line stub pointing at this file — leave it.

**Existing unit test files that must be updated** (enumerated so none is missed):

- `libs/location/src/seed-list-types.test.ts` — `mockListTypeData` entries at lines 28 and 38 use `provenance: "CFT_IDAM"` / `"CRIME_IDAM"`; convert to arrays. The file mocks `@hmcts/list-types-common/list-type-data` at lines 44-46; it will also need `@hmcts/list-types-common/user-provenance` left unmocked (real implementation) or the assertions adjusted.
- `apps/postgres/prisma/generate-seed-sql.test.ts` — `import type { ListTypeData }` at line 1; `const LIST_TYPES: ListTypeData[]` at line 36 with `provenance: "CFT_IDAM"` at lines 41 and 52; convert to arrays and add a two-provenance case asserting the emitted SQL literal is `'CRIME_IDAM,PI_AAD'`.
- `apps/web/src/pages/(system-admin)/add-list-type/index.test.ts` — line 49 asserts the exact `checkedProvenance: { CFT_IDAM: false, PI_AAD: false, CRIME_IDAM: false }` render prop; update to the new `provenanceItems` shape. Keep the single-string case at line 142.
- `apps/web/src/pages/(system-admin)/edit-list-type/index.test.ts` — line 22 mock row has `allowedProvenance: "CFT_IDAM"` (a DB string, stays a string); line 125 expects `["CFT_IDAM"]`. Update the `checkedProvenance` assertions and add the spaced-legacy-value case.
- `libs/publication/src/authorisation/service.test.ts` — add the whitespace-tolerance case; existing cases should pass unchanged.
- New: `libs/list-types/common/src/user-provenance.test.ts`, `libs/list-types/common/src/reference/parity.test.ts`.
- No change: `libs/system-admin-pages/src/list-type/*.test.ts` beyond whatever `validateProvenance`'s refactor requires (behaviour and messages are identical); the ~40 `(list-types)` page tests; the two dead-template `.njk.test.ts` files; `configure-list-type-preview/index.njk.test.ts` (line 21's `["MANUAL_UPLOAD", "SJP"]` is display-only data for a summary row and does not have to be a valid `UserProvenance` — leave it, or tidy it to `["CFT_IDAM", "PI_AAD"]` for consistency).

---

## 5. CLARIFICATIONS NEEDED

### Q1 — `PHT_WEEKLY_HEARING_LIST`: is `MANUAL_UPLOAD` deliberate? (ticket Q1)

**Recommended answer: data error. Change it to `CFT_IDAM`.** Requires product/BA sign-off before merge because it changes who may publish.

Evidence: `MANUAL_UPLOAD` is not a `UserProvenances` value in the shared model. More decisively, **no CaTH login path ever sets `user.provenance` to `MANUAL_UPLOAD`** — the four writers are `login/return/index.ts:216` (`PI_AAD`), `cft-login/return/index.ts:51` (`CFT_IDAM`), `crime-login/return/index.ts:61` (`CRIME_IDAM`) and `passport-config.ts:21` (`SSO`). So `allowed_provenance = 'MANUAL_UPLOAD'` currently means "no one can publish this list type through the authorised route". `MANUAL_UPLOAD` *is* a valid value of the unrelated artefact-provenance enum in `libs/publication/src/provenance.ts`, which is almost certainly where the value was copied from. Consequence of the change: CFT publishers gain the ability to publish PHT lists, including at `Classified` sensitivity (see §2.2). Ask the same stakeholder to confirm PHT's `defaultSensitivity: null` is intentional.

### Q2 — Is `MANUAL_UPLOAD` a valid provenance at all? (ticket Q2)

**Recommended answer: no.** Do not put it in `USER_PROVENANCES`. It is an artefact provenance, not a user provenance, and after Q1 no list type declares it. The existing System Admin UI already implies this — its three checkboxes have never offered `MANUAL_UPLOAD`, so an admin editing PHT today and saving would already have destroyed the value. Naming the new module `user-provenance.ts` is the durable fix for the conflation.

### Q3 — The 19 name divergences (ticket Q3)

**Recommended answer: out of scope, and the ticket already says so — but record the direction.** Align to the shared model eventually, because #1026 requires `x-list-type` to match the incumbent's enum, and every day we do not align is a day a publisher's payload can be rejected. Each rename is a keyed migration on `list_types.name` (the stable key used by `PDF_GENERATOR_REGISTRY`, the Excel converter registry and subscriptions) and needs the #957 in-place treatment. Verified: all 19 pairs agree on `CFT_IDAM`, so **no provenance work is blocked by this decision** — the parity test's `NAME_ALIASES` map handles it cleanly and becomes the checklist for the follow-up tickets.

### Q4 — `CROWN_WARNED_PDDA_LIST` vs `CROWN_ADVANCED_PDDA_LIST` (ticket Q4)

**Recommended answer: needs a decision from Crime; not resolvable in this repo, and not blocking #698.** We hold none of the three PDDA list types today (`CROWN_DAILY_PDDA_LIST`, `CROWN_FIRM_PDDA_LIST`, `CROWN_WARNED_PDDA_LIST` are all in the absent-25). They will arrive with their own tickets. When they do, they must carry `["CRIME_IDAM", "PI_AAD"]`. Record in `EXPECTED_ABSENT` that `CROWN_WARNED_PDDA_LIST`'s name is contested with #957.

### Q5 — Which of the absent list types does CaTH need? (ticket Q5)

**Recommended answer: none in this ticket; and the count is 25, not 24.** The ticket's table omits `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` [`CFT_IDAM`]. Of the 25, three are marked `@Deprecated` upstream and are already superseded by names we hold, so the real gap is **22**:

| Absent, deprecated upstream | Superseded by, which we already have |
|---|---|
| `CARE_STANDARDS_LIST` | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` |
| `PRIMARY_HEALTH_LIST` | `PHT_WEEKLY_HEARING_LIST` |
| `CIC_DAILY_HEARING_LIST` | `CIC_WEEKLY_HEARING_LIST` |

Do not raise tickets for those three. The remaining 22 need a product decision each.

### Q6 — Should `allowed_provenance` stay a delimited `VARCHAR(50)`? (ticket Q6)

**Recommended answer: widen to `VARCHAR(255)` in this ticket (§2.8); defer the array column / join table and close the question.** Once the delimiter exists in one module with unit tests, the array column is cleanup with no user-visible benefit and a migration touching six code sites plus fixtures. Needs a nod from whoever owns the schema, but this is a low-stakes call. Correction to the ticket's framing: Postgres raises `22001 value too long for type character varying(50)` — it does **not** truncate silently. The risk was an unguarded 500 in the admin UI, not silent data loss.

### Q7 — New: is #1029 actually a dependency?

**Recommended answer: no, and the comment should be corrected on the issue.** #1029 ("Replace B2C_IDAM with PI_AAD", OPEN, empty body) does not gate any part of #698. Verified: `canAccessPublication` reads `user.provenance` from the session `UserProfile`, and `apps/web/src/pages/(auth)/login/return/index.ts:216` already writes `provenance: "PI_AAD"` for B2C media users, so adding `PI_AAD` to the four magistrates list types takes effect immediately on merge. `B2C_IDAM` appears in exactly two places, both in the admin *user-search* feature and both unrelated to `list_types.allowed_provenance`: `libs/system-admin-pages/src/user-management/validation.ts:6` (`VALID_PROVENANCES` for the search filter) and `user-management/queries.ts:55` (which already expands `B2C_IDAM` → `["B2C_IDAM", "PI_AAD"]`).

The only residual coupling is a merge conflict: if #1029 also introduces a canonical provenance constant, it should consume `USER_PROVENANCES` from `@hmcts/list-types-common/user-provenance` rather than declaring its own. Worth a comment on #1029. **Ask the ticket author to confirm** there is not some other intent behind the dependency comment that the empty issue body hides — but do not hold #698 waiting for it.

### Q8 — New: should the two dead templates be deleted?

`configure-list-type-enter-details/index.njk` and `view-list-types/index.njk` both contain provenance UI and both sit behind controllers that only `res.redirect(301, "/manage-list-types")`. They are exercised solely by their own `.njk.test.ts` files. Leaving them means the hardcoded provenance checkbox list survives in the codebase after this ticket claims to have removed it. **Recommended: leave them in #698 (out of scope, unrelated churn) and raise a separate cleanup ticket to delete both templates, both controllers and both tests.** Flagging so the reviewer is not surprised that a grep for `"CFT_IDAM"` still hits `.njk` files after this lands.

### Q9 — New: checkbox order

`validation.ts:2` orders the options `CFT_IDAM, PI_AAD, CRIME_IDAM`, matching the live checkbox order in both templates. Declaring `USER_PROVENANCES` in that order preserves the UI exactly. **Recommended: do that**, and note that `list-type-data.ts` entries should list provenances in the shared model's own order (`CRIME_IDAM, PI_AAD` for the magistrates lists) since that is what the parity comparison reads — the comparison is order-insensitive, so this is cosmetic.
