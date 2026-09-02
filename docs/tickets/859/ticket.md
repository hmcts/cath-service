# #859: Style Guide: Implement High Court manual-upload daily cause lists (Business & Property, Circuit Commercial, HC Civil, HC Family)

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** type:story
**Created:** 2026-07-15T08:49:48Z
**Updated:** 2026-07-15T16:06:14Z

## Description

## User Story

As a user, I want to view the following High Court daily cause lists that have been manually uploaded as flat files, so that I can access scheduled hearing information.

## Background

Four **manual-upload flat-file (non-strategic)** list types need to be registered.

**These are flat-file lists. They have NO JSON schema.** They are uploaded as flat files (PDF / CSV / DOC / HTML) through the admin manual-upload journey and served/downloaded verbatim through the existing generic flat-file path. There is **no** JSON validation, no Excel-to-JSON conversion, no bespoke HTML renderer, and no bespoke PDF generator for these list types.

> The earlier version of this ticket incorrectly described these as JSON-schema list types with per-list-type `libs/list-types/*` packages. That is wrong — those steps do not apply. See "How flat-file lists actually work" below.

Reference: [`listLookup.json` in pip-frontend](https://github.com/hmcts/pip-frontend/blob/master/src/main/resources/listLookup.json).

| List type (enum) | url path | Jurisdiction |
|---|---|---|
| `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` | `business-and-property-daily-list` | High Court |
| `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` | `circuit-commercial-court-daily-list` | High Court |
| `HIGH_COURT_CIVIL_DAILY_CAUSE_LIST` | `high-court-civil-daily-list` | High Court |
| `HIGH_COURT_FAMILY_DAILY_CAUSE_LIST` | `high-court-family-daily-list` | High Court of the Family Division |

All four are non-strategic (`isNonStrategic: true`), have no restricted provenances, and empty default sensitivity.

## Page titles

| List | EN title | CY title |
|------|----------|----------|
| business-and-property-daily-list | Business &amp; Property Daily Cause List | Rhestr Achosion Dyddiol Busnes ac Eiddo |
| circuit-commercial-court-daily-list | Circuit Commercial Court Daily Cause List | Rhestr Achosion Dyddiol Llys Masnachol Cylchdaith |
| high-court-civil-daily-list | High Court Civil Daily Cause List | Rhestr Achosion Dyddiol Sifil yr Uchel Lys |
| high-court-family-daily-list | High Court Family Daily Cause List | Rhestr Achosion Dyddiol Teulu yr Uchel Lys |

## How flat-file lists actually work (context)

- **`isNonStrategic`** is a per-**list-type** property (set in `libs/list-types/common/src/list-type-data.ts`).
- **`isFlatFile`** is a per-**artefact** (per-upload) property. It is set at upload time, **not** in the list-type catalogue. `apps/web/src/pages/(admin)/manual-upload-summary/index.ts` sets `isFlatFile = !fileName.endsWith(".json")` — i.e. any non-JSON file uploaded through the manual-upload journey becomes a flat-file artefact.
- Flat-file artefacts are stored as-is and displayed/downloaded verbatim via `libs/public-pages/src/flat-file/flat-file-service.ts`. `processPublication` does no schema validation, no PDF generation, and no search extraction for a flat file.
- The manual-upload form (`libs/admin-pages/src/manual-upload/validation.ts`, `validateManualUploadForm`) already accepts `.csv|.doc|.docx|.htm|.html|.json|.pdf`. Only `.json` files are schema-validated; the other formats are treated as flat files.
- Consequently, **no `libs/list-types/<name>/` package, schema, validator, renderer, or PDF generator is required** for these four list types.

## Acceptance Criteria

### List type data registration
- [ ] Add all four list type entries to `libs/list-types/common/src/list-type-data.ts` with the correct `name` (enum), `englishFriendlyName`, `welshFriendlyName`, `urlPath`, `provenance`, `isNonStrategic: true`, `defaultSensitivity`, and `subJurisdictionIds`
- [ ] Enum `name` values match CaTH ORG exactly (see #846) so data sync works

### Manual upload journey (flat file)
- [ ] Each list type is selectable in the admin manual-upload journey
- [ ] A flat file (e.g. PDF) can be uploaded and committed against each list type, producing an artefact with `isFlatFile: true`
- [ ] No JSON schema validation is applied to the flat-file upload (only `.json` uploads are validated)

### Viewing the flat file
- [ ] Uploaded flat file is viewable/downloadable via the existing generic flat-file path (`libs/public-pages/src/flat-file/`)
- [ ] Correct English and Welsh friendly names / page titles are shown, driven by the catalogue entry (see page-titles table above)
- [ ] Access control behaves as for other flat-file lists (403 when the user does not have access)

### Welsh language
- [ ] Welsh friendly names present in the catalogue entry and used when `?lng=cy`

### Tests
- [ ] Unit tests updated/added for the `list-type-data.ts` additions
- [ ] `yarn test` passes across the workspace

## Out of scope (explicitly NOT required — these apply only to JSON list types)

- ❌ New `libs/list-types/<name>/` package per list type
- ❌ `src/schemas/*.json`, `src/validation/json-validator.ts` + tests
- ❌ `src/rendering/renderer.ts`, bespoke HTML page under `apps/web/src/pages/`
- ❌ `src/pdf/pdf-generator.ts` + PDF template, and registration in `PDF_GENERATOR_REGISTRY`
- ❌ Excel converter registration
- ❌ Path aliases in root `tsconfig.json` / dependencies in `apps/web/package.json`
- ❌ The `libs/list-types/common` CI schema-guard test (only applies to packages shipping a schema)

## Notes / corrections to the original ticket

- The list-type catalogue lives at **`libs/list-types/common/src/list-type-data.ts`**, not `libs/location/src/list-type-data.ts` (which does not exist).
- The referenced `pht-weekly-hearing-list` (#645) reference implementation does not exist in this repo; the nearest JSON reference is `care-standards-tribunal-weekly-hearing-list` — but that is a JSON/Excel list and is **not** the model for these flat-file lists.

## TODO
- [ ] Confirm the exact `provenance`, `defaultSensitivity`, and `subJurisdictionIds` values for each of the four list types against CaTH ORG / #846

## Comments

### Comment by junaidiqbalmoj on 2026-07-15T16:06:14Z
@SPEC
