# Plan: #859 — Register four High Court manual-upload flat-file daily cause lists

## 1. Technical Approach

This is a **pure catalogue-registration task**. All four list types are flat-file,
non-strategic lists uploaded verbatim through the existing admin upload journey and
served through the existing generic flat-file path. There is no JSON schema, no
Excel converter, no bespoke renderer, and no bespoke PDF generator.

The only source change required to register the list types is adding four object
literals to the catalogue array in
`libs/list-types/common/src/list-type-data.ts`, plus a co-located unit test
asserting the additions.

Everything else in the ticket's acceptance criteria is already delivered by
existing, generic code and needs no per-list-type work:

- **Selectability in the upload journey** — the upload pages build their list-type
  dropdown dynamically from the database (`findStrategicListTypes` /
  `findNonStrategicListTypes` in
  `libs/system-admin-pages/src/list-type/queries.ts`), which is seeded from the
  catalogue via `libs/location/src/seed-list-types.ts`. Adding a catalogue entry is
  sufficient for the type to appear.
- **Flat-file detection** — `apps/web/src/pages/(admin)/manual-upload-summary/index.ts`
  line 94 sets `isFlatFile = !uploadData.fileName?.endsWith(".json")` per artefact.
  This is upload-time behaviour, not a catalogue property.
- **Viewing/downloading** — `libs/public-pages/src/flat-file/flat-file-service.ts`
  (`getFlatFileForDisplay` / `getFileForDownload`) already serves any flat-file
  artefact and derives the English/Welsh display name from the catalogue via
  `findListTypeById(...)` → `friendlyName` / `welshFriendlyName` (lines 34–35).
- **Access control (403)** — `canAccessPublicationData` in
  `libs/publication/src/authorisation/service.ts` already gates every flat-file
  artefact by sensitivity/provenance. No new code.

### Grounding: shape of a catalogue entry

`ListTypeData` (`list-type-data.ts` lines 1–11):

```ts
export interface ListTypeData {
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
  isNonStrategic: boolean;
  defaultSensitivity: string | null;
  shortenedFriendlyName?: string;
  subJurisdictionIds: number[];
}
```

The seed maps each entry to the `list_type` row: `englishFriendlyName → friendlyName`,
`provenance → allowedProvenance`, `urlPath → url`, and links the entry to sub-jurisdictions
via `subJurisdictionIds` (`seed-list-types.ts` lines 30–72).

The closest existing precedent is the other RCJ / High Court non-strategic daily cause
lists already in the file, e.g. `KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST` (lines 135–144),
`MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST` (lines 155–164) and
`SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST` (lines 165–174): all
`provenance: "CFT_IDAM"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`.

### Grounding: sub-jurisdiction IDs for "High Court"

From `libs/location/src/location-data.ts`:

- `subJurisdictionId: 10` → **"High Court"** (jurisdictionId 1, Civil) — lines 324–329
- `subJurisdictionId: 11` → **"High Court of the Family Division"** (jurisdictionId 2, Family) — lines 330–335

These are the concrete values for the ticket's "Jurisdiction" column.

## 2. Implementation Details

Add the following four object literals to the `listTypeData` array in
`libs/list-types/common/src/list-type-data.ts`. Insert them at the end of the array,
immediately before the closing `];` (currently line 674), grouped with a comment
matching the existing style (e.g. `// High Court flat-file daily cause lists`).

```ts
  // High Court flat-file daily cause lists (non-strategic, manual upload)
  {
    name: "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST",
    englishFriendlyName: "Business & Property Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Busnes ac Eiddo",
    provenance: "CFT_IDAM",
    urlPath: "business-and-property-daily-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST",
    englishFriendlyName: "Circuit Commercial Court Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Llys Masnachol Cylchdaith",
    provenance: "CFT_IDAM",
    urlPath: "circuit-commercial-court-daily-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_CIVIL_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Civil Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Sifil yr Uchel Lys",
    provenance: "CFT_IDAM",
    urlPath: "high-court-civil-daily-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [10]
  },
  {
    name: "HIGH_COURT_FAMILY_DAILY_CAUSE_LIST",
    englishFriendlyName: "High Court Family Daily Cause List",
    welshFriendlyName: "Rhestr Achosion Dyddiol Teulu yr Uchel Lys",
    provenance: "CFT_IDAM",
    urlPath: "high-court-family-daily-list",
    isNonStrategic: true,
    defaultSensitivity: "Public",
    subJurisdictionIds: [11]
  }
```

Notes:

- `englishFriendlyName`/`welshFriendlyName` are taken from the ticket page-titles table.
  The EN title in the ticket shows the HTML entity `&amp;`; in the TypeScript source use a
  literal `&` (matching `MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST`, "Mayor & City ...").
- No `shortenedFriendlyName` is set — the seed falls back to `englishFriendlyName`
  (`seed-list-types.ts` line 42), matching how `KINGS_BENCH_DIVISION_...` behaves.
- After editing, run `yarn db:generate` (no schema change, so no migration) and
  re-seed locally (`yarn db:migrate:dev` / running the seed) so the new rows appear
  in the upload dropdown.

### Tests

There is currently **no** co-located test for `list-type-data.ts` (only
`config.test.ts` exists in `libs/list-types/common/src`). Add
`libs/list-types/common/src/list-type-data.test.ts` that imports `listTypeData` and
asserts, for each of the four new `name` values, that:

- exactly one entry exists,
- `isNonStrategic === true`,
- `provenance === "CFT_IDAM"`,
- `urlPath` matches the ticket table,
- `subJurisdictionIds` is `[10]` (or `[11]` for family),
- `englishFriendlyName` / `welshFriendlyName` match the page-titles table,
- `urlPath` and `name` are unique within the catalogue (guards against copy-paste dupes).

Follow the AAA pattern per `.claude/rules/testing.md`. Run `yarn test` from the root.

## 3. Error Handling & Edge Cases

- **Enum name drift vs CaTH ORG (#846)** — if a `name` does not match the ORG enum
  exactly, data sync breaks silently. The names in section 2 are taken verbatim from
  the ticket table; they still need confirming against #846 (see Clarifications).
- **Duplicate `urlPath`** — several catalogue entries deliberately share a `urlPath`
  (e.g. all `siac-poac-paac-weekly-hearing-list`). The four new paths are unique here;
  the unit test asserts uniqueness of the four new names and paths.
- **Sensitivity/provenance access** — with `defaultSensitivity: "Public"`, the
  flat-file guard (`canAccessPublicationData`) allows all users. If the uploader picks
  `Private`/`Classified` at upload time, access is correctly restricted and a 403 is
  returned by the existing guard — no per-list-type code needed.
- **Seeding is skipped in prod** — `seed-list-types.ts` lines 10–18 skip seeding when
  `ENVIRONMENT === "prod"` or `CI === "true"`. Production rows are expected to arrive
  via the CaTH ORG data sync keyed on `name`; hence the enum-name match is critical.

## 4. Acceptance Criteria Mapping

| AC | How satisfied | How verified |
|----|---------------|--------------|
| Add four entries with correct fields | Four object literals in `list-type-data.ts` (section 2) | Unit test `list-type-data.test.ts`; code review |
| Enum `name` matches CaTH ORG (#846) | Names copied from ticket table verbatim | Manual check against #846 (CLARIFICATION) |
| Each type selectable in upload journey | Catalogue entry → seeded → dropdown built dynamically from DB | Manual walkthrough of upload page after re-seed; see CLARIFICATION on which journey |
| Flat file uploadable, artefact `isFlatFile: true` | Existing `manual-upload-summary` sets `isFlatFile = !fileName.endsWith(".json")` | Manual upload of a PDF; inspect artefact |
| No JSON schema validation on flat file | Existing validator only schema-checks `.json` (`manual-upload/validation.ts` line 194) | Upload a PDF and confirm it passes |
| Viewable/downloadable via generic flat-file path | Existing `flat-file-service.ts` serves any flat-file artefact | Open `/hearing-lists/[locationId]/[artefactId]` |
| Correct EN/CY names shown from catalogue | `flat-file-service.ts` lines 34–35 read `friendlyName`/`welshFriendlyName` | View page with and without `?lng=cy` |
| Access control 403 behaviour | Existing `canAccessPublicationData` guard | View a non-public artefact as unauthorised user |
| Welsh names present and used with `?lng=cy` | `welshFriendlyName` populated in each entry | Unit test + `?lng=cy` walkthrough |
| Unit tests added; `yarn test` passes | New `list-type-data.test.ts` | `yarn test` |

## 5. CLARIFICATIONS NEEDED

1. **`isNonStrategic: true` contradicts the "manual-upload flat-file" journey.**
   The `/manual-upload` page builds its dropdown from `findStrategicListTypes()`
   (`WHERE isNonStrategic = false`, `queries.ts` line 202), so a type marked
   `isNonStrategic: true` will **not** appear there. It will only appear in
   `/non-strategic-upload`, whose validator (`validateNonStrategicUploadForm`,
   `manual-upload/validation.ts` line 202) accepts **only `.xlsx`** — which rejects
   the PDF/CSV/DOC flat files the ticket describes. **These two requirements are
   mutually incompatible in the current codebase.** Confirm one of:
   - (a) the four types should be `isNonStrategic: false` so they appear in
     `/manual-upload` (which accepts `.csv|.doc|.docx|.htm|.html|.json|.pdf` and marks
     any non-JSON as a flat file) — this matches the ticket's described journey; **or**
   - (b) they stay `isNonStrategic: true` and the ticket accepts that flat files can
     only be uploaded via a journey that currently restricts to `.xlsx` (would require
     out-of-scope changes to the non-strategic journey — flag as separate work).
   Recommendation: given the ticket explicitly describes PDF/CSV/DOC flat-file uploads
   through the manual-upload journey, `isNonStrategic: false` is the technically
   consistent choice. The ticket's AC says `isNonStrategic: true`, so this must be
   resolved before implementation.

2. **`provenance`** — proposed `"CFT_IDAM"` to match every other Civil/Family
   non-strategic High Court entry (`KINGS_BENCH_DIVISION_...`, `MAYOR_CITY_...`,
   `SENIOR_COURTS_COSTS_...`). Confirm against CaTH ORG / #846. The ticket says "no
   restricted provenances"; `allowedProvenance` only affects access for `Classified`
   sensitivity, so with `Public` sensitivity the exact value is not access-significant.

3. **`defaultSensitivity`** — the ticket says "empty default sensitivity", but **no
   existing catalogue entry uses `null` or `""`** — every entry uses `"Public"`,
   `"Private"` or `"Classified"`. Proposed `"Public"` (safest, matches all comparable
   High Court entries and keeps them publicly viewable). Confirm whether "empty"
   literally means `null`, or simply "not restricted" (i.e. `"Public"`).

4. **`subJurisdictionIds`** — proposed `[10]` (High Court) for the first three and
   `[11]` (High Court of the Family Division) for the family list, from
   `location-data.ts`. Confirm these are the intended jurisdictions in CaTH ORG (other
   RCJ High Court lists in this file use `[1]` "Civil Court" rather than `[10]`, so
   there is existing inconsistency worth confirming).

5. **Enum `name` values (#846)** — confirm all four `name` strings match CaTH ORG
   exactly (data sync depends on it, especially since prod is not seeded locally).
