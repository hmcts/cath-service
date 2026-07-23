# Technical Plan: Business and Property Courts Rolls Building venue (#659)

## 1. Technical Approach

This is **predominantly a reference-data / configuration task, not a new-page build**. The public
summary page the acceptance criteria describe already exists and already renders every required
element:

- Controller: `apps/web/src/pages/(public)/summary-of-publications/index.ts`
- Template: `apps/web/src/pages/(public)/summary-of-publications/index.njk`
- Content: co-located `en.ts` / `cy.ts`

The template already renders, in order:
1. `<h1>{{ title }}</h1>` where `title = "${t.titlePrefix} ${locationName}${t.titleSuffix}"`
   → `"What do you want to view from Business and Property Courts Rolls Building?"` (verified `en.titlePrefix = "What do you want to view from"`, `titleSuffix = "?"`).
2. The FaCT link paragraph, built from `factLinkText` / `factLinkUrl` / `factAdditionalText`
   (verified `factLinkText = "Find contact details and other information about courts and tribunals"`,
   `factLinkUrl = "https://www.find-court-tribunal.service.gov.uk/"`) — the masking required by the AC
   is already implemented (`{{ factLinkText }}` is the anchor, `{{ factAdditionalText }}` the trailing text).
3. `{{ cautionMessage | safe }}` — sourced from `LocationMetadata.cautionMessage` /
   `welshCautionMessage` via `getLocationMetadataByLocationId(locationId)`.
4. The alphabetically-sorted list of published list types (controller sorts by friendly name).

So the work is:
1. **Register the new location** (`locationId: 26`) in seed data.
2. **Register the 17 Rolls Building list types** — all confirmed **not to exist yet**.
3. **Set the caution message** via `LocationMetadata` (seeding never writes it — see §3).
4. **Coordinate the production reference-data (CSV) change** to create the venue in STG/prod.
5. **Verify** rendering via unit / template / E2E tests.

### Key architecture facts (verified against the codebase)

- **Seeding runs only in non-prod, non-CI.** `seedLocationData()` and `seedListTypes()` both bail out
  when `ENVIRONMENT === "prod"` or `CI === "true"`. `seedLocationData` additionally skips a full seed
  when tables are already populated, but **still upserts** regions/jurisdictions/subJurisdictions/locations
  by primary key, so a new entry in `location-data.ts` is picked up on existing non-prod DBs. In the
  "already-populated" branch it does **not** rewrite the `locationRegion` / `locationSubJurisdiction`
  junction tables — only the full-seed branch does. This matters for local DBs that already have data:
  the venue row will upsert but its region/sub-jurisdiction associations may not, so verify locally with a
  fresh DB (`yarn db:drop` then reseed) if associations don't appear.
- **In prod, venues are created via the CSV reference-data upload flow**
  (`libs/system-admin-pages/src/reference-data-upload/`), not via `location-data.ts`. The production
  `locationId` is assigned by that source and may differ from the seed value `26`. All routing is by
  `locationId` at runtime, so nothing hardcodes `26`.
- **`LocationMetadata` (the caution message) is never seeded.** It is set per-venue at runtime by system
  admins through `apps/web/src/pages/(system-admin)/location-metadata-manage/`. This is the production
  mechanism for the caution message. For local/dev, either set it via that page or extend seeding
  (out of default scope — see Open Questions).

## 2. Implementation Details

### 2.1 New location — `libs/location/src/location-data.ts`

Add to the `locations` array (highest existing `locationId` is 25, contiguous):

```typescript
{
  locationId: 26,
  name: "Business and Property Courts Rolls Building",
  welshName: "[WELSH TRANSLATION REQUIRED: \"Business and Property Courts Rolls Building\"]",
  regions: [1],            // London — see Open Questions (vs 11 = Royal Courts of Justice Group)
  subJurisdictions: [1],   // Civil Court — see Open Questions (vs 10 = High Court)
  provenanceLocationType: "VENUE"
}
```

`Location` shape (from `libs/location/src/repository/model.ts`):
`{ locationId, name, welshName, regions: number[], subJurisdictions: number[], provenanceLocationType?: string }`.

### 2.2 The 17 list types — `libs/list-types/common/src/list-type-data.ts`

All 17 are **new** (verified: none exist; the only near-match is the unrelated
`CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST`). Add each following the RCJ precedent
(`CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST`): `provenance: "CFT_IDAM"`, `isNonStrategic: true`,
`defaultSensitivity: "Public"`, `subJurisdictionIds: [1]` (subject to Open Questions).

`ListTypeData` shape: `{ name, englishFriendlyName, welshFriendlyName, provenance, urlPath?, isNonStrategic, defaultSensitivity, shortenedFriendlyName?, subJurisdictionIds }`.

| `name` | `englishFriendlyName` | `urlPath` |
|---|---|---|
| ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST | Admiralty Court (KB) daily cause list | admiralty-court-kb-daily-cause-list |
| BUSINESS_LIST_CHD_DAILY_CAUSE_LIST | Business list (ChD) daily cause list | business-list-chd-daily-cause-list |
| CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST | Chancery Appeals (ChD) daily cause list | chancery-appeals-chd-daily-cause-list |
| COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST | Commercial Court (KB) daily cause list | commercial-court-kb-daily-cause-list |
| COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST | Companies Winding Up (ChD) daily cause list | companies-winding-up-chd-daily-cause-list |
| COMPETITION_LIST_CHD_DAILY_CAUSE_LIST | Competition List (ChD) daily cause list | competition-list-chd-daily-cause-list |
| FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST | Financial List (ChD/KB) daily cause list | financial-list-chd-kb-daily-cause-list |
| INSOLVENCY_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST | Insolvency & Companies Court (ChD) daily cause list | insolvency-companies-court-chd-daily-cause-list |
| INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST | Interim Applications List (ChD) Daily Cause List | interim-applications-chd-daily-cause-list |
| INTELLECTUAL_PROPERTY_ENTERPRISE_COURT_CHD_DAILY_CAUSE_LIST | Intellectual Property and Enterprise Court (ChD) daily cause list | intellectual-property-enterprise-court-chd-daily-cause-list |
| INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST | Intellectual Property List (ChD) daily cause list | intellectual-property-list-chd-daily-cause-list |
| LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST | London Circuit Commercial Court (KB) daily cause list | london-circuit-commercial-court-kb-daily-cause-list |
| PATENTS_COURT_CHD_DAILY_CAUSE_LIST | Patents Court (ChD) daily cause list | patents-court-chd-daily-cause-list |
| PENSIONS_LIST_CHD_DAILY_CAUSE_LIST | Pensions List (ChD) daily cause list | pensions-list-chd-daily-cause-list |
| PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST | Property, Trusts and Probate list (ChD) daily cause list | property-trusts-probate-list-chd-daily-cause-list |
| REVENUE_LIST_CHD_DAILY_CAUSE_LIST | Revenue List (ChD) daily cause list | revenue-list-chd-daily-cause-list |
| TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST | Technology and Construction Court (KB) daily cause list | technology-and-construction-court-kb-daily-cause-list |

Each `welshFriendlyName` must be `[WELSH TRANSLATION REQUIRED: "…"]` until translated. Do NOT ship an
English fallback in a Welsh field.

`seedListTypes()` upserts each list type by unique `name` and writes `ListTypeSubJurisdiction` join rows
for each `subJurisdictionId`. It throws if a list type resolves to zero sub-jurisdictions, so
`subJurisdictionIds` must be non-empty and reference an existing sub-jurisdiction.

### 2.3 Caution message — `LocationMetadata`

English (exact, from AC):
> These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.

Welsh: `[WELSH TRANSLATION REQUIRED: …]`.

Set per environment via the system-admin page `/location-metadata-manage` (production mechanism).
For local/dev verification, set it through that page after seeding, since seeding does not write metadata.

### 2.4 Production reference-data (CSV)

Coordinate a CSV row for the venue in the reference-data source used by
`libs/system-admin-pages/src/reference-data-upload/` (`CsvRow`: `LOCATION_ID, LOCATION_NAME,
WELSH_LOCATION_NAME, EMAIL, CONTACT_NO, SUB_JURISDICTION_NAME, REGION_NAME, PROVENANCE,
PROVENANCE_LOCATION_ID, PROVENANCE_LOCATION_TYPE`). This is how the venue actually appears in STG/prod.

## 3. Files to Change

- `libs/location/src/location-data.ts` — add `locationId: 26` venue.
- `libs/list-types/common/src/list-type-data.ts` — add 17 list types.
- Tests:
  - `libs/list-types/common/src/list-type-data.test.ts` — assert the 17 new entries and unique names/urlPaths.
  - `libs/location/src/seed-data.test.ts` — extend if it asserts location counts/contents.
  - `apps/web/src/pages/(public)/summary-of-publications/index.test.ts` — verify title composition for the venue.
  - `apps/web/src/pages/(public)/summary-of-publications/index.njk.test.ts` — FaCT masking, caution message beneath link, alphabetical list (largely existing coverage).
- E2E: one `@nightly` journey in `e2e-tests/tests/` (browse to venue → heading, FaCT link, caution message, a list link; inline axe; Welsh toggle). E2E seeding helpers: `e2e-tests/utils/seed-list-types.ts`, `e2e-tests/utils/seed-location-data.ts`.
- No Prisma schema change — `Location`, `LocationMetadata`, `ListType`, `ListTypeSubJurisdiction` already model everything needed. No migration.

## 4. Error Handling & Edge Cases

- Missing/non-numeric/unknown `locationId` → existing controller redirect to `/400` (no change).
- Venue with no publications → existing fallback (`noListMessage` if set on `LocationMetadata`, else `noPublicationsMessage` = "Sorry, no lists found for this court").
- Seed uniqueness: `locationId`, `name`, `welshName` are all `@unique`; list-type `name` is `@unique`. Duplicate values will fail the upsert.
- Empty `subJurisdictionIds` on any list type → `seedListTypes` throws.
- Local DB already populated → junction tables may not refresh; verify with a fresh DB if associations are missing.
- `cautionMessage` rendered with `| safe`; content is service-controlled — do not allow user input into this field.

## 5. Acceptance Criteria Mapping

| AC | How satisfied | Verification |
|---|---|---|
| Venue created in CaTH | New `locationId: 26` seed entry + prod CSV row | `seed-data` test; browse/search resolves the venue |
| Page header "What do you want to view from Business and Property Courts Rolls Building?" | Existing `titlePrefix` + location name + `titleSuffix` | `index.test.ts` title assertion; E2E `<h1>` |
| FaCT link with correct masking | Existing `factLinkText`/`factLinkUrl`/`factAdditionalText` | `index.njk.test.ts` anchor href + text; E2E |
| Caution message under FaCT link | `LocationMetadata.cautionMessage` set to the exact string | template test (message beneath link); manual/E2E after metadata set |
| 17 lists alphabetical under caution message | New list types + existing `localeCompare` sort | `list-type-data.test.ts`; template test asserts alphabetical order |
| Welsh | Existing `cy.*` keys + Welsh venue name / caution / friendly names | `?lng=cy` render tests; locale-key parity |

## 6. Open Questions (see CLARIFICATIONS NEEDED)

These block a clean implementation and are posted to the issue.

## CLARIFICATIONS NEEDED

1. **Rendering scope (blocking).** Does this ticket only require the 17 lists to appear as **selectable
   links** on the summary page (metadata registration), or must each list type also have a full rendering
   pipeline — dedicated view page, PDF/Excel converters, and a JSON schema + `validate*` wrapper + tests
   per the CLAUDE.md "Implementing a new list type" checklist? The AC only mentions display on the summary
   page. Full per-list implementation is a large, separate effort assumed **out of scope** unless confirmed.
   If in scope, the CI guard in `libs/list-types/common/src/validation/guard.test.ts` requires a validator
   per schema.

2. **Region.** Should the venue sit under **London** (regionId 1) or **Royal Courts of Justice Group**
   (regionId 11)? This affects grouping in the A-Z / search. Both regions exist.

3. **Sub-jurisdiction.** Assumed **Civil Court** (subJurisdictionId 1) for all 17. Should the Business &
   Property lists instead be **High Court** (subJurisdictionId 10)? Existing
   `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` uses High Court (`[10]`). Confirm the correct value.

4. **List-type `name` / `urlPath` conventions.** The identifiers in §2.2 are inferred from the RCJ
   precedent. Confirm the exact enum names and whether these reuse a shared "standard" daily-cause-list
   template or need bespoke templates.

5. **Provenance.** Assumed `CFT_IDAM` (matching RCJ). Confirm the upstream publishing system / provenance
   value expected on artefacts.

6. **Sensitivity.** Assumed `Public` for all 17. Confirm none are `Classified` / `Private`.

7. **Caution message seeding for dev.** `LocationMetadata` is never seeded. Acceptable to require the
   caution message be set via the `/location-metadata-manage` admin page in each environment, or should
   seeding be extended to populate it for local/dev?

8. **Welsh translations.** Venue name, caution message and all 17 friendly names need official Welsh
   translations before release. Who provides these, and by when?
