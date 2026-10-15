# Plan — #698: Add/Update provenance for all lists

## Summary

Align CaTH list-type provenance with the shared model (`pip-data-models` `ListType.java`,
snapshot committed at `docs/tickets/698/reference-list-types.json`, 102 entries). The
multi-provenance mechanism already works end-to-end via a comma-delimited
`list_types.allowed_provenance` column; this story corrects the *data*, hardens the
*representation*, and adds a *parity test* — it does not rebuild multi-provenance support.

The work is provenance-data / registration-only. **TEMPLATE SOURCE: n/a** — no new rendered
page or list-type view is created; the only template touch is replacing hardcoded checkbox
literals on the two existing System Admin forms with values driven from a shared constant.

---

## 1. Technical Approach (scope)

### In scope

- **(a) Type change** — `ListTypeData.provenance: string` → `string[]`. Every entry in
  `list-type-data.ts` declares its provenances as a list, mirroring `List.of(...)` upstream.
- **(b) Single provenance module** — one place owns the delimiter and the known-set.
  `formatProvenance(string[]) → string` (validates + joins) and
  `parseProvenance(string) → string[]` (splits + **trims** + drops empties). Validation is
  against a known-set of user-provenance constants: `CRIME_IDAM`, `PI_AAD`, `CFT_IDAM`, `SSO`.
  `MANUAL_UPLOAD` is explicitly **not** a valid user provenance (it belongs to the unrelated
  artefact-provenance enum in `libs/publication/src/provenance.ts`). No caller splits or joins
  the delimiter directly after this change.
- **(c) Fix the 5 data mismatches**:
  - `MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`,
    `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`:
    add `PI_AAD` → `["CRIME_IDAM", "PI_AAD"]`.
  - `PHT_WEEKLY_HEARING_LIST`: `["MANUAL_UPLOAD"]` → `["CFT_IDAM"]` — **subject to the blocking
    sign-off in section 5**. If sign-off is withheld, PHT stays as-is and is recorded as an
    explicit allowed-divergence in the parity test.
- **(d) Wire both seed paths through the module** — the generated-SQL path
  (`generate-seed-sql.ts`) and the local upsert path (`seed-list-types.ts`) both call
  `formatProvenance(lt.provenance)` instead of embedding the raw string.
- **(e) Drive System Admin checkboxes from the shared constant** — replace the four duplicated
  `checkedProvenance` literals and the hardcoded template checkbox items with the exported
  publisher-provenance constant; `validation.ts` consumes the same constant instead of its
  private `PROVENANCE_OPTIONS`.
- **(f) Parity test** — for every list type in `list-type-data.ts`, assert its declared
  provenances equal the shared model's (via `reference-list-types.json`), after aliasing the 19
  known name divergences, or that the divergence is explicitly recorded with a reason.
- **(g) Widen `allowed_provenance`** `VARCHAR(50)` → `VARCHAR(255)` (catalog-only `ALTER`).

### Out of scope (recorded, not actioned)

- Adding the 22 genuinely-absent list types (each needs its own schema/validation/render/PDF).
- Renaming the 19 divergent names (`list_types.name` is the stable key — needs keyed migration
  per #957).
- `LocationType` and `Roles` (the shared model's other constructor args).
- Migrating `allowed_provenance` to a `text[]`/join table (deferred follow-up; see Q6).

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** (provenance-data / registration-only — no new rendered page or
list-type view).

### New shared code — `@hmcts/list-types-common`

Create `libs/list-types/common/src/user-provenance.ts` (named `user-provenance` to distinguish
from the artefact-provenance enum already at `libs/publication/src/provenance.ts`):

```typescript
// Valid values a user.provenance can take (login side). MANUAL_UPLOAD is NOT one of these.
export const USER_PROVENANCES = ["CRIME_IDAM", "PI_AAD", "CFT_IDAM", "SSO"] as const;

// The subset used as list-type publisher provenances (what the shared model assigns and what
// the System Admin form offers). SSO is a login provenance, never a list-type provenance.
export const PUBLISHER_PROVENANCES = ["CFT_IDAM", "PI_AAD", "CRIME_IDAM"] as const;

export function formatProvenance(provenances: string[]): string {
  for (const p of provenances) {
    if (!(USER_PROVENANCES as readonly string[]).includes(p)) {
      throw new Error(`Invalid provenance "${p}". Expected one of: ${USER_PROVENANCES.join(", ")}`);
    }
  }
  return provenances.join(",");
}

export function parseProvenance(value: string): string[] {
  return value.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
}
```

- Export from `libs/list-types/common/src/index.ts`, **and** add a dedicated package export
  subpath `"./user-provenance"` in `libs/list-types/common/package.json` — mirroring the
  existing `"./list-type-data"` subpath. This matters: both `generate-seed-sql.ts` and
  `seed-list-types.ts` import from the subpath specifically to avoid the barrel (which pulls in
  nunjucks/exceljs, absent from the focused postgres deploy image). The provenance module must
  be importable the same way.

### Files to change

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts` | `provenance: string` → `provenance: string[]`; convert all 77 entries to array literals; apply the 4 magistrates `PI_AAD` additions + PHT fix (pending sign-off). |
| `libs/list-types/common/src/user-provenance.ts` | **new** — module above. |
| `libs/list-types/common/src/index.ts` | export `USER_PROVENANCES`, `PUBLISHER_PROVENANCES`, `formatProvenance`, `parseProvenance`. |
| `libs/list-types/common/package.json` | add `"./user-provenance"` export subpath. |
| `apps/postgres/prisma/generate-seed-sql.ts` | line ~133: `sqlStr(lt.provenance)` → `sqlStr(formatProvenance(lt.provenance))`; import from `@hmcts/list-types-common/user-provenance`. |
| `libs/location/src/seed-list-types.ts` | lines ~48, ~57: `allowedProvenance: listType.provenance` → `formatProvenance(listType.provenance)`; subpath import. |
| `libs/system-admin-pages/src/list-type/queries.ts` | lines 119, 142, 170: `data.allowedProvenance.join(",")` → `formatProvenance(data.allowedProvenance)`. |
| `libs/publication/src/authorisation/service.ts` | line 34: `listType.provenance.split(",").includes(...)` → `parseProvenance(listType.provenance).includes(...)`; import from `@hmcts/list-types-common/user-provenance`. |
| `libs/system-admin-pages/src/list-type/validation.ts` | replace private `PROVENANCE_OPTIONS` with `PUBLISHER_PROVENANCES`. |
| `apps/web/src/pages/(system-admin)/add-list-type/index.ts` | replace the two `checkedProvenance` literals (lines 18, 80) with a helper built from `PUBLISHER_PROVENANCES`; pass the option list to the template. |
| `apps/web/src/pages/(system-admin)/edit-list-type/index.ts` | line 39: `.split(",")` → `parseProvenance(...)`; replace the two `checkedProvenance` literals (lines 47, 125) as above. |
| `apps/web/src/pages/(system-admin)/add-list-type/index.njk` & `edit-list-type/index.njk` | line ~101–103: build checkbox `items` by iterating the passed provenance-option list instead of hardcoding the three values. |
| `libs/postgres-prisma/prisma/schema/location.prisma` | line 54: `@db.VarChar(50)` → `@db.VarChar(255)`. |

### Prisma migration (only schema change)

1. Edit `location.prisma:54` to `@db.VarChar(255)`.
2. Create `apps/postgres/prisma/migrations/<timestamp>_widen_allowed_provenance/migration.sql`:
   ```sql
   ALTER TABLE "list_types" ALTER COLUMN "allowed_provenance" TYPE VARCHAR(255);
   ```
   (catalog-only widen — no table rewrite, no data loss).
3. `yarn db:generate` to refresh the client; verify with `yarn db:migrate:dev` locally.

### Parity test — `libs/list-types/common/src/list-type-data.parity.test.ts`

Loads `docs/tickets/698/reference-list-types.json` and, for each entry in `listTypeData`,
resolves its reference name (direct or via `NAME_ALIASES`) and asserts
`sort(ours.provenance) === sort(reference.allowedProvenances)`.

- **`NAME_ALIASES`** — the 19 ours→shared divergences (all agree on `CFT_IDAM`), doubling as the
  rename-follow-up checklist:
  `BRISTOL_CARDIFF_… → BRISTOL_AND_CARDIFF_…`, `CARE_STANDARDS_TRIBUNAL_… → CST_…`,
  `FTT_LANDS_REGISTRATION_… → FTT_LR_…`, `FTT_RPT_{EASTERN,LONDON,MIDLANDS,NORTHERN,SOUTHERN}_… →
  RPT_{…}_…`, `FTT_TAX_CHAMBER_… → FTT_TAX_…`, `MAYOR_CITY_… → MAYOR_AND_CITY_…`,
  `UTIAC_JR_{BIRMINGHAM,CARDIFF,LEEDS,LONDON,MANCHESTER}_… → UT_IAC_JR_{…}_…`,
  `UTIAC_STATUTORY_APPEAL_… → UT_IAC_STATUTORY_APPEALS_…`,
  `UT_ADMINISTRATIVE_APPEALS_CHAMBER_… → UT_AAC_…`, `UT_LANDS_CHAMBER_… → UT_LC_…`,
  `UT_TAX_AND_CHANCERY_CHAMBER_… → UT_T_AND_CC_…`.
- **`KNOWN_GAPS`** — the 22 real gaps (reference names absent from CaTH, not ported here) **plus**
  the 3 deprecated-and-superseded upstream entries that must stay absent
  (`CARE_STANDARDS_LIST`, `PRIMARY_HEALTH_LIST`, `CIC_DAILY_HEARING_LIST`). Assert none of these
  appear in `listTypeData`. (`CROWN_WARNED_PDDA_LIST` annotated as contested with #957.)
- **`ALLOWED_DIVERGENCES`** — if PHT sign-off is withheld, one entry:
  `PHT_WEEKLY_HEARING_LIST` ours `["MANUAL_UPLOAD"]` vs ref `["CFT_IDAM"]`, with a reason string.
  If sign-off is granted, this map is empty and PHT passes parity normally.

Also add unit tests for `formatProvenance`/`parseProvenance` (trim, empty-drop, invalid-throws)
in `libs/list-types/common/src/user-provenance.test.ts`, and extend the authorisation service
test to cover a spaced legacy row (`"CRIME_IDAM, PI_AAD"`) now matching after `parseProvenance`.

---

## 3. Error Handling & Edge Cases

- **Invalid provenance fails fast** — `formatProvenance` throws on any value outside
  `USER_PROVENANCES`. This runs in both seed paths, so a bad value fails at build/seed time
  rather than silently denying access at runtime (AC4).
- **Whitespace / legacy spaced rows** — `parseProvenance` trims, so a pre-existing
  `"CRIME_IDAM, PI_AAD"` row (or one an older UI wrote) authorises correctly and `edit-list-type`
  no longer silently drops the second provenance on read (fixes the `service.ts:34` no-trim bug
  and the `edit-list-type/index.ts:39` read path).
- **VARCHAR length** — longest real value is `"CRIME_IDAM,PI_AAD"` (17 chars); widening to 255
  removes any future headroom concern. Postgres raises `22001` on overflow (it does not
  truncate), so the prior risk was an unguarded 500 in the admin form, now moot.
- **`edit-list-type` read path** — DB→UI parse routed through `parseProvenance`; the AC caveat
  ("nothing outside the seed handles the delimited form") is satisfied in intent — the DB column
  stays delimited, but only `formatProvenance`/`parseProvenance` touch the delimiter; no caller
  does.

---

## 4. Acceptance Criteria Mapping

| AC | Satisfied by | Verified by |
|---|---|---|
| `provenance` is `string[]`; every entry a list | §1(a), §2 list-type-data conversion | TypeScript compile; parity test reads arrays |
| Seed joins into `allowed_provenance`; nothing outside seed handles delimited form | §1(b)(d) `formatProvenance` in both seed paths; only module touches delimiter | seed unit run; grep shows no stray `.join(",")`/`.split(",")` on provenance |
| 4 magistrates lists allow `CRIME_IDAM` + `PI_AAD` | §1(c) | parity test; authorisation service test |
| Values validated against known set; unknown fails at build/seed | §1(b) `formatProvenance` throws | `user-provenance.test.ts` invalid-throws case |
| Whitespace cannot break matching | §1(b) `parseProvenance` trims | `user-provenance.test.ts` + authorisation spaced-row test |
| Test asserts each list type matches shared model or records divergence | §2 parity test (`NAME_ALIASES`, `KNOWN_GAPS`, `ALLOWED_DIVERGENCES`) | parity test run |
| Provenance editable via System Admin dashboard, multiple per list | §1(e) checkboxes from shared constant; existing multi-select persists via `formatProvenance` | add/edit controller tests |
| Existing authorisation unchanged for unchanged list types | `parseProvenance` is behaviour-equivalent to `.split(",")` for delimiter-free values | authorisation service test (unchanged cases still pass) |

---

## 5. CLARIFICATIONS NEEDED

### BLOCKING

1. **PHT `MANUAL_UPLOAD` → `CFT_IDAM` sign-off.** Recommendation: it is a data error, change it.
   `MANUAL_UPLOAD` is not a `UserProvenances` value — it is an *artefact*-provenance value
   (`libs/publication/src/provenance.ts`) almost certainly copied by mistake, and **no login path
   sets `user.provenance = MANUAL_UPLOAD`**, so PHT currently authorises to nobody via the
   provenance route. Changing it to `CFT_IDAM` **widens access to CFT publishers** (including at
   `Classified` sensitivity), so it needs explicit sign-off. If withheld, PHT stays as-is and the
   parity test records it under `ALLOWED_DIVERGENCES`. (Q2 follows: `MANUAL_UPLOAD` should not be
   a valid allowed-provenance value; the UI has never offered it.)

### NON-BLOCKING (recommendations recorded; proceed unless told otherwise)

2. **#1029 dependency ("Replace B2C_IDAM with PI_AAD").** No real coupling found — the media
   login path already sets `provenance: "PI_AAD"`, and surviving `B2C_IDAM` references are in the
   admin user-search filter only, not `allowed_provenance`. Recommend **proceeding without
   waiting**; if #1029 introduces its own provenance constant it should consume the one this
   ticket adds. Confirm no hidden intent behind the dependency.
3. **VARCHAR vs array/join-table (Q6).** Recommend **widen to `VARCHAR(255)` now, defer the
   `text[]`/join-table** to a follow-up (it is cleanup once the delimiter lives in one tested
   module, not a fix). Needs a nod from the schema owner.
4. **The 19 name renames (Q3).** Out of scope; all agree on `CFT_IDAM` so no provenance impact.
   `NAME_ALIASES` becomes the rename checklist.
5. **`CROWN_WARNED_PDDA_LIST` vs `CROWN_ADVANCED_PDDA_LIST` (Q4).** Out of scope; we hold no PDDA
   list yet. Belongs on the PDDA tickets; they must carry `["CRIME_IDAM", "PI_AAD"]`.
6. **Which of the 22 absent list types CaTH needs (Q5).** Out of scope; the 3
   deprecated-and-superseded (`CARE_STANDARDS_LIST`, `PRIMARY_HEALTH_LIST`,
   `CIC_DAILY_HEARING_LIST`) must stay absent — the real gap is 22, not 25.

### Follow-up (separate tickets, not this story)

- Delete the two dead System Admin pages (`configure-list-type-enter-details`,
  `view-list-types`) whose controllers `res.redirect(301, ...)` — their provenance blocks are
  unreachable. Not smuggled into this ticket.
