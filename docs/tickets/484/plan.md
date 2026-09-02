# Technical Plan: Generate SJP Excel file when list is uploaded (#484)

## Technical Approach

### High-level Strategy

The `libs/excel-generation` module currently has only compiled `dist/` files with a partial implementation (a single `generateExcelForPublication` that only handles press list type ID 1 with incorrect columns). The `src/` directory and `package.json` don't exist.

The approach is:

1. Create the full `src/` directory structure for `libs/excel-generation` with proper TypeScript source
2. Implement two separate generators matching the ticket specification exactly:
   - `sjp-public-list-excel-generator.ts` — fixed 4 columns (Name, Postcode, Offence, Prosecutor)
   - `sjp-press-list-excel-generator.ts` — dynamic offence columns (Address, Case URN, DOB, Name, Offence N columns, Prosecutor)
3. Reuse the existing JSON parsing from `@hmcts/list-types-common` (`extractPressCases`, `extractPublicCases`, `SjpJson`)
4. Integrate into `processPublication` following the same registry pattern as `PDF_GENERATOR_REGISTRY`
5. Store output at `storage/temp/uploads/{artefactId}.xlsx` — the same directory used for `.json` and `.pdf` files

### Architecture Decisions

- **Reuse `@hmcts/list-types-common` JSON parsing**: The `extractPressCases` and `extractPublicCases` functions already handle the nested `courtLists → courtHouse → courtRoom → session → sittings → hearing` traversal. No need to duplicate this logic.
- **Registry pattern**: Mirror `PDF_GENERATOR_REGISTRY` with an `EXCEL_GENERATOR_REGISTRY` mapping list type names to generator functions.
- **File storage path**: Use `storage/temp/uploads/` at the monorepo root (not `libs/excel-generation/storage/`). The existing dist code used a relative path from the module itself; the correct path is the shared root `storage/temp/uploads/` where `.json` and `.pdf` files already exist.
- **Error isolation**: Excel generation wrapped in try/catch, errors logged but don't block notifications (same as PDF generation).
- **No separate file storage module needed inside excel-generation**: The `saveExcelFile` function will write directly to the shared uploads directory. It's a simple `fs.writeFile` call.

### Key Technical Considerations

- **List type IDs**: SJP_PRESS_LIST=24, SJP_PUBLIC_LIST=25, SJP_DELTA_PRESS_LIST=26, SJP_DELTA_PUBLIC_LIST=27 (from `libs/location/src/list-type-data.ts`)
- **exceljs**: Already a dependency in `libs/list-types/common` and `e2e-tests`. Add it to `libs/excel-generation`.
- **SJP Press List dynamic columns**: Need a first pass to determine max offences across all defendants, then build headers dynamically.
- **DOB formatting**: `dd/MM/yyyy (age)` — the `SjpCasePress` interface already has `dateOfBirth: Date | null` and `age: number | null`.
- **Press restriction**: Map `reportingRestriction: boolean` to `"Active"` or `"None"`.

---

## Implementation Details

### File Structure

```
libs/excel-generation/
├── package.json                          (NEW)
├── tsconfig.json                         (NEW)
├── storage/temp/uploads/                 (EXISTS - not used directly)
└── src/
    ├── index.ts                          (NEW - exports)
    ├── config.ts                         (NEW - module config)
    ├── excel/
    │   ├── excel-styles.ts               (NEW - shared styles)
    │   ├── sjp-public-list-excel-generator.ts   (NEW)
    │   ├── sjp-public-list-excel-generator.test.ts (NEW)
    │   ├── sjp-press-list-excel-generator.ts    (NEW)
    │   └── sjp-press-list-excel-generator.test.ts  (NEW)
    └── file-storage/
        ├── file-storage-service.ts       (NEW)
        └── file-storage-service.test.ts  (NEW)
```

### Components

#### 1. `sjp-public-list-excel-generator.ts`

- Input: `SjpJson` (from `@hmcts/list-types-common`)
- Uses `extractPublicCases()` to get flat list of cases
- Creates workbook with worksheet "SJP Public List"
- Columns: Name, Postcode, Offence, Prosecutor
- Header row bold, columns auto-sized
- Returns `Buffer`

#### 2. `sjp-press-list-excel-generator.ts`

- Input: `SjpJson` (from `@hmcts/list-types-common`)
- Uses `extractPressCases()` to get full case data with offences
- First pass: determine `maxOffences = Math.max(...cases.map(c => c.offences.length))`
- Build headers dynamically:
  - Address, Case URN, Date of Birth, Defendant Name
  - For i in 1..maxOffences: `Offence {i} Press Restriction Requested`, `Offence {i} Title`, `Offence {i} Wording`
  - Prosecutor Name
- Format DOB as `dd/MM/yyyy (age)` where age is calculated from DOB
- Map `reportingRestriction` boolean → `"Active"` / `"None"`
- Header row bold, columns auto-sized
- Returns `Buffer`

#### 3. `file-storage-service.ts`

- `saveExcelFile(artefactId: string, buffer: Buffer): Promise<void>` — writes to `storage/temp/uploads/{artefactId}.xlsx`
- Uses `MONOREPO_ROOT` pattern consistent with existing code (navigate up from module location)

#### 4. Integration in `libs/publication/src/processing/service.ts`

- Add `EXCEL_GENERATOR_REGISTRY` mapping:
  - `SJP_PUBLIC_LIST` → `generateSjpPublicListExcel`
  - `SJP_DELTA_PUBLIC_LIST` → `generateSjpPublicListExcel`
  - `SJP_PRESS_LIST` → `generateSjpPressListExcel`
  - `SJP_DELTA_PRESS_LIST` → `generateSjpPressListExcel`
- Add `generatePublicationExcel` function (similar to `generatePublicationPdf`)
- Call it in `processPublication` after JSON save/PDF generation, before notifications
- Wrap in try/catch — log errors but don't block

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty courtLists (no hearings) | Generate Excel with header row only, no data rows |
| Defendant with no offences | Row with empty offence columns |
| Missing DOB on press list | Cell left blank |
| Missing postcode | Cell left blank |
| Missing prosecutor | Cell left blank |
| `exceljs` throws during generation | Catch error, log, return without blocking notifications |
| File write fails (disk full, permissions) | Catch error, log, return without blocking |
| Non-SJP list type | Skip Excel generation entirely (no-op) |
| SJP_DELTA variants | Same generator as non-delta (identical JSON structure) |
| Very large lists (thousands of defendants) | No special handling needed; ExcelJS handles streaming internally |

---

## Acceptance Criteria Mapping

| Criterion | Implementation | Verification |
|-----------|----------------|--------------|
| `sjp-public-list-excel-generator.ts` with 4 columns | `extractPublicCases()` → 4-column worksheet | Unit test with fixture data |
| `sjp-press-list-excel-generator.ts` with dynamic columns | `extractPressCases()` → dynamic worksheet | Unit test verifying column count matches max offences |
| `file-storage-service.ts` saves to correct path | `fs.writeFile` to `storage/temp/uploads/{artefactId}.xlsx` | Unit test with mocked fs |
| `src/index.ts` exports three functions | Named exports | TypeScript compilation |
| Header row bold, auto-sized columns | Apply `HEADER_STYLE` and set column widths | Unit test checking cell.font.bold |
| Delta variants use same generator | Registry maps both names to same function | processPublication test |
| `processPublication` calls generator based on listTypeId | Registry lookup by list type name | Unit test with mocked generator |
| Only runs for SJP types | Registry only contains SJP entries | Test that non-SJP types don't trigger Excel |
| Runs after JSON save, before notifications | Positioned in processPublication flow | Test execution order |
| Failure doesn't block notifications | try/catch around Excel call | Test with throwing generator |
| File saved as `{artefactId}.xlsx` | fileName construction | Integration test |
| Retrievable via existing download | Same directory as JSON/PDF | No changes needed to download mechanism |
| `@hmcts/excel-generation` dependency in publication | `package.json` update | Build succeeds |
| Path alias in root tsconfig | tsconfig.json update | TypeScript resolves import |
| `yarn test` passes | All tests green | CI |
| English-only headers | Hardcoded English strings | Inspection |

---

## CLARIFICATIONS NEEDED

1. **Column order for press list**: The ticket lists columns as: Address, Case URN, DOB, Defendant Name, Offence columns, Prosecutor Name. Should the column order match exactly as listed, or is alphabetical/logical grouping acceptable? (Assuming exact ticket order.)

2. **Age calculation**: The `SjpCasePress` already has an `age` field from the JSON. Should we use that directly, or recalculate from DOB at Excel generation time? (Using the field from JSON avoids date arithmetic edge cases.)

3. **Existing dist/ files**: The `dist/` directory in `libs/excel-generation` contains an older implementation with different column structure. Should these be deleted? (Assuming yes — the new `src/` will compile to a new `dist/`.)
