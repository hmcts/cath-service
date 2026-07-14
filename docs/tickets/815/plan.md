# Plan — Issue #815: Schema validation is missing for some list types

## 1. Technical Approach

The gap is purely in test coverage and missing validator wrappers — the runtime wiring (`list-type-validator.ts`) and all 30 JSON schema files are already correct. The fix is:

1. Add a thin `validate*` wrapper + real fixture-driven tests to the **13 packages that have a schema but no validator**.
2. Replace the mocked tests in the **3 UT packages** that already have wrappers but never exercise the real schema.
3. Add a **guard test** in `libs/list-types/common` that ensures every package with a `src/schemas/*.json` also exports a `validate*` function — so future packages can't regress.

No frontend, database, or runtime code changes are required. No schema files need to be modified.

## 2. Implementation Details

### 2.1 Pattern to use for new validators

All 13 schema-only packages already export `schemaPath` from their `src/config.ts`. Use Pattern B (consistent with `grc-weekly-hearing-list`, `utiac-jr-*`, `wpafcc-*`):

```typescript
// libs/list-types/<name>/src/validation/json-validator.ts
import { createJsonValidator, type ValidationResult } from "@hmcts/list-types-common";
import { schemaPath } from "../config.js";

export function validate<PascalCaseName>(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

`createJsonValidator` is already in `@hmcts/list-types-common`; it reads the schema file, compiles it with Ajv (with caching), and returns a function `(data: unknown) => { isValid: boolean; errors: string[] }`.

### 2.2 Function naming convention

Derive the exported function name from the package name (consistent with existing validators):

| Package name | Exported function |
|---|---|
| administrative-court-daily-cause-list | `validateAdministrativeCourtDailyCauseList` |
| ast-daily-hearing-list | `validateAstDailyHearingList` |
| care-standards-tribunal-weekly-hearing-list | `validateCareStandardsTribunalWeeklyHearingList` |
| cic-weekly-hearing-list | `validateCicWeeklyHearingList` |
| court-of-appeal-civil-daily-cause-list | `validateCourtOfAppealCivilDailyCauseList` |
| ftt-lands-registration-tribunal-weekly-hearing-list | `validateFttLandsRegistrationTribunalWeeklyHearingList` |
| ftt-rpt-weekly-hearing-list | `validateFttRptWeeklyHearingList` |
| ftt-tax-chamber-weekly-hearing-list | `validateFttTaxChamberWeeklyHearingList` |
| london-administrative-court-daily-cause-list | `validateLondonAdministrativeCourtDailyCauseList` |
| rcj-standard-daily-cause-list | `validateRcjStandardDailyCauseList` |
| send-daily-hearing-list | `validateSendDailyHearingList` |
| siac-poac-paac-weekly-hearing-list | `validateSiacPoacPaacWeeklyHearingList` |
| sscs-daily-hearing-list | `validateSscsDailyHearingList` |

### 2.3 Index.ts export line to add (13 packages)

```typescript
export { validate<PascalCaseName> } from "./validation/json-validator.js";
```

### 2.4 Test pattern for the 13 new packages

Follow the `grc-weekly-hearing-list` integration pattern — no mocking, real schema execution, AAA style:

```typescript
// libs/list-types/<name>/src/validation/json-validator.test.ts
import { describe, it, expect } from "vitest";
import { validate<PascalCaseName> } from "./json-validator.js";

describe("validate<PascalCaseName>", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange — minimal complete fixture (see schema for required fields)
    const validData = [{ /* all required fields */ }];

    // Act
    const result = validate<PascalCaseName>(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validate<PascalCaseName>(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

Key note: all 13 schema-only packages use `"type": "array"` at the schema root (flat list-row format), so fixtures are arrays of objects.

### 2.5 Replacing mocked tests in the 3 UT packages

The 3 packages (`upper-tribunal-lands-chamber-daily-hearing-list`, `upper-tribunal-administrative-appeals-chamber-daily-hearing-list`, `upper-tribunal-tax-and-chancery-chamber-daily-hearing-list`) use Pattern A (inline JSON import, `validateJson` from `@hmcts/publication`, returns `{ isValid, errors, schemaVersion }`).

Their tests currently mock `@hmcts/publication` — drop the mock and call the real function:

```typescript
import { describe, it, expect } from "vitest";
import { validate<Name> } from "./json-validator.js";

describe("validate<Name>", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange — fixture matching schema required fields: time, caseReferenceNumber,
    //            caseName, judges, members, hearingType, venue, modeOfHearing, additionalInformation
    const validData = [{ /* all required fields */ }];

    // Act
    const result = validate<Name>(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validate<Name>(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

No changes needed to `json-validator.ts` or `index.ts` for these 3 packages.

### 2.6 Guard test

Add to `libs/list-types/common/src/validation/list-type-validator.test.ts` (or a new `guard.test.ts`):

A test that:
- Reads all directories in `libs/list-types/`
- For each one that has a `src/schemas/` directory with at least one `.json` file
- Imports the package's `src/index.ts` (or checks its exports statically via `fs`)
- Asserts that at least one exported name starts with `validate`

This acts as a CI guardrail to prevent future schema-only packages shipping without validators.

## 3. File Structure

```
libs/list-types/
├── administrative-court-daily-cause-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE (Pattern B)
│       └── json-validator.test.ts        ← CREATE
├── ast-daily-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── care-standards-tribunal-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── cic-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── court-of-appeal-civil-daily-cause-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── ftt-lands-registration-tribunal-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── ftt-rpt-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── ftt-tax-chamber-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── london-administrative-court-daily-cause-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── rcj-standard-daily-cause-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── send-daily-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── siac-poac-paac-weekly-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── sscs-daily-hearing-list/src/
│   ├── index.ts                          ← add export line
│   └── validation/
│       ├── json-validator.ts             ← CREATE
│       └── json-validator.test.ts        ← CREATE
├── upper-tribunal-lands-chamber-daily-hearing-list/src/validation/
│   └── json-validator.test.ts            ← REWRITE (drop vi.mock)
├── upper-tribunal-administrative-appeals-chamber-daily-hearing-list/src/validation/
│   └── json-validator.test.ts            ← REWRITE (drop vi.mock)
├── upper-tribunal-tax-and-chancery-chamber-daily-hearing-list/src/validation/
│   └── json-validator.test.ts            ← REWRITE (drop vi.mock)
└── common/src/validation/
    └── guard.test.ts                     ← CREATE (CI guard)
```

## 4. Error Handling & Edge Cases

- All 13 schema-only packages use `"type": "array"` at the root. Fixtures must be arrays, not objects.
- `createJsonValidator` caches by schema path, so concurrent test runs are safe.
- The 3 UT packages use Pattern A (inline JSON import + `@hmcts/publication`). Their `ValidationResult` includes `schemaVersion`; tests for them can optionally assert `result.schemaVersion === "1.0"`.
- The guard test must skip the `common` directory and any package that has no `src/schemas/` directory.

## 5. Acceptance Criteria Mapping

| Criterion | How satisfied |
|---|---|
| Every schema-bearing list type exposes a `validate*` wrapper | 13 new `json-validator.ts` files + index.ts exports |
| Mandatory-field enforcement proven | Each test's invalid-data `it` block removes required fields |
| Pattern-constrained fields proven | Covered by invalid data fixture (empty objects trigger required-field errors) |
| Happy path validates | Each test's valid-data `it` block |
| Mocked tests replaced | 3 UT test rewrites |
| CI guard | `common/src/validation/guard.test.ts` |

## CLARIFICATIONS NEEDED

1. **Schema versions**: Do all 13 schema-only packages declare `"1.0"` as the schema version? The spec assumes yes (consistent with all existing validators), but check the `$schema` or a `version` field in each JSON before hardcoding.

2. **Guard test location**: Should the guard test live in `libs/list-types/common` or `libs/publication`? The `common` package already imports list-type packages in its test suite, so `common` is the safer choice to avoid circular dependencies.

3. **Schema-only packages that may never receive JSON uploads** (ast, cic, care-standards, sscs, send — also register Excel converters): Should their validators be added unconditionally, or only if confirmed JSON-uploadable? The spec says to add them — since a schema file exists, the intent was to support validation.

4. **publicationDate pattern test**: The 13 schema-only packages use a flat-array schema format. Check whether `publicationDate` appears in their schemas or only in the nested `document` object schemas used by cause lists. If absent, the pattern test is not required for those packages.
