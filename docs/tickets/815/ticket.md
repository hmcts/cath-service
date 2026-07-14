# #815: Schema validation is missing for some list types

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-07-02T10:36:20Z
**Updated:** 2026-07-09T14:32:09Z

## Description

We noticed that schema validation is missing for some list type. You need to perform following actions:

- Make sure all the list types has schema
- Make sure there is schema validation for all the list types
- Make sure that you implement tests for all mandatory fields in a schema for given list
- Make sure that you implement data validation tests for certain fields having special pattern i.e. publicationDate
- This ticket is about create automation tests for all the list types schema validation. No frontend change is required.

Check following test example from other project how it is testing mandatory field validation in automation tests: https://github.com/hmcts/pip-data-management/blob/master/src/integrationTest/java/uk/gov/hmcts/reform/pip/data/management/service/schemavalidation/CivilAndFamilyDailyCauseListTest.java

## Comments

### Comment by junaidiqbalmoj on 2026-07-09T11:45:13Z
@SPEC

### Comment by hmctsclaudecode on 2026-07-09T11:50:32Z
# Technical Specification — Issue #815: Schema validation is missing for some list types

## 1. User Story
**As a** developer / service maintainer responsible for the CaTH publication pipeline
**I want to** guarantee that every list type with a JSON schema has a corresponding schema-validation function and an automated test suite that proves its mandatory fields and pattern-constrained fields are enforced
**So that** malformed publications are rejected at upload time across *all* list types, not just the subset that happens to have validators today, and regressions in any schema are caught by CI before they reach staging or production.

## 2. Background

CaTH validates uploaded JSON publications against per-list-type JSON Schemas. The wiring is:

- `libs/publication/src/validation/json-validator.ts` exposes the generic `validateJson(jsonData, schema, schemaVersion)` (Ajv, `allErrors: true`, `strict: false`).
- Each list type package (`libs/list-types/<name>`) is expected to export a thin wrapper, e.g. `validateUtLandsChamberDailyHearingList(json)`, that calls `validateJson` with its own schema JSON.
- `libs/list-types/common/src/validation/list-type-validator.ts` — `validateListTypeJson(listTypeId, jsonData, listTypes)` — is the runtime entry point. It resolves the DB list type to a kebab-case package name (applying `PACKAGE_ALIASES` for regional/delta variants), dynamically imports `@hmcts/<package>`, finds the first exported function whose name starts with `validate`, and calls it. **If no `validate*` export is found, it returns `isValid: false` with the message "No JSON schema available for … This list type does not support JSON uploads."**

**The gap.** There are 30 list-type packages that ship a JSON schema (31 schema files — `utiac-jr` has both a standard and a London schema), but only 17 of them export a `validate*` wrapper. That leaves **13 packages with a schema file but no validator** — for these, the runtime path silently reports "no schema available" even though a schema exists. Separately, of the 17 packages that *do* have a validator, **3 have tests that mock `@hmcts/publication` and therefore never exercise the real schema** — they assert the wrapper delegates, but prove nothing about mandatory fields or formats.

This ticket is scoped to **automation tests and the minimal validator wrappers needed to make them meaningful**. No frontend change is required.

### 2.1 Current state inventory

**Packages WITH a schema AND a validator (14 — real, fixture-based tests already present or expected):**
`civil-and-family-daily-cause-list`, `civil-daily-cause-list`, `crown-daily-list`, `crown-firm-list`, `crown-warned-list`, `family-daily-cause-list`, `grc-weekly-hearing-list`, `magistrates-public-list`, `magistrates-standard-list`, `sjp-press-list`, `sjp-public-list`, `utiac-jr-daily-hearing-list`, `utiac-statutory-appeal-daily-hearing-list`, `wpafcc-weekly-hearing-list`

**Packages WITH a validator but WEAK (mocked) tests (3 — need real mandatory-field tests):**
`upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `upper-tribunal-lands-chamber-daily-hearing-list`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`

**Packages WITH a schema but NO validator (13 — need a wrapper + real tests):**
`administrative-court-daily-cause-list`, `ast-daily-hearing-list`, `care-standards-tribunal-weekly-hearing-list`, `cic-weekly-hearing-list`, `court-of-appeal-civil-daily-cause-list`, `ftt-lands-registration-tribunal-weekly-hearing-list`, `ftt-rpt-weekly-hearing-list`, `ftt-tax-chamber-weekly-hearing-list`, `london-administrative-court-daily-cause-list`, `rcj-standard-daily-cause-list`, `send-daily-hearing-list`, `siac-poac-paac-weekly-hearing-list`, `sscs-daily-hearing-list`

## 3. Acceptance Criteria

* Every schema-bearing list type exposes a `validate*` wrapper
* Mandatory-field enforcement proven per list type (removing each required field → `isValid: false`)
* Pattern-constrained fields proven (malformed `publicationDate` → `isValid: false`)
* Happy path validates (`isValid: true`, `errors: []`)
* Mocked validator tests replaced with real fixture-driven tests
* Guard test enforces the invariant in CI going forward

## 4. Validation Rules

- **Root required fields** (e.g. `document`, `venue`, `courtLists`) — removing any → invalid
- **`document.publicationDate`** — pattern `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([.]\d{1,9})?Z$`; missing or malformed → invalid
- **Nested required fields** (venue, address, courtHouse, sittings, hearing, case) — each removed individually → invalid
- **Anti-HTML pattern** — string fields with embedded HTML tags → invalid
- **`schemaVersion`** — returned by wrapper matches declared version string
