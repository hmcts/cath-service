# Technical Plan — Issue #659: Business and Property Division Rolls Building venue and hearing lists

## 1. Technical Approach

### Three findings that reshape the work

Before any implementation detail, three verified facts change the shape of this ticket away from what the AC text implies ("create a venue", "remove 16 list types"):

1. **The venue is a RENAME IN PLACE, not a create.** `libs/location/src/location-data.ts:188` already holds `locationId: 26`, name `"Business and Property Courts Rolls Building"`, welshName `"Llysoedd Busnes ac Eiddo - Adeilad Rolls"`, `regions: [11]`, `subJurisdictions: [10]`. Issue #659 asks for "Business and Property **Division** Rolls Building". We edit the `name` (and, pending Welsh sign-off, `welshName`) on the existing row. **Creating a new `locationId` would orphan every artefact already published against 26 and silently break existing subscriptions.** No new location entry, no hand-written SQL — the change to `location-data.ts` is reflected on every environment by the generated seed on deploy.

2. **Only 4 of the 16 "remove" list types actually exist.** In `libs/list-types/common/src/list-type-data.ts` the only present entries from the removal list are:
   - `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (line 751)
   - `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (line 761)
   - `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (line 791)
   - `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` (line 813)

   The other 12 names were never created — there is **no removal work** for them. "Remove" means: delete the entry from `list-type-data.ts` (the seed generator then automatically `UPDATE list_types SET deleted_at = NOW()` for the now-absent name, preserving the row for MI reporting). Packages, converters, PDF generators and notification wiring stay in the repo so historic artefacts still render and MI still resolves the name.

3. **Two of those four are `isNonStrategic: false`.** `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (line 756) and `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (line 766) are strategic/manual-upload list types — they appear on `/manual-upload`, not the Excel non-strategic dropdown. `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` is not London-scoped, so soft-deleting it removes it service-wide (see Q2, blocking). `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` are `isNonStrategic: true`.

### Architecture decisions

- **Two new Excel (non-strategic) multi-tab list types**, both following the existing London Administrative Court pattern exactly (multi-sheet converter → JSON blob → schema validation → renderer → Nunjucks page + PDF generator).
  - `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` — a **16-section** multi-tab list (the largest in the service; current max is London Admin's 2 tabs).
  - `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` — a hearings tab plus a **config tab** carrying a judge name + email that interpolate into the open-justice wording. No existing list type reads non-hearing data from a spreadsheet tab; this is genuinely new.
- **Single `SECTIONS` source-of-truth pattern** for the 16-section list: one constant array drives the Excel sheet config, model keys, JSON schema `required` keys, renderer output and the template loop. Avoids 16 duplicated blocks and keeps section order/labels in one place.
- **Never key on numeric `listTypeId`.** All guards, converters, PDF and notification registrations use the stable `listTypeName` string, per CLAUDE.md.
- **Reference data only in `location-data.ts` / `list-type-data.ts`.** No `.sql` files. Soft-delete on removal is automatic.
- **Welsh parity throughout** — every new content key exists in both `en.ts` and `cy.ts`; locale-key parity asserted in tests.
- The **caution message and open-justice wording ownership** need confirmation (see Q4) — the caution message is currently admin-managed via `location_metadata`, not seeded from code. The venue landing page already renders the header, FaCT link and caution message, so AC2–AC4 are largely satisfied by existing behaviour once the venue is renamed.

## 2. Implementation Details

### TEMPLATE SOURCE decision (recorded verbatim)

> TEMPLATE SOURCE: write fresh — this ticket creates two NEW Excel/non-strategic multi-tab list types. Copy the existing `libs/list-types/london-administrative-court-daily-cause-list/` package pattern (multi-sheet converter, renderer, PDF generator, page controller, template). This is NOT a pip-frontend page migration.

### New package A — `libs/list-types/business-and-property-division-rolls-building-daily-cause-list`

Structure mirrors `london-administrative-court-daily-cause-list`:

```
libs/list-types/business-and-property-division-rolls-building-daily-cause-list/
├── package.json                # build + build:nunjucks + build:schemas scripts
├── tsconfig.json
└── src/
    ├── config.ts               # moduleRoot, assets, schemaPath
    ├── index.ts                # side-effect import of converter config + business/locale exports + validate* export
    ├── sections.ts             # SECTIONS single source of truth (key, en label, cy label) — 16 entries in AC order
    ├── conversion/
    │   ├── business-and-property-division-rolls-building-daily-cause-list-config.ts   # createMultiSheetConverter over SECTIONS; registerConverterByName
    │   └── *.test.ts
    ├── models/
    │   └── types.ts            # BusinessAndPropertyRollsData = Record<sectionKey, StandardHearing[]> derived from SECTIONS
    ├── rendering/
    │   ├── renderer.ts         # loops SECTIONS → normaliseHearings per section; header from locale
    │   └── renderer.test.ts
    ├── schemas/
    │   └── business-and-property-division-rolls-building-daily-cause-list.json  # object with one array property per SECTION key
    ├── validation/
    │   ├── json-validator.ts   # validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList (createJsonValidator)
    │   └── json-validator.test.ts   # MANDATORY (CI guard) — one it per required field per section
    ├── pdf/
    │   ├── pdf-generator.ts    # generateBusinessAndPropertyDivisionRollsBuildingDailyCauseListPdf
    │   ├── pdf-template.njk    # loops SECTIONS
    │   └── pdf-generator.test.ts
    ├── email-summary/          # summary-builder for notification service (copy London Admin)
    └── locales/
        ├── en.ts               # pageTitle, 16 section labels, open-justice wording (Remote Hearings block + contacts), "No hearings scheduled for this day"
        └── cy.ts               # Welsh parity (translations supplied in ticket)
```

**`SECTIONS` source-of-truth pattern** (in `sections.ts`):

```ts
export const SECTIONS = [
  { key: "appealList", en: "Appeal List", cy: "Y Rhestr Apeliadau" },
  { key: "businessList", en: "Business List", cy: "Y Rhestr Fusnes" },
  // ... 16 total, in the AC order (see Q3 — literal order for now)
] as const;
```

- Excel config: `createMultiSheetConverter(buffer, SECTIONS.map((s, i) => ({ worksheetName: s.en, worksheetIndex: i, dataKey: s.key, config: STANDARD_CONFIG })))`.
- `STANDARD_CONFIG` = a NEW ChD/KB 7-field config (Q1 RESOLVED): Judge, Time, Venue, Type, Case Number, Case Name, Additional Information — with `minRows: 0` and simple-time validation on the Time field. `RCJ_EXCEL_CONFIG_SIMPLE_TIME` cannot be reused verbatim because its columns differ (Case Details / Hearing Type). Define the new config in package A's `conversion/` (or add a shared `CHD_KB_EXCEL_CONFIG_SIMPLE_TIME` to `libs/list-types/common/src/conversion/` if package B reuses it — package B's hearings tab uses the same set). Follow the `rcj-field-configs.ts` structure; reuse existing validators (`validateNoHtmlTags`, `validateTimeFormatSimple`).
- Model type, schema `required` list, renderer output keys and template `for` loop all derive from `SECTIONS` — change the array, everything follows.

### Package B — `libs/list-types/interim-applications-daily-cause-list`

> **UPDATE (post-implementation consolidation):** Package B is NOT a new package. During review we
> found the existing `interim-applications-chd-daily-cause-list` package ("Interim Applications List
> (Chancery Division)") already implements exactly this two-tab pattern (Hearing List tab + an
> editable "Open Justice Statement Details" tab carrying judge name + email). We therefore **deleted
> the newly-scaffolded duplicate** and **renamed/repurposed the existing CHD package** as
> `interim-applications-daily-cause-list` (dropping "chd" from the folder, npm name, all symbols,
> `urlPath`, page directory and list-type name → `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST`). The old
> `INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST` list-type-data entry was removed, so the deploy seed
> soft-deletes that row (retained for MI reporting), matching the ticket's "removed but retained for
> MI" requirement. Content was updated to the ticket wording: title "Interim Applications Daily Cause
> List", open-justice paragraph 1 aligned (no comma before the interpolated judge name), a new
> paragraph 3 added ("…will not additionally appear in their individual list."), and the empty-state
> message set to "No hearings scheduled for this day". The existing Special Category Data caution
> notes were kept. The interpolation uses the existing `openJusticeStatementDetails[0]` (nameToBeDisplayed
> / email) config-tab mechanism rather than a new `JUDGE_DETAILS_CONFIG`.

Original design (superseded by the consolidation above) — same skeleton, plus the **config-tab pattern**:

- Two-tab workbook: tab 1 = hearings (7-field standard config), tab 2 = judge details (a single `{ judgeName, judgeEmail }` config row).
- `sections.ts` equivalent holds a `HEARINGS_SHEET` config and a `JUDGE_DETAILS_CONFIG` describing the second tab. The multi-sheet converter reads the judge-details tab into a small object, not a hearings array.
- Renderer interpolates `{judgeName}` / `{judgeEmail}` into the open-justice wording (`"Parties should contact the clerk to the Interim Judge {judgeName} {judgeEmail} as early as possible."`). When the tab is blank, fall back to placeholder-free wording (`"Parties should contact the clerk to the Interim Judge as early as possible."`) — **the literal `[name, email address]` from the ticket copy must never render to the public** (see Q4/note). Welsh fallback needed (Q4).
- Add a `validateEmailFormat` validator to `libs/list-types/common/src/conversion/validators.ts` for the judge email cell (exported alongside `validateTimeFormat`).
- Schema + `validateInterimApplicationsDailyCauseList` wrapper + `json-validator.test.ts` (CI guard).

### New web pages — `apps/web/src/pages/(list-types)/`

Two directories, each copying `london-administrative-court-daily-cause-list/index.ts`:

```
apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/
├── index.ts            # createSimpleListTypeHandler, guardArtefact on artefact.listTypeName, renders template
├── *.njk               # extends base template; loops SECTIONS; "No hearings scheduled for this day" per empty section
├── index.test.ts
└── *.njk.test.ts       # structural (Cheerio) + Welsh + locale-key parity

apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/
├── index.ts            # createSimpleListTypeHandler; render interpolates judge details / fallback
├── *.njk
├── index.test.ts
└── *.njk.test.ts
```

Guard pattern (per London Admin `index.ts`): `if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) { res.status(400).render("errors/common", …); return true; }`.

### Reference data changes

`libs/list-types/common/src/list-type-data.ts`:
- **Add** `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` — `isNonStrategic: true`, `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`, `subJurisdictionIds: [10]`, `urlPath: "business-and-property-division-rolls-building-daily-cause-list"`, friendly names EN/CY from ticket.
- **Add** `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` — same flags, `urlPath: "interim-applications-daily-cause-list"`.
- **Delete** `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (soft-delete automatic).
- **Delete** `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` and `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` (soft-delete automatic). Their packages/converters/PDF/notification wiring **stay** so historic artefacts render.
- **`CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` — DO NOT delete yet** (Q2 blocking; not London-scoped).

`libs/location/src/location-data.ts:188`:
- Edit `name` → "Business and Property Division Rolls Building".
- Edit `welshName` → pending Q5 (recommend "Adran Busnes ac Eiddo - Adeilad Rolls").

### Registration checklist

For each new package (A and B):

1. **Root `tsconfig.json`** `paths`: add
   `"@hmcts/business-and-property-division-rolls-building-daily-cause-list": ["libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src"]` and the interim-applications equivalent.
2. **`apps/web/package.json`** `dependencies`: add both `workspace:*` deps.
3. **`apps/api/package.json`** `dependencies`: add both (API resolves list types / PDF).
4. **`apps/web/src/app.ts`**: import `moduleRoot` from each `/config` and add to `modulePaths` for Nunjucks template discovery.
5. **`non-strategic-upload` side-effect imports** — add `import "@hmcts/business-and-property-division-rolls-building-daily-cause-list";` and `import "@hmcts/interim-applications-daily-cause-list";` to the top of `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` (and `non-strategic-upload-summary/index.ts` if it also registers converters) so the converters register on load.
6. **`PDF_GENERATOR_REGISTRY`** in `libs/publication/src/processing/service.ts` (line 149): add both `listTypeName` → generator entries; add the two package imports at top.
7. **Notification `EMAIL_BUILDER_REGISTRY`** in `libs/notifications/src/notification/notification-service.ts` (line 139): add both entries (extract + format), copying the London Admin summary-builder approach.
8. **`/list-search-config`** — add entries per new list type (Q10; admin-managed, add to release checklist).
9. Each package's `package.json` needs `build`, `build:nunjucks`, `build:schemas` scripts and `@hmcts/list-types-common`, `@hmcts/pdf-generation`, `@hmcts/postgres-prisma`, `exceljs`, `luxon`, `nunjucks` deps (copy London Admin).

## 3. Error Handling & Edge Cases

- **Empty sections / no list published:** each section that resolves to an empty array renders "No hearings scheduled for this day" (AC — supplied EN; Welsh in `cy.ts`). Renderer runs `normaliseHearings` so undefined/missing sheet → `[]`.
- **Missing / renamed Excel tabs:** `createMultiSheetConverter` already falls back `getWorksheet(name) || worksheets[index]` and yields `[]` for a missing sheet — so a missing tab degrades to an empty section, not a crash. Tab names are load-bearing (Q8); document the authoritative tab-name list.
- **Judge-details tab fallback (Interim Applications):** blank/absent config tab → render placeholder-free open-justice wording; never emit the literal `[name, email address]`.
- **Untrusted spreadsheet input:** every text field uses the `validateNoHtmlTags` validator and the schema `pattern` that rejects `<...>` tags (same as London Admin schema). Templates rely on Nunjucks autoescaping; no `| safe` on spreadsheet-sourced values.
- **Page-level error statuses** (via `createSimpleListTypeHandler`): 400 missing `artefactId`; 404 artefact/blob not found; 400 schema validation failure or wrong `listTypeName` (guard); 403 access denied; 500 unexpected. All render `errors/common` / `errors/403` with EN+CY.
- **Judge email validation:** `validateEmailFormat` rejects malformed emails at conversion time so bad data never reaches the blob.

## 4. Acceptance Criteria Mapping

The ticket text lists AC bullets; the spec consolidates them as AC1–AC13. Mapping each to implementation + verification:

| AC | Requirement | Implementation | Verification |
|----|-------------|----------------|--------------|
| AC1 | Venue "Business and Property Division Rolls Building" exists | Rename `name` on `locationId: 26` in `location-data.ts` | Unit assert on `location-data`; E2E venue landing loads |
| AC2 | Page header "What do you want to view from …?" | Existing summary-of-publications page renders header from venue name | E2E: header text after rename |
| AC3 | FaCT link + trailing text | Already implemented on landing page | E2E link assertion |
| AC4 | Caution message under FaCT link | Admin-managed `location_metadata` (Q4) — post-deploy step | Manual/ops verification; release checklist |
| AC5 | Only 2 list types publishable under venue | Add 2 new `list-type-data` entries with `subJurisdictionIds: [10]`; delete superseded | Unit assert on list-type-data; E2E dropdown shows 2 |
| AC6 | Old list types removed but retained for MI | Delete 3 entries (soft-delete auto); packages remain (Q2 holds Circuit Commercial) | Assert entries absent from seed source; MI mapping Q6 |
| AC7 | Rolls Building list has multiple sections | `SECTIONS` (16) drives renderer/template | `renderer.test.ts`; `*.njk.test.ts` section count |
| AC8 | 16 sequential section headers (listed order) | `SECTIONS` in AC order (Q3 literal) | Template test asserts heading order EN + CY |
| AC9 | Multi-tab Excel upload (like London Admin) | `createMultiSheetConverter` over `SECTIONS` | Converter test with fixture workbook |
| AC10 | "No hearings scheduled for this day" per empty section | Template conditional per section | Template test both ways (empty vs populated) |
| AC11 | Rolls Building open-justice wording (Remote Hearings block + 5 contacts + Remote Judgments) | `locales/en.ts` + `cy.ts`; rendered on page + PDF | Template test asserts blocks; Welsh parity test |
| AC12 | Interim Applications: 2-tab Excel, judge name/email in wording | Package B config-tab pattern + interpolation | Converter test reads config tab; renderer test interpolation + fallback |
| AC13 | Lists arranged alphabetically under caution message | Existing `localeCompare` sort on venue publications page | E2E ordering assertion |

## 5. CLARIFICATIONS NEEDED

Consolidated open questions. **Blocking** items must be answered before the relevant code is written; others have a working recommendation.

### RESOLVED (user decision, 2026-08-20)

- **Q1 — RESOLVED: use the ChD/KB column set** — Judge, Time, Venue, Type, Case Number, Case **Name**, Additional Information. A new field config is needed (`RCJ_EXCEL_CONFIG_SIMPLE_TIME` cannot be reused verbatim). This applies to package A (Rolls Building) section tables and package B (Interim Applications) hearings tab.
- **Q2 — RESOLVED: leave `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` in place.** Do NOT delete it in this ticket. It has no package/page/wiring (only the data entry at `list-type-data.ts:761`) and is not London-scoped, so scope must be confirmed with the business first. Removal is a trivial one-line follow-up (delete the entry → deploy soft-deletes automatically). Delete only the other three: `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST`, `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST`, `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST`.

### Remaining open (non-blocking; recommendations stand)
- **Q3 — Is the 16-section order literal?** Items 1–11 read alphabetical, then 12–16 restart alphabetically (looks like two concatenated lists). **Recommendation: implement literal AC order; one-line `SECTIONS` reorder if corrected.**
- **Q4 (partially blocking) — Caution message + open-justice ownership & missing Welsh.** Caution message is admin-managed `location_metadata`, not code-seeded → post-deploy operational step (add to release notes). Welsh supplied covers only the first caution sentence — **need Welsh for** "If you do not see a list published for the court you are looking for, it means there are no hearings scheduled." Also **need Welsh** for the Interim Applications placeholder-free fallback: "Parties should contact the clerk to the Interim Judge as early as possible." Blocks final Welsh content sign-off, not the code skeleton.
- **Q5 — Does the venue's Welsh name change?** Current "Llysoedd Busnes ac Eiddo - Adeilad Rolls" ("Llysoedd" = Courts). **Recommendation: "Adran Busnes ac Eiddo - Adeilad Rolls"**, subject to Welsh language team.
- **Q6 — Old-name → new-section mapping for MI reporting** (not 1:1). Needs reporting owner input.
- **Q7 — Existing subscriptions on removed list types** stop silently. **Recommendation: out of scope; separate ticket.**
- **Q8 — Are the two Excel workbooks a deliverable?** Tab names are load-bearing (converter matches by `worksheetName`). **Recommendation: workbooks owned outside repo; this ticket produces the authoritative tab-name/column-header list + a fixture workbook for E2E/converter tests.**
- **Q9 — Confirm displayed address.** Existing Rolls Building pages show "Rolls Building / Fetter Lane, London / EC4A 1NL". **Recommendation: reuse verbatim.**
- **Q10 — `/list-search-config` entries** needed per new list type or cross-artefact case search won't index. Admin-managed; add to release checklist.
