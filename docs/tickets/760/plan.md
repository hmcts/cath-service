# Technical Plan — #760: Changes to Residential Property Tribunal (new list + name change)

## Overview

Three distinct changes to the Residential Property Tribunal (RPT):

1. **Rename** "Residential Property Tribunal" → "First-tier Tribunal (Property Chamber) - Residential Property Division" (with Welsh), without breaking existing subscriptions and updating the A-Z filter.
2. **New list type** `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` published at the same venue, mirroring the existing five RPT regional lists (same data fields, email summary, PDF, CSV, style guide, schema).
3. **Revised open-justice wording** in the "Important information" accordion for **all** RPT lists, with **region-specific email addresses** substituted for the current `[insert office email]` placeholder, plus an **additional bold paragraph** for Market Rents only.

The existing RPT implementation is a single shared lib (`libs/list-types/ftt-rpt-weekly-hearing-list`) driving five regional list-type name constants. The cleanest approach is to **extend the existing lib** to add a sixth (Market Rents) name constant rather than create a new lib — the data fields, schema, converter, renderer, PDF template and email summary are all identical per the ACs.

---

## Key architectural findings (grounding)

- **"Residential Property Tribunal" is modelled as a `SubJurisdiction` (id 24)**, not a `Location`. It is defined in `libs/location/src/location-data.ts:416-421` and `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql:42`. There is **no `Location` row** with that exact name in the local seed. The A-Z sidebar filter lists sub-jurisdictions.
- **Subscriptions reference location by `LOCATION_ID` (numeric), never by name** (`libs/subscriptions/src/repository/queries.ts`). Display names are resolved live from `Location.name`/`welshName` at render time. So a **`Location` rename** propagates automatically with zero subscription impact. Sub-jurisdictions are **not subscribable** in this model.
- The five existing RPT list types live in `libs/list-types/common/src/list-type-data.ts:337-391` (name, englishFriendlyName, welshFriendlyName, shortenedFriendlyName, `subJurisdictionIds: [24]`, `urlPath: "ftt-rpt-weekly-hearing-list"`, `isNonStrategic: true`).
- The **Excel upload dropdown** text is `shortenedFriendlyName || friendlyName || name` (`apps/web/src/pages/(admin)/non-strategic-upload/index.ts:19-32`).
- The **open-justice wording is a single shared locale string** (`libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts:11` + `cy.ts`), currently identical EN/CY English text, containing the literal `[insert office email]`. It is **not** parameterised per region today.
- **Region emails do not exist anywhere in source today** — this is net-new configuration.
- Registration touch-points for a list type name: converter (`registerConverterByName`), PDF (`PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts:139`), email summary (`libs/notifications/src/notification/notification-service.ts:214-233`), page controller `LIST_TYPE_CONFIG`, list-type seed data (TS + SQL), and sub-jurisdiction link SQL.
- The RPT lib converter is registered via its `index.ts` side-effect import, but the non-strategic upload page (`non-strategic-upload/index.ts`) only side-effect-imports a subset of libs and **does not import the RPT lib**. This must be verified/fixed so the new Market Rents converter is available during upload validation.

---

## Technical approach

### Part A — Venue / name change

**Decision required (see Clarifications).** Two interpretations:

- **(A1) Sub-jurisdiction rename** — update the `SubJurisdiction` id 24 `name`/`welshName` in `libs/location/src/location-data.ts:418-419` and `apps/postgres/prisma/scripts/003_upsert_sub_jurisdictions_and_list_type_links.sql:42`. This changes the A-Z sidebar filter label (satisfies "filter updated"). No subscription impact because sub-jurisdictions aren't subscribed. The `SubJurisdiction.name` `@unique` constraint means the new name must not collide.
- **(A2) `Location` rename** — if production has an actual venue named "Residential Property Tribunal" (not present in the 25-row local sample), rename its `Location.name`/`welshName`. Subscriptions are unaffected (they key on `locationId`). This is the interpretation the "should not impact existing subscriptions" AC most naturally points at.

Both are cheap. The plan will implement whichever the SM confirms; likely **both** the sub-jurisdiction label and any matching Location. The list-type friendly names (`First-tier Tribunal (Residential Property Tribunal): …`) are a **separate** decision — the ACs do **not** ask to change those, so leave them unless told otherwise.

### Part B — New Market Rents list type

Extend the existing lib. New name constant: **`FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST`**.

- **`libs/list-types/common/src/list-type-data.ts`** — add entry:
  - `englishFriendlyName`/`welshFriendlyName`: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List" / Welsh "Tribiwnlys Haen Gyntaf (Tribiwnlys Eiddo Preswyl): Rhestr Gwrandawiadau Wythnosol Rhenti'r Farchnad"
  - `shortenedFriendlyName`: "FTT (RPT): Market Rents Weekly Hearing List" (this is the dropdown label the AC specifies) / Welsh "FTT (RPT): Rhestr Gwrandawiadau Wythnosol Rhenti'r Farchnad"
  - `provenance: "CFT_IDAM"`, `urlPath: "ftt-rpt-weekly-hearing-list"`, `isNonStrategic: true`, `defaultSensitivity: "Public"`, `subJurisdictionIds: [24]`.
- **SQL seed scripts** — add the row to `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql` and the list-type→sub-jurisdiction link (→24) in `003_upsert_sub_jurisdictions_and_list_type_links.sql`.
- **Converter** — `libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts`: add `registerConverterByName("FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST", fttRptConverter)` (reuse the shared converter — identical fields).
- **PDF** — add a `FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST` entry to `PDF_GENERATOR_REGISTRY` in `libs/publication/src/processing/service.ts`, with `listTitle` = "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List".
- **Email summary** — add the name to `libs/notifications/src/notification/notification-service.ts` reusing `extractFttRptSummary`/`formatFttRptSummaryForEmail` (AC: same fields as existing RPT lists).
- **Page controller** — add the name to `LIST_TYPE_CONFIG` in `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.ts`, referencing new locale keys `rptMarketRentsCourtName`/`rptMarketRentsPageTitle`.
- **Locales** — add `rptMarketRentsCourtName`/`rptMarketRentsPageTitle` to `en.ts` + `cy.ts` (Welsh values supplied in ticket).
- **Schema/validator** — the AC states identical data fields, so **reuse** the existing `ftt-rpt-weekly-hearing-list.json` schema and `validateFttRptWeeklyHearingList`. No new schema file (avoids CLAUDE.md item-6 obligations) unless the SM wants a distinct schema.
- **Upload flow registration** — add `import "@hmcts/ftt-rpt-weekly-hearing-list";` to `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` so the (new and existing) RPT converters are registered during upload validation.

### Part C — Open-justice wording (all RPT lists) + region emails

The wording change applies to **all** RPT regional lists. The new text differs from the current string: it drops "telephone or", changes the follow-on sentence, and requires a **region-specific email** in place of `[insert office email]`.

Because the accordion text must now vary by region (email) and Market Rents needs an extra bold paragraph, the single shared `importantInformationText` must become **region-aware**. Proposed design:

- Introduce a per-list-type mapping of **region email** and (for Market Rents) an **extra bold paragraph flag** in the page controller's `LIST_TYPE_CONFIG` (string-keyed, per CLAUDE.md — never numeric IDs).
- Refactor the locale so the open-justice text is composed from parts: a lead sentence with a `{email}` token, the "Listings often change at short notice…" sentence (Welsh supplied), and the guidance link. Render the email per region.
- Region emails (from AC): Eastern `RPEastern@justice.gov.uk`, Midlands `rpmidland@justice.gov.uk`, Northern `rpnorthern@justice.gov.uk`, Southern `RPSouthern@justice.gov.uk`, London `London.Rap@justice.gov.uk`, Market Rents (Leicester) `marketrents@justice.gov.uk`.
- **Market Rents extra bold paragraph** (EN): "For Market Rent applications received before 16 March 2026 please check the relevant regional hearing list(s) or call the Tribunal on 0300 303 5857." (Welsh supplied in ticket). Rendered in bold (`govuk-!-font-weight-bold`) only for the Market Rents list.
- Update the `.njk` accordion (`ftt-rpt-weekly-hearing-list.njk:17-31`) to render the composed lead sentence, the region email as a `mailto:` link, the short-notice sentence, the optional bold Market Rents paragraph, and the guidance link.
- Apply the same wording to the **PDF template** (`libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk`) if it renders the open-justice text.

> Note on the AC's Welsh Market Rents block: the Welsh open-justice text supplied in the ticket says "telephone or video" and hard-codes `marketrents@justice.gov.uk`, whereas the English revised wording drops "telephone" and uses per-region emails. This inconsistency is flagged in Clarifications.

---

## Implementation details (files)

| Area | File(s) |
|------|---------|
| List-type reference data | `libs/list-types/common/src/list-type-data.ts` |
| SQL seed | `apps/postgres/prisma/scripts/001_insert_missing_list_types.sql`, `003_upsert_sub_jurisdictions_and_list_type_links.sql` |
| Sub-jurisdiction / venue rename | `libs/location/src/location-data.ts`, `003_upsert_sub_jurisdictions_and_list_type_links.sql` (and `Location` seed if A2) |
| Converter | `libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts` |
| PDF registry | `libs/publication/src/processing/service.ts` |
| Email summary | `libs/notifications/src/notification/notification-service.ts` |
| Locales (wording, region emails, Market Rents titles) | `libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts`, `cy.ts` |
| Page controller (`LIST_TYPE_CONFIG` + region email/bold map) | `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.ts` |
| Web template (accordion) | `apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk` |
| PDF template | `libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk` |
| Upload converter registration | `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` |

No Prisma schema change needed (region email held in locale/config, not DB). No new lib.

---

## Error handling & edge cases

- `guardArtefact` already rejects unknown `listTypeName`; the new name must be added to `LIST_TYPE_CONFIG` or Market Rents artefacts render a 400.
- Converter must be registered in the upload flow, else Excel upload of Market Rents fails validation with a confusing error.
- `SubJurisdiction.name`/`welshName` and `Location.name`/`welshName` are `@unique` — the new venue name must not collide with an existing row.
- EN/CY locale objects must keep identical key sets (there is a parity test pattern).
- Region email rendered as `mailto:` — ensure no HTML-injection and correct escaping; emails are static constants, not user input.
- If a Market Rents artefact is uploaded before the list type is seeded in an environment, the dropdown won't show it — seeding via SQL scripts + TS seed data covers all environments.

---

## Acceptance criteria mapping

1. **Venue rename** → Part A (sub-jurisdiction and/or Location `name`/`welshName`). *Pending clarification A1 vs A2.*
2. **No subscription impact** → Confirmed: subscriptions key on `locationId`; name resolved live. Automatically satisfied for a `Location` rename; N/A for sub-jurisdiction (not subscribable).
3. **A-Z filter updated** → sub-jurisdiction label read live from DB in the courts-tribunals-list filters; satisfied by Part A.
4. **New list type titled "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List"** → Part B, `englishFriendlyName` + page title locale key.
5. **Dropdown shows "FTT (RPT): Market Rents Weekly Hearing List"** → `shortenedFriendlyName` in list-type-data + SQL seed.
6. **Style guide, schema, PDF, CSV** → reuse existing RPT schema/converter/PDF; CSV produced by the shared converter path; style guide mirrors existing RPT with new open-justice wording.
7. **Email summary fields same as existing RPT** → reuse `extractFttRptSummary`/`formatFttRptSummaryForEmail`.
8. **Data fields same as existing** (Date, Time, Venue, Case type, Case reference number, Judge(s), Member(s), Hearing method, Additional information) → identical `FttRptHearing` model already matches exactly.
9. **Revised open-justice wording for all RPT lists** → Part C locale/template refactor.
10. **Region-specific emails** → Part C region-email map, rendered per list.
11. **Market Rents extra bold paragraph** → Part C conditional bold paragraph.
12. **Welsh translations** → supplied in ticket; add to `cy.ts`. Short-notice sentence Welsh supplied; remaining new EN text needs Welsh (see Clarifications).

---

## Verification approach

- **Unit**: converter registration test (name resolvable), page-controller test asserting Market Rents renders with correct title/court name and region email in the accordion, and that each region renders its own email; validator test already covers the shared schema (reused).
- **Template test** (`*.njk.test.ts`): accordion renders revised wording, region `mailto:` link present, Market Rents bold paragraph present only for Market Rents, absent otherwise; Welsh rendering asserted; EN/CY key parity.
- **PDF test**: `generateFttRptWeeklyHearingListPdf` produces the Market Rents title.
- **E2E**: one journey viewing a Market Rents published list (happy path + accessibility + Welsh inline), per CLAUDE.md minimal-test rule.
- **Seed**: run `yarn db:migrate:dev` / seed and confirm the new list type appears in the non-strategic upload dropdown with the FTT (RPT) shortened label.

---

## CLARIFICATIONS NEEDED

1. **Venue vs sub-jurisdiction rename.** "Residential Property Tribunal" exists in code as a **sub-jurisdiction** (id 24), not a `Location` venue. Does production have an actual **`Location`** named "Residential Property Tribunal" that must be renamed, or is the rename purely the sub-jurisdiction filter label (and possibly the list-type friendly names)? This determines whether the "no subscription impact" AC is about a real venue subscription.
2. **List-type friendly names.** Should the existing five RPT list-type friendly names ("First-tier Tribunal (Residential Property Tribunal): … region Weekly Hearing List") also change to reflect the new venue name, or stay as-is? The ACs only mention the venue and the new Market Rents title, so current plan leaves them unchanged.
3. **"[insert office email]" for existing regions.** The revised wording requires a real email per region. Confirm the region→email mapping (Eastern `RPEastern@justice.gov.uk`, Midlands `rpmidland@justice.gov.uk`, Northern `rpnorthern@justice.gov.uk`, Southern `RPSouthern@justice.gov.uk`, London `London.Rap@justice.gov.uk`, Market Rents `marketrents@justice.gov.uk`). Casing is inconsistent in the ticket (e.g. `RPEastern` vs `rpmidland`) — confirm exact addresses.
4. **EN vs Welsh open-justice inconsistency.** The English revised wording drops "telephone or" ("join any video hearing"), but the Welsh block supplied says "telephone or video" and hard-codes `marketrents@justice.gov.uk` for all. Which is correct for the non-Market-Rents regions? Confirm the canonical EN and CY text.
5. **Welsh for new English sentences.** The ticket supplies Welsh for the venue name, list title, dropdown label, short-notice sentence, and the Market Rents bold paragraph. It does **not** clearly supply Welsh for the full revised lead sentence with a generic `{email}` token. Confirm whether the existing Welsh lead sentence is reused or new Welsh is pending (placeholder `[WELSH TRANSLATION REQUIRED]` will be used in the interim per CLAUDE.md).
6. **Separate schema for Market Rents?** ACs say data fields are identical to existing RPT lists, so the plan reuses the existing schema/validator. Confirm no Market-Rents-specific validation is required (which would trigger the mandatory new-schema + validator + test obligation in CLAUDE.md).
