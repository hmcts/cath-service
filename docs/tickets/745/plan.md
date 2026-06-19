# Technical Plan: Add PNC ID to Magistrates Standard List (#745)

## 1. Technical Approach

The `magistrates-standard-list` module **does not yet exist** in this repository. The ASN field also does not exist. This means we must create the full Magistrates Standard List module from scratch, with both ASN and PNC ID included from day one, following the established SJP Press List pattern.

The change spans four layers:
1. **Validation schema** — add optional `asn` and `pncId` string fields at case/defendant level
2. **Locale files** — add `asnHeader` and `pncIdHeader` labels in `en.ts` and `cy.ts`
3. **Front-end template** — render ASN row followed immediately by PNC ID row (both conditional) using `govukSummaryList`
4. **PDF/CSV** — depends on whether these are publisher-uploaded artefacts or server-generated (see Open Questions)

Reference implementation: `libs/list-types/sjp-press-list/` and `apps/web/src/pages/(list-types)/sjp-press-list/`.

---

## 2. Implementation Details

### Module structure

```
libs/list-types/magistrates-standard-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts
    ├── index.ts
    ├── schemas/
    │   └── magistrates-standard-list.json
    ├── magistrates-standard-list/
    │   ├── en.ts
    │   └── cy.ts
    └── validation/
        ├── json-validator.ts
        └── json-validator.test.ts

apps/web/src/pages/(list-types)/magistrates-standard-list/
├── index.ts
├── magistrates-standard-list.njk
└── index.test.ts
```

### Schema — ASN and PNC ID fields

Both fields sit at the same object level within a case/defendant object. They are optional strings using the standard injection-prevention pattern used throughout the codebase:

```json
"asn": {
  "title": "ASN",
  "description": "Arrest Summons Number",
  "type": "string",
  "default": "",
  "examples": ["1234567890"],
  "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
},
"pncId": {
  "title": "PNC ID",
  "description": "Police National Computer identifier for the defendant",
  "type": "string",
  "default": "",
  "examples": ["2001/0123456A"],
  "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$"
}
```

Neither field is in any `required` array — both are non-mandatory.

### Locale files

```typescript
// en.ts
export const en = {
  asnHeader: "ASN",
  pncIdHeader: "PNC ID",
  // ... other labels
};

// cy.ts
export const cy = {
  asnHeader: "ASN",       // acronym retained — confirm with Welsh team
  pncIdHeader: "PNC ID",  // acronym retained — confirm with Welsh team
  // ... other labels
};
```

### Nunjucks template — conditional row rendering

```njk
{{ govukSummaryList({
  rows: [
    ...
    {
      key: { text: t.asnHeader },
      value: { text: case.asn or '' }
    } if case.asn,
    {
      key: { text: t.pncIdHeader },
      value: { text: case.pncId or '' }
    } if case.pncId,
    ...
  ]
}) }}
```

PNC ID row appears directly beneath ASN row. Both rows are omitted when the value is absent.

### List type registration

Add to `libs/location/src/list-type-data.ts`:

```typescript
{
  id: <next-available-id>,
  name: "MAGISTRATES_STANDARD_LIST",
  englishFriendlyName: "Magistrates Standard List",
  welshFriendlyName: "Magistrates Standard List",  // confirm Welsh name
  provenance: "CRIME_IDAM",
  urlPath: "magistrates-standard-list",
  isNonStrategic: false,
  defaultSensitivity: "Public",
  subJurisdictionIds: [7]  // confirm sub-jurisdiction IDs
}
```

### Module registration

Add to root `tsconfig.json` paths:
```json
"@hmcts/magistrates-standard-list": ["libs/list-types/magistrates-standard-list/src"]
```

Add to `apps/web/src/app.ts` `modulePaths` array:
```typescript
import { moduleRoot as magistratesStandardListModuleRoot } from "@hmcts/magistrates-standard-list/config";
// ...
const modulePaths = [
  __dirname,
  webCoreModuleRoot,
  magistratesStandardListModuleRoot,
  // ...
];
```

### PDF and CSV

PDF and CSV handling depends on the architecture confirmation (see Open Questions). Two possibilities:

- **Publisher-uploaded artefacts** (current flat-file service pattern): The publisher uploads pre-rendered PDF/CSV alongside the JSON. No server-side generation needed — the existing `libs/public-pages/src/flat-file/flat-file-service.ts` serves them. In this case, no code changes are needed for PDF/CSV in cath-service.
- **Server-generated** (like `libs/list-types/daily-cause-list-common/src/pdf/`): A PDF template (`pdf-template.njk`) and generator function are required. The PNC ID row would be added next to ASN in the PDF Nunjucks template. CSV column would be added in the generation logic.

---

## 3. Error Handling & Edge Cases

- **Absent ASN or PNC ID**: Template conditional (`if case.asn`, `if case.pncId`) ensures no empty row is rendered. This matches ASN behaviour as described in the issue.
- **Schema injection prevention**: Both fields use the `^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$` pattern already applied to string fields across all list-type schemas.
- **Validation failure**: A payload with an ASN or PNC ID containing HTML tags is rejected by the JSON schema validator. No new bespoke error message is needed — the existing validation-error response handles this.
- **Welsh rendering**: If `cy.pncIdHeader` is missing or undefined, the template will render blank. Ensure both locale files have identical keys.

---

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | How Satisfied |
|---|---|
| PNC ID added to Magistrate's standard Validation schema | `pncId` optional field added to schema alongside `asn` |
| PNC ID displayed under ASN field in front end / style guide | Nunjucks template renders PNC ID row immediately after ASN row |
| PNC ID non-mandatory, follows same business rules as ASN | Not in `required` array; conditional rendering when absent |
| PNC ID in download PDF | PDF template updated (server-generated) or publisher uploads PDF containing it (uploaded artefact) |
| PNC ID in download CSV | CSV updated (server-generated) or publisher uploads CSV containing it |

---

## 5. CLARIFICATIONS NEEDED

1. **PDF and CSV architecture**: Are the Magistrates Standard List PDF and CSV files publisher-uploaded artefacts served by the flat-file service, or does `cath-service` generate them server-side? This determines whether any PDF/CSV code changes are needed here at all.

2. **JSON property name from publisher**: The implementation assumes `pncId` (camelCase). Confirm the exact key the upstream Common Platform / publisher feed will send. A mismatch here means the field never renders.

3. **ASN and PNC ID object level**: Are `asn` and `pncId` at the case level, the defendant/party level, or the hearing level in the publisher's JSON? PNC ID must be a sibling of ASN at whichever level that is.

4. **Welsh translation of "PNC ID"**: The plan assumes "PNC ID" is retained as an acronym in Welsh (consistent with "ASN" → "ASN"). Confirm with the Welsh translation team whether a translated form is required.

5. **PNC ID format constraint**: Is a strict regex format required (e.g., `YYYY/NNNNNNNA`)? The current plan uses the generic injection-prevention pattern only. If a format is known, add a stricter `pattern` to the schema.

6. **Sub-jurisdiction IDs and list type `id`**: The next available `id` in `list-type-data.ts` and the correct `subJurisdictionIds` for the Magistrates Standard List must be confirmed from the existing data.
