# #1220: List type not shown in subscription if jurisdictions in location reference data and list lookup table unmatched

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** Post-Migration
**Created:** 2026-10-22T15:14:41Z
**Updated:** 2026-10-22T15:51:58Z

## Description

**PROBLEM STATEMENT**
Currently if the jurisdiction on the location reference data does not match up with the jurisdiction on the list lookup table in the frontend code, the user will not receive any subscription email when they subscribe to that court.


**AS A** Service
**I WANT** to review the code
**SO THAT** i can identify a suitable solution to resolve this issue 


**ACCEPTANCE CRITERIA** 
The code is reviewed to check if there is a way to pull in the jurisdictions from a single source rather than multiple sources to avoid this happening.

## Comments

### Comment by OgechiOkelu on 2026-10-22T15:41:36Z

@spec spike

### Comment by hmctsclaudecode on 2026-10-22T15:47:40Z

# Spike: List type not shown in subscription when location reference data and list lookup jurisdictions are unmatched

**Issue:** #1220

## 1. Problem Statement

A court's subscribable list types are derived indirectly, by joining the court to its sub-jurisdictions and then joining those sub-jurisdictions to list types:

```
location
  └── location_sub_jurisdiction      ← written by CSV reference data upload (keyed on NAME)
        └── sub_jurisdiction
              └── list_types_sub_jurisdictions   ← written by deploy seed (keyed on numeric ID)
                    └── list_types
```

The two sides of that join are populated from **two different sources, using two different keys**:

| Side | Source of truth | Key used | Who writes it |
|------|-----------------|----------|---------------|
| `location_sub_jurisdiction` | `libs/location/src/location-data.ts` **and** the system-admin CSV upload | sub-jurisdiction **name** (CSV) / numeric id (seed) | deploy seed + sysadmin at runtime |
| `list_types_sub_jurisdictions` | `libs/list-types/common/src/list-type-data.ts` (`subJurisdictionIds: number[]`) | numeric **`sub_jurisdiction_id`** | deploy seed + sysadmin "create/edit list type" pages |

Nothing reconciles them. When a court ends up attached only to sub-jurisdictions that no list type references, the join returns an empty set and the subscription journey silently dead-ends:

- `apps/web/src/pages/(verified)/subscription-add-list/index.ts:46` and `apps/web/src/pages/(verified)/subscription-configure-list/index.ts:34` query `prisma.listType.findMany({ where: { subJurisdictions: { some: { subJurisdictionId: { in: subJurisdictionIds } } } } })`. An empty result renders `subscription-add-list/index.njk:38` — a bare paragraph, "No list types are available for the selected courts or tribunals." There is no onward action and no error.
- Even if the user got past that screen, `subscription-confirmation-preview/index.ts:236` filters their selection through `getAllowedListTypeIdsForLocations()` (`libs/subscriptions/src/repository/subscription-list-type-service.ts:34`) and blocks confirmation when the intersection is empty.
- The failure is then compounded on the send side. `findActiveSubscriptionsByLocation()` (`libs/notifications/src/notification/subscription-queries.ts:24`) only returns users with `subscriptionListTypes: { none: {} }`. So any user who has *ever* saved a list-type row is excluded from the location-level email path and depends entirely on `findListTypeSubscribersByListTypeAndLanguage()` matching `listTypeIds has <id>`. A user whose court maps to no list types, or whose saved list types do not include the published one, receives nothing — with no log line indicating a subscriber was skipped for a mapping reason.

This is already reachable with the committed seed data: `sub_jurisdiction_id` 12, "Court of Appeal (Criminal Division)" (`libs/location/src/location-data.ts:364`), is referenced by **no** entry in `listTypeData`. Royal Courts of Justice survives only because it also carries sub-jurisdictions 1, 5, 10 and 11. Any court whose reference data gives it *only* sub-jurisdiction 12 is unsubscribable, and nothing in CI detects that.

The unknown this spike must resolve: **can the sub-jurisdiction taxonomy be consumed from a single source of truth, keyed on a stable value, so this class of mismatch becomes impossible (or at least fails loudly in CI) rather than silently costing a user their subscription emails?**

## 2. Key Questions to Answer

1. **Can `list-type-data.ts` reference sub-jurisdictions by name instead of numeric id?** `ListTypeData.subJurisdictionIds: number[]` (`libs/list-types/common/src/list-type-data.ts:10`) hardcodes ids. Seeded ids 1–30 are explicit (`sub_jurisdiction_id` is `@id` with no `@default(autoincrement())`), so they are stable *as long as the row came from the seed* — but `createJurisdictionRecord()` (`libs/system-admin-pages/src/jurisdiction-management/queries.ts:~75`) assigns `max(id) + 1` for sysadmin-created sub-jurisdictions, so ids 31+ diverge per environment exactly like `ListType.id` does. The repo already mandates name-keying for list types (CLAUDE.md "List Type Implementation"); does the same rule extend cleanly here, and what does `generate-seed-sql.ts` need to emit instead (`SELECT sub_jurisdiction_id FROM sub_jurisdiction WHERE name = …` in place of a literal)?

2. **Which single file should own the sub-jurisdiction taxonomy, and can the other side be derived from it?** `location-data.ts` declares the 4 jurisdictions and 30 sub-jurisdictions; `list-type-data.ts` references them by id without importing them. Can `list-type-data.ts` import the taxonomy from `@hmcts/location/location-data` (or a new shared `libs/list-types/common` export both consume) so a typo or stale id becomes a TypeScript error rather than a silent runtime miss? Check the dependency direction: `libs/location` already imports `@hmcts/list-types-common/list-type-data` in `seed-list-types.ts:4`, so a naive reverse import creates a circular package dependency — where does the shared taxonomy have to live to avoid that?

3. **Is a CI guard test sufficient on its own, and what exactly should it assert?** Candidates: (a) every `subJurisdictionNames` entry in `listTypeData` exists in the taxonomy; (b) every sub-jurisdiction in the taxonomy is referenced by at least one list type — which fails *today* on id 12, "Court of Appeal (Criminal Division)"; (c) every location in `locationData` resolves to ≥1 list type. Is (b) a legitimate permanent invariant, or are there sub-jurisdictions that genuinely should have no publishable list type? If so, (b) needs an explicit allow-list with a stated reason per entry.

4. **How do we close the gap for sub-jurisdictions that arrive at runtime, after the deploy seed has run?** The CSV upload validates that every `SUB_JURISDICTION_NAME` exists (`libs/system-admin-pages/src/reference-data-upload/validation/validation.ts:220-249`) but never checks that the resulting mapping yields any list type. Likewise, a sysadmin can create a sub-jurisdiction via `/jurisdiction-data` and attach courts to it with no list type ever mapped. Should the upload surface a blocking error, a warning, or a post-upload report? Should the "create sub-jurisdiction" and "create/edit list type" journeys force the mapping at the point of creation?

5. **Should the notification path fall back to location-level sending when the list-type mapping is empty?** `findActiveSubscriptionsByLocation()` excludes every user with any `subscriptionListType` row (`subscription-queries.ts:29`). Changing that predicate to "has no list-type row *covering this location*" would mean a mapping gap degrades to receiving the list rather than receiving nothing. What is the duplicate-email risk given `sendListTypePublicationNotifications()` is already passed `result.notifiedUserIds` to exclude (`libs/publication/src/processing/service.ts:665`), and is "send more than the user asked for" acceptable to the service, or worse than silence?

6. **How much drift already exists on STG, and is any of it self-inflicted by the seed?** Two sub-questions:
   - `generate-seed-sql.ts:72` renames any `sub_jurisdiction` row whose `name`/`welsh_name` collides with a seed value to `__realign_<id>`, and only rows whose *id* appears in the seed get their name restored. A sysadmin-created sub-jurisdiction at id 31 that shares a seed name is therefore left permanently named `__realign_31`, after which every CSV referencing that name fails validation. Has this happened?
   - Neither `generateListTypeSubJurisdictionsSql()` (`generate-seed-sql.ts:162`) nor `seedListTypes()` (`libs/location/src/seed-list-types.ts`) ever deletes stale `list_types_sub_jurisdictions` rows — both are `ON CONFLICT DO NOTHING` / `upsert`-only. So a mapping removed from `list-type-data.ts` persists in the database forever, and a sysadmin who removes a mapping via `/edit-list-type` has it silently re-added on the next deploy. Confirm both against STG.

7. **Is the sub-jurisdiction join the right mechanism for this at all?** Sub-jurisdictions exist primarily to drive the court/tribunal search filters (`libs/location/src/filtering/service.ts`). Using the same taxonomy to decide "which lists can this court publish" couples two unrelated concerns. Is there a more direct signal already available — `list_types.allowed_provenance` combined with `location_reference.provenance`, `list_types.location_type`, or simply the list types actually published at that court (`artefact` history)? Quantify how different the answers would be before recommending a rewrite.

## 3. Desired Outcomes

* [ ] A written answer to each of the seven questions in section 2, with file/line evidence
* [ ] A technical recommendation (Go/No-Go) on single-sourcing the sub-jurisdiction taxonomy, naming the chosen option from the shortlist in section 6 and stating what is explicitly rejected and why
* [ ] A query run against STG quantifying the current blast radius, to be included in the report:
  ```sql
  -- Courts that can never be subscribed to: no sub-jurisdiction with any list type
  SELECT l.location_id, l.name
  FROM location l
  WHERE NOT EXISTS (
    SELECT 1
    FROM location_sub_jurisdiction lsj
    JOIN list_types_sub_jurisdictions ltsj
      ON ltsj.sub_jurisdiction_id = lsj.sub_jurisdiction_id
    JOIN list_types lt
      ON lt.id = ltsj.list_type_id AND lt.deleted_at IS NULL
    WHERE lsj.location_id = l.location_id
  )
  ORDER BY l.name;

  -- Sub-jurisdictions with no list type mapped (expect id 12 at minimum)
  SELECT sj.sub_jurisdiction_id, sj.name
  FROM sub_jurisdiction sj
  LEFT JOIN list_types_sub_jurisdictions ltsj
    ON ltsj.sub_jurisdiction_id = sj.sub_jurisdiction_id
  WHERE ltsj.list_type_id IS NULL
  ORDER BY sj.sub_jurisdiction_id;

  -- Orphaned seed artefacts of the realign step, and admin-created ids beyond the seed range
  SELECT sub_jurisdiction_id, name FROM sub_jurisdiction
  WHERE name LIKE '\_\_realign\_%' OR sub_jurisdiction_id > 30;

  -- Users subscribed to a court whose list-type selection cannot match anything published there
  SELECT COUNT(DISTINCT s.user_id)
  FROM subscription s
  JOIN subscription_list_type slt ON slt.user_id = s.user_id
  WHERE s.search_type = 'LOCATION_ID'
    AND NOT EXISTS (
      SELECT 1
      FROM location_sub_jurisdiction lsj
      JOIN list_types_sub_jurisdictions ltsj
        ON ltsj.sub_jurisdiction_id = lsj.sub_jurisdiction_id
      WHERE lsj.location_id = s.search_value::int
        AND ltsj.list_type_id = ANY(slt.list_type_ids)
    );
  ```
  (Table and column names above are the `@@map`/`@map` names from `libs/postgres-prisma/prisma/schema/`, not the Prisma model names. One caveat on the last query: `subscription.search_value` is a string column, so the `::int` cast fails if any `LOCATION_ID` row holds a non-numeric value — add `AND s.search_value ~ '^[0-9]+$'` if it errors.)
* [ ] A CI guard test, committed as the spike's proof of concept, that fails on the mismatch rather than describing it. Smallest credible version: a test in `libs/list-types/common/src/` asserting every sub-jurisdiction reference in `listTypeData` resolves against the taxonomy in `locationData`, plus the reverse coverage check with an explicit, commented allow-list. This is the one deliverable that should land on a branch regardless of which larger option is chosen.
* [ ] Estimated effort for the actual implementation, split per option in section 6, as story points
* [ ] A decision on question 5 (notification fallback) recorded with the service owner, since "send the user a list they did not tick" is a product call, not a technical one

**Out of scope for this spike:** changing the subscription UI, writing the migration, or re-keying `list_types_sub_jurisdictions`. The spike produces the recommendation and the failing guard test; implementation follows as separate tickets.

## 4. Timebox

**Max Hours/Days:** 2 days

**Expiry Date:** 2026-11-07 — if the questions in section 2 are not answered by then, stop, write up whatever is known, and raise the guard test from section 3 on its own. The guard test has standalone value and must not be held hostage to the wider single-source decision.

## 5. Resources & Documentation

**Code to read, in order:**

| File | Why |
|------|-----|
| `libs/list-types/common/src/list-type-data.ts` | The "list lookup table" from the issue title. `subJurisdictionIds: number[]` on every one of the 77 entries |
| `libs/location/src/location-data.ts` | The taxonomy: 4 jurisdictions (lines 276–295), 30 sub-jurisdictions (lines 296–479), and the seeded location → sub-jurisdiction mapping |
| `apps/postgres/prisma/generate-seed-sql.ts` | Deploy-time writer for both sides of the join. `generateRealignSql` (line 72), `generateLocationSubJurisdictionsSql` (line 125), `generateListTypeSubJurisdictionsSql` (line 162) |
| `libs/location/src/seed-list-types.ts` | Local `yarn db:seed` path; resolves `listType.subJurisdictionIds` against `subJurisdiction.findMany()` and throws when a list type resolves to zero sub-jurisdictions (line 36) |
| `libs/subscriptions/src/repository/subscription-list-type-queries.ts` | `getListTypeIdsForLocation()` — the join at the centre of the bug |
| `apps/web/src/pages/(verified)/subscription-add-list/index.ts` | First place the empty result surfaces to the user (line 46) |
| `apps/web/src/pages/(verified)/subscription-configure-list/index.ts` | Same query for the manage-subscription journey (line 34) |
| `apps/web/src/pages/(verified)/subscription-confirmation-preview/index.ts` | Second gate: `getAllowedListTypeIdsForLocations` filter at line 236 |
| `libs/notifications/src/notification/subscription-queries.ts` | `findActiveSubscriptionsByLocation` (line 24) and `findListTypeSubscribersByListTypeAndLanguage` (line 105) — why the user receives no email |
| `libs/notifications/src/notification/notification-service.ts` | `sendListTypePublicationNotifications` (line 654); note there is no location filter on the list-type subscriber query |
| `libs/system-admin-pages/src/reference-data-upload/validation/validation.ts` | Existing sub-jurisdiction name validation (lines 220–249) — the natural home for a new mapping-coverage check |
| `libs/system-admin-pages/src/reference-data-upload/parsers/csv-parser.ts` | CSV contract: `SUB_JURISDICTION_NAME` is a name, there is no jurisdiction column; jurisdiction is derived in `services/enrichment-service.ts` |
| `libs/system-admin-pages/src/jurisdiction-management/queries.ts` | `createJurisdictionRecord` assigns `max(id) + 1`, the source of environment-divergent ids |
| `libs/system-admin-pages/src/list-type/queries.ts` | Sysadmin create/edit list type: writes `list_types_sub_jurisdictions` directly (lines 122, 145, 173) — a third writer |
| `libs/postgres-prisma/prisma/schema/location.prisma` | Schema for `SubJurisdiction`, `ListTypeSubJurisdiction`, `LocationSubJurisdiction`. Note `SubJurisdiction.name` is `@unique`, which is what makes name-keying viable |

**Internal documentation:**

* `CLAUDE.md` → "List Type Implementation" — the existing, enforced precedent that reference data must be keyed on the stable `@unique` name, never an id. The argument for name-keying sub-jurisdictions is the same argument, already accepted for list types.
* `CLAUDE.md` → "List Type Implementation" item 7 — explains why deploy seeding is generated SQL rather than Prisma `upsert`, and why the web app must not seed. Any change to the seed shape must preserve atomic `INSERT … ON CONFLICT`.
* `.claude/rules/backend.md` → "Filter, Sort, and Search at the Database Level" and "Avoid N+1 Queries" — relevant because `getAllowedListTypeIdsForLocations` currently runs one query per location (`subscription-list-type-service.ts:35`), as does `getSubscriptionListTypesByUserId` per list type (line 44). Worth folding into whichever ticket touches this file.
* `.claude/rules/testing.md` → guard-test conventions and the AAA pattern for the proof-of-concept test.
* Precedent for the "generated from TypeScript, reconciled by soft-delete" approach: the `listTypeData` removal reconciliation in `generate-seed-sql.ts` (`generateSoftDeleteReconciliationSql`, line 62) and `seed-list-types.ts`. A reconciliation step for `list_types_sub_jurisdictions` would follow the same shape.

**External documentation:**

* [GOV.UK Design System — Problem with the service pages](https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/) — if the chosen option keeps the possibility of a zero-list-type court, the current bare paragraph is not an adequate dead-end and needs replacing.
* [GOV.UK Design System — Notification banner](https://design-system.service.gov.uk/components/notification-banner/) — candidate component for surfacing a post-upload reference-data warning to the sysadmin.
* [GOV.UK Design System — Error summary](https://design-system.service.gov.uk/components/error-summary/) — the CSV upload page already uses this; a new mapping-coverage error slots in alongside the existing sub-jurisdiction and region errors.

## 6. Final Report (To be filled by Dev)

### Desk review completed when this spec was written

The code review the acceptance criteria asks for has been started. Findings below are from reading the code only — **nothing here has been verified against the STG database**, which is the first task of the spike.

**Confirmed by reading the code:**

1. There are **three writers** to `list_types_sub_jurisdictions` (deploy seed, local `yarn db:seed`, sysadmin create/edit list type) and **two writers** to `location_sub_jurisdiction` (deploy seed, CSV upload). None of the five reconciles against the others.
2. The two sides of the join use **different keys**: `location_sub_jurisdiction` is populated from names at runtime (CSV), `list_types_sub_jurisdictions` from hardcoded numeric ids at deploy. `sub_jurisdiction.name` is `@unique`, so name-keying is available and is the pattern CLAUDE.md already mandates for list types.
3. **The mismatch exists in committed data today.** Sub-jurisdiction 12, "Court of Appeal (Criminal Division)", is referenced by no `listTypeData` entry. It is currently masked only because its one location also carries four other sub-jurisdictions.
4. **Neither seed path removes stale mappings.** `generateListTypeSubJurisdictionsSql` emits `ON CONFLICT … DO NOTHING` and `seedListTypes` only upserts. A mapping deleted from `list-type-data.ts` persists indefinitely, and a sysadmin edit that removes a mapping is silently reverted on the next deploy.
5. **The seed can orphan admin-created rows.** `generateRealignSql` renames any `sub_jurisdiction` whose name collides with a seed name to `__realign_<id>` and restores only ids present in the seed, so an admin-created row sharing a seed name is left permanently renamed — after which every CSV referencing that name fails validation.
6. **The failure is silent at every layer.** The CSV upload validates that sub-jurisdiction names exist but not that they yield any list type. The subscription page renders an unactionable paragraph. The notification path logs nothing when a subscriber is skipped for a mapping reason.
7. **A user with any list-type row loses the location-level fallback entirely**, because `findActiveSubscriptionsByLocation` filters on `subscriptionListTypes: { none: {} }`. This is what turns a data-mapping gap into zero emails rather than degraded emails.

### Options shortlist for the recommendation

Assessed on reading alone; the spike must confirm feasibility and size each one.

**Option 1 — Re-key `list-type-data.ts` on sub-jurisdiction name.** Replace `subJurisdictionIds: number[]` with `subJurisdictionNames: string[]`; `generate-seed-sql.ts` resolves each name with a `SELECT … WHERE name = …` subquery, exactly as `generateListTypeSubJurisdictionsSql` already does for `list_types.name`. Removes the environment-divergence class of failure and makes the data readable. Does **not** on its own close the coverage gap — a correctly spelled name with no list type still yields nothing. Touches 77 entries plus two seed paths plus `seed-list-types.ts`.

**Option 2 — Single-source the taxonomy and add a CI guard.** Option 1, plus `listTypeData` and `locationData` both importing one shared sub-jurisdiction list so a bad name is a compile error, plus the coverage guard test from section 3. Requires resolving the package dependency direction (question 2) — `libs/location` already depends on `@hmcts/list-types-common`, so the shared taxonomy cannot simply live in `libs/location`. **This is the option that answers the acceptance criteria as written** and is the expected recommendation unless the spike finds a blocker.

**Option 3 — Validate coverage at the point of data entry.** Extend `validation.ts` so the CSV upload reports when an uploaded location would end up with no list types, and make the sysadmin "create sub-jurisdiction" and "create/edit list type" journeys surface the same gap. Complements options 1 and 2; does not replace them, since it cannot fix data already in the database.

**Option 4 — Degrade instead of going silent on the send side.** Change `findActiveSubscriptionsByLocation`'s predicate from "user has no list-type rows at all" to "user has no list-type row covering this location". A mapping gap then means the user receives the list rather than nothing; `sendListTypePublicationNotifications` already receives `notifiedUserIds` to deduplicate. Cheap and high-value as a safety net, but it changes what users receive, so it needs the service owner's agreement (question 5), and the fix must not be *only* this — masking the data problem without fixing it is worse than the current state.

**Option 5 — Replace the sub-jurisdiction join (not recommended on current evidence).** Derive subscribable list types from `allowed_provenance` × `location_reference.provenance`, from `list_types.location_type`, or from publication history. Removes the mismatch by removing the join, but it is a rewrite of the subscription journey's data model and should only be considered if the spike shows the sub-jurisdiction taxonomy cannot be made reliable.

### If a zero-list-type court remains possible, the dead-end copy must change

Only needed if the recommendation leaves the empty state reachable. The current copy (`apps/web/src/pages/(verified)/subscription-add-list/en.ts`, `noListTypes`) states the problem and offers nothing. Replacement, to be added to both locale files alongside the existing keys:

```typescript
// apps/web/src/pages/(verified)/subscription-add-list/en.ts
noListTypesHeading: "You cannot set up a list subscription for these courts yet",
noListTypesBody:
  "We do not currently publish any lists for the courts and tribunals you selected. You will not receive any emails for them.",
noListTypesAction: "Choose different courts or tribunals",
```

```typescript
// apps/web/src/pages/(verified)/subscription-add-list/cy.ts
noListTypesHeading: [WELSH TRANSLATION REQUIRED: "You cannot set up a list subscription for these courts yet"],
noListTypesBody: [WELSH TRANSLATION REQUIRED: "We do not currently publish any lists for the courts and tribunals you selected. You will not receive any emails for them."],
noListTypesAction: [WELSH TRANSLATION REQUIRED: "Choose different courts or tribunals"],
```

`noListTypesAction` links back to `/location-name-search`. Replace the bare `<p class="govuk-body">{{ noListTypes }}</p>` at `index.njk:38` with these plus the link, so the page has an onward route; drop the now-unused `noListTypes` key from both locale files.

### Dev's conclusion

[Recommendation, chosen option, and story-point estimate per option — to be completed at the end of the timebox]

**STG verification results:**

| Query (section 3) | Result | Notes |
|---|---|---|
| Courts with no subscribable list type | | |
| Sub-jurisdictions with no list type | | |
| `__realign_*` rows / ids > 30 | | |
| Affected subscribed users | | |

**Follow-up tickets raised:**

[List issue numbers and titles]

### Comment by OgechiOkelu on 2026-10-22T15:51:58Z

@plan

