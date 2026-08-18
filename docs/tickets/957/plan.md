# Technical Plan — #957: Changes to Crown Warned list (Go-Live 1st Oct 2026)

## 1. Technical Approach

Three separable changes, all of which must ship in the **same release**:

1. **Rename** the list type — DB row, reference data, package, page URL, page directory, locale strings, registry keys.
2. **Remove** the "week commencing" sentence from the opening statement (web page + PDF), and drop the `{% if header.weekCommencing %}` guard so the three remaining statements always render.
3. **No change** for the Xhibit hearing-type changes — verified below that `HearingDescription` is free text.

The rename must be **identity-preserving**: `list_types.id` must not change.

### 1.1 Why an in-place SQL migration is mandatory

Verified against `apps/postgres/prisma/generate-seed-sql.ts`:

- `generateListTypesSql` emits `INSERT INTO list_types (...) ON CONFLICT (name) DO UPDATE ...`. Conflict arbitration is on **`name`**. A new name means **no conflict** → a brand-new row with a **new autoincrement `id`**.
- `generateSoftDeleteReconciliationSql` emits `UPDATE list_types SET deleted_at = NOW() WHERE deleted_at IS NULL AND name NOT IN (<active names>) AND name NOT LIKE 'TEST_%' AND name NOT LIKE 'E2E_%'`. `CROWN_WARNED_LIST` would no longer be in `listTypeData`, so it gets **soft-deleted**.

So editing `listTypeData` alone silently orphans everything keyed on the old `id`:

| Table | Column | What breaks |
|---|---|---|
| `subscription_list_type` | `list_type_ids Int[]` | Citizen/professional list-type subscriptions stop matching |
| `artefact` | `list_type_id Int` | Every published Crown Warned artefact points at a soft-deleted list type |
| `third_party_user_list_type` | `list_type_id Int` | Third-party API subscriptions stop matching |
| `list_search_config` | `list_type_id Int` | Search config orphaned |
| `list_types_sub_jurisdictions` | `list_type_id Int` | Sub-jurisdiction mapping orphaned |

A raw-SQL Prisma migration that `UPDATE`s the existing row in place, running **before** the seed, fixes this. Ordering is safe: `apps/postgres/start.sh` runs `prisma migrate deploy` → `prisma generate` → generate + apply seed SQL. The whole generated seed is one `BEGIN … COMMIT`, so once the migration has renamed the row, the seed's `ON CONFLICT (name)` finds it and only refreshes the descriptive columns.

The same applies to the local path (`yarn db:seed` → `seedListTypes()` in `libs/location/src/seed-list-types.ts`), which does `prisma.listType.upsert({ where: { name } })` plus the same soft-delete reconcile. Local developers with an existing DB need `yarn db:migrate:dev` before `yarn db:seed`; a fresh DB is unaffected (nothing to rename).

### 1.2 Why the package must be renamed too

`libs/list-types/common/src/validation/list-type-validator.ts` resolves the validator dynamically:

```ts
const kebabName = convertListTypeNameToKebabCase(listType.name); // CROWN_ADVANCED_PDDA_LIST -> crown-advanced-pdda-list
const resolvedName = PACKAGE_ALIASES[kebabName] ?? kebabName;
const listTypeModule = await import(`@hmcts/${resolvedName}`);
```

So `package.json#name` must equal `kebab-case(list_types.name)`, or a `PACKAGE_ALIASES` entry must exist. **Decision: do the full package rename.** `PACKAGE_ALIASES` is documented as being for delta/variant list types sharing a parent schema, which is not the case here; using it would leave the obsolete name permanently in the codebase. If the reviewer judges the rename too broad for a go-live-window merge, the fallback is a one-line `"crown-advanced-pdda-list": "crown-warned-list"` alias entry — see CLARIFICATIONS.

### 1.3 Why the page URL must change and needs a redirect

`getRenderedTemplateUrl` (`libs/publication/src/repository/service.ts:53`) reads `listType.url` from the DB and builds `/${listType.url}?artefactId=…` for every search result, publications-page link and subscription email. Changing `url` to `crown-advance-list` therefore updates every link automatically, including for artefacts published before the rename (they keep the same `list_type_id`). Old emails and bookmarks pointing at `/crown-warned-list` would 404, so keep the old page directory containing only a `301` redirect controller. Precedent: `apps/web/src/pages/(core)/cookies/index.ts` is a redirect-only page directory with no `.njk`, so auto-discovery supports this.

### 1.4 Naming decision

The ACs give two names. Resolution:

| Concern | Value | Source |
|---|---|---|
| `list_types.name` (internal) | `CROWN_ADVANCED_PDDA_LIST` | AC: "List name in the database should be Crown Advanced PDDA list so it matches other Crown list nomenclature" |
| `friendly_name` (front end, dropdown) | `Crown Advance List` | AC: "list name is changed from Crown Warned List to Crown Advance List … at the front end, in the manual upload drop down" |
| `welsh_friendly_name` | `Rhestr Ymlaen Llaw Llys y Goron` | Ticket |
| `url` | `crown-advance-list` | Derived from the friendly name |
| Package | `@hmcts/crown-advanced-pdda-list` | Must equal `kebab-case(name)` (§1.2) |

### 1.5 Hearing types — no code change

Verified: in `src/schemas/crown-warned-list.json`, `HearingDescription` is a plain `"type": "string"` (no `enum`) on `Hearing` entries in both the `WithFixedDate` and `WithoutFixedDate` branches, and `renderer.ts` uses it verbatim as the accordion group key (`const category = hearing?.HearingDescription || ""`). New Xhibit hearing types therefore render as new accordion sections with no schema or code change. `DocumentType` is also a free string with no enum, so the payload's `crown_warned_pdda_list` value needs no change.

Two consequences worth stating: hearing-type headings are **not translated** (Welsh users see the English Xhibit value — existing behaviour), and accordion order follows first-encountered payload order.

---

## 2. Implementation Details

**TEMPLATE SOURCE: n/a** — this is a rename and edit of the existing `apps/web/src/pages/(list-types)/crown-warned-list/crown-warned-list.njk`, not a new page. No pip-frontend migration.

### 2.1 Reference data — `libs/list-types/common/src/list-type-data.ts:44-53`

Edit the existing entry **in place** (do not delete and re-add):

```ts
{
  name: "CROWN_ADVANCED_PDDA_LIST",
  englishFriendlyName: "Crown Advance List",
  welshFriendlyName: "Rhestr Ymlaen Llaw Llys y Goron",
  provenance: "CRIME_IDAM",
  urlPath: "crown-advance-list",
  isNonStrategic: false,
  defaultSensitivity: "Classified",
  subJurisdictionIds: [4]
}
```

`provenance`, `isNonStrategic`, `defaultSensitivity` and `subJurisdictionIds` are unchanged. Note the current `welshFriendlyName` is the English string `"Crown Warned List"` — this change also fixes that.

### 2.2 Database migration

New `apps/postgres/prisma/migrations/20260930000000_rename_crown_warned_list_to_crown_advance/migration.sql`:

```sql
-- Rename in place so list_types.id is preserved. Subscriptions
-- (subscription_list_type.list_type_ids), artefacts, third-party subscriptions and
-- search config all reference this row by id, and the deploy seeder arbitrates
-- ON CONFLICT (name) — so without this the seeder would insert a new row at a new id
-- and soft-delete the old one, orphaning every reference.
UPDATE list_types
SET name                    = 'CROWN_ADVANCED_PDDA_LIST',
    friendly_name           = 'Crown Advance List',
    welsh_friendly_name     = 'Rhestr Ymlaen Llaw Llys y Goron',
    shortened_friendly_name = 'Crown Advance List',
    url                     = 'crown-advance-list',
    deleted_at              = NULL,
    updated_at              = NOW()
WHERE name = 'CROWN_WARNED_LIST'
  AND NOT EXISTS (SELECT 1 FROM list_types WHERE name = 'CROWN_ADVANCED_PDDA_LIST');
```

Notes:
- `shortened_friendly_name` **must** be included. `apps/web/src/pages/(admin)/manual-upload/index.ts:17` renders the dropdown as `shortenedFriendlyName || friendlyName || name`, and both seeders set `shortened_friendly_name = shortenedFriendlyName ?? englishFriendlyName`, so existing rows hold `'Crown Warned List'` there. Omitting it leaves the dropdown stale until the seed runs. (Correcting the tech-spec comment on the issue, which says no `shortened_friendly_name` change is needed.)
- `list_types.name` is `@unique`; `url` is **not** unique (verified in `libs/postgres-prisma/prisma/schema/location.prisma:46-67`). The `NOT EXISTS` guard covers the `name` collision and makes re-runs a no-op.
- No Prisma schema change — no columns added or removed. `prisma migrate dev` will want to create the directory; the SQL is hand-written since this is data-only.

### 2.3 Package rename

`libs/list-types/crown-warned-list/` → `libs/list-types/crown-advanced-pdda-list/`, `@hmcts/crown-warned-list` → `@hmcts/crown-advanced-pdda-list`.

Symbol renames (mechanical, no behaviour change):

| Current | New |
|---|---|
| `CrownWarnedListData` | `CrownAdvanceListData` |
| `CrownWarnedCaseRow` | `CrownAdvanceCaseRow` |
| `crownWarnedListEn` / `crownWarnedListCy` | `crownAdvanceListEn` / `crownAdvanceListCy` |
| `renderCrownWarnedListData` | `renderCrownAdvanceListData` |
| `validateCrownWarnedList` | `validateCrownAdvanceList` |
| `generateCrownWarnedListPdf` | `generateCrownAdvanceListPdf` |
| `src/schemas/crown-warned-list.json` | `src/schemas/crown-advanced-pdda-list.json` |

The JSON root key stays `WarnedList` (see §1.5 — payload contract unchanged), so `CrownAdvanceListData.WarnedList` is intentionally retained. Add a one-line comment on the interface saying the PDDA payload key is unchanged, so it doesn't look like a missed rename.

### 2.4 Content removal — locales

`libs/list-types/crown-advanced-pdda-list/src/locales/en.ts` and `cy.ts`:

- `title`: `"Crown Warned List"` → `"Crown Advance List"`; cy `"Rhestr Rybuddiol y Goron"` → `"Rhestr Ymlaen Llaw Llys y Goron"`.
- `pageTitle`: `"Crown Warned List for"` → `"Crown Advance List for"`; cy → `"Rhestr Ymlaen Llaw Llys y Goron ar gyfer"`.
- **Delete** `preStatementPrefix` from both files (en: "The undermentioned cases are warned for the hearing period of week commencing"; cy: "Mae'r achosion a grybwyllir isod wedi'u rhybuddio ar gyfer cyfnod gwrandawiad yr wythnos sy'n cychwyn"). Both must go — locale-key parity is asserted by the template tests.
- `preStatementSuffix2/3/4` keep their current keys and text. Existing Welsh for all three is already present and correct in `cy.ts`; no translation work needed there. Keys are **not** renumbered to 1/2/3 — churn with no user-visible benefit.
- All other keys untouched (table headings, `toBeAllocated`, `searchCases`, the reporting-restrictions block, `courtHouseDetails`, `backToTop`, `dataSource`, error strings).

Welsh needed for `pageTitle` only: the ticket gives the list name; the `" ar gyfer"` suffix follows the existing cy pattern. Mark for translator confirmation.

### 2.5 Renderer — drop `weekCommencing`

`src/rendering/renderer.ts`:
- Remove `weekCommencing: formatContentDate(toStartOfWeek(options.contentDate), options.locale)` from the `header` object.
- Delete the now-unused `toStartOfWeek()` helper and the `formatContentDate` import from `@hmcts/list-types-common`.
- Keep `options.contentDate` in `RenderOptions` — it is part of the shared `BasePdfGenerationOptions`-driven call shape; confirm with `tsc` whether it becomes genuinely unused and remove only if it does.
- Everything else (grouping by `HearingDescription`, `TO_BE_ALLOCATED` bucketing, fixed-date sort, custody detection) is untouched.

### 2.6 Templates — remove the conditional wrapper

`apps/web/src/pages/(list-types)/crown-advance-list/crown-advance-list.njk` (lines 54-59 today):

```njk
    <p class="govuk-body govuk-!-margin-top-4">{{ t.preStatementSuffix2 }}</p>
    <p class="govuk-body">{{ t.preStatementSuffix3 }}</p>
    <p class="govuk-body">{{ t.preStatementSuffix4 }}</p>
```

`libs/list-types/crown-advanced-pdda-list/src/pdf/pdf-template.njk` (lines 49-54 today): the equivalent, unwrapped.

Removing the `{% if header.weekCommencing | length %}` guard also **fixes an existing defect**: the `*` custody marker could previously render with its "*denotes a defendant in custody" explanation suppressed when `weekCommencing` was empty.

The PDF's `<title>` and `<h1>` already use `{{ t.pageTitle }}`, so they pick up the new name with no template change. `pdf-generator.ts` needs a function rename only — it takes no `listTypeName` and has no title map.

### 2.7 Page directory rename + legacy redirect

- `apps/web/src/pages/(list-types)/crown-warned-list/` → `crown-advance-list/`, and `crown-warned-list.njk` → `crown-advance-list.njk`, `crown-warned-list.njk.test.ts` → `crown-advance-list.njk.test.ts`.
- Controller: renamed imports, `logPrefix: "crown-advance-list"`, `res.render("crown-advance-list", …)`.
- New `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` containing only:

```ts
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const artefactId = typeof req.query.artefactId === "string" ? req.query.artefactId : "";
  res.redirect(301, artefactId ? `/crown-advance-list?artefactId=${encodeURIComponent(artefactId)}` : "/crown-advance-list");
};
```

Follows the `(core)/cookies/index.ts` precedent. Delete in a follow-up ticket once old emails have aged out.

### 2.8 Full file list

| File | Change |
|---|---|
| `libs/list-types/common/src/list-type-data.ts:44-53` | Entry edited in place (§2.1) |
| `apps/postgres/prisma/migrations/<new>/migration.sql` | New rename migration (§2.2) |
| `libs/list-types/crown-advanced-pdda-list/package.json` | `name` → `@hmcts/crown-advanced-pdda-list` |
| `libs/list-types/crown-advanced-pdda-list/src/index.ts` | Renamed exports |
| `.../src/locales/en.ts`, `cy.ts` | `title`/`pageTitle` renamed; `preStatementPrefix` deleted |
| `.../src/models/types.ts` | Type renames; comment on retained `WarnedList` key |
| `.../src/rendering/renderer.ts` | Drop `weekCommencing`, `toStartOfWeek`, `formatContentDate` import |
| `.../src/pdf/pdf-template.njk:49-54` | Remove `{% if %}` wrapper + prefix line |
| `.../src/pdf/pdf-generator.ts` | Function/type renames |
| `.../src/validation/json-validator.ts` | Function + schema import renamed |
| `.../src/schemas/crown-warned-list.json` | File renamed; **contents unchanged** |
| `.../src/email-summary/summary-builder.ts` | Type rename only; email field labels unchanged |
| `apps/web/src/pages/(list-types)/crown-advance-list/*` | Dir + template renamed; `{% if %}` wrapper removed; `logPrefix`/`res.render` updated |
| `apps/web/src/pages/(list-types)/crown-warned-list/index.ts` | **New** 301 redirect stub |
| `apps/web/src/app.ts:16,153` | Import + `modulePaths` entry renamed |
| `libs/publication/src/processing/service.ts:12,203` | Import renamed; `PDF_GENERATOR_REGISTRY` key → `CROWN_ADVANCED_PDDA_LIST` |
| `libs/notifications/src/notification/notification-service.ts:28,214` | Import renamed; summary registry key → `CROWN_ADVANCED_PDDA_LIST` |
| `libs/publication/package.json:35`, `libs/notifications/package.json:33` | Workspace dependency renamed |
| `tsconfig.json:81,84` | Path aliases renamed (`@hmcts/crown-advanced-pdda-list` and `/config`) |
| `e2e-tests/utils/seed-list-types.ts:31-39` | `name`, `friendlyName`, `welshFriendlyName`, `url` updated |
| All co-located `*.test.ts` above | Renamed imports/keys; assertions updated (§4) |
| `yarn.lock` | Regenerate via `yarn install` after the package rename |

No change needed to `apps/web/vite.config.ts` (this lib contributes no bundled assets), `apps/api/src/app.ts` (no API routes), or any `.prisma` schema file.

---

## 3. Error Handling & Edge Cases

| Case | Behaviour |
|---|---|
| Migration re-applied | No-op (`NOT EXISTS` guard). |
| Migration runs on a fresh DB with no `CROWN_WARNED_LIST` row | No-op; the seed inserts the row under the new name. |
| Environment already has both rows (shouldn't happen) | `NOT EXISTS` guard skips the rename; the stale `CROWN_WARNED_LIST` row is soft-deleted by seed reconciliation. Flag if seen on STG. |
| DB rename and package rename land out of step | Manual JSON upload fails with "No JSON schema available for Crown Advance List". Both **must** ship in one release — this is the main release risk. |
| Artefact with no derivable week-commencing date | The three statements now always render (previously suppressed). |
| Old bookmark / email link to `/crown-warned-list?artefactId=X` | `301` → `/crown-advance-list?artefactId=X`. |
| Old link with no `artefactId` | `301` → `/crown-advance-list`, which then 400s from `createListTypeHandler` as it does today. |
| Missing `artefactId` / artefact not found / blob missing / 403 | Unchanged (400 / 404 / 403 from `createListTypeHandler`, `checkAccess: true`, `defaultSensitivity: "Classified"`). |
| Unseen Xhibit hearing type | New accordion section, no code change (§1.5). |
| Hearing type with no Welsh translation | Rendered untranslated in both locales — existing behaviour, out of scope. |
| Local dev DB seeded before this change | Needs `yarn db:migrate:dev` before `yarn db:seed`, else `seedListTypes` inserts a second row and soft-deletes the old one. Call this out in the PR description. |
| Validation rules | **Unchanged.** Same schema, same root key `WarnedList`, same required fields. `libs/list-types/common/src/validation/guard.test.ts` still passes because the package still exports a `validate*` function. |

---

## 4. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Name changed at the front end | `title`/`pageTitle` in `en.ts`/`cy.ts`; `<h1>`/`<title>` already read from `t.pageTitle` | Controller + `.njk` template tests assert the new `h1` in en and cy; E2E asserts the `h1` |
| Name changed in the manual upload dropdown | `friendly_name` + `shortened_friendly_name` updated by migration and seed; dropdown reads `shortenedFriendlyName \|\| friendlyName \|\| name` | E2E journey asserts the dropdown option reads "Crown Advance List" and no option reads "Crown Warned List" |
| Internal DB list type name changed | Migration sets `name = 'CROWN_ADVANCED_PDDA_LIST'`; `listTypeData` updated | Migration test against a seeded local DB; manual STG check |
| DB name is "Crown Advanced PDDA list" nomenclature | `CROWN_ADVANCED_PDDA_LIST` | Reference-data + seed-SQL generator tests |
| Week-commencing sentence removed | `preStatementPrefix` deleted from both locales; `weekCommencing` dropped from renderer; `{% if %}` wrapper removed from both templates | Template tests assert the three statements in document order and that the removed string appears nowhere in the HTML; renderer test asserts `header` has no `weekCommencing` |
| Same data fields retained | JSON schema, root key and required fields untouched; only the file name and TS symbol names change | Existing `json-validator.test.ts` suite passes unchanged (renamed import only) |
| Changes to Xhibit hearing types | No code change — `HearingDescription` is free text used verbatim (§1.5) | Renderer test: a previously unseen `HearingDescription` produces a new accordion group |
| Subscriptions retained, not lost | In-place `UPDATE`, `list_types.id` preserved (§1.1) | Migration test: `id` unchanged, `deleted_at IS NULL`, exactly one row, and a `subscription_list_type` row whose `list_type_ids` holds that `id` still matches after migrate + seed |
| Merged just before go-live 1 Oct 2026 | Release/merge timing, not code. Recommendation: scheduled merge in the go-live window, **not** a feature flag — flagging would mean maintaining two locale sets, two URLs and two registry keys, which is more risk than the merge timing it avoids | Confirm release window and STG-verification owner (see CLARIFICATIONS) |
| Welsh: "Rhestr Ymlaen Llaw Llys y Goron" | `welshFriendlyName` in `listTypeData`, `welsh_friendly_name` in the migration, `title`/`pageTitle` in `cy.ts` | cy template test; E2E `?lng=cy` assertion |

### 4.1 Test scenarios

**Unit / integration (Vitest, co-located):**
- Renderer no longer returns `header.weekCommencing`; the three Monday-rounding tests (`renderer.test.ts:59,69,79`) are **deleted**, not adapted.
- Renderer still groups by `HearingDescription`, still buckets `WithoutFixedDate` under `TO_BE_ALLOCATED`, still sorts by fixed date — proving the removal touched only the header.
- Renderer creates a new group for an unseen `HearingDescription`.
- Controller renders `crown-advance-list` with the renamed `pageTitle`, in en and cy.
- Template test: the three statements present in document order; the removed prefix appears nowhere in the HTML.
- Template test: statements still render when the header carries no week-commencing value (regression guard for the removed `{% if %}`) — replaces the current `crown-warned-list.njk.test.ts:163` "should not render the pre-statement when weekCommencing is empty" test, which must be **inverted**.
- Template test: locale-key parity `Object.keys(en).sort() === Object.keys(cy).sort()`; Welsh render shows the Welsh heading and statements.
- Redirect stub: `GET /crown-warned-list?artefactId=X` → `301 /crown-advance-list?artefactId=X`; no `artefactId` → `301 /crown-advance-list`.
- `validateCrownAdvanceList` passes the hydrated fixture and still fails per individually removed required field (existing suite, renamed import).
- `PDF_GENERATOR_REGISTRY` resolves `CROWN_ADVANCED_PDDA_LIST`; `pdf-generator.test.ts` fixture drops `weekCommencing` (line 44) and asserts the PDF HTML omits the removed sentence.
- Notification summary registry resolves `CROWN_ADVANCED_PDDA_LIST`.
- Seed-SQL generator: emits the upsert with the new friendly names and URL, and **no** soft-delete for `CROWN_ADVANCED_PDDA_LIST`.
- `libs/list-types/common/src/validation/guard.test.ts` continues to pass.

**Migration / data (local seeded DB + manual STG check before merge):**
- Applying the migration to a DB holding `CROWN_WARNED_LIST` leaves `id` unchanged and updates `name`, `friendly_name`, `welsh_friendly_name`, `shortened_friendly_name`, `url`.
- Re-running `migrate deploy` + generated seed is a no-op: one row, same `id`, `deleted_at` still `NULL`.
- A `subscription_list_type.list_type_ids` containing that `id` still matches after migrate + seed.
- Artefacts published before the rename resolve to `/crown-advance-list?artefactId=…` via `getRenderedTemplateUrl`.

**E2E (Playwright):** extend the existing Crown list coverage rather than adding new specs. One `@nightly` journey: admin signs in → `/manual-upload` → asserts dropdown reads "Crown Advance List" and no "Crown Warned List" → uploads a Crown Advance JSON fixture → confirms → signs in as verified user → opens the published list from the court page → asserts `h1`, the three statements, absence of the removed sentence → switches to Welsh, asserts Welsh heading and statements → inline Axe scan (zero violations) → keyboard-navigates one accordion section → follows the legacy `/crown-warned-list?artefactId=…` URL and asserts it lands on the renamed page.

### 4.2 Accessibility

No new components; preserve WCAG 2.2 AA through the rename.
- `<h1 id="page-heading">` stays the single `h1` and matches `<title>`; both read "Crown Advance List for {court}".
- Removing one `<p>` does not change heading order (`h1` → `h2` search/accordion → `h3` reporting restrictions).
- The three statements stay plain `<p class="govuk-body">` in reading order immediately before the reporting-restrictions region.
- Removing the `{% if %}` guard **fixes** the defect where `<span aria-hidden="true">*</span>` could render with no textual explanation.
- Sortable headers keep `scope="col"`/`aria-sort`; accordion keeps `data-module="govuk-accordion"` and unique section IDs.
- The `301` must be reachable by keyboard with no interstitial.

---

## 5. CLARIFICATIONS NEEDED

1. **Hearing types — the one genuinely unspecified item.** The AC says "some changes will be made to the Hearing types from Xhibit" but doesn't say what. Analysis says no code change is needed because `HearingDescription` is free text (§1.5). Can Crime supply the actual before/after list so we can confirm (a) nothing downstream relies on a fixed set, (b) whether the new types need a defined display order rather than payload order, and (c) whether Welsh display names are wanted — today they render untranslated in both locales.
2. **Payload contract.** Confirming the assumption: the PDDA/Xhibit JSON root key stays `WarnedList` and `DocumentType` stays `crown_warned_pdda_list`. If Crime is also renaming the payload, the schema, `models/types.ts`, renderer, summary builder and every fixture change too — materially larger work.
3. **`pageTitle` Welsh.** The ticket gives the list name ("Rhestr Ymlaen Llaw Llys y Goron"). Confirm `"Rhestr Ymlaen Llaw Llys y Goron ar gyfer"` for the "… for {court}" heading, following the existing cy pattern.
4. **Go-live mechanics.** Recommendation is a scheduled merge in the 1 Oct 2026 window, not a feature flag (§4). Confirm the release window and who owns STG verification on the day.
5. **Already-generated PDFs.** PDFs generated before the rename keep the old title and the removed sentence. Regenerate for in-window artefacts at go-live, or accept that pre-1-October publications keep the old wording?
6. **Historic artefacts.** Published Crown Warned artefacts with content dates before go-live will render under the new name and without the week-commencing sentence, because rendering is not versioned. Assumed acceptable since the change is described as cosmetic — please confirm with Crime.
7. **Package rename vs alias.** Confirm the reviewer prefers the full package rename to `@hmcts/crown-advanced-pdda-list` over a `PACKAGE_ALIASES` entry (§1.2).
8. **Third-party subscribers.** Third-party API subscriptions survive because they key on `list_type_id`, but any external consumer matching on the `CROWN_WARNED_LIST` **name** string breaks. Does anything outside this repo consume that name, and do third parties need notifying before 1 October?
9. **Legacy redirect lifetime.** Confirm a follow-up ticket to delete the `/crown-warned-list` stub, and the retention period (suggest 3 months after go-live).
