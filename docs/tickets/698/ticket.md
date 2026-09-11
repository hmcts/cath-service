# #698: Add/Update provenance for all lists

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story, epic:public-journey
**Created:** 2026-06-10T12:57:31Z
**Updated:** 2026-09-11T16:09:33Z

## Description

**PROBLEM STATEMENT**

This ticket is raised to add/update the provenance for all the lists in CaTH, and to align CaTH's list types and their provenances with the shared model in [`pip-data-models` `ListType.java`](https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java).

**AS A** Service
**I WANT** each list type to declare every provenance that is allowed to publish it, matching the shared model
**SO THAT** publishers are authorised correctly and the provenance data is up to date

## A list can have more than one provenance

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

## What already works — do not rebuild this

Multiple provenances per list type are **already supported end to end**, via a comma-delimited string:

- Storage: `list_types.allowed_provenance` — a single `VARCHAR(50)` column ([`location.prisma:54`](https://github.com/hmcts/cath-service/blob/master/libs/postgres-prisma/prisma/schema/location.prisma#L54)).
- System Admin UI: already models it as `string[]` and persists with `.join(",")` ([`list-type/queries.ts:119`](https://github.com/hmcts/cath-service/blob/master/libs/system-admin-pages/src/list-type/queries.ts#L119)).
- Authorisation: already splits and matches — [`authorisation/service.ts:34`](https://github.com/hmcts/cath-service/blob/master/libs/publication/src/authorisation/service.ts#L34):
  ```ts
  return !!user.provenance && listType.provenance.split(",").includes(user.provenance);
  ```
- `MAGISTRATES_PUBLIC_LIST` already carries `"CRIME_IDAM,PI_AAD"` in `list-type-data.ts` and authorises both provenances correctly today.

So this story is **not** about building multi-provenance support. It is about correcting the data, hardening the representation, and reconciling the list-type set against the shared model.

## What is actually wrong

### 1. Four list types are missing `PI_AAD`

`libs/list-types/common/src/list-type-data.ts` has `CRIME_IDAM` only, where the shared model has both. A `PI_AAD` publisher is denied access to these four today:

| List type | Ours | Reference |
|---|---|---|
| `MAGISTRATES_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |
| `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE` | `CRIME_IDAM` | `CRIME_IDAM,PI_AAD` |

### 2. One list type has an entirely different provenance

| List type | Ours | Reference |
|---|---|---|
| `PHT_WEEKLY_HEARING_LIST` | `MANUAL_UPLOAD` | `CFT_IDAM` |

`MANUAL_UPLOAD` is not a `UserProvenances` value in the shared model. Confirm whether this is deliberate for CaTH or a data error — see open questions.

### 3. `provenance` is typed as a bare `string`, so the delimiter is invisible to the type system

`ListTypeData.provenance` is `string` ([`list-type-data.ts:5`](https://github.com/hmcts/cath-service/blob/master/libs/list-types/common/src/list-type-data.ts#L5)). Nothing stops `"CRIME_IDAM, PI_AAD"` being written with a space, and because `service.ts:34` splits on `","` **without trimming**, `" PI_AAD"` would never match and the provenance would be silently denied. There is no test or type that catches this.

Change `provenance` to `string[]` in `ListTypeData` and join at the seed boundary, so the delimited form exists only in the database and every list type declares its provenances as a list — mirroring `List.of(...)` in the shared model.

Also note `VARCHAR(50)` has limited headroom: the longest plausible combination (`CRIME_IDAM,PI_AAD,CFT_IDAM,MANUAL_UPLOAD`) is 39 characters. It fits today but a fifth provenance would truncate silently. Consider widening, or moving to a proper array/join table.

## List type reconciliation against the shared model

The shared model declares **101** list types. `list-type-data.ts` declares **77**.

### A. 19 list types exist in both but under different names

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

### B. 24 list types are genuinely absent from this project

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

### C. `CROWN_WARNED_PDDA_LIST` vs #957

The shared model names it **`CROWN_WARNED_PDDA_LIST`**. #957 renames our Crown Warned list to **`CROWN_ADVANCED_PDDA_LIST`**, a name that does not exist in the shared model. Combined with #1026 (which requires `x-list-type` to match the incumbent's enum), a publisher sending `CROWN_WARNED_PDDA_LIST` would be rejected by us. Needs reconciling with Crime before both land.

## ACCEPTANCE CRITERIA

- `ListTypeData.provenance` is `string[]`, and every entry in `list-type-data.ts` declares its provenances as a list.
- The seed joins the list into `list_types.allowed_provenance`; nothing outside the seed handles the delimited form.
- The four `MAGISTRATES_*_ADULT_COURT_LIST_*` types allow both `CRIME_IDAM` and `PI_AAD`.
- Provenance values are validated against a known set; an unrecognised value fails at build or seed time rather than silently denying access.
- Whitespace around the delimiter cannot break matching — either by trimming on read, or by never producing it (preferred, via the array representation).
- A test asserts, for every list type, that its declared provenances match the shared model, or that the divergence is explicitly recorded with a reason.
- The provenance for all lists in CaTH can be added/updated through the System Admin dashboard, for multiple provenances per list.
- Existing publisher authorisation is unchanged for every list type whose provenance set is unchanged.

## Out of Scope

- Adding the 24 absent list types. Each needs its own schema, validation, rendering, PDF and page work per `CLAUDE.md`, so they belong in their own tickets — this story records the gap and corrects provenance for what exists.
- Renaming the 19 divergent list types. `list_types.name` is the stable key used by `PDF_GENERATOR_REGISTRY`, Excel converters and subscriptions, so renames need the in-place migration treatment (see #957) and a decision per list.
- `LocationType` and `Roles`, the shared model's other two constructor arguments. Only provenance is in scope here.

## Open Questions

1. **`PHT_WEEKLY_HEARING_LIST` provenance.** Ours says `MANUAL_UPLOAD`, the shared model says `CFT_IDAM`, and `MANUAL_UPLOAD` is not a `UserProvenances` value. Data error, or a deliberate CaTH-only value? If deliberate, the parity test needs an allowed-divergence list.
2. **Is `MANUAL_UPLOAD` a valid provenance at all?** If it is, the validated set in the AC above must include it and it should be documented as CaTH-specific.
3. **The 19 name divergences.** Align to the shared model, or keep ours? Aligning is the safer long-term position given #1026 requires `x-list-type` to match the incumbent's enum, but each rename is a keyed migration.
4. **`CROWN_WARNED_PDDA_LIST` vs `CROWN_ADVANCED_PDDA_LIST`** — see section C. Which name will Crime actually send?
5. **Which of the 24 absent list types does CaTH need?** Some may be legacy or already covered by a differently-named list we have.
6. **Should `allowed_provenance` stay a delimited `VARCHAR(50)`?** A `String[]` column or a join table would remove the delimiter class of bug entirely. Widening the column is the minimum.

## References

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

