# Technical Plan — #1220: List type not shown in subscription if jurisdictions in location reference data and list lookup table unmatched

**Ticket type:** Spike (`@spec spike`, 2-day timebox, expiry 2026-11-07).
**Acceptance criteria:** "The code is reviewed to check if there is a way to pull in the jurisdictions
from a single source rather than multiple sources to avoid this happening."

This is a review-and-recommend ticket, not a feature. The deliverables are a written answer to the
seven questions in the spike spec, a Go/No-Go recommendation, and **one** committed artefact: a CI
guard test that fails on the mismatch instead of describing it. Implementation of the chosen option
follows as separate tickets.

All findings below were re-verified against the repository while writing this plan. Line numbers are
accurate as of `f3df6eb`.

---

## 1. Technical Approach

### 1.1 The defect, stated precisely

A court's subscribable list types are resolved through a two-hop join:

```
location
  └── location_sub_jurisdiction          ← written by deploy seed AND by sysadmin CSV upload
        └── sub_jurisdiction             ← written by deploy seed AND by sysadmin /jurisdiction-data
              └── list_types_sub_jurisdictions   ← written by deploy seed, local seed, AND sysadmin /edit-list-type
                    └── list_types
```

The two sides of that join are declared in two different TypeScript files, keyed on two different
things, and nothing reconciles them:

| Side | Declared in | Key | Writers |
|---|---|---|---|
| `location_sub_jurisdiction` | `libs/location/src/location-data.ts` (`locations[].subJurisdictions: number[]`) | numeric id (seed) / **name** (CSV upload) | deploy seed, CSV upload |
| `list_types_sub_jurisdictions` | `libs/list-types/common/src/list-type-data.ts` (`subJurisdictionIds: number[]`, line 10) | numeric id | deploy seed, local `yarn db:seed`, sysadmin create/edit list type |

When a court carries only sub-jurisdictions that no list type references, the join returns empty and
the subscription journey dead-ends silently. There is no error at any layer.

### 1.2 Verified findings

Each of these was confirmed by reading the code during planning, not assumed from the spec.

**F1 — The mismatch exists in committed data today.** A mechanical cross-check of
`location-data.ts` against `list-type-data.ts` gives:

- 30 sub-jurisdictions declared; 29 referenced by at least one of the 77 `listTypeData` entries.
- **Unreferenced: `subJurisdictionId: 12`, "Court of Appeal (Criminal Division)"**
  (`libs/location/src/location-data.ts:363`).
- No dangling references (every id in `listTypeData` exists in the taxonomy) — so the live failure
  mode today is the *coverage* gap, not a typo'd id.

It is masked only because its single seeded location, Royal Courts of Justice, also carries
sub-jurisdictions 1, 5, 10 and 11 (`location-data.ts:36`). Any court given *only* sub-jurisdiction 12
— by seed edit or by CSV upload — is unsubscribable, and nothing in CI detects it.

**F2 — `sub_jurisdiction` ids are explicit, not autoincrement, and diverge above 30.**
`SubJurisdiction.subJurisdictionId` is `@id` with **no** `@default(autoincrement())`
(`libs/postgres-prisma/prisma/schema/location.prisma:22`), so seeded ids 1–30 are stable across
environments. But `createJurisdictionRecord` assigns `MAX(sub_jurisdiction_id) + 1` under an
`EXCLUSIVE` table lock (`libs/system-admin-pages/src/jurisdiction-management/queries.ts:85-101`), so
every sysadmin-created sub-jurisdiction at id 31+ is environment-specific — exactly the `ListType.id`
problem CLAUDE.md already forbids. `SubJurisdiction.name` and `welshName` are both `@unique`
(`location.prisma:23-24`), so name-keying is available.

**F3 — Name-keying alone does not make the failure loud.** `generateListTypeSubJurisdictionsSql`
(`apps/postgres/prisma/generate-seed-sql.ts:162-174`) already resolves the *list type* side by name:

```sql
INSERT INTO list_types_sub_jurisdictions (list_type_id, sub_jurisdiction_id)
SELECT id, 12 FROM list_types WHERE name = 'SOME_LIST'
ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;
```

If the name does not match, the `SELECT` returns zero rows and the `INSERT` is a **silent no-op**.
Re-keying the sub-jurisdiction side the same way inherits that silence. This is the single most
important finding for the recommendation: **Option 1 on its own trades a wrong-id bug for a
wrong-name bug of identical silence.** What makes it loud is the compile-time type plus the CI guard
— i.e. Option 2.

**F4 — The local seed catches only total mismatch, not partial.** `seedListTypes` throws
`No sub-jurisdictions resolved for list type "X"` only when **zero** ids resolve
(`libs/location/src/seed-list-types.ts:36-38`). A list type declaring `[3, 4, 99]` seeds happily with
two of three mappings. It also skips entirely when `ENVIRONMENT === "prod"` or `CI === "true"`
(lines 13-23), so it is not a CI safety net at all.

**F5 — No seed path removes stale mappings; the deploy seed reverts sysadmin edits.**
`generateListTypeSubJurisdictionsSql` is `ON CONFLICT … DO NOTHING` and `seedListTypes` upserts only
— neither deletes. But the sysadmin edit path *does* delete
(`libs/system-admin-pages/src/list-type/queries.ts:155`, `tx.listTypeSubJurisdiction.deleteMany`). So
a mapping an admin deliberately removes is silently re-added on the next deploy, and a mapping
removed from `list-type-data.ts` persists in the database indefinitely. `listTypeData` has removal
reconciliation for list types themselves (`generateSoftDeleteReconciliationSql`,
`generate-seed-sql.ts:176-183`) but nothing equivalent for the mapping table.

**F6 — The realign step can permanently orphan an admin-created sub-jurisdiction.**
`generateRealignSql` (`generate-seed-sql.ts:72-76`) renames **any** row whose `name` or `welsh_name`
collides with a seed value to `__realign_<id>` / `__realign_w_<id>`, and only rows whose *id* appears
in the seed get restored by the following upsert (`generateSubJurisdictionsSql`, line 88). An
admin-created row at id 31 sharing a seed name is therefore left named `__realign_31` forever — after
which every CSV referencing that name fails the existence check at
`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:220-249`. **Unverified
against STG** — this is a spike task.

**F7 — Silent at every layer.**
- CSV upload validates that each `SUB_JURISDICTION_NAME` *exists* (`validation.ts:220-249`) but never
  that the resulting mapping yields a list type.
- `subscription-add-list/index.ts:48-54` renders `listTypeGroups: []` → `index.njk:38` emits a bare
  `<p class="govuk-body">{{ noListTypes }}</p>` with no onward action.
  `subscription-configure-list/index.ts:37` repeats the same query.
- `subscription-confirmation-preview/index.ts:236` blocks confirmation when
  `getAllowedListTypeIdsForLocations()` returns an empty intersection.
- The notification path logs nothing when a subscriber is skipped for a mapping reason.

**F8 — A user with any list-type row loses the location-level fallback entirely.**
`findActiveSubscriptionsByLocation` filters `user: { subscriptionListTypes: { none: {} } }`
(`libs/notifications/src/notification/subscription-queries.ts:29`). Once a user saves a single
list-type row they depend wholly on `findListTypeSubscribersByListTypeAndLanguage` matching
`listTypeIds has <id>` (line 105). A mapping gap therefore degrades to **zero** emails, not fewer.

**F9 — NEW, not in the spike spec: `SubscriptionListType` has no location column, and the
list-type send path has no location filter.** The schema is one row per user holding a global
`listTypeIds Int[]` (`libs/postgres-prisma/prisma/schema/subscription.prisma`, `userId` is `@unique`),
and `findListTypeSubscribersByListTypeAndLanguage` filters on list type and language only — never on
`locationId` (`subscription-queries.ts:105-118`); the caller
`sendListTypePublicationNotifications` does not add one either
(`libs/notifications/src/notification/notification-service.ts:654-671`). So a user who subscribes to
Court A and ticks "Civil Daily Cause List" is emailed when **any** court publishes that list,
including courts they never subscribed to. This matters for the recommendation: the service is
already over-sending in one direction while under-sending in the other, and Option 4 (fallback) must
be designed against the real send semantics, not the assumed ones. Raise as its own defect ticket.

**F10 — Minor, worth folding into whichever ticket touches these files:**
- `getListTypeIdsForLocation` (`libs/subscriptions/src/repository/subscription-list-type-queries.ts:3-15`)
  does **not** filter `deletedAt: null`, so the confirmation-preview gate at
  `subscription-confirmation-preview/index.ts:236` can allow a soft-deleted list type that
  `subscription-add-list/index.ts:48` (which does filter) never offered.
- `getAllowedListTypeIdsForLocations` runs one query per location
  (`subscription-list-type-service.ts:34-36`) and `getSubscriptionListTypesByUserId` one per list
  type id (lines 42-48) — N+1, against `.claude/rules/backend.md`.
- `subscription-add-list/index.ts:48` and `subscription-configure-list/index.ts:37` query
  `prisma.listType.findMany` directly from the page controller, duplicating
  `getListTypeIdsForLocation` and putting business logic in `apps/` (CLAUDE.md pitfall 1).

### 1.3 Answer to the acceptance criteria

**Yes — the taxonomy can be single-sourced, and the dependency direction resolves cleanly.** The
spike spec left this as an open question; it is answered here.

`@hmcts/location` already declares `@hmcts/list-types-common` as a dependency
(`libs/location/package.json`), and `@hmcts/list-types-common` does **not** depend on
`@hmcts/location`. So the shared sub-jurisdiction taxonomy must live on the `list-types-common` side
of that edge. A naive `list-type-data.ts → @hmcts/location/location-data` import is the direction
that would cycle; the reverse is already legal.

Recommended placement: a new leaf module `libs/list-types/common/src/sub-jurisdiction-data.ts` with
its own subpath export `./sub-jurisdiction-data`, consumed by `list-type-data.ts` (same package) and
by `libs/location/src/location-data.ts`. The subpath matters: both existing consumers import
`@hmcts/list-types-common/list-type-data` rather than the barrel precisely because the barrel pulls
in nunjucks/exceljs, which are absent from the focused postgres deploy image
(`generate-seed-sql.ts:1-8`, `seed-list-types.ts:1-4`). The new export must stay equally free of
transitive imports.

**Recommendation: Option 2 (re-key on name + single-source the taxonomy + CI guard), Go.** Option 1
alone is rejected per F3 — it does not make the failure loud. Option 3 complements but cannot fix
data already in the database. Option 4 is a product decision (see Open Questions) and must not ship
*alone*, because masking the data defect without fixing it is worse than the current state. Option 5
(replacing the join) is rejected on current evidence: no data suggests the taxonomy cannot be made
reliable, and it is a rewrite of the subscription journey's data model.

### 1.4 Shape of the fix the spike should recommend

Sketch only — this plan does **not** implement it.

```typescript
// libs/list-types/common/src/sub-jurisdiction-data.ts
export const SUB_JURISDICTION_NAMES = [
  "Civil Court",
  "Family Court",
  // …30 entries, the single source of truth
] as const;

export type SubJurisdictionName = (typeof SUB_JURISDICTION_NAMES)[number];
```

```typescript
// libs/list-types/common/src/list-type-data.ts
subJurisdictionNames: SubJurisdictionName[];   // replaces subJurisdictionIds: number[]
```

A typo then fails `tsc`, not production. The ids stay in `location-data.ts` as the seed's primary
key; only the *cross-file reference* becomes a name. `generate-seed-sql.ts` resolves it with a
two-table subquery in place of the literal:

```sql
INSERT INTO list_types_sub_jurisdictions (list_type_id, sub_jurisdiction_id)
SELECT lt.id, sj.sub_jurisdiction_id
FROM list_types lt, sub_jurisdiction sj
WHERE lt.name = 'SOME_LIST' AND sj.name = 'Civil Court'
ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;
```

This preserves the atomic `INSERT … ON CONFLICT` contract CLAUDE.md requires (item 7) and keeps the
statement a no-op-on-miss — which is acceptable *only* because the guard test makes a miss
impossible to commit.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — no rendered page or list-type view is created by this ticket. The copy
change in §2.3 is conditional and deferred.

### 2.1 Files to read, in order (the code review the AC asks for)

| File | What to establish |
|---|---|
| `libs/list-types/common/src/list-type-data.ts` | `subJurisdictionIds: number[]` on all 77 entries (interface at line 10) |
| `libs/location/src/location-data.ts` | 4 jurisdictions, 30 sub-jurisdictions (from line 296), seeded location → sub-jurisdiction mapping |
| `apps/postgres/prisma/generate-seed-sql.ts` | `generateRealignSql:72`, `generateSubJurisdictionsSql:88`, `generateLocationSubJurisdictionsSql:125`, `generateListTypeSubJurisdictionsSql:162`, `generateSoftDeleteReconciliationSql:176` |
| `libs/location/src/seed-list-types.ts` | zero-resolve throw at line 36; prod/CI skip at lines 13-23 |
| `libs/subscriptions/src/repository/subscription-list-type-queries.ts` | `getListTypeIdsForLocation` — the join at the centre of the bug; no `deletedAt` filter |
| `libs/subscriptions/src/repository/subscription-list-type-service.ts` | `getAllowedListTypeIdsForLocations:34` (N+1) |
| `apps/web/src/pages/(verified)/subscription-add-list/index.ts` | empty-state render at lines 48-54 |
| `apps/web/src/pages/(verified)/subscription-configure-list/index.ts` | same query, line 37 |
| `apps/web/src/pages/(verified)/subscription-confirmation-preview/index.ts` | second gate, line 236 |
| `libs/notifications/src/notification/subscription-queries.ts` | `findActiveSubscriptionsByLocation:24` (predicate at 29), `findListTypeSubscribersByListTypeAndLanguage:105` |
| `libs/notifications/src/notification/notification-service.ts` | `sendListTypePublicationNotifications:654` — confirm the missing location filter (F9) |
| `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` | existing name check, lines 220-249 — natural home for a coverage check |
| `libs/system-admin-pages/src/jurisdiction-management/queries.ts` | `createJurisdictionRecord` id assignment, lines 85-101 |
| `libs/system-admin-pages/src/list-type/queries.ts` | third writer; `deleteMany` at line 155 |
| `libs/postgres-prisma/prisma/schema/location.prisma` | `SubJurisdiction` 21-32, `ListTypeSubJurisdiction` 34-44, `LocationSubJurisdiction` 108-117 |
| `libs/postgres-prisma/prisma/schema/subscription.prisma` | `SubscriptionListType` — confirm no location column (F9) |

### 2.2 The one artefact that lands: the CI guard test

New file: `libs/list-types/common/src/sub-jurisdiction-coverage.test.ts`.

Precedent for a data-integrity guard in this package is
`libs/list-types/common/src/validation/guard.test.ts`. Follow `.claude/rules/testing.md`: Vitest,
co-located, AAA comments, `should … when …` naming. **No mocks** — import the real
`listTypeData` and `locationData` and assert against them, the same way the schema guard executes the
real schemas.

Three assertions:

1. **No dangling reference** — every sub-jurisdiction referenced by `listTypeData` exists in
   `locationData.subJurisdictions`. Passes today; prevents regression.
2. **Full coverage** — every sub-jurisdiction in `locationData.subJurisdictions` is referenced by at
   least one `listTypeData` entry, except entries on an explicit allow-list. **This fails today on
   id 12** unless 12 is allow-listed, which is the point: the test must either go red or carry a
   written, reviewed justification for the gap.
3. **No unsubscribable seeded court** — every `locationData.locations[]` entry resolves, through its
   `subJurisdictions`, to at least one list type.

The allow-list is a `const` with a comment per entry stating *why* that sub-jurisdiction legitimately
has no publishable list type. An empty allow-list is the goal state. Resolving whether 12 belongs on
it, or whether a list type should map to it, is a spike question for the service owner (§6, Q3) — the
test must not be made green by guessing.

Dependency note: the test lives in `@hmcts/list-types-common`, which does **not** depend on
`@hmcts/location`, so it cannot import `locationData` as written. Two options, to be decided during
implementation:
- Land the guard in `libs/location/src/` instead (dependency direction already permits it) as a
  tactical placement, and move it when the taxonomy is single-sourced; **or**
- Add the shared taxonomy module first (§1.4) so the guard can live in `list-types-common` and assert
  against it.

The first is the smaller, more honest spike deliverable — the guard's value is that it goes red, not
where it lives. Recommend landing it at `libs/location/src/sub-jurisdiction-coverage.test.ts` with a
comment pointing at this ticket and the intended final home.

### 2.3 Deferred — conditional UI copy change

Only if the final recommendation leaves a zero-list-type court reachable. Not part of this spike's
commit. The existing `noListTypes` key
(`apps/web/src/pages/(verified)/subscription-add-list/en.ts:8`) states the problem and offers no
route onward; the replacement copy and the `index.njk:38` change are specified in the spike spec on
the issue and should be carried into the follow-up ticket, with Welsh placeholders marked
`[WELSH TRANSLATION REQUIRED: …]` per CLAUDE.md.

### 2.4 No database schema changes, no API endpoints

This ticket adds no migration, no Prisma model change, and no route. Re-keying
`list_types_sub_jurisdictions` is explicitly out of scope per the spike spec.

---

## 3. Error Handling & Edge Cases

Scenarios the spike's written report must state a position on:

- **Sub-jurisdiction with no list type** (live today, id 12) — guard test assertion 2.
- **Dangling id/name in `listTypeData`** — guard test assertion 1; becomes a `tsc` error once the
  taxonomy is shared.
- **Partial resolve** — list type declaring 3 ids of which 1 is bad. Seeds silently today (F4).
  Assertion 1 catches it.
- **Runtime-created sub-jurisdiction with no mapping** — `/jurisdiction-data` creates ids 31+ that no
  guard test can see, because they are not in `locationData`. Needs a runtime check (Option 3), not a
  CI check. The report must say so explicitly rather than implying the guard test closes this.
- **CSV upload attaching a court only to uncovered sub-jurisdictions** — passes validation today.
  Blocking error vs. warning vs. post-upload report is Q4.
- **`__realign_<id>` orphan** (F6) — a sub-jurisdiction whose name the seed has parked makes every
  CSV referencing that name fail. Needs an STG query to confirm, and a cleanup plan if present.
- **Soft-deleted list type passing the preview gate** (F10) — `getListTypeIdsForLocation` has no
  `deletedAt` filter.
- **Over-send** (F9) — list-type subscribers are notified for courts they never subscribed to. Must
  be quantified before Option 4 is designed, or the "fallback" is built on a false model of what
  users currently receive.

---

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How it is satisfied | Verification |
|---|---|---|
| "The code is reviewed…" | §1.2 F1–F10, each with file:line evidence, extended by the spike against the files in §2.1 | Report section on the issue, reviewed by the service owner |
| "…to check if there is a way to pull in the jurisdictions from a single source rather than multiple sources" | §1.3 — yes; `libs/list-types/common/src/sub-jurisdiction-data.ts` behind a dedicated subpath export, because `@hmcts/location` already depends on `@hmcts/list-types-common` and not the reverse | `tsc` on a spike branch proving the import direction compiles with no cycle |
| "…to avoid this happening" | Option 2 recommended; a shared `as const` taxonomy turns a bad reference into a compile error, and the CI guard catches the coverage gap that typing cannot | Guard test from §2.2, red on current data |

Spike deliverables from the spec, mapped:

| Deliverable | Where |
|---|---|
| Written answer to each of the 7 questions | Report comment on the issue; Q2 answered in §1.3, Q1 partly in F2/F3, Q3 scoped in §2.2 |
| Go/No-Go + chosen option + explicit rejections | §1.3 |
| STG blast-radius queries run | Spike task; four queries given in the spec on the issue |
| CI guard test committed | §2.2 — the only code this ticket lands |
| Story-point estimate per option | Report |
| Q5 (notification fallback) decision recorded with service owner | Report; see Open Questions |

---

## 5. Test Scenarios

Per CLAUDE.md and `.claude/rules/testing.md`, one scenario per journey — not one per assertion. This
ticket adds no user-facing behaviour, so there are **no E2E tests**.

| # | Scenario | Expected | Covers |
|---|---|---|---|
| 1 | **Reference-data integrity guard** (`libs/location/src/sub-jurisdiction-coverage.test.ts`) — real `listTypeData` × real `locationData`, no mocks. Asserts: no dangling reference; every sub-jurisdiction covered except an explicitly justified allow-list; every seeded location resolves to ≥1 list type. | Dangling and unsubscribable-court assertions pass; the coverage assertion **fails on sub-jurisdiction 12** until it is either mapped to a list type or allow-listed with a stated reason. A red test here is a correct result for this spike. | AC, F1, F4 |
| 2 | **Seed-generator output is unchanged** — re-run `apps/postgres/prisma/generate-seed-sql.test.ts`. | Green. Proves the guard test is additive and the spike touched no seed behaviour. | §2.4 |

Scenario 1 has a corresponding task in `tasks.md`; scenario 2 is covered by the existing suite and by
the `yarn test` task.

Deferred to the implementation tickets, not written here: a seed test proving a renamed
sub-jurisdiction fails loudly (Option 1/2), a `validation.ts` test for the coverage error (Option 3),
and a `findActiveSubscriptionsByLocation` test for the changed predicate (Option 4).

---

## 6. CLARIFICATIONS NEEDED

Posted as a comment on the issue.

1. **Is sub-jurisdiction 12, "Court of Appeal (Criminal Division)", missing a list type by mistake or
   by design?** This decides whether the guard test's coverage assertion ships green (12 is mapped to
   a list type) or ships with 12 on a justified allow-list. Needed before the guard test can be
   finalised — it is the one question that blocks the committed artefact.

2. **Q5 from the spec — should a mapping gap degrade to a location-level email, or stay silent?**
   Changing `findActiveSubscriptionsByLocation`'s predicate (F8) means a user receives a list they
   did not tick. That is a product call, not a technical one. Note the decision must account for F9:
   list-type subscribers are *already* emailed for courts they never subscribed to, so "what users
   receive today" is not what the spec assumed.

3. **Is STG database access available within the timebox, and through what route?** Four of the
   deliverables are SQL results against STG. If there is no access path, say so now and the spike
   reports on code evidence only — but then F6 (`__realign_*` orphans) and the affected-user count
   stay unverified, and the report must label them as such.

4. **Is F9 in scope for this spike, or a separate ticket?** The missing location filter on
   `findListTypeSubscribersByListTypeAndLanguage` is a live over-sending defect found during
   planning and not mentioned in the spike spec. Recommendation: raise it as its own ticket
   immediately rather than absorbing it here, since it is a correctness bug independent of the
   taxonomy question — but it must be resolved *before* Option 4 is designed.

5. **Should the sysadmin journeys be forced to create the mapping at the point of creation
   (Q4/Option 3), and does a blocking CSV error risk stalling a reference-data upload the service
   needs to land?** A blocking error is the safest technical answer and the most disruptive
   operational one. Needs the service owner's preference between blocking error, warning, and
   post-upload report.
