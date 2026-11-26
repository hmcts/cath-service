# #659: The 'Business and Property Division Rolls Building' venue and hearing lists are created in CaTH

**State:** OPEN
**Assignees:** alao-daniel (Daniel Alao)
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story, jira:VIBE-314, epic:public-journey
**Created:** 2026-05-20
**Updated:** 2026-08-20

## Description

**PROBLEM STATEMENT**

This ticket covers the creation of The Business and Property Division Rolls Building which is to be created as a venue in CaTH.

**AS A** Service
**I WANT** to create The Business and Property Courts Rolls Building
**SO THAT** hearing lists can be published against this building in CaTH

**ACCEPTANCE CRITERIA**

- The venue 'Business and Property Division Rolls Building' is created in CaTH
- In the front end, the following text is displayed as a page header; 'What do you want to view from Business and Property Division Rolls Building?'
- The link to FaCT is displayed after the text above in the following text and masked in the highlighted part of the text;

  [Find contact details and other information about courts and tribunals](https://www.find-court-tribunal.service.gov.uk/) in England and Wales, and some non-devolved tribunals in Scotland.

- The following caution message is displayed under the FaCT link;

  'These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
  If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.'

- The Business and Property Division will publish only 2 list types; the 'Interim Applications Daily Cause List' and the 'Business and Property Division Rolls Building Daily Cause List'.
- Any other list type that may have been created previously under this venue should be removed but retained in the code for MI Reporting from the database. This should however not affect the new list format and naming displayed in the front end. List types that should be removed if previously created include;
  - Admiralty Court (KB) daily cause list
  - Business list (ChD) daily cause list
  - Chancery Appeals (ChD) daily cause list
  - Commercial Court (KB) daily cause list
  - Companies Winding Up (ChD) daily cause list
  - Competition List (ChD) daily cause list
  - Financial List (ChD/KB) daily cause list
  - Insolvency & Companies Court (ChD) daily cause list
  - Intellectual Property and Enterprise Court (ChD) daily cause list
  - Intellectual Property List (ChD) daily cause list
  - London Circuit Commercial Court (KB) daily cause list
  - Patents Court (ChD) daily cause list
  - Pensions List (ChD) daily cause list
  - Property, Trusts and Probate list (ChD) daily cause list
  - Revenue List (ChD) daily cause list
  - Technology and Construction Court (KB) daily cause list

- The 'Business and Property Division Rolls Building Daily Cause List' will contain multiple sections containing the hearing information from the various courts within its division.
- The multi-sections within the new list will be displayed sequentially with the following section headers;
  1. Appeal List
  2. Business List
  3. Commercial Court
  4. Financial List
  5. Insolvency & Companies Court
  6. Intellectual Property and Enterprise Court
  7. Intellectual Property List
  8. London Circuit Commercial Court
  9. Patents Court
  10. Property, Trusts and Probate List
  11. Technology and Construction Court
  12. Admiralty Court
  13. Companies Winding Up
  14. Competition List
  15. Pensions List
  16. Revenue List

- The 'Business and Property Division Rolls Building Daily Cause List' will be published in CaTH using an excel template with multi-tabs, per section above, to support the publishing of several multi-sections in one list (similar to the London administrative court & Planning court)
- Where no list is published in any of the sections, the following message should be displayed in that section; 'No hearings scheduled for this day'
- The open justice wording for the Business and Property Division Rolls Building Daily Cause List will be updated to read as follows;

  These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.

  Remote Hearings
  If a member of the public or media wishes to attend a remote hearing, they should contact the relevant listing office. The correct office depends on the judge hearing the case.
  Contact details:
  - Business and Property Division High Court Judge: BPD.HCJListing@justice.gov.uk
  - Commercial Court (High Court Judge): COMCT.Listing@justice.gov.uk
  - Technology and Construction Court (High Court Judge): TCC.Listing@justice.gov.uk
  - Insolvency and Companies Court Judge: BPD.ICCJClerks@justice.gov.uk
  - Business and Property Master: BPD.Masters@justice.gov.uk

  The listing office will direct your enquiry to the appropriate person.

  Remote Judgments
  Judgments may be handed down remotely. They are sent to the parties (or their representatives) by email and published on The National Archives website shortly afterwards.

- The Interim Applications daily cause list will be published in CaTH through the Excel upload, using a separate excel template containing two tabs that support the amendment of the judges name and email address within the open justice wording (as needed)
- The open justice wording for the Interim Applications Daily Cause List will be updated to read as follows;

  Parties should contact the clerk to the Interim Judge [name, email address] as early as possible.

  An application should not be listed before the Interim Applications Judge unless the overall time required to deal with the application is 2 hours or less. The 2 hour maximum includes the judge's pre-reading time, the hearing of the application, delivery of judgment and time for dealing with costs. If the judge considers that the estimate will exceed the 2 hour limit it may be stood out of the interim applications list.

  Please note that hearings in the interim applications list will not additionally appear in their individual list.

- The Rolls Building hearing lists are arranged in an alphabetical order under the caution message.

**Welsh translations:**
- Business and Property Division Rolls Building Daily Cause List → Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls
- These lists are subject to change until 4:30pm... → Gall y rhestrau canlynol fod yn destun newid tan 4:30pm. Bydd unrhyw newidiadau ar ôl yr amser hwn yn cael eu cyfathrebu dros y ffôn neu drwy e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
- Remote Hearings → Gwrandawiadau o Bell
- If a member of the public or media wishes to attend a remote hearing... → Os yw aelod o'r cyhoedd neu'r cyfryngau eisiau mynychu gwrandawiad o bell, dylent gysylltu â'r swyddfa restru berthnasol. Mae'r swyddfa gywir yn dibynnu ar y barnwr sy'n gwrando'r achos.
- Contact details → Manylion cyswllt
- Business and Property Division High Court Judge → Barnwr Uchel Lys - Yr Adran Busnes ac Eiddo
- Commercial Court (High Court Judge) → Y Llys Masnach (Barnwr Uchel Lys)
- Technology and Construction Court (High Court Judge) → Y Llys Technoleg ac Adeiladwaith (Barnwr Uchel Lys)
- Insolvency and Companies Court Judge → Barnwr y Llys Ansolfedd a Chwmnïau
- Business and Property Master → Meistr Busnes ac Eiddo
- The listing office will direct your enquiry to the appropriate person → Bydd y swyddfa restru yn cyfeirio eich ymholiad i'r unigolyn priodol
- Remote Judgments → Dyfarniadau o Bell
- Judgments may be handed down remotely... → Gall dyfarniadau gael eu traddodi o bell. Maent yn cael eu hanfon at y partïon (neu eu cynrychiolwyr) trwy e-bost ac yn cael eu cyhoeddi ar wefan yr Archifau Cenedlaethol yn fuan ar ôl hynny.
- Appeal List → Y Rhestr Apeliadau
- Business List → Y Rhestr Fusnes
- Commercial Court → Y Llys Masnach
- Financial List → Rhestr Ariannol
- Insolvency & Companies Court → Y Llys Ansolfedd a Chwmnïau
- Intellectual Property and Enterprise Court → Y Llys Mentrau Eiddo Deallusol
- Intellectual Property List → Y Rhestr Eiddo Deallusol
- London Circuit Commercial Court → Y Llys Masnach - Cylchdaith Llundain
- Patents Court → Y Llys Patentau
- Property, Trusts and Probate List → Y Rhestr Eiddo, Ymddiriedolaethau a Phrofiant
- Technology and Construction Court → Y Llys Technoleg ac Adeiladwaith
- Admiralty Court → Llys y Morlys
- Companies Winding Up → Dirwyn Cwmnïau i Ben
- Competition List → Y Rhestr Gystadleuaeth
- Pensions List → Y Rhestr Pensiynau
- Revenue List → Y Rhestr Refeniw
- Parties should contact the clerk to the Interim Judge [name, email address] as early as possible. → Dylai partïon gysylltu â chlerc y Barnwr Interim [name, email address] cyn gynted â phosib.
- An application should not be listed before the Interim Applications Judge... → Ni ddylai cais gael ei restru gerbron y Barnwr Ceisiadau Interim oni bai bod cyfanswm yr amser sy'n ofynnol i ymdrin â'r cais yn 2 awr neu'n llai. Mae'r uchafswm o 2 awr yn cynnwys amser darllen ymlaen llaw y barnwr, gwrandawiad y cais, rhoi'r dyfarniad ac amser ar gyfer ymdrin â chostau. Os yw'r barnwr yn ystyried y bydd yr amcangyfrif amser yn fwy na'r uchafswm o 2 awr, gall gael ei dynnu oddi ar y rhestr ceisiadau interim.
- Please note that hearings in the interim applications list will not additionally appear in their individual list. → Noder, ni fydd gwrandawiadau yn y rhestr ceisiadau interim yn ymddangos yn ychwanegol yn eu rhestr unigol.

## Comments

### Comment by OgechiOkelu / SarahLittlejohn (2026-08-17 → 2026-08-18)
Several `@spec` / `@plan` trigger comments.

### Comment by hmctsclaudecode on 2026-08-18 (Technical Specification — Issue #659)

A full technical specification was generated. Key points reproduced here (full text preserved in the issue thread):

**Background — this is NOT greenfield:**
- **The venue already exists** as `locationId: 26`, named "Business and Property Courts Rolls Building" (`libs/location/src/location-data.ts:187-192`). The issue asks for "Business and Property **Division** Rolls Building" — this is a **rename in place**, not a create. A new locationId would orphan every artefact already published against 26 and break existing subscriptions.
- Venue landing page already renders `"What do you want to view from <venue>?"`, the FaCT link and caution message (`apps/web/src/pages/(public)/summary-of-publications/`).
- FaCT link + trailing text already implemented exactly as AC requires.
- Caution message rendered from `location_metadata.caution_message`, admin-managed via `/location-metadata-manage` — **not** seeded from code.
- Alphabetical list ordering already implemented via existing `localeCompare` sort.
- Multi-tab Excel → multi-section page fully solved for London Administrative Court (`libs/list-types/london-administrative-court-daily-cause-list/`).
- Reference-data seeding: deleting an entry from `listTypeData`/`locationData` **soft-deletes** the DB row (`deleted_at = NOW()`), preserving it for MI reporting.

**Existing list types affected (only 4 of the 16 actually exist in `libs/list-types/common/src/list-type-data.ts`):**
- `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` — Remove (superseded); `isNonStrategic: false`
- `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` — Remove
- `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` — Remove
- `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` — see OQ-2 (not London-scoped; `isNonStrategic: false`)

The other 12 names were never created — no removal work needed. "Removed" = soft-delete of the `list_type` row + removal from the seed source; packages, pages, converters, PDF generators and notification wiring stay in the repo so historic artefacts still render and MI reporting still resolves the name.

**What is genuinely new:**
1. Two new list types, both Excel (non-strategic) uploads.
2. A 16-section multi-tab list (largest in the service; current max is 2 tabs).
3. A **config tab** pattern — the Interim Applications template's second tab carries a judge name and email interpolated into the open-justice wording. No existing list type reads non-hearing data from a spreadsheet tab.

**Reference implementations to copy:**
- `libs/list-types/london-administrative-court-daily-cause-list/` — multi-sheet converter, renderer, PDF generator, page controller, template
- `libs/list-types/common/src/conversion/multi-sheet-converter.ts` — `createMultiSheetConverter`
- `libs/list-types/common/src/conversion/rcj-field-configs.ts` — `RCJ_EXCEL_CONFIG_SIMPLE_TIME` (7 fields, `minRows: 0`)
- `apps/web/src/pages/(list-types)/list-type-handler.ts` — `createSimpleListTypeHandler`

The spec includes 13 acceptance criteria (AC1–AC13), user journey flows, wireframes, page specs, full EN/CY content, URL map, validation rules, error messages, navigation, accessibility (WCAG 2.2 AA), and detailed test scenarios. The spec proposes:
- Rename `locationId: 26` in `location-data.ts`.
- Add two `listTypeData` entries: `BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST` and `INTERIM_APPLICATIONS_DAILY_CAUSE_LIST` (both `isNonStrategic: true`, `defaultSensitivity: "Public"`, `provenance: "CFT_IDAM"`, `subJurisdictionIds: [10]`).
- Delete the superseded entries (soft-delete automatic on deploy).
- New package `libs/list-types/business-and-property-division-rolls-building-daily-cause-list` with a single `SECTIONS` source of truth driving Excel config, model keys, schema, renderer and template (one loop, not 16 blocks).
- New package `libs/list-types/interim-applications-daily-cause-list` with a `JUDGE_DETAILS_CONFIG` second-tab config and a new `validateEmailFormat` validator added to `libs/list-types/common`.
- New web pages under `apps/web/src/pages/(list-types)/` using `createSimpleListTypeHandler`, guarding on `artefact.listTypeName`.
- Registration in root `tsconfig.json`, app `package.json`s, `non-strategic-upload` side-effect imports, `PDF_GENERATOR_REGISTRY` and notification-service registry.
- Mandatory JSON schema + `validate*` wrapper + tests per package (CI guard).

### Comment by hmctsclaudecode on 2026-08-18 (Technical plan — clarifications needed)

A prior plan was committed to branch `feature/659-business-property-rolls-building-venue` (NOTE: not the current `Feature-659` branch). Key clarifications:

1. This is a venue **rename**, not create (`locationId: 26`, `location-data.ts:188`).
2. Only 4 of 16 list types to remove actually exist; the rest were never created.
3. Two of those four (`BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST`, `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST`) have `isNonStrategic: false` (appear on `/manual-upload`, not the Excel dropdown).

**Open Questions (blocking / shaping):**
- **Q1 — Which 7 columns per section table?** *(blocks the Excel template)* Options: (a) ChD/KB set already used by the lists being consolidated — Judge, Time, Venue, Type, Case Number, Case **Name**, Additional Information; (b) RCJ set used by London Administrative Court — Venue, Judge, Time, Case Number, Case **Details**, Hearing Type, Additional Information. **Recommendation: ChD/KB set** so publishers keep today's columns.
- **Q2 / OQ-2 — Is `Circuit Commercial Court Daily Cause List` in scope?** Not London-scoped; soft-deleting removes it service-wide. **Recommendation: out of scope until confirmed London-only.**
- **Q3 / OQ-3 — Is the 16-section order literal?** Items 1–11 alphabetical, then 12–16 restart alphabetically — reads like two concatenated lists. **Recommendation: implement literal order; one-line change if corrected.**
- **Q4 / OQ-1 — Who enters the caution message?** Admin-managed `location_metadata`, not seeded from code. **Recommendation: post-deploy operational step, copy in release notes.** Welsh supplied covers only the first sentence — need Welsh for "If you do not see a list published for the court you are looking for, it means there are no hearings scheduled."
- **Q5 / OQ-9 — Does the venue's Welsh name change?** Current: "Llysoedd Busnes ac Eiddo - Adeilad Rolls" ("Llysoedd" = Courts). **Recommendation: "Adran Busnes ac Eiddo - Adeilad Rolls"**, subject to Welsh language team.
- **Q6 / OQ-8 — Old-name → new-section mapping** for MI reporting continuity (not 1:1). Needs reporting owner.
- **Q7 / OQ-4 — Existing subscriptions on removed list types** stop silently. **Recommendation: out of scope; separate ticket.**
- **Q8 / OQ-7 — Are the two Excel workbooks a deliverable?** Tab names are load-bearing. **Recommendation: workbooks owned outside repo; ticket produces authoritative tab-name/column-header list + fixture workbook for E2E.**
- **Q9 / OQ-6 — Confirm displayed address.** Existing Rolls Building pages show "Rolls Building / Fetter Lane, London / EC4A 1NL". **Recommendation: reuse verbatim.**
- **Q10 — `/list-search-config` entries** needed per new list type or cross-artefact case search won't index. Admin-managed; add to release checklist.

**Note on ticket copy:** the Interim Applications wording embeds a literal `[name, email address]` placeholder. Rendering brackets to the public is a defect — substitute `{judgeName}`/`{judgeEmail}` from the config tab, with placeholder-free fallback when the tab is blank. Need Welsh for the fallback: "Parties should contact the clerk to the Interim Judge as early as possible."
