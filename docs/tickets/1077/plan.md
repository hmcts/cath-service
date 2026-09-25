# Technical Plan — #1077 List reconciliation

## Status of the evidence

Every number and claim below was re-derived from `master` (`6b05658`) and from a fresh fetch of the
reference enum [`pip-data-models` `ListType.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java).
The parsed snapshot is committed at `docs/tickets/1077/reference-list-types.json` (name, provenances,
`isDeprecatedUpstream`) so the parity test and any reviewer can check the same source.

Counts on `master`:

| | Count |
|---|---|
| Reference enum entries | **102** |
| `listTypeData` entries | **77** |
| Exact name matches | 58 |
| Name divergences (same list, different name) | **19** |
| Absent from CaTH | **25** |
| Reference entries marked `isDeprecated = true` upstream | 6 |

`58 + 19 = 77` ✅ and `58 + 19 + 25 = 102` ✅.

---

## 1. Corrections to the ticket description — read this first

Five statements in the acceptance criteria do not hold against `master`. The plan below is built on
the verified state, not the description. These need a decision before implementation starts
(see **CLARIFICATIONS NEEDED**).

### 1.1 Three of the list types described as "already exist in this system" do not exist

The ticket says the naming "only needs to be reconciled" for these. There is nothing to reconcile —
the names are absent from `libs/list-types/common/src/list-type-data.ts` and there is no
implementation anywhere in the repo:

| Ticket claim | Verified state on `master` |
|---|---|
| `CROWN_DAILY_PDDA_LIST` implemented in #436 | **Absent.** We have `CROWN_DAILY_LIST` (`libs/list-types/crown-daily-list`). No `*_PDDA_LIST` name exists anywhere; `grep -r PDDA` returns only reference-data-upload and blob-ingestion provenance strings. |
| `CROWN_FIRM_PDDA_LIST` implemented in #436 | **Absent.** We have `CROWN_FIRM_LIST`. |
| `CROWN_WARNED_PDDA_LIST` implemented in #436 | **Absent.** We have `CROWN_WARNED_LIST`. |
| `SSCS_DAILY_LIST` implemented in #431 | **Absent.** #431 delivered the *seven regional* non-strategic lists (`SSCS_LONDON_DAILY_HEARING_LIST` … `SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST`). All seven are exact matches in the reference enum, which carries `SSCS_DAILY_LIST` **in addition to** them. It is a separate list type, genuinely absent. |
| `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` implemented in #798 (as `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`) | **Absent.** `grep -ri interim_applications` over `libs/`, `apps/`, `e2e-tests/` returns nothing. No list type by either name. |

The `CROWN_*_LIST` ↔ `CROWN_*_PDDA_LIST` relationship is the interesting one: the reference enum
carries **both**, with our three names marked `isDeprecated = true` upstream and superseded by the
PDDA variants. So this is not a rename — it is either (a) three renames that also drop the
deprecated names, or (b) three new list types. Product decision, blocking. See Q1.

### 1.2 The out-of-scope list of 16 mixes two different situations

Fourteen of the sixteen names are in the 25-absent set, so "will not need to be added" resolves them
cleanly. Two are **already in CaTH and matched exactly in the reference enum today**:

- `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`
- `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`

When #659 removes them from the shared model they become CaTH-only entries. The parity test must
therefore support a "pending upstream removal" annotation, not just a "known gap" annotation, or CI
will go red the day #659 merges. See Q4.

### 1.3 `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` is missing from every list in the ticket

The reference enum carries **two** TCC entries: `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST`
(in the out-of-scope 16) and a non-KB `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` that the
ticket never mentions and that CaTH does not have. This is the "24 vs 25" discrepancy. See Q3.

### 1.4 Two acceptance criteria are already owned by open PR #1060

- "The reason why the identified list type has an entirely different provenance is investigated and
  resolved" → `PHT_WEEKLY_HEARING_LIST` `MANUAL_UPLOAD` → `CFT_IDAM`.
- "`provenance` is typed as a bare string, so the delimiter is invisible to the type system" →
  `ListTypeData.provenance: string[]` plus the `allowed_provenance` text-array column change that
  @KianKwa asked for on #698.

Both are the scope of **#698 / PR #1060 (`feature-698`, OPEN)**. On `master` today `provenance` is
still `string` (`list-type-data.ts:5`) and `allowed_provenance` is still a delimited column, so
neither has landed. Duplicating them here would produce a guaranteed conflict in
`list-type-data.ts` — the one file this ticket rewrites 19 times over.

**Recommendation: #1077 depends on #1060 and does not re-implement it.** Rebase this work on
`feature-698` once it merges, then verify both criteria rather than re-doing them. See Q2.

### 1.5 The four "missing list types … implemented in #514/#790/#596/#771" are present

Verified — all four exist in `list-type-data.ts` and all four issues are closed:

`MAGISTRATES_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_ADULT_COURT_LIST_FUTURE`,
`MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`
(plus `MAGISTRATES_PUBLIC_LIST` from #596 and `MAGISTRATES_STANDARD_LIST` from #771).

This criterion is satisfied by evidence, not by code. Their *provenance* gap (`PI_AAD`) is #1060's.

---

## 2. Technical approach

The deliverable is **the 19 renames**, done as a keyed in-place rename, plus a **parity test** that
locks the alignment in place and records every remaining divergence with a reason, plus **three
follow-up tickets** for the genuinely-absent lists CaTH needs.

### 2.1 Why a migration is mandatory, and what breaks without one

`list_types.name` is the seed's conflict key
(`generate-seed-sql.ts:136` — `ON CONFLICT (name) DO UPDATE`), and removal is reconciled by
soft-delete (`generateSoftDeleteReconciliationSql`, `generate-seed-sql.ts:151`).

So editing `name` in `list-type-data.ts` **alone** would, on every environment:

1. `INSERT` a brand-new `list_types` row at a **new autoincrement `id`**;
2. `UPDATE list_types SET deleted_at = NOW()` on the old row, because its name is no longer in
   `listTypeData`;
3. leave every `artefact.list_type_id` pointing at the soft-deleted row — **published lists vanish
   from the UI**;
4. leave `subscription_list_type.list_type_ids Int[]` holding the old id — **subscribers silently
   stop receiving that list**, with no error anywhere;
5. same for `third_party_user_list_type.list_type_id`, `legacy_third_party_push_log.list_type_id`
   and `list_search_config.list_type_id`.

The fix is an in-place `UPDATE list_types SET name = …`. Because every consumer references
`list_types.id` (an `Int` FK) and never the name — verified across all seven Prisma schema files —
an in-place rename preserves artefacts, subscriptions, third-party wiring and search config with
zero data migration beyond the string itself.

Ordering is already correct: `apps/postgres/start.sh` runs `prisma migrate deploy` **before**
generating and applying the seed, so the migration renames the row and the seed then matches it on
`ON CONFLICT (name)` and updates friendly names in place.

### 2.2 The 19 renames

All 19 agree on `CFT_IDAM` in the reference enum (verified), so no provenance changes.

| # | Current name | Reference name |
|---|---|---|
| 1 | `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` |
| 2 | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `CST_WEEKLY_HEARING_LIST` |
| 3 | `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | `FTT_LR_WEEKLY_HEARING_LIST` |
| 4 | `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST` | `RPT_EASTERN_WEEKLY_HEARING_LIST` |
| 5 | `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` | `RPT_LONDON_WEEKLY_HEARING_LIST` |
| 6 | `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST` | `RPT_MIDLANDS_WEEKLY_HEARING_LIST` |
| 7 | `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST` | `RPT_NORTHERN_WEEKLY_HEARING_LIST` |
| 8 | `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST` | `RPT_SOUTHERN_WEEKLY_HEARING_LIST` |
| 9 | `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | `FTT_TAX_WEEKLY_HEARING_LIST` |
| 10 | `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | `MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST` |
| 11 | `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST` | `UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST` |
| 12 | `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST` | `UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST` |
| 13 | `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` | `UT_IAC_JR_LEEDS_DAILY_HEARING_LIST` |
| 14 | `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `UT_IAC_JR_LONDON_DAILY_HEARING_LIST` |
| 15 | `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST` | `UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST` |
| 16 | `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST` |
| 17 | `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `UT_AAC_DAILY_HEARING_LIST` |
| 18 | `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `UT_LC_DAILY_HEARING_LIST` |
| 19 | `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `UT_T_AND_CC_DAILY_HEARING_LIST` |

### 2.3 What stays unchanged — deliberately

- **`urlPath` / public URLs.** `list_types.url` drives the list-type page routes under
  `apps/web/src/pages/(list-types)/`. The reference enum says nothing about URLs, and changing them
  breaks bookmarks, existing links and email notifications already sent. **Do not touch `urlPath`.**
- **Directory and package names.** `libs/list-types/care-standards-tribunal-weekly-hearing-list/`,
  `libs/list-types/upper-tribunal-lands-chamber-daily-hearing-list/` and the rest keep their paths.
  Renaming 19 packages would churn `package.json` names, root `tsconfig.json` paths, `app.ts`
  imports and `vite.config.ts` for zero functional gain. The list type **name** is the contract; the
  directory is an internal detail.
- **`englishFriendlyName` / `welshFriendlyName` / `shortenedFriendlyName`.** Display strings, not
  keys. Unchanged.

### 2.4 Reference sites each rename must update

Verified by grepping all 19 names. Every name appears in a consistent subset of six categories:

| Category | Location | Notes |
|---|---|---|
| Reference data | `libs/list-types/common/src/list-type-data.ts` | the `name:` field — all 19 |
| PDF registry | `libs/publication/src/processing/service.ts` | `PDF_GENERATOR_REGISTRY` key + list-title maps — all 19 |
| Notifications | `libs/notifications/src/notification/notification-service.ts` | config object keyed by name — all 19 |
| Excel converters | `libs/list-types/<pkg>/src/conversion/<x>-config.ts` | `registerConverterByName("…")` — all 19 |
| Multi-list page controllers | `apps/web/src/pages/(list-types)/<page>/index.ts` | `LIST_TYPE_CONFIG` keys — #1, #4–#8, #10 |
| Locale maps keyed by list type name | `libs/list-types/<pkg>/src/locales/{en,cy}.ts` | e.g. `rptRegionalEmail.FTT_RPT_EASTERN_…`, admin-court and RCJ locale keys — #1, #4–#8, #10 |
| Tests / fixtures | `*.test.ts`, `*.njk.test.ts` | co-located unit, template, PDF and renderer tests |
| E2E | `e2e-tests/utils/seed-list-types.ts`, `e2e-tests/tests/summary-of-publications.spec.ts` | #2 only |
| Registry test | `libs/list-types/common/src/conversion/non-strategic-list-registry.test.ts` | #2 only |
| Admin upload test | `apps/web/src/pages/(admin)/non-strategic-upload/index.test.ts` | #2 only |

Per-name file counts (excluding `node_modules`, `libs/postgres-prisma/generated/`, `docs/`):
12, 9, 5, 11, 9, 9, 9, 10, 5, 10, 7, 7, 8, 9, 7, 5, 5, 5, 5.

`requirements/seed.sql` contains **none** of the 19 names — no change needed there.

### 2.5 Outward-facing consequence: `x-list-type`

`libs/legacy-third-party-fulfilment/src/push/headers.ts:33` sends the list type **name** as the
`x-list-type` header to third parties (Courtel and legacy consumers). After the rename, e.g. Courtel
receives `CST_WEEKLY_HEARING_LIST` where it previously received
`CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST`.

Aligning to the shared model is the whole point of this ticket, and #1026 requires `x-list-type` to
match the incumbent's enum — so this change is *desirable*. But it is a contract change visible
outside CaTH on 19 list types simultaneously. It needs announcing to third-party consumers before
release, not after. Flagged, not solved by code. See Q5.

---

## 3. Implementation details

**TEMPLATE SOURCE: n/a** — this ticket renames reference-data keys and adds a parity test. No new
rendered page or list-type view is created.

### 3.1 Migration

`apps/postgres/prisma/migrations/<timestamp>_rename_list_types_to_shared_model/migration.sql`

```sql
-- Rename list_types.name in place to match pip-data-models ListType.java.
-- In place, not insert-and-soft-delete: artefact, subscription_list_type,
-- third_party_user_list_type, legacy_third_party_push_log and list_search_config all
-- reference list_types.id, so renaming the row preserves every relation. Creating a new
-- row instead would orphan published artefacts and silently break subscriptions.
-- Guarded on the old name so re-running is a no-op.
UPDATE list_types SET name = 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'
  WHERE name = 'BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST';
-- … 18 more
```

Written by hand as a migration — this is **not** a seed file, so it does not conflict with
CLAUDE.md's "do not hand-write `.sql` seed files" rule. `list-type-data.ts` remains the single source
of truth for the seed; the migration only realigns pre-existing rows so the seed can match them.

Note the migration is a plain `UPDATE`, so on an environment where a row with the *new* name somehow
already exists it would violate `list_types_name_key`. Guarding each statement with
`AND NOT EXISTS (SELECT 1 FROM list_types WHERE name = '<new>')` makes it safe to re-run and safe on
a partially-migrated environment. Prefer the guard.

No Prisma schema change is needed — the column type and constraints are untouched.

### 3.2 Code changes

Mechanical rename of the string literal at every site in §2.4. The literals are the *only* thing
that changes; no logic, no signatures, no file moves. A single careful pass per name, driven from
the table in §2.2, with `grep` used to prove zero remaining occurrences of each old name.

Where the old name is also an *object key* in a locale file (`rptRegionalEmail`,
the administrative-court and RCJ locale maps), rename the key in **both** `en.ts` and `cy.ts` so the
locale-key parity assertion keeps passing.

### 3.3 Parity test — the durable part

New: `libs/list-types/common/src/list-type-parity.test.ts`

Asserts, against the committed snapshot `docs/tickets/1077/reference-list-types.json`:

1. every name in `listTypeData` exists in the reference enum, **or** appears in an explicit
   `CATH_ONLY` map with a reason;
2. every reference name exists in `listTypeData`, **or** appears in an explicit `KNOWN_GAPS` map with
   a reason and a tracking issue;
3. for every matched name, the declared provenance set equals the reference's, **or** appears in an
   explicit `PROVENANCE_DIVERGENCES` map with a reason.

The three annotation maps are the durable record the ticket asks for ("the divergence is explicitly
recorded with a reason"). After this ticket the expected content is:

- `CATH_ONLY` — empty, **unless** the PDDA decision (Q1) keeps `CROWN_DAILY_LIST`,
  `CROWN_FIRM_LIST`, `CROWN_WARNED_LIST`, plus the two pending-#659 entries from §1.2.
- `KNOWN_GAPS` — the 25 absent names, each tagged: `out-of-scope(#659)` ×14,
  `deprecated-upstream, superseded by <ours>` ×3, `follow-up ticket #<n>` for the rest.
- `PROVENANCE_DIVERGENCES` — owned by #1060; empty here if #1060 lands first.

If #1060 has not merged, the provenance half of the test must be written against `string[]` and
land with the rebase, not against the current delimited `string`.

The snapshot is committed rather than fetched at test time: a test that hits GitHub is a test that
fails when GitHub is slow. Refreshing the snapshot becomes a deliberate act with a visible diff,
which is exactly the review signal you want when the shared model moves.

### 3.4 Follow-up tickets to raise (not implement here)

Adding a list type is schema + validator + validator tests + renderer + template + PDF generator +
Excel converter + page + E2E per CLAUDE.md. Out of scope here; raise one ticket each:

| List type | Provenance | Why it is needed |
|---|---|---|
| `SJP_PRESS_REGISTER` | `PI_AAD` | Confirmed genuinely absent. Not deprecated upstream. |
| `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` | `CFT_IDAM` | Confirmed genuinely absent. Child of `SSCS_DAILY_LIST` upstream. |
| `SSCS_DAILY_LIST` | `CFT_IDAM` | Contrary to the ticket, absent. Prerequisite for the additional-hearings list. |

`CIC_DAILY_HEARING_LIST` — the ticket asks us to confirm whether it is genuinely missing. **It is
absent, but it is `isDeprecated = true` upstream and superseded by `CIC_WEEKLY_HEARING_LIST`, which
CaTH already has (#434).** Recommendation: do **not** raise a ticket; record it in `KNOWN_GAPS` as
deprecated-upstream. Same reasoning retires `CARE_STANDARDS_LIST` (superseded by our
`CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` → `CST_WEEKLY_HEARING_LIST`) and `PRIMARY_HEALTH_LIST`
(superseded by our `PHT_WEEKLY_HEARING_LIST`) — which is what the ticket already asserts for those
two, and this confirms it from the enum's own deprecation flag rather than by inspection.

---

## 4. Error handling & edge cases

| Case | Handling |
|---|---|
| Migration re-run, or run on an environment already renamed | `UPDATE … WHERE name = '<old>' AND NOT EXISTS (… '<new>')` — no-op, no unique violation. |
| A rename is made in `list-type-data.ts` but the migration is forgotten | Seed inserts a new row and soft-deletes the old one; artefacts orphan and subscriptions go silent, with no error. **Mitigation:** the migration and the data change land in the same commit, and the plan reviewer checks both are present. |
| Local developer DB already seeded with old names | `yarn db:migrate` then `yarn db:seed`. Migration runs first locally too. Call this out in the PR description. |
| In-flight artefacts uploaded under an old `x-list-type` value during deploy | The migration and app deploy are not atomic. Worst case an upload in the deploy window is rejected for an unknown list type and must be retried. Acceptable; note it in the release notes. |
| Locale `en`/`cy` key drift when renaming a locale map key | Existing locale-key-parity assertions (`Object.keys(en).sort()` vs `cy`) catch a one-sided rename. Keep those tests. |
| Reference enum moves after this ticket | Parity test fails against the committed snapshot with a readable diff, which is the intended signal. |
| `TEST_*` / `E2E_*` fixtures | Exempt from soft-delete reconciliation already; the parity test must exclude them too or it will report them as CaTH-only. |

---

## 5. Acceptance criteria mapping

| Criterion | How it is satisfied | Verification |
|---|---|---|
| Four missing list types were implemented in #514/#790/#596/#771 | **Already true.** All four `MAGISTRATES_*` entries present, all four issues closed. No code change. | Evidence recorded in §1.5; parity test shows all four matched. |
| The list type with an entirely different provenance is investigated and resolved | `PHT_WEEKLY_HEARING_LIST` `MANUAL_UPLOAD` → `CFT_IDAM`. **Owned by #698 / PR #1060.** | Verify after rebase; parity test asserts it. Blocking on Q2. |
| `provenance` typed as a bare string is investigated and resolved | `ListTypeData.provenance: string[]` + `allowed_provenance` as a text array. **Owned by #698 / PR #1060.** | Verify after rebase. Blocking on Q2. |
| The 19 list types under different names are unified to the shared-model names; no provenance change | §2.2 renames + §3.1 migration + §3.2 code pass. Provenance untouched (all 19 are `CFT_IDAM` both sides — verified). | Parity test rule 1 and 2 pass with no entry for any of the 19. |
| The 16 lists being removed from the shared model are ignored, not added | 14 recorded in `KNOWN_GAPS` as `out-of-scope(#659)`. The other 2 already exist in CaTH and need a *pending-upstream-removal* annotation instead — see §1.2 / Q4. | Parity test annotations reviewed. |
| Number of list types matches the shared model, allowing for the agreed removals | After the renames: 77 ours vs 102 reference. Every one of the 25 differences is explicitly accounted for — 14 out-of-scope, 3 deprecated-upstream, 3 new tickets, 5 needing a decision (3 PDDA + interim applications + non-KB TCC). | Parity test enumerates all 25; the arithmetic is asserted, so the count cannot drift silently. |
| Naming reconciled for the lists that already exist | True for `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` (#2) and `PHT_WEEKLY_HEARING_LIST` (already matches). **Not true for the 3 PDDA lists, `SSCS_DAILY_LIST` and interim applications** — see §1.1 / Q1. | Blocking on Q1. |
| Confirm whether `SJP_PRESS_REGISTER`, `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS`, `CIC_DAILY_HEARING_LIST` are genuinely missing; raise tickets if so | Confirmed: first two genuinely missing → raise tickets. `CIC_DAILY_HEARING_LIST` absent **but deprecated upstream** and superseded by our `CIC_WEEKLY_HEARING_LIST` → recommend no ticket. `SSCS_DAILY_LIST` must be added to this group. | Comment on #1077 with the finding; issues raised. |
| `CROWN_WARNED_PDDA_LIST` vs #957 — naming in this system is current | **Cannot be confirmed as stated.** Neither `CROWN_WARNED_PDDA_LIST` nor `CROWN_ADVANCED_PDDA_LIST` exists in CaTH; we have `CROWN_WARNED_LIST`, deprecated upstream. `CROWN_ADVANCED_PDDA_LIST` appears nowhere in the reference enum. | Blocking on Q1. |

---

## CLARIFICATIONS NEEDED

### Q1 — The Crown PDDA lists, `SSCS_DAILY_LIST` and interim applications do not exist. What did you intend? **(blocking)**

The ticket lists five list types as "already exist in this system and so the naming only needs to be
reconciled". None of the five is in `list-type-data.ts` on `master`, and there is no implementation
of any of them anywhere in the repo (§1.1). So either the referenced work landed under a different
name than the ticket believes, or it has not landed.

The most likely reading is that CaTH's `CROWN_DAILY_LIST` / `CROWN_FIRM_LIST` / `CROWN_WARNED_LIST`
*are* our PDDA implementations from #436, just registered under the pre-PDDA names. If so this is
three more renames (21 total, taking us to 80 entries). But note the reference enum keeps **both**
the plain and the PDDA names, with ours marked deprecated — so renaming ours means CaTH stops
offering the deprecated names entirely, which the shared model still lists.

Please confirm, per list:

1. `CROWN_DAILY_LIST` → rename to `CROWN_DAILY_PDDA_LIST`, or keep both?
2. `CROWN_FIRM_LIST` → rename to `CROWN_FIRM_PDDA_LIST`, or keep both?
3. `CROWN_WARNED_LIST` → rename to `CROWN_WARNED_PDDA_LIST`, or keep both? And how does that sit
   with **#957**, which renames our Crown Warned list to `CROWN_ADVANCED_PDDA_LIST` — a name that
   exists nowhere in the reference enum? These two tickets currently want the same row renamed to
   two different things. Which name will Crime actually send in `x-list-type`?
4. `SSCS_DAILY_LIST` — genuinely absent (the seven regional lists from #431 are a different thing,
   and the reference enum carries all eight). New ticket, or out of scope?
5. `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` — genuinely absent despite #798 being closed. It is a
   ChD list; should it join the #659 out-of-scope group, or does CaTH need it?

### Q2 — Confirm #1077 depends on #1060 and does not duplicate it **(blocking)**

Two of this ticket's criteria (PHT provenance; `provenance` as `string[]` / text-array column) are
the scope of #698, in open PR #1060, and neither has reached `master`. Both tickets rewrite
`list-type-data.ts` — #1060 changes the `provenance` field on all 77 entries, #1077 changes `name` on
19 — so doing them in parallel guarantees a conflict in exactly the file that matters most.

Proposal: merge #1060 first, rebase #1077 on it, and treat those two criteria as *verify* rather than
*implement*. Confirm, or tell me to absorb #1060's scope into this branch instead.

### Q3 — `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` (no `_KB_`) — in or out?

The reference enum has two TCC entries. The out-of-scope 16 names only the `_KB_` one. The non-KB
variant is absent from CaTH and unmentioned anywhere in the ticket. Is it also being removed from the
shared model under #659 (so: ignore), or does CaTH need it (so: raise a ticket)?

### Q4 — `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` already exist here

Both are in the out-of-scope 16 *and* already in CaTH, matching the reference enum exactly today.
When #659 removes them upstream they become CaTH-only. Do we (a) leave them and annotate the parity
test as "pending upstream removal", or (b) also remove them from CaTH, which soft-deletes the rows
and hides any already-published artefacts? Recommendation: (a) for now; removal is its own ticket
with its own data question.

### Q5 — Who tells third parties that `x-list-type` changes for 19 list types?

`x-list-type` carries the list type name to Courtel and the legacy consumers
(`legacy-third-party-fulfilment/src/push/headers.ts:33`). After this ticket 19 of those values
change on the same release. That is the intended alignment, and #1026 depends on it, but it needs
announcing to consumers before release. Who owns that, and is there a coordinated release date?

### Q6 — Do public list-type URLs stay as they are?

The plan deliberately leaves `urlPath` alone (§2.3), so e.g. the CST list stays at its current URL
under its new name. Confirm that is acceptable, or a second decision and a redirect strategy are
needed.
