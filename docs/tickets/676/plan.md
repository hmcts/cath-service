# Plan: CSV Download for SJP Hearing Lists (#676)

## 1. Technical Approach

Generate SJP CSV files on-demand from the stored JSON artefact. No new database schema, no pre-generation, no new storage. The CSV is streamed directly to the browser from the same JSON file that already backs the HTML view.

Two entry points:
- **In-page link** on the SJP list page — honours active postcode/prosecutor filters
- **Email link** — absolute URL with no filters (returns full list)

Scope: **CSV only**. PDF generation for SJP lists has no existing generator and is a sibling concern. A UI slot for PDF is reserved in the download block but PDF implementation is not part of this ticket.

## 2. Implementation Details

### 2.1 CSV Builder — `libs/list-types/common/src/sjp/sjp-csv.ts`

New file in the existing SJP common module. Uses PapaParse, which must be added as a dependency to `@hmcts/list-types-common` (currently only in `@hmcts/system-admin-pages`).

**Press CSV** — one row per offence (preserves all offence data):

| Column | Source |
|--------|--------|
| Name | `case.name` |
| Date of birth | `case.dateOfBirth` formatted `d MMMM yyyy` |
| Age | `case.age` |
| Case reference | `case.reference` |
| Address | `case.address` |
| Postcode | `case.postcode` |
| Prosecutor | `case.prosecutor` |
| Offence | `offence.offenceTitle` |
| Offence details | `offence.offenceWording` |
| Reporting restriction | `offence.reportingRestriction` → `"Yes"` / `"No"` |

**Public CSV** — one row per case:

| Column | Source |
|--------|--------|
| Name | `case.name` |
| Postcode | `case.postcode` |
| Offence | `case.offence` |
| Prosecutor | `case.prosecutor` |

Null values → empty strings. Column order matches the rendered table column order.

```typescript
// libs/list-types/common/src/sjp/sjp-csv.ts
import Papa from "papaparse";
import { format } from "date-fns";
import type { SjpCasePress, SjpCasePublic } from "./sjp-service.js";

export function buildPressListCsv(cases: SjpCasePress[]): string {
  const rows = cases.flatMap((c) =>
    c.offences.map((o) => ({
      "Name": c.name,
      "Date of birth": c.dateOfBirth ? format(c.dateOfBirth, "d MMMM yyyy") : "",
      "Age": c.age ?? "",
      "Case reference": c.reference ?? "",
      "Address": c.address ?? "",
      "Postcode": c.postcode ?? "",
      "Prosecutor": c.prosecutor ?? "",
      "Offence": o.offenceTitle,
      "Offence details": o.offenceWording ?? "",
      "Reporting restriction": o.reportingRestriction ? "Yes" : "No",
    }))
  );
  return Papa.unparse(rows, { header: true });
}

export function buildPublicListCsv(cases: SjpCasePublic[]): string {
  const rows = cases.map((c) => ({
    "Name": c.name,
    "Postcode": c.postcode ?? "",
    "Offence": c.offence ?? "",
    "Prosecutor": c.prosecutor ?? "",
  }));
  return Papa.unparse(rows, { header: true });
}
```

Export both functions from `libs/list-types/common/src/index.ts`.

### 2.2 `getAllSjpPublicCases` — `libs/list-types/common/src/sjp/sjp-service.ts`

Add alongside the existing `getAllSjpPressCases`:

```typescript
export async function getAllSjpPublicCases(
  artefactId: string,
  filters: SjpSearchFilters
): Promise<{ cases: SjpCasePublic[]; totalCases: number }> {
  const sjpData = await readSjpJson(artefactId);
  let pressCases = extractPressCases(sjpData);
  pressCases = applyFilters(pressCases, filters);

  const allCases = pressCases.map((c) => ({
    caseId: c.caseId,
    name: c.name,
    postcode: c.postcode,
    offence: c.offences.map((o) => o.offenceTitle || o.offenceWording).filter(Boolean).join(", ") || null,
    prosecutor: c.prosecutor,
  }));

  return { cases: allCases, totalCases: allCases.length };
}
```

Export from `libs/list-types/common/src/index.ts`.

### 2.3 Download Controllers

#### `libs/list-types/sjp-press-list/src/pages/download.ts`

Serves `GET /sjp-press-list/download` and `GET /sjp-delta-press-list/download` (same handler; the delta distinction is the route path, not the logic).

```typescript
import { getAllSjpPressCases, buildPressListCsv, getSjpListById } from "@hmcts/list-types-common";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("errors/400", { en, cy, locale });
  }

  const list = await getSjpListById(artefactId);
  if (list?.listType !== "press") {
    return res.status(404).render("errors/404", { en, cy, locale });
  }

  const filters = {
    postcodes: parseQueryArray(req.query.postcode),
    prosecutors: parseQueryArray(req.query.prosecutor),
  };

  const { cases } = await getAllSjpPressCases(artefactId, filters);
  const csv = buildPressListCsv(cases);
  const contentDate = list.contentDate.toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="sjp-press-list-${contentDate}.csv"`);
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.send(csv);
};
```

#### `libs/list-types/sjp-public-list/src/pages/download.ts`

Same pattern; uses `getAllSjpPublicCases` + `buildPublicListCsv`; validates `list?.listType !== "public"`.

### 2.4 Template Content Additions

Add to each module's `en.ts` and `cy.ts` `common` block:

```typescript
// en.ts additions
downloadHeading: "Download this list",
downloadCsv: "Download a copy (CSV)",
downloadCsvAriaLabel: "Download a copy of this list as a CSV file",
```

```typescript
// cy.ts additions
downloadHeading: "Lawrlwytho'r rhestr hon",
downloadCsv: "Llwytho copi i lawr (CSV)",
downloadCsvAriaLabel: "Llwytho copi o'r rhestr hon i lawr fel ffeil CSV",
```

### 2.5 Nunjucks Template Additions

Add a "Download this list" block to `sjp-press-list.njk` and `sjp-public-list.njk`, immediately before the filter section. Uses a plain `<a>` with the current `artefactId` and active filter params forwarded:

```html
<div class="govuk-!-margin-bottom-4">
  <h2 class="govuk-heading-s">{{ t.common.downloadHeading }}</h2>
  <ul class="govuk-list">
    <li>
      <a class="govuk-link" href="{{ downloadCsvUrl }}" aria-label="{{ t.common.downloadCsvAriaLabel }}">
        {{ t.common.downloadCsv }}
      </a>
    </li>
  </ul>
</div>
```

The controller builds `downloadCsvUrl` by appending `/download?artefactId=...&postcode=...&prosecutor=...` to the current path, preserving active filters.

### 2.6 Email Notification — CSV Link

`PublicationEvent` needs an `artefactId` field to build the CSV URL. Check whether `publicationId` in the existing event maps to `artefactId` in the artefact table, or add `artefactId` to `PublicationEvent`.

In `libs/notifications/src/govnotify/template-config.ts`, add `link_to_csv` to `TemplateParameters` and a helper:

```typescript
export function buildCsvDownloadLink(artefactId: string, listUrlPath: string): string {
  return `${getServiceUrl()}/${listUrlPath}/download?artefactId=${artefactId}`;
}
```

In `buildFallbackEmailData` (and the enhanced path), pass `link_to_csv` when the list type is one of the four SJP types. Use `LIST_TYPE_DATA` from `@hmcts/location` to look up `urlPath` by `listTypeId`.

The GOV.UK Notify template must also be updated to render `((link_to_csv))` — this is an out-of-codebase change (Notify admin) but the template parameter wiring must be in place.

### 2.7 Dependency — PapaParse in `@hmcts/list-types-common`

Add to `libs/list-types/common/package.json`:
```json
"papaparse": "5.5.3",
"@types/papaparse": "5.5.2"
```

## 3. Files to Create/Modify

| Action | File |
|--------|------|
| Create | `libs/list-types/common/src/sjp/sjp-csv.ts` |
| Create | `libs/list-types/common/src/sjp/sjp-csv.test.ts` |
| Modify | `libs/list-types/common/src/sjp/sjp-service.ts` — add `getAllSjpPublicCases` |
| Modify | `libs/list-types/common/src/sjp/sjp-service.test.ts` — tests for new function |
| Modify | `libs/list-types/common/src/index.ts` — export new functions |
| Modify | `libs/list-types/common/package.json` — add papaparse |
| Create | `libs/list-types/sjp-press-list/src/pages/download.ts` |
| Create | `libs/list-types/sjp-press-list/src/pages/download.test.ts` |
| Modify | `libs/list-types/sjp-press-list/src/pages/en.ts` — download content |
| Modify | `libs/list-types/sjp-press-list/src/pages/cy.ts` — download content (Welsh) |
| Modify | `libs/list-types/sjp-press-list/src/pages/sjp-press-list.njk` — download block |
| Modify | `libs/list-types/sjp-press-list/src/pages/index.ts` — pass `downloadCsvUrl` to template |
| Create | `libs/list-types/sjp-public-list/src/pages/download.ts` |
| Create | `libs/list-types/sjp-public-list/src/pages/download.test.ts` |
| Modify | `libs/list-types/sjp-public-list/src/pages/en.ts` — download content |
| Modify | `libs/list-types/sjp-public-list/src/pages/cy.ts` — download content (Welsh) |
| Modify | `libs/list-types/sjp-public-list/src/pages/sjp-public-list.njk` — download block |
| Modify | `libs/list-types/sjp-public-list/src/pages/index.ts` — pass `downloadCsvUrl` to template |
| Modify | `libs/notifications/src/govnotify/template-config.ts` — add `link_to_csv`, `buildCsvDownloadLink` |
| Modify | `libs/notifications/src/notification/notification-service.ts` — wire `link_to_csv` for SJP types |
| Modify | `libs/notifications/src/notification/validation.ts` — add `artefactId?` to `PublicationEvent` if needed |

## 4. Acceptance Criteria Mapping

| AC | How satisfied |
|----|---------------|
| CSV available for SJP_PRESS_LIST, SJP_DELTA_PRESS_LIST, SJP_PUBLIC_LIST, SJP_DELTA_PUBLIC_LIST | Download controllers at `/sjp-press-list/download` and `/sjp-public-list/download`; delta variants share the same handlers (path distinction handled in existing page controllers) |
| PDF also available (mentioned in AC) | UI slot reserved in template; PDF generation is out of scope (no existing SJP PDF generator) |
| CSV download link in email notifications | `link_to_csv` template param wired in notification service for the 4 SJP list type IDs |
| All CaTH data fields/columns in CSV | Press CSV: 10 columns matching the rendered table; Public CSV: 4 columns |

## 5. Error Handling

- Missing `artefactId` → 400
- Malformed/path-traversal `artefactId` → 400 (via existing `validateArtefactId` in `sjp-service.ts`)
- Artefact not found / wrong list type for endpoint → 404
- Unexpected error → 500, internal details logged server-side only

## 6. Open Questions (CLARIFICATIONS NEEDED)

1. **PDF scope**: Is SJP PDF generation expected in this ticket or a separate one? The AC mentions PDF, but no PDF generator exists for SJP lists. If it must be in scope, additional work is needed: `generateSjpPressListPdf` / `generateSjpPublicListPdf` functions registered in `PDF_GENERATOR_REGISTRY`.

2. **Offence row shape for press CSV**: This plan uses one row per offence (repeating case-level fields) to preserve all offence data. Alternative is one row per case with offences concatenated into one cell. Please confirm the preferred shape before implementation.

3. **Notify template update**: The GOV.UK Notify subscription template(s) need a `((link_to_csv))` placeholder added. Who owns the Notify template change, and is a new template ID needed or can the existing one be edited?

4. **`artefactId` in `PublicationEvent`**: The current `PublicationEvent` interface uses `publicationId`. Does `publicationId === artefactId` (i.e., the same value used in the JSON filename), or is a mapping required? This affects how the CSV link URL is built in the email.

5. **Access control on download endpoints**: The press list is Classified. Does the existing authentication middleware on the SJP press list page automatically cover the `/download` sub-path, or does an explicit guard need adding to the download controller?
