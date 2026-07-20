# Technical Plan: #645 - Style Guide: Implement PHT Weekly Hearing List

## Technical Approach

Implement the `pht-weekly-hearing-list` module following the `ftt-tax-chamber-weekly-hearing-list` pattern exactly. This is a non-strategic list type with list type name `PHT_WEEKLY_HEARING_LIST`.

The implementation is a straight adaptation of the FTT Tax reference — same structure, different columns (Date, Case Name, Hearing Length, Hearing Type, Venue, Additional Information), different introductory text (PHT contact details + observe-a-court link), and different locale strings.

## Implementation Details

### File Structure

```
libs/list-types/pht-weekly-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config.ts
    ├── models/
    │   └── types.ts                          # PhtHearing, PhtHearingList
    ├── schemas/
    │   └── pht-weekly-hearing-list.json      # JSON schema
    ├── locales/
    │   ├── en.ts
    │   └── cy.ts
    ├── rendering/
    │   └── renderer.ts
    │   └── renderer.test.ts
    ├── validation/
    │   └── json-validator.ts
    ├── conversion/
    │   └── pht-config.ts                     # Excel converter, auto-registers on load
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-template.njk
    │   └── pdf-generator.test.ts
    └── email-summary/
        └── summary-builder.ts               # Deferred until requirements confirmed

apps/web/src/pages/(list-types)/pht-weekly-hearing-list/
├── index.ts                                  # Page controller
├── index.test.ts
└── pht-weekly-hearing-list.njk              # Nunjucks template
```

### Data Model

PHT columns per acceptance criteria:

```typescript
// src/models/types.ts
export interface PhtHearing {
  date: string;              // dd/MM/yyyy
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}

export type PhtHearingList = PhtHearing[];
```

### JSON Schema

Array of hearing objects with fields: `date` (pattern `^\d{2}/\d{2}/\d{4}$`), `caseName`, `hearingLength`, `hearingType`, `venue`, `additionalInformation`. All fields required, string type, no HTML tags pattern for non-date fields.

### Locale Content

**EN key strings:**
- `pageTitle`: `"Primary Health Tribunal Weekly Hearing List"`
- `listForWeekCommencing`: `"List for week commencing"`
- `contactParagraph`: `"Please contact the Primary Health Lists at primaryhealthlists@justice.gov.uk for details of how to access video hearings."`
- `observeLinkText`: `"Observe a court or tribunal hearing as a journalist, researcher or member of the public"`
- `observeLinkUrl`: `"https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing"`
- `tableHeaders`: `{ date, caseName, hearingLength, hearingType, venue, additionalInformation }`
- `dataSource`, `lastUpdated`, `at`, `backToTop`, `factLinkText`, `factLinkUrl`, `factAdditionalText`

**CY key strings:**
- `pageTitle`: `"Rhestr Wrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol"`
- All other CY strings: translations required — use `[WELSH TRANSLATION REQUIRED: '...']` format for unconfirmed strings

### Introductory Section

The first section replaces the FTT Tax "important information" details box with:
1. A paragraph: "Please contact the Primary Health Lists at **primaryhealthlists@justice.gov.uk** for details of how to access video hearings."
2. A linked paragraph: "[Observe a court or tribunal hearing...](https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing)"

This differs from FTT Tax which uses a `<details>` collapsible — PHT uses a plain section (no collapsible required per spec).

### PDF Generator

Uses `generateFttSiacWeeklyHearingListPdf` from `@hmcts/list-types-common` (same as FTT Tax pattern):

```typescript
export async function generatePhtWeeklyHearingListPdf(options: PdfGenerationOptions) {
  return generateFttSiacWeeklyHearingListPdf({
    ...options,
    courtName: "Primary Health Tribunal",
    listTitle: "Primary Health Tribunal Weekly Hearing List",
    moduleDir: __dirname,
    provenanceLabel: ...,
    importEn: () => import("../locales/en.js"),
    importCy: () => import("../locales/cy.js"),
    generatePdf: generatePdfFromHtml,
    renderData: renderPhtData
  });
}
```

### Excel Converter

Fields: Date, Case Name, Hearing Length, Hearing Type, Venue, Additional Information.
Registers under `"PHT_WEEKLY_HEARING_LIST"`.

### List Type Data Registration

Add to `libs/location/src/list-type-data.ts` (next available ID, currently 62):

```typescript
{
  id: 62,
  name: "PHT_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Primary Health Tribunal Weekly Hearing List",
  welshFriendlyName: "Rhestr Wrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol",
  provenance: "MANUAL_UPLOAD",
  urlPath: "pht-weekly-hearing-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: []
}
```

### Registration Points

| Location | Change |
|----------|--------|
| `libs/publication/src/processing/service.ts` | Import + add `PHT_WEEKLY_HEARING_LIST` to `PDF_GENERATOR_REGISTRY` |
| `apps/web/src/app.ts` | Import `moduleRoot as phtWeeklyHearingListModuleRoot` + add to `modulePaths` |
| `apps/web/package.json` | Add `"@hmcts/pht-weekly-hearing-list": "workspace:*"` |
| `libs/publication/package.json` | Add `"@hmcts/pht-weekly-hearing-list": "workspace:*"` |
| `tsconfig.json` (root) | Add path aliases for `@hmcts/pht-weekly-hearing-list` and `/config` |

## Error Handling & Edge Cases

- Missing `artefactId` → 400 (handled by `createSimpleListTypeHandler`)
- Artefact not found → 404 (handled by `createSimpleListTypeHandler`)
- Access denied → 403 (handled by `createSimpleListTypeHandler`)
- JSON fails schema validation → 400 (handled by `createSimpleListTypeHandler`)
- `additionalInformation` may be empty — template should handle blank values gracefully

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Columns: Date, Case Name, Hearing Length, Hearing Type, Venue, Additional Information | `PhtHearing` type + table headers in locales + template columns |
| List title: "Primary Health Tribunal Weekly Hearing List - [date]" | `pageTitle` in `en.ts`, date appended in renderer `header.listTitle` |
| Contact paragraph with email | `contactParagraph` in locales, rendered in template first section |
| Observe-a-court link | `observeLinkText` + `observeLinkUrl` in locales |
| Page at `GET /pht-weekly-hearing-list?artefactId=<id>` | Page controller at `apps/web/src/pages/(list-types)/pht-weekly-hearing-list/index.ts` |
| Welsh content via `?lng=cy` | `cy.ts` locale + controller passes both `en` and `cy` |
| PDF generation | `pdf-generator.ts` + `pdf-template.njk` |

## Open Questions / Clarifications Needed

- **Welsh translations**: All Welsh strings other than `pageTitle` and column headers need confirmed translations. Currently the reference FTT Tax `cy.ts` has the same English text as a placeholder.
- **`additionalInformation` optional?**: The spec lists it as a column but doesn't say if it's required in the schema. Treat as optional (not in `required` array) to match likely real-world data.
- **Email summary**: Explicitly deferred per ticket TODO — do not implement until requirements confirmed.
- **Sub-jurisdiction ID**: Left as `[]` — needs to be confirmed if PHT belongs to a jurisdiction subtree.
