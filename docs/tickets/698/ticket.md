# #698: Add/Update provenance for all lists

**State:** open (reopened)
**Assignees:** alao-daniel
**Author:** OgechiOkelu
**Labels:** type:story, epic:public-journey
**Milestone:** System/Local Admin Journey
**Parent:** #837 (4 - System / Local Admin)
**Created:** 2026-06-10T12:57:31Z
**Updated:** 2026-09-22T08:21:18Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to add/update the provenance for all the lists in CaTH, and to align CaTH's list types and their provenances with the shared model in [`pip-data-models` `ListType.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java).

**AS A** Service
**I WANT** each list type to declare every provenance that is allowed to publish it, matching the shared model
**SO THAT** publishers are authorised correctly and the provenance data is up to date

### A list can have more than one provenance

In the shared model, provenance is the second constructor argument and is a **list**:

```java
CROWN_DAILY_LIST(VENUE, List.of(CRIME_IDAM), ...)
MAGISTRATES_PUBLIC_LIST(VENUE, List.of(CRIME_IDAM, PI_AAD), ...)
```

**Nine** reference list types declare more than one provenance, all `CRIME_IDAM` + `PI_AAD`:

| List type | Provenances |
|---|---|
| `MAGISTRATES_PUBLIC_LIST` | `CRIME_IDAM`, `PI_AAD` |
| `MAGISTRATES_STANDARD_LIST` | `CRIME_IDAM`, `PI_AAD` |
| `MAGISTRATES_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM`, `PI_AAD` |
| `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM`, `PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM`, `PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM`, `PI_AAD` |
| `CROWN_DAILY_PDDA_LIST` | `CRIME_IDAM`, `PI_AAD` |
| `CROWN_FIRM_PDDA_LIST` | `CRIME_IDAM`, `PI_AAD` |
| `CROWN_WARNED_PDDA_LIST` | `CRIME_IDAM`, `PI_AAD` |

### What already works — do not rebuild this

Multiple provenances per list type are **already supported end to end**, via a comma-delimited string:

- Storage: `list_types.allowed_provenance` — a single `VARCHAR(50)` column ([`location.prisma:54`](https://github.com/hmcts/cath-service/blob/master/libs/postgres-prisma/prisma/schema/location.prisma#L54)).
- System Admin UI: already models it as `string[]` and persists with `.join(",")` ([`list-type/queries.ts:119`](https://github.com/hmcts/cath-service/blob/master/libs/system-admin-pages/src/list-type/queries.ts#L119)).
- Authorisation: already splits and matches — [`authorisation/service.ts:34`](https://github.com/hmcts/cath-service/blob/master/libs/publication/src/authorisation/service.ts#L34):
  ```ts
  return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
  ```
- `MAGISTRATES_PUBLIC_LIST` already carries `"CRIME_IDAM,PI_AAD"` in `list-type-data.ts` and authorises both provenances correctly today.

So this story is **not** about building multi-provenance support. It is about correcting the data, hardening the representation, and reconciling the list-type set against the shared model.

### What is actually wrong

#### 1. Four list types are missing `PI_AAD`

`libs/list-types/common/src/list-type-data.ts` has `CRIME_IDAM` only, where the shared model has both. A `PI_AAD` publisher is denied access to these four today:

| List type | Ours | Reference |
|---|---|---|
| `MAGISTRATES_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |

#### 2. One list type has an entirely different provenance

| List type | Ours | Reference |
|---|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `MANUAL_UPLOAD` | `CFT_IDAM` |

`MANUAL_UPLOAD` is not a `UserProvenances` value in the shared model. Confirm whether this is deliberate for CaTH or a data error — see open questions.

#### 3. `provenance` is typed as a bare `string`, so the delimiter is invisible to the type system

`ListTypeData.provenance` is `string` ([`list-type-data.ts:5`](https://github.com/hmcts/cath-service/blob/master/libs/list-types/common/src/list-type-data.ts#L5)). Nothing stops `"CRIME_IDAM, PI_AAD"` being written with a space, and because `service.ts:34` splits on `","` **without trimming**, `" PI_AAD"` would never match and the provenance would be silently denied. There is no test or type that catches this.

Change `provenance` to `string[]` in `ListTypeData` and join at the seed boundary, so the delimited form exists only in the database and every list type declares its provenances as a list — mirroring `List.of(...)` in the shared model.

Also note `VARCHAR(50)` has limited headroom: the longest plausible combination (`CRIME_IDAM,PI_AAD,CFT_IDAM,MANUAL_UPLOAD`) is 39 characters. It fits today but a fifth provenance would truncate silently. Consider widening, or moving to a proper array/join table.

### List type reconciliation against the shared model

The shared model declares **101** list types. `list-type-data.ts` declares **77**.

#### A. 19 list types exist in both but under different names

These are naming divergences, not gaps. Each pair needs a decision: rename ours to match the shared model, or keep ours and accept the divergence. **Renaming changes `list_types.name`, which is the stable key** — see open questions.

| Ours | Shared model |
|---|---|
| `BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` | `BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST` |
| `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` | `CST_WEEKLY_HEARING_LIST` |
| `FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST` | `FTT_LR_WEEKLY_HEARING_LIST` |
| `FTT_RPT_EASTERN_WEEKLY_HEARING_LIST` | `RPT_EASTERN_WEEKLY_HEARING_LIST` |
| `FTT_RPT_LONDON_WEEKLY_HEARING_LIST` | `RPT_LONDON_WEEKLY_HEARING_LIST` |
| `FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST` | `RPT_MIDLANDS_WEEKLY_HEARING_LIST` |
| `FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST` | `RPT_NORTHERN_WEEKLY_HEARING_LIST` |
| `FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST` | `RPT_SOUTHERN_WEEKLY_HEARING_LIST` |
| `FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST` | `FTT_TAX_WEEKLY_HEARING_LIST` |
| `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` | `MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST` |
| `UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST` | `UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST` |
| `UTIAC_JR_CARDIFF_DAILY_HEARING_LIST` | `UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST` |
| `UTIAC_JR_LEEDS_DAILY_HEARING_LIST` | `UT_IAC_JR_LEEDS_DAILY_HEARING_LIST` |
| `UTIAC_JR_LONDON_DAILY_HEARING_LIST` | `UT_IAC_JR_LONDON_DAILY_HEARING_LIST` |
| `UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST` | `UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST` |
| `UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST` | `UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST` |
| `UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST` | `UT_AAC_DAILY_HEARING_LIST` |
| `UT_LANDS_CHAMBER_DAILY_HEARING_LIST` | `UT_LC_DAILY_HEARING_LIST` |
| `UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST` | `UT_T_AND_CC_DAILY_HEARING_LIST` |

All 19 pairs agree on provenance (`CFT_IDAM`), so no provenance change is needed for them.

#### B. 24 list types are genuinely absent from this project

| List type | Provenance |
|---|---|
| `ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `BUSINESS_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `CARE_STANDARDS_LIST` | `CFT_IDAM` |
| `CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `CIC_DAILY_HEARING_LIST` | `CFT_IDAM` |
| `COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `COMPETITION_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| **`CROWN_DAILY_PDDA_LIST`** | **`CRIME_IDAM,PI_AAD`** |
| **`CROWN_FIRM_PDDA_LIST`** | **`CRIME_IDAM,PI_AAD`** |
| **`CROWN_WARNED_PDDA_LIST`** | **`CRIME_IDAM,PI_AAD`** |
| `INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `PATENTS_COURT_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `PENSIONS_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `PRIMARY_HEALTH_LIST` | `CFT_IDAM` |
| `PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `REVENUE_LIST_CHD_DAILY_CAUSE_LIST` | `CFT_IDAM` |
| `SJP_PRESS_REGISTER` | `PI_AAD` |
| `SSCS_DAILY_LIST` | `CFT_IDAM` |
| `SSCS_DAILY_LIST_ADDITIONAL_HEARINGS` | `CFT_IDAM` |
| `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST` | `CFT_IDAM` |

Several look like they may be superseded by names we already have (e.g. `CARE_STANDARDS_LIST` alongside `CST_WEEKLY_HEARING_LIST`, and the CHD/KB business-and-property lists against our `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` family). Whether each is genuinely needed in CaTH is a product decision, not a mechanical port — see open questions.

#### C. `CROWN_WARNED_PDDA_LIST` vs #957

The shared model names it **`CROWN_WARNED_PDDA_LIST`**. #957 renames our Crown Warned list to **`CROWN_ADVANCED_PDDA_LIST`**, a name that does not exist in the shared model. Combined with #1026 (which requires `x-list-type` to match the incumbent's enum), a publisher sending `CROWN_WARNED_PDDA_LIST` would be rejected by us. Needs reconciling with Crime before both land.

### ACCEPTANCE CRITERIA

- `ListTypeData.provenance` is `string[]`, and every entry in `list-type-data.ts` declares its provenances as a list.
- The seed joins the list into `list_types.allowed_provenance`; nothing outside the seed handles the delimited form.
- The four `MAGISTRATES_*_ADULT_COURT_LIST_*` types allow both `CRIME_IDAM` and `PI_AAD`.
- Provenance values are validated against a known set; an unrecognised value fails at build or seed time rather than silently denying access.
- Whitespace around the delimiter cannot break matching — either by trimming on read, or by never producing it (preferred, via the array representation).
- A test asserts, for every list type, that its declared provenances match the shared model, or that the divergence is explicitly recorded with a reason.
- The provenance for all lists in CaTH can be added/updated through the System Admin dashboard, for multiple provenances per list.
- Existing publisher authorisation is unchanged for every list type whose provenance set is unchanged.

### Out of Scope

- Adding the 24 absent list types. Each needs its own schema, validation, rendering, PDF and page work per `CLAUDE.md`, so they belong in their own tickets — this story records the gap and corrects provenance for what exists.
- Renaming the 19 divergent list types. `list_types.name` is the stable key used by `PDF_GENERATOR_REGISTRY`, Excel converters and subscriptions, so renames need the in-place migration treatment (see #957) and a decision per list.
- `LocationType` and `Roles`, the shared model's other two constructor arguments. Only provenance is in scope here.

### Open Questions

1. **`PHT_WEEKLY_HEARING_LIST` provenance.** Ours says `MANUAL_UPLOAD`, the shared model says `CFT_IDAM`, and `MANUAL_UPLOAD` is not a `UserProvenances` value. Data error, or a deliberate CaTH-only value? If deliberate, the parity test needs an allowed-divergence list.
2. **Is `MANUAL_UPLOAD` a valid provenance at all?** If it is, the validated set in the AC above must include it and it should be documented as CaTH-specific.
3. **The 19 name divergences.** Align to the shared model, or keep ours? Aligning is the safer long-term position given #1026 requires `x-list-type` to match the incumbent's enum, but each rename is a keyed migration.
4. **`CROWN_WARNED_PDDA_LIST` vs `CROWN_ADVANCED_PDDA_LIST`** — see section C. Which name will Crime actually send?
5. **Which of the 24 absent list types does CaTH need?** Some may be legacy or already covered by a differently-named list we have.
6. **Should `allowed_provenance` stay a delimited `VARCHAR(50)`?** A `String[]` column or a join table would remove the delimiter class of bug entirely. Widening the column is the minimum.

### References

- Shared model: [`pip-data-models` `ListType.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java) — provenance is the second constructor argument, `List.of(...)`
- Ours: `libs/list-types/common/src/list-type-data.ts` (single source of truth per `CLAUDE.md`)
- Authorisation check: `libs/publication/src/authorisation/service.ts:34`
- System Admin persistence: `libs/system-admin-pages/src/list-type/queries.ts:119`
- Related: #1026 (`x-list-type` must match the incumbent's enum), #957 (Crown Warned → Crown Advance rename)

## Comments

### Comment by junaidiqbalmoj on 2026-09-11T15:00:18Z
This ticket is dependent on https://github.com/hmcts/cath-service/issues/1029

### Comment by junaidiqbalmoj on 2026-09-11T16:09:33Z
@PLAN

### Comment by hmctsclaudecode[bot] on 2026-09-11T16:29:45Z

## Technical plan

Branch: `feature/698-list-type-provenance-parity`
Plan: `docs/tickets/698/plan.md` · Tasks: `docs/tickets/698/tasks.md`

I parsed the reference [`ListType.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java) and diffed it against `list-type-data.ts` rather than taking the tables in the description on trust. The parsed snapshot is committed at `docs/tickets/698/reference-list-types.json`. The description holds up on the substance; three numbers are off, and there is one material fact it misses.

### Corrections to the description

- **The reference declares 102 list types, not 101.**
- **25 list types are absent from CaTH, not 24.** Table B omits `TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST` (`CFT_IDAM`) — the reference carries both that and `TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST`.
- **`MAGISTRATES_STANDARD_LIST` already carries `"CRIME_IDAM,PI_AAD"` too** (`list-type-data.ts:659`), not just `MAGISTRATES_PUBLIC_LIST`. Two entries, not one.

Everything else checks out: the 19 name divergences are correct and all agree on `CFT_IDAM`; there are exactly 5 provenance mismatches (PHT plus the four magistrates adult court lists); 77 = 58 exact name matches + 19 divergences.

### Not in the description: 6 reference entries are `isDeprecated = true`

The 4th positional boolean constructor argument (`ListType.java:39-41, 61-63`) marks six entries deprecated. This cuts two ways:

**We carry three lists that are deprecated upstream** — `CROWN_DAILY_LIST`, `CROWN_FIRM_LIST`, `CROWN_WARNED_LIST`, all superseded upstream by their `*_PDDA_LIST` equivalents. This is directly material to section C and Q4.

**Three of the 25 absent lists are deprecated upstream and already superseded by names we hold**, so they should not be ported at all:

| Absent, deprecated upstream | Superseded by, which we already have |
|---|---|
| `CARE_STANDARDS_LIST` | `CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST` |
| `PRIMARY_HEALTH_LIST` | `PHT_WEEKLY_HEARING_LIST` |
| `CIC_DAILY_HEARING_LIST` | `CIC_WEEKLY_HEARING_LIST` |

**So the real gap is 22, not 24.** That partly answers Q5 without a product conversation.

---

## Questions needing an answer before implementation

### 1. `PHT_WEEKLY_HEARING_LIST` — confirm changing `MANUAL_UPLOAD` → `CFT_IDAM` (Q1/Q2) — **blocking**

Recommendation: it is a data error, change it. But it widens access, so it needs sign-off.

`MANUAL_UPLOAD` is not a `UserProvenances` value — it *is* a value of the unrelated **artefact** provenance enum in `libs/publication/src/provenance.ts` (`MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA`), which is almost certainly where it was copied from.

More decisively: **no login path in CaTH ever sets `user.provenance` to `MANUAL_UPLOAD`.** The four writers are `login/return/index.ts:216` → `PI_AAD`, `cft-login/return/index.ts:51` → `CFT_IDAM`, `crime-login/return/index.ts:61` → `CRIME_IDAM`, `passport-config.ts:21` → `SSO`. So `allowed_provenance = 'MANUAL_UPLOAD'` currently means **nobody can publish PHT through the authorised route**. Changing it to `CFT_IDAM` turns that on for CFT publishers, including at `Classified` sensitivity — `defaultSensitivity` only pre-selects a radio in the upload form, it does not constrain what the admin picks.

Also worth confirming in the same breath: is PHT's `defaultSensitivity: null` intentional? I am not changing it either way in this ticket.

**Q2 follows from this:** `MANUAL_UPLOAD` should *not* be a valid allowed-provenance value. The System Admin UI has never offered it as a checkbox, so editing PHT through the dashboard today would already have destroyed the value.

### 2. Is #1029 actually a dependency? — **I do not think so**

@junaidiqbalmoj — the comment says this is dependent on #1029 ("Replace B2C_IDAM with PI_AAD"). I cannot find the coupling.

`canAccessPublication` compares `user.provenance` from the session `UserProfile`, and `apps/web/src/pages/(auth)/login/return/index.ts:216` **already** sets `provenance: "PI_AAD"` for B2C media users. `B2C_IDAM` survives in exactly two places, both in the admin *user-search* filter and neither touching `list_types.allowed_provenance`: `user-management/validation.ts:6` and `user-management/queries.ts:55` (which already expands `B2C_IDAM` → `["B2C_IDAM", "PI_AAD"]`).

So adding `PI_AAD` to the four magistrates lists takes effect on merge. The only residual coupling is a possible merge conflict if #1029 declares its own provenance constant — it should consume the shared one this ticket introduces.

**Is there other intent behind the dependency that the empty issue body hides?** If not, I would like to proceed without waiting.

### 3. Widen `allowed_provenance` to `VARCHAR(255)` in this ticket? (Q6)

Recommendation: yes, and close Q6 by explicitly deferring the array column.

One correction to the description's framing: Postgres `varchar(n)` raises `22001 value too long`, it does **not** truncate silently. So the risk was never silent data loss — it was an unguarded 500 in the admin form, which has no length validation on that field. Longest value after the fix is `"CRIME_IDAM,PI_AAD"` (17 chars); the longest combination of all three real provenances is 26. Widening is a catalog-only `ALTER`, no table rewrite.

A real `text[]` column or join table is the right long-term shape and would delete the delimiter bug class outright — but once the delimiter lives in one module with unit tests, it is cleanup, not a fix, and it touches six code sites plus fixtures. I recommend recording that as a follow-up rather than leaving Q6 open. Needs a nod from whoever owns the schema.

### 4. Q3 (19 renames) and Q4 (`CROWN_WARNED_PDDA_LIST` vs `CROWN_ADVANCED_PDDA_LIST`) — noted, not blocking

Both are out of scope per the description and neither blocks the provenance work: all 19 divergent pairs agree on `CFT_IDAM`, and we hold none of the three PDDA lists yet. The parity test's `NAME_ALIASES` map becomes the checklist for the rename follow-ups, and `CROWN_WARNED_PDDA_LIST` will be annotated in the known-gap list as contested with #957.

Q4 still needs a real answer from Crime before the PDDA lists land, given #1026 requires `x-list-type` to match the incumbent's enum — but that belongs on the PDDA tickets. When they arrive they must carry `["CRIME_IDAM", "PI_AAD"]`. Worth noting that #957's `CROWN_ADVANCED_PDDA_LIST` exists nowhere in the reference.

---

## Two other things the reviewer should know

**The description points at a dead file.** The provenance checkbox block in `configure-list-type-enter-details/index.njk` is unreachable — its controller is `res.redirect(301, "/manage-list-types")`. Same for `view-list-types/index.njk`. The live UI is `add-list-type/index.njk` and `edit-list-type/index.njk`, and there are **four** duplicated `checkedProvenance` literals across their two controllers, not one. This ticket drives the checkboxes from the shared constant instead; I am proposing a separate cleanup ticket to delete the two dead pages rather than smuggling it in here.

**AC "nothing outside the seed handles the delimited form" needs one caveat.** The DB→UI read in `edit-list-type/index.ts:39` and the authorisation check in `authorisation/service.ts:34` must both parse the column, so the delimiter cannot literally live only in the seed while the column stays delimited. The plan satisfies the intent instead: `formatProvenance`/`parseProvenance` in one module, so no *caller* handles the delimiter, and `parseProvenance` trims — which is the actual whitespace bug the description describes, and also fixes `edit-list-type` silently dropping a provenance when loading a legacy spaced row.

---

## Cross-repo verification (this session)

The provenance data was independently re-verified against all three upstream repos before planning:

- **`pip-data-models` / `ListType.java`** (commit `bbefd93`) — the authoritative source for `allowedProvenances` (`List.of(...)`). Declares **102** list types. This is what `list-type-data.ts` must match.
- **`pip-data-management`** — has no `ListType.java` of its own; its `build.gradle` depends on `com.github.hmcts:pip-data-models:2.3.50`, so the backend API consumes the same enum. Nothing separate to reconcile.
- **`pip-frontend`** — does **not** carry `allowedProvenances`. Its `listLookup.json` uses a different field, `restrictedProvenances`, for subscription-list *filtering* only (empty = available to all). It is not the publisher-authorisation concept this ticket corrects and does not contradict the shared model. (PHT and the four magistrates lists all have `restrictedProvenances: []`.)

An independent parse-and-diff of `list-type-data.ts` vs `ListType.java` reproduced the bot's numbers exactly: **exactly 5 provenance mismatches** (PHT + the four `MAGISTRATES_*_ADULT_COURT_LIST_*`), **0 of our names fall outside the shared model** (after aliasing the 19 divergences), and **25 absent / 22 real gap** after excluding the 3 deprecated-and-superseded upstream entries.

`PHT_WEEKLY_HEARING_LIST` resolves to **"Primary Health Tribunal Weekly Hearing List"** (Welsh: *Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol*); it is a live, non-deprecated `CFT_IDAM` entry. The similarly-named `PRIMARY_HEALTH_LIST` is its deprecated predecessor and is absent from both `list-type-data.ts` and pip-frontend's lookup — it should stay absent.
