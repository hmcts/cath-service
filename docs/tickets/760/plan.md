# Technical Plan — Issue #760: Changes to Residential Property Tribunal (new list + name change)

## 0. Correction of prior AI-drafted spec (comment on 2026-07-22)

The first AI comment on this issue is a useful starting reference but contains inaccuracies that were **verified against the current codebase** and must not be carried into implementation:

| Claim in prior comment | Actual state (verified) |
|---|---|
| "Update `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`" and `003_upsert_sub_jurisdictions_and_list_type_links.sql` | **These files do not exist in the repo.** `apps/postgres/prisma/scripts/` is not a directory that exists. Reference/seed data (locations, sub-jurisdictions, list types) is sourced entirely from `libs/location/src/location-data.ts` and `libs/list-types/common/src/list-type-data.ts`. On deploy, `apps/postgres/prisma/generate-seed-sql.ts` reads these TypeScript files and emits idempotent `INSERT ... ON CONFLICT` SQL. Locally, `yarn db:seed` reads the same TypeScript files via `libs/location/src/seed-data.ts` / `seed-list-types.ts`. **No hand-written SQL is needed or wanted** — see `CLAUDE.md` "List Type Implementation" §7. |
| "Migration mirror files under `requirements/migrations/`" | `requirements/migrations/*.sql` is an unrelated append-only log for a `requirement` traceability table (GitHub issue/requirement sync), not a data/schema migration mechanism for this feature. **Not applicable to this ticket.** |
| "The renamed venue appears under letter 'F'... grouped under F" (implying the main A–Z table) | The A–Z **table** (`courts-tribunals-list/index.njk`) is grouped by `location.name` (venue rows), sourced from `location-data.ts` `locations[]`. There is **no `Location` row** named "Residential Property Tribunal" — it only exists as a **sub-jurisdiction** (id 24), which appears as a **checkbox filter** under the "Tribunal" jurisdiction (id 4) in the left-hand filter panel, sorted alphabetically by `subJurisdictionItemsByJurisdiction` (`.sort((a,b) => a.text.localeCompare(b.text))`). Renaming it moves its position in that alphabetically-sorted checkbox list from "R" to "F" — it does **not** add/move a row in the main venue table. AC wording ("filter on the A-Z page") is consistent with this; the wireframe's framing of it as an A-Z-table row is not. |
| "Excel upload dropdown" (implying `manual-upload`) | All five existing RPT list types have `isNonStrategic: true`. Non-strategic list types are uploaded via `/non-strategic-upload` (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts`, sourced from `findNonStrategicListTypes()`), **not** `/manual-upload` (which lists only strategic types). The new Market Rents list type must also be `isNonStrategic: true` so it appears in the correct dropdown. |
| File paths for locales, controller, PDF registry, email registry, Excel converter registration | All confirmed correct and current — no changes needed to these paths. |

Everything else below is based on direct inspection of the current codebase.

## 1. Technical Approach

This is a **content/configuration change to an existing shared list-type module**, not a new package. The five existing RPT region lists (`FTT_RPT_EASTERN/LONDON/MIDLANDS/NORTHERN/SOUTHERN_WEEKLY_HEARING_LIST`) all share one lib (`libs/list-types/ftt-rpt-weekly-hearing-list`), one JSON schema, one Excel converter config, one PDF generator, one email-summary builder and one Nunjucks template. The new "Market Rents" list has an **identical data shape** (per AC), so it extends this same lib as a sixth list-type code rather than creating a new package.

Three independent changes, each isolated to its own data/config surface:

1. **Rename sub-jurisdiction 24** in `libs/location/src/location-data.ts` (name + welshName only). This is a single source-of-truth data edit — it propagates automatically to the A-Z filter checkbox and to `list_type_data`/deploy seed SQL. **No subscription impact**: subscriptions key on `locationId`/`listTypeId`/sub-jurisdiction id (stable), never on display name — confirmed no code path stores a subscription against a name string.
2. **Add a sixth list-type entry** (`FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST`) to `libs/list-types/common/src/list-type-data.ts`, register it in the Excel converter, PDF generator registry, and email-builder registry, and add it to the web controller's `LIST_TYPE_CONFIG`. Reuses the existing schema/validator/renderer/template — no new package, no new schema file (per CLAUDE.md's schema-validator-test rule, only new schemas need new validators; this ticket adds no new schema).
3. **Revise the open-justice wording** in `en.ts`/`cy.ts` for the shared RPT locale files, with per-region email substitution, and add a Market-Rents-only bold paragraph rendered conditionally in the shared Nunjucks template.

### Architecture decision: per-region email substitution

The current `importantInformationText` is one static string per locale, containing the literal placeholder `"[insert office email]"`, shared by all five (soon six) list types. To substitute six different emails into one shared string without duplicating the whole paragraph six times per locale:

- Replace the static string with a **function** `buildImportantInformationText(email: string): string` exported from `en.ts`/`cy.ts` (or a shared `locales/` helper), which does `en.importantInformationTextTemplate.replace("{email}", email)`.
- Add `rptRegionalEmail: Record<string, string>` keyed by **list type name** (never numeric id, per CLAUDE.md list-type rules) in the locale files, e.g.:
  ```ts
  export const en = {
    ...
    importantInformationTextTemplate:
      'Members of the public wishing to observe a hearing or representatives of the media may, on their request, join any video hearing remotely while they are taking place by sending an email in advance to the tribunal at {email} with the following details in the subject line "[OBSERVER/MEDIA] REQUEST – [case reference] – [hearing date]" and appropriate arrangements will be made to allow access where reasonably practicable.',
    importantInformationSecondParagraph: "Listings often change at short notice, and therefore if you wish to observe a hearing, you may wish to contact the office first to check it is proceeding.",
    rptRegionalEmail: {
      FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: "RPEastern@justice.gov.uk",
      FTT_RPT_LONDON_WEEKLY_HEARING_LIST: "London.Rap@justice.gov.uk",
      FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: "rpmidland@justice.gov.uk",
      FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: "rpnorthern@justice.gov.uk",
      FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: "RPSouthern@justice.gov.uk",
      FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: "marketrents@justice.gov.uk"
    },
    marketRentsExtraInformation: "For Market Rent applications received before 16 March 2026 please check the relevant regional hearing list(s) or call the Tribunal on 0300 303 5857."
  };
  ```
- Controller resolves `importantInformationText = buildText(t.importantInformationTextTemplate, t.rptRegionalEmail[artefact.listTypeName])` and passes it to the template as a data value (not a locale-key lookup), keeping the template itself unaware of the substitution mechanism (it just renders `{{ importantInformationText }}`).
- Template conditionally renders `marketRentsExtraInformation` as a bold paragraph only when the resolved list type is Market Rents (pass an explicit `extraInformationText` prop that is `""` for the other five; `{% if extraInformationText %}` in the template avoids leaking an `isMarketRents` boolean into the template's contract).

This keeps the CLAUDE.md rule "court names / list-type-specific strings must come from locale files, keyed by `listTypeName`" intact, avoids six near-duplicate hard-coded paragraphs, and needs zero schema/model changes.

### Two duplicate `.njk` templates — clean up the stale one

There are **two identical copies** of the RPT template:
- `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk` — this is the one actually rendered (confirmed: its co-located `index.test.ts` and `ftt-rpt-weekly-hearing-list.njk.test.ts` exercise the live controller/template pair; `apps/web/src/app.ts`'s `modulePaths` list is the Nunjucks search path, and the CLAUDE.md architecture note states page templates now live under `apps/web/src/pages/`).
- `libs/list-types/ftt-rpt-weekly-hearing-list/src/views/ftt-rpt-weekly-hearing-list.njk` — unmodified since the original PR (#749) that first added the RPT list types; not touched by any subsequent RPT change; appears to be dead leftover from before the page-template migration described in CLAUDE.md.

**Only the `apps/web` copy needs the conditional-bold-paragraph edit.** To avoid the two files drifting further and confusing future maintainers, this ticket also deletes the stale `libs/.../src/views/ftt-rpt-weekly-hearing-list.njk` copy (see Tasks). This is a low-risk cleanup, confirmed dead by the render path above — flagged as a call for reviewer confirmation before merging (see Clarifications).

## 2. Implementation Details

### File changes (all in existing files — no new packages)

| File | Change |
|---|---|
| `libs/location/src/location-data.ts` (~L417-421) | Rename sub-jurisdiction id 24: `name` → `"First-tier Tribunal (Property Chamber) - Residential Property Division"`, `welshName` → `"Tribiwnlys Haen Gyntaf (Siambr Eiddo) – Adran Eiddo Preswyl"`. `jurisdictionId: 4` unchanged. |
| `libs/list-types/common/src/list-type-data.ts` (~L359-413, after the five existing RPT entries) | Add new entry: `name: "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST"`, `englishFriendlyName: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List"`, `welshFriendlyName` (Welsh from ticket), `provenance: "CFT_IDAM"`, `urlPath: "ftt-rpt-weekly-hearing-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `shortenedFriendlyName: "FTT (RPT): Market Rents Weekly Hearing List"`, `subJurisdictionIds: [24]`. |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts` | Replace static `importantInformationText` with `importantInformationTextTemplate` (email placeholder) + `importantInformationSecondParagraph` (link paragraph already separate — verify current structure keeps as-is); add `rptRegionalEmail` map (keyed by list type name); add `marketRentsExtraInformation`; add `rptMarketRentsCourtName`, `rptMarketRentsPageTitle`. |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts` | Same keys with genuine Welsh (see §3 pre-existing debt note). |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts` | Add `registerConverterByName("FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST", fttRptConverter);` |
| `libs/publication/src/processing/service.ts` (~L221-255, `PDF_GENERATOR_REGISTRY`) | Add `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: (p) => generateFttRptWeeklyHearingListPdf({ ...p, jsonData: p.jsonData as FttRptHearingList, courtName: "First-tier Tribunal (Residential Property Tribunal)", listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List" })` — same pattern as the other five. |
| `libs/notifications/src/notification/notification-service.ts` (~L224-243, `EMAIL_BUILDER_REGISTRY` or equivalent map) | Add `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST: { extract: extractFttRptSummary, format: formatFttRptSummaryForEmail }` — identical to the other five (reuses the same extractor/formatter; confirms AC "email summary fields... same as existing lists"). |
| `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.ts` | Add `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` to `LIST_TYPE_CONFIG`; resolve `importantInformationText` via the template+email-map function; resolve `extraInformationText` (Market Rents only); pass both to `res.render`. |
| `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk` | Replace `{{ t.importantInformationText }}` with `{{ importantInformationText }}` (controller-resolved value, not a locale key); add conditional bold paragraph: `{% if extraInformationText %}<p class="govuk-body govuk-!-font-weight-bold">{{ extraInformationText }}</p>{% endif %}` inside the `<details>` block, after the existing link paragraph. |
| `libs/list-types/ftt-rpt-weekly-hearing-list/src/views/ftt-rpt-weekly-hearing-list.njk` | **Delete** (stale duplicate, confirmed dead — see §1). |
| Tests (see below) | Update/add per the changed contract. |

No changes needed to: `models/types.ts`, `schemas/ftt-rpt-weekly-hearing-list.json`, `validation/json-validator.ts`, `rendering/renderer.ts`, `pdf/pdf-generator.ts`, `email-summary/summary-builder.ts` — the data shape and rendering pipeline are unchanged; only locale content and list-type registration change.

### Database / seed data

No hand-written SQL, no Prisma schema change, no new migration. `location-data.ts` and `list-type-data.ts` edits are picked up automatically by:
- Local dev: `yarn db:seed` → `apps/postgres/prisma/seed.ts` → `seedLocationData()` / `seedListTypes()`.
- Deployed environments: `apps/postgres/start.sh` → `generate-seed-sql.ts` → `prisma db execute`.

Run `yarn db:seed` (or `yarn db:migrate:dev` if any Prisma schema drift is later found — not expected here) locally after the data-file edits to verify the rename and new list type land correctly, and that `list_types_sub_jurisdictions` links the new list type to sub-jurisdiction 24.

### Tests to add/update

- `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/*` — no dedicated test file exists today; locale parity is asserted in the njk test (`Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`) — keep this passing for the new keys.
- `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.test.ts` — add a 6th `REGION_CASES` entry for Market Rents (courtName/listTitle), and cases asserting: (a) the resolved `importantInformationText` contains the correct regional email for each of the six codes, (b) `extraInformationText` is non-empty only for Market Rents and empty for the other five.
- `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk.test.ts` — add cases: important-information paragraph contains the substituted email (not the literal placeholder); bold extra paragraph renders with `govuk-!-font-weight-bold` when `extraInformationText` is passed, and is absent when it is `""`.
- `libs/list-types/common/src/list-type-data.ts` — no dedicated unit test found; the deploy-seed generator has `apps/postgres/prisma/generate-seed-sql.test.ts` — check it doesn't assert an exact/snapshot count of list types that would break when one is added (verify before merging; update snapshot if present).
- `libs/location/src/location-data.ts` — check `libs/location/src/seed-data.test.ts` / `seed-list-types.test.ts` for any hard-coded assertion on sub-jurisdiction 24's name string; update if present.
- E2E: one journey test only, per CLAUDE.md's "minimize test count" rule (see §5).

## 3. Error Handling & Edge Cases

- **Unknown/unsupported list type**: already handled by `guardArtefact` in the controller (`LIST_TYPE_CONFIG[artefact.listTypeName]` lookup) — adding the new code to the map means it is *not* rejected; no new error path needed.
- **Missing regional email for a list type code**: if `rptRegionalEmail[artefact.listTypeName]` is ever undefined (e.g. future 7th region added without updating the map), the template substitution would silently render `{email}` literally into the public page. Guard this in the controller: fall back to an empty string or throw before render if the map lookup misses, so a missing entry fails a test rather than shipping a broken placeholder to citizens. Add a unit test asserting all six `LIST_TYPE_CONFIG` keys have a corresponding `rptRegionalEmail` entry in both `en` and `cy`.
- **Locale key parity**: enforce `Object.keys(en).sort() === Object.keys(cy).sort()` (existing test) — the new `rptRegionalEmail`, `marketRentsExtraInformation`, `rptMarketRentsCourtName`, `rptMarketRentsPageTitle`, `importantInformationTextTemplate`, `importantInformationSecondParagraph` keys must exist in both files.
- **Genuine Welsh vs pre-existing English-in-cy.ts debt — RESOLVED, scope expanded (Clarification 6)**: `cy.ts` currently duplicates `en.ts` verbatim for every string (confirmed by reading both files — byte-identical apart from the `provenanceLabelsCy` import). Per the resolved clarification, this ticket **must** supply genuine Welsh for the **entire file**, not just new/changed strings. See §3a for the full per-key sourcing table: verified boilerplate translations are reused verbatim from sibling list-types (`pht-weekly-hearing-list`, `care-standards-tribunal-weekly-hearing-list`); new/changed strings use the ticket-supplied Welsh; any remaining string with no verified translation anywhere in the codebase (table headers, `searchCasesLabel`, the 5 existing region court names/page titles) uses the established `[WELSH TRANSLATION REQUIRED: '...']` placeholder convention (precedent: `grc-weekly-hearing-list/src/locales/cy.ts`), pending sign-off from the ticket's named Welsh translator (Kimberley Newton).
- **Welsh for the full revised lead sentence with per-region email — RESOLVED (Clarification 5)**: use the ticket-supplied Welsh paragraph as the canonical `cy` `importantInformationTextTemplate`, with `{email}` substituted per region exactly as done for English — same mechanism, both locales.
- **Non-strategic upload sensitivity/provenance**: new list type must set `defaultSensitivity: "Public"` and `provenance: "CFT_IDAM"` to match its siblings — mismatched provenance would silently break the non-strategic upload validation/summary flow (provenance drives which upload path/validation is used elsewhere in the codebase).
- **Sub-jurisdiction rename and existing published artefacts**: existing/historic artefacts under the five region list types are keyed by `listTypeName`/`listTypeId`, not sub-jurisdiction display name — renaming sub-jurisdiction 24 does not require any artefact backfill.
- **Realign SQL race in `generate-seed-sql.ts`**: the generator's `generateRealignSql` parks any row whose *name or welsh_name* collides with an incoming seed value before re-inserting by id. Since "Residential Property Tribunal" (old name) is being replaced and no other seed row introduces that old string, this is a straightforward rename with no risk of colliding with another still-active row — confirmed by grep, only one occurrence of "Residential Property Tribunal" in `location-data.ts` before the edit.

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Satisfied by | Verification |
|---|---|---|
| Venue name changed to "First-tier Tribunal (Property Chamber) - Residential Property Division" | `location-data.ts` sub-jurisdiction 24 rename | Unit test on `location-data.ts` (or seed-data test) asserting the new name/welshName; manual check of `/courts-tribunals-list` filter panel under "Tribunal" |
| Rename does not impact existing subscriptions | No code change needed — subscriptions key on `locationId`/list-type id, never on display name (confirmed via `libs/location` repository/service code) | Existing subscription tests continue to pass unmodified; no subscription-table code touches sub-jurisdiction name |
| A-Z filter updated with new venue name | Automatic — `getAllSubJurisdictions()` reads live DB values seeded from `location-data.ts` | `courts-tribunals-list/index.njk.test.ts` / manual check: filter checkbox label reads the new name, sorted under "F" among Tribunal sub-jurisdictions |
| New list type "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST" created, titled correctly | `list-type-data.ts` new entry | `index.test.ts` region-case test; deploy-seed generator test |
| Dropdown shows "FTT (RPT): Market Rents Weekly Hearing List" | `shortenedFriendlyName` on the new entry | `non-strategic-upload` dropdown test / manual check |
| Style guide, validation schema, PDF, CSV created (reusing existing RPT style) | Reuses existing schema/validator/Excel-converter/PDF-generator via new registrations | `pdf-generator.test.ts` new case; `ftt-rpt-config.ts` converter registration; existing schema/validator untouched |
| Email summary fields same as existing RPT lists | `EMAIL_BUILDER_REGISTRY` entry reuses `extractFttRptSummary`/`formatFttRptSummaryForEmail` | Notification-service test asserting the new code maps to the same extractor/formatter |
| Data fields identical (9 columns) | No model/schema/renderer change — Market Rents reuses `FttRptHearing` shape | Existing njk table-column tests already cover this; Market Rents fixture added to the region-case loop asserts same columns |
| Revised open-justice wording on all RPT lists with per-region email | `en.ts`/`cy.ts` template + `rptRegionalEmail` map + controller resolution | njk test per region asserting the resolved email appears and the placeholder string never appears |
| Bold extra paragraph on Market Rents only | Controller passes `extraInformationText` only for Market Rents; template conditional | njk test: bold paragraph present for Market Rents, absent for the other five |
| Regional email addresses correct | `rptRegionalEmail` map values from ticket table | Unit test asserting each of the six codes' email matches the ticket's table |
| Welsh support for all revised/added content | `cy.ts` additions using ticket-supplied Welsh | njk Welsh-rendering test extended to cover venue name (via location fixture), list title, bold paragraph, open-justice wording |

## 5. Test Scenarios (E2E)

Per CLAUDE.md's "minimize test count" rule, add at most one or two `@nightly` Playwright journeys (not one test per AC):

1. **Publisher journey**: sign in → open non-strategic upload → select the RPT venue → open list-type dropdown → confirm "FTT (RPT): Market Rents Weekly Hearing List" is present → upload a valid Market Rents Excel/JSON file → confirm publish succeeds.
2. **Public viewer journey**: open `/courts-tribunals-list` → confirm the renamed sub-jurisdiction appears in the Tribunal filter (Welsh check inline via `?lng=cy`) → view a published Market Rents artefact → confirm all 9 columns render, the "Important information" accordion is open by default with the correct region email substituted, the bold Market-Rents-only paragraph is present → run axe accessibility scan inline → repeat spot-check of one non-Market-Rents RPT list to confirm the bold paragraph is absent there and its own regional email is substituted.

## CLARIFICATIONS — RESOLVED (2026-07-28)

1. **Existing list-type friendly names / court names unchanged?** → **Yes, intentional.** The five existing RPT region list types keep their old "Residential Property Tribunal" phrasing in `englishFriendlyName`/`courtName`/PDF `listTitle`. Only the sub-jurisdiction (venue) name at `location-data.ts` id 24 changes. No change to `rptEastern/London/Midlands/Northern/SouthernCourtName`/`PageTitle` keys.
2. **"telephone or video" vs "video" only?** → **Keep "telephone or video".** Verified the current `en.ts`/`cy.ts` `importantInformationText` already reads "...join any **telephone or video** hearing remotely..." — the AC's literal "video hearing" drop of "telephone" is **not** carried into the rewrite. The new `importantInformationTextTemplate` (EN and CY) must retain "telephone or video" for consistency with the existing wording and the ticket's own supplied Welsh ("dros y ffôn neu fideo").
3. **Literal `[insert office email]` placeholder — ever shipped literally?** → **No.** Every one of the six list types must resolve to a real regional email; the literal placeholder must never render. Enforced by the "missing email → fail" guard in §3 and its accompanying unit test.
4. **Region → email casing** → **Use exactly the ticket's casing**, verbatim: `RPEastern@justice.gov.uk`, `rpmidland@justice.gov.uk`, `rpnorthern@justice.gov.uk`, `RPSouthern@justice.gov.uk`, `London.Rap@justice.gov.uk`, `marketrents@justice.gov.uk`. No normalisation to lower/upper case.
5. **Generalising the Market-Rents-specific Welsh paragraph into a shared per-region template?** → **Confirmed.** Use the ticket's supplied Welsh sentence as the canonical `cy` `importantInformationTextTemplate`, substituting `{email}` per region exactly as done for English — same mechanism, both locales.
6. **Scope of pre-existing `cy.ts` English-in-Welsh debt** → **Expanded scope: fix it.** Confirmed by direct inspection that `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts` is **byte-identical to `en.ts`** (English text under a Welsh key) for every single existing string — this is not limited to the strings this ticket touches. This ticket must supply genuine Welsh for the **entire file**, not just the new/changed keys. See new §3a below for the sourcing approach and per-key status table, since this is a larger scope than originally planned.
7. **16 March 2026 cut-off date** → **Confirmed static.** Use the date exactly as written in the ticket ("16 March 2026"); no runtime date logic, no auto-hide behaviour.
8. **Delete the stale duplicate `.njk`** → **Yes, confirmed.** Delete `libs/list-types/ftt-rpt-weekly-hearing-list/src/views/ftt-rpt-weekly-hearing-list.njk` as part of this PR (not deferred).
9. **Snapshot/count-style tests on `listTypeData`/`locationData`** → **Yes, check and update.** Implementer must run the full test suite for `libs/list-types/common` and `apps/postgres` after adding the new list-type entry and confirm/update any snapshot or hard-coded-count assertions that break.

## 3a. Welsh translation sourcing for the pre-existing `cy.ts` debt (scope confirmed in Clarification 6)

`libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts` currently duplicates `en.ts` verbatim. Per the resolved scope, this ticket must genuinely translate the whole file. Sourcing approach, verified by cross-referencing other list-type `cy.ts` files that **already carry professionally-supplied Welsh** for identical boilerplate strings (e.g. `care-standards-tribunal-weekly-hearing-list`, `pht-weekly-hearing-list`):

| Key | Source | Verified Welsh value |
|---|---|---|
| `listForWeekCommencing` | Reused verbatim (identical EN string, already translated elsewhere) | "Rhestr ar gyfer yr wythnos yn dechrau ar" |
| `lastUpdated` | Reused verbatim | "Diweddarwyd ddiwethaf" |
| `at` | Reused verbatim | "am" |
| `factLinkText` + `factAdditionalText` | Reused verbatim (same two-part FaCT sentence used across all list types) | "Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr" / "a rhai tribiwnlysoedd heb eu datganoli yn yr Alban." |
| `importantInformationTitle` | Reused verbatim | "Gwybodaeth bwysig" |
| `importantInformationTextTemplate` | **Ticket-supplied** (per-region template, see §2) | Ticket's Welsh paragraph, `{email}` substituted |
| `importantInformationSecondParagraph` | **Ticket-supplied** | "Mae rhestrau'n aml yn newid ar fyr rybudd, ac felly os ydych yn dymuno arsylwi gwrandawiad, efallai yr hoffech gysylltu â'r swyddfa gyntaf i wirio a yw'n mynd yn ei flaen." |
| `importantInformationLinkText` | Reused verbatim | "Arsylwi gwrandawiad llys neu dribiwnlys fel newyddiadurwr, ymchwilydd neu aelod o'r cyhoedd" |
| `marketRentsExtraInformation` | **Ticket-supplied** (bold paragraph, Market Rents only) | Ticket's Welsh sentence |
| `dataSource` | Reused verbatim | "Ffynhonnell data" |
| `backToTop` | Reused verbatim | "Yn ôl i frig y dudalen" |
| `cautionNote` | Reused verbatim | "Noder bod y ddogfen hon yn cynnwys Data Categori Arbennig..." (full text as in sibling files) |
| `cautionReporting` | Reused verbatim | "Mae'r ddogfen hon yn cynnwys gwybodaeth a fwriedir..." (full text as in sibling files) |
| `searchCasesTitle` | Reused verbatim | "Chwilio Achosion" |
| `searchCasesLabel` | **No verified match anywhere in the codebase** (RPT's exact English wording is unique) | `[WELSH TRANSLATION REQUIRED: 'Search by case reference number, date, venue, or other details']` |
| `tableHeaders.date/time/venue/caseType/judges/members/hearingMethod` | **No verified match anywhere in the codebase** — even `grc-weekly-hearing-list` (which shares `judges`/`members` keys) has these marked `[WELSH TRANSLATION REQUIRED: ...]`, unresolved | `[WELSH TRANSLATION REQUIRED: '<English value>']` for each, following the exact bracket convention already used in `grc-weekly-hearing-list/src/locales/cy.ts` |
| `tableHeaders.caseReferenceNumber` | **No verified match** | `[WELSH TRANSLATION REQUIRED: 'Case reference number']` |
| `tableHeaders.additionalInformation` | Reused verbatim (verified in multiple sibling files) | "Gwybodaeth ychwanegol" |
| `rptEastern/London/Midlands/Northern/SouthernCourtName` + `PageTitle` (5 existing, untouched per Clarification 1) | **No verified match; ticket does not supply these** | `[WELSH TRANSLATION REQUIRED: '<English value>']` each |
| `rptMarketRentsCourtName` / `rptMarketRentsPageTitle` | **Ticket-supplied** | Ticket's Welsh translations for the new list title/short name |
| Venue name (`location-data.ts` `welshName`) | **Ticket-supplied** | "Tribiwnlys Haen Gyntaf (Siambr Eiddo) – Adran Eiddo Preswyl" |

**Rule applied:** never invent legal/procedural Welsh translations. Reuse only strings already verified as professionally translated identically elsewhere in the codebase; everything else uses the existing `[WELSH TRANSLATION REQUIRED: '...']` convention (already established in-repo, e.g. `grc-weekly-hearing-list/src/locales/cy.ts`) pending sign-off from the ticket's named Welsh translator (Kimberley Newton, per the ticket).
