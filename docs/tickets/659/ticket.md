# #659: The 'Business and Property Division Rolls Building' venue and hearing lists are created in CaTH

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, status:new, type:story, jira:VIBE-314, epic:public-journey
**Created:** 2026-05-20T16:35:25Z
**Updated:** 2026-08-18T13:34:35Z

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
Admiralty Court (KB) daily cause list
Business list (ChD) daily cause list
Chancery Appeals (ChD) daily cause list
Commercial Court (KB) daily cause list
Companies Winding Up (ChD) daily cause list
Competition List (ChD) daily cause list
Financial List (ChD/KB) daily cause list
Insolvency & Companies Court (ChD) daily cause list
Intellectual Property and Enterprise Court (ChD) daily cause list
Intellectual Property List (ChD) daily cause list
London Circuit Commercial Court (KB) daily cause list
Patents Court (ChD) daily cause list
Pensions List (ChD) daily cause list
Property, Trusts and Probate list (ChD) daily cause list
Revenue List (ChD) daily cause list
Technology and Construction Court (KB) daily cause list

- The 'Business and Property Division Rolls Building Daily Cause List' will contain multiple sections containing the hearing information from the various courts within its division.
- The multi-sections within the new list will be displayed sequentially with the following section  headers; 
Appeal List
Business List
Commercial Court
Financial List
Insolvency & Companies Court
Intellectual Property and Enterprise Court
Intellectual Property List
London Circuit Commercial Court
Patents Court
Property, Trusts and Probate List
Technology and Construction Court
Admiralty Court
Companies Winding Up
Competition List
Pensions List
Revenue List

- The 'Business and Property Division Rolls Building Daily Cause List' will be published in CaTH using an excel template with multi-tabs, per section above, to support the publishing of several multi-sections in one list (similar to the London administrative court & Planning court)
- Where no list is published in any of the sections, the following message should be displayed in that section; 'No hearings scheduled for this day' 
- The open justice wording for the Business and Property Division Rolls Building Daily Cause List will be updated to read as follows;

These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
 
Remote Hearings
If a member of the public or media wishes to attend a remote hearing, they should contact the relevant listing office. The correct office depends on the judge hearing the case.
Contact details:
Business and Property Division High Court Judge: BPD.HCJListing@justice.gov.uk
Commercial Court (High Court Judge): COMCT.Listing@justice.gov.uk
Technology and Construction Court (High Court Judge): TCC.Listing@justice.gov.uk
Insolvency and Companies Court Judge: BPD.ICCJClerks@justice.gov.uk
Business and Property Master: [BPD.Masters@justice.gov.uk](mailto:BPD.Masters@justice.gov.uk)
 
The listing office will direct your enquiry to the appropriate person.
 
Remote Judgments
Judgments may be handed down remotely. They are sent to the parties (or their representatives) by email and published on The National Archives website shortly afterwards.
 
- The Interim Applications daily cause list will be published in CaTH through the Excel upload, using a separate excel template containing two tabs that support the amendment of the judges name and email address within the open justice wording (as needed)
- The open justice wording for the Interim Applications Daily Cause List will be updated to read as follows;

Parties should contact the clerk to the Interim Judge [name, email address] as early as possible.

An application should not be listed before the Interim Applications Judge unless the overall time required to deal with the application is 2 hours or less. The 2 hour maximum includes the judge’s pre-reading time, the hearing of the application, delivery of judgment and time for dealing with costs. If the judge considers that the estimate will exceed the 2 hour limit it may be stood out of the interim applications list.

Please note that hearings in the interim applications list will not additionally appear in their individual list.

- The Rolls Building hearing lists are arranged in an alphabetical order under the caution message. Rolls Building Hearing Lists are;


**Welsh translations:**
- Business and Property Division Rolls Building Daily Cause List - Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls
- These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. - Gall y rhestrau canlynol fod yn destun newid tan 4:30pm. Bydd unrhyw newidiadau ar ôl yr amser hwn yn cael eu cyfathrebu dros y ffôn neu drwy e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
- Remote Hearings - Gwrandawiadau o Bell
- If a member of the public or media wishes to attend a remote hearing, they should contact the relevant listing office. The correct office depends on the judge hearing the case. - Os yw aelod o'r cyhoedd neu'r cyfryngau eisiau mynychu gwrandawiad o bell, dylent gysylltu â'r swyddfa restru berthnasol. Mae'r swyddfa gywir yn dibynnu ar y barnwr sy'n gwrando'r achos.
- Contact details - Manylion cyswllt
- Business and Property Division High Court Judge: [BPD.HCJListing@justice.gov.uk](mailto:BPD.HCJListing@justice.gov.uk) - Barnwr Uchel Lys - Yr Adran Busnes ac Eiddo: [BPD.HCJListing@justice.gov.uk](mailto:BPD.HCJListing@justice.gov.uk)
- Commercial Court (High Court Judge): [COMCT.Listing@justice.gov.uk](mailto:COMCT.Listing@justice.gov.uk) - Y Llys Masnach (Barnwr Uchel Lys): [COMCT.Listing@justice.gov.uk](mailto:COMCT.Listing@justice.gov.uk)
- Technology and Construction Court (High Court Judge): [TCC.Listing@justice.gov.uk](mailto:TCC.Listing@justice.gov.uk) - Y Llys Technoleg ac Adeiladwaith (Barnwr Uchel Lys): [TCC.Listing@justice.gov.uk](mailto:TCC.Listing@justice.gov.uk)
- Insolvency and Companies Court Judge: [BPD.ICCJClerks@justice.gov.uk](mailto:BPD.ICCJClerks@justice.gov.uk) - Barnwr y Llys Ansolfedd a Chwmnïau: [BPD.ICCJClerks@justice.gov.uk](mailto:BPD.ICCJClerks@justice.gov.uk)
- Business and Property Master: [BPD.Masters@justice.gov.uk](mailto:BPD.Masters@justice.gov.uk) - Meistr Busnes ac Eiddo: [BPD.Masters@justice.gov.uk](mailto:BPD.Masters@justice.gov.uk)
- The listing office will direct your enquiry to the appropriate person - Bydd y swyddfa restru yn cyfeirio eich ymholiad i'r unigolyn priodol
- Remote Judgments - Dyfarniadau o Bell
- Judgments may be handed down remotely. They are sent to the parties (or their representatives) by email and published on The National Archives website shortly afterwards. - Gall dyfarniadau gael eu traddodi o bell. Maent yn cael eu hanfon at y partïon (neu eu cynrychiolwyr) trwy e-bost ac yn cael eu cyhoeddi ar wefan yr Archifau Cenedlaethol yn fuan ar ôl hynny.
- Appeal List - Y Rhestr Apeliadau
- Business List - Y Rhestr Fusnes
- Commercial Court - Y Llys Masnach
- Financial List - Rhestr Ariannol
- Insolvency & Companies Court - Y Llys Ansolfedd a Chwmnïau
- Intellectual Property and Enterprise Court - Y Llys Mentrau Eiddo Deallusol
- Intellectual Property List - Y Rhestr Eiddo Deallusol
- London Circuit Commercial Court - Y Llys Masnach - Cylchdaith Llundain
- Patents Court - Y Llys Patentau
- Property, Trusts and Probate List - Y Rhestr Eiddo, Ymddiriedolaethau a Phrofiant
- Technology and Construction Court - Y Llys Technoleg ac Adeiladwaith
- Admiralty Court - Llys y Morlys
- Companies Winding Up - Dirwyn Cwmnïau i Ben
- Competition List - Y Rhestr Gystadleuaeth
- Pensions List - Y Rhestr Pensiynau
- Revenue List - Y Rhestr Refeniw
- Parties should contact the clerk to the Interim Judge [name, email address] as early as possible. - Dylai partïon gysylltu â chlerc y Barnwr Interim [name, email address] cyn gynted â phosib.
- An application should not be listed before the Interim Applications Judge unless the overall time required to deal with the application is 2 hours or less. The 2 hour maximum includes the judge’s pre-reading time, the hearing of the application, delivery of judgment and time for dealing with costs. If the judge considers that the estimate will exceed the 2 hour limit it may be stood out of the interim applications list. - Ni ddylai cais gael ei restru gerbron y Barnwr Ceisiadau Interim oni bai bod cyfanswm yr amser sy'n ofynnol i ymdrin â'r cais yn 2 awr neu'n llai. Mae'r uchafswm o 2 awr yn cynnwys amser darllen ymlaen llaw y barnwr, gwrandawiad y cais, rhoi'r dyfarniad ac amser ar gyfer ymdrin â chostau.  Os yw'r barnwr yn ystyried y bydd yr amcangyfrif amser yn fwy na'r uchafswm o 2 awr, gall gael ei dynnu oddi ar y rhestr ceisiadau interim.
- Please note that hearings in the interim applications list will not additionally appear in their individual list. - Noder, ni fydd gwrandawiadau yn y rhestr ceisiadau interim yn ymddangos yn ychwanegol yn eu rhestr unigol.


## Comments

### Comment by OgechiOkelu on 2026-08-17T15:40:27Z

@spec 

### Comment by OgechiOkelu on 2026-08-18T10:21:53Z

@SPEC

### Comment by SarahLittlejohn on 2026-08-18T12:28:01Z

@spec 

### Comment by SarahLittlejohn on 2026-08-18T13:14:37Z

@spec

### Comment by hmctsclaudecode on 2026-08-18T13:25:24Z

# Technical Specification — Issue #659

**Title:** The 'Business and Property Division Rolls Building' venue and hearing lists are created in CaTH

---

## 1. User Story

**As a** HMCTS court and tribunal service (publishing hearing lists on CaTH)
**I want to** publish hearing lists against a single "Business and Property Division Rolls Building" venue, restricted to two consolidated list types
**So that** members of the public, media and legal professionals see one authoritative, correctly-named set of Rolls Building lists instead of sixteen separate court-specific lists

---

## 2. Background

### 2.1 What already exists

This is **not** a greenfield venue creation. The codebase already contains most of the moving parts:

| Concern | Current state | File |
|---|---|---|
| The venue | Exists as `locationId: 26`, named **"Business and Property Courts Rolls Building"** — the issue asks for **"Business and Property Division Rolls Building"**. This is a **rename**, not a create. | `libs/location/src/location-data.ts:187-192` |
| Venue landing page | Already renders `"What do you want to view from <venue>?"`, the FaCT link, and a caution message | `apps/web/src/pages/(public)/summary-of-publications/` |
| FaCT link + trailing text | Already implemented exactly as the AC requires | `apps/web/src/pages/(public)/summary-of-publications/en.ts` / `cy.ts` |
| Caution message | Rendered from `location_metadata.caution_message`, managed by system admins via `/location-metadata-manage` — **not** seeded from code | `libs/location/src/repository/location-metadata-queries.ts` |
| Alphabetical list ordering | Landing page already sorts publications by localised list-type friendly name | `summary-of-publications/index.ts` (`uniquePublications.sort`) |
| Multi-tab Excel → multi-section page | Fully solved for the London Administrative Court (2 tabs → 2 sections) | `libs/list-types/london-administrative-court-daily-cause-list/` |
| Reference data seeding | `listTypeData` / `locationData` are the single sources of truth; deleting an entry soft-deletes the DB row (`deleted_at = NOW()`), preserving it for MI reporting | `apps/postgres/prisma/generate-seed-sql.ts:136,155` |

### 2.2 Existing list types affected

Of the 16 list types the issue asks to remove, only these currently exist in `libs/list-types/common/src/list-type-data.ts`:

| Name | Friendly name | Line | Action |
|---|---|---|---|
| `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` | Business & Property Daily Cause List | 751 | Remove (superseded) |
| `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` | Companies Winding Up (ChD) Daily Cause List | 791 | Remove |
| `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` | Financial List (ChD/KB) Daily Cause List | 802 | Remove |
| `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` | Circuit Commercial Court Daily Cause List | 761 | **See open question OQ-2** — the issue names "*London* Circuit Commercial Court (KB)"; this entry is not London-scoped |

The other 13 names in the issue's removal list were never created, so no removal work is needed for them. Removal here means **soft-delete of the `list_type` row and removal from the seed source** — the packages, web pages, converters, PDF generators and notification wiring stay in the repo so historic artefacts still render and MI reporting still resolves the list-type name.

### 2.3 What is genuinely new

1. Two new list types, both Excel (non-strategic) uploads.
2. A 16-section multi-tab list (largest in the service; the current maximum is 2 tabs).
3. A **config tab** pattern — the Interim Applications template's second tab carries a judge name and email that are interpolated into the open-justice wording. No existing list type reads non-hearing data from a spreadsheet tab.

### 2.4 Reference implementations to copy

- `libs/list-types/london-administrative-court-daily-cause-list/` — multi-sheet converter, renderer, PDF generator, page controller, template
- `libs/list-types/common/src/conversion/multi-sheet-converter.ts` — `createMultiSheetConverter`
- `libs/list-types/common/src/conversion/rcj-field-configs.ts` — `RCJ_EXCEL_CONFIG_SIMPLE_TIME` (7 fields, `minRows: 0`)
- `apps/web/src/pages/(list-types)/list-type-handler.ts` — `createSimpleListTypeHandler`

---

## 3. Acceptance Criteria

### AC1 — Venue exists with the correct name

* **Scenario:** Venue is renamed and discoverable
    * **Given** `locationId: 26` currently exists as "Business and Property Courts Rolls Building"
    * **When** the reference-data seed runs on any environment
    * **Then** the venue name is "Business and Property Division Rolls Building" and its Welsh name is `[WELSH TRANSLATION REQUIRED: "Business and Property Division Rolls Building"]`, it remains in region 11 (Royal Courts of Justice Group) and sub-jurisdiction 10 (High Court), and it appears under "B" on `/courts-tribunals-list`

### AC2 — Venue landing page header

* **Scenario:** Page header text
    * **Given** a user navigates to `/summary-of-publications?locationId=26`
    * **When** the page renders in English
    * **Then** the `h1` reads exactly "What do you want to view from Business and Property Division Rolls Building?"
    * **And** in Welsh the `h1` reads "Beth ydych chi eisiau edrych arno gan `[WELSH TRANSLATION REQUIRED: "Business and Property Division Rolls Building"]`?"

### AC3 — FaCT link

* **Scenario:** Find a Court and Tribunal link renders below the header
    * **Given** the venue landing page is displayed
    * **When** the user reads the paragraph directly under the `h1`
    * **Then** the text is "Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland."
    * **And** only the leading phrase "Find contact details and other information about courts and tribunals" is an anchor pointing at `https://www.find-court-tribunal.service.gov.uk/`
    * *(Already implemented — regression coverage only.)*

### AC4 — Caution message

* **Scenario:** Caution message renders under the FaCT link
    * **Given** `location_metadata` for `locationId: 26` has a caution message set
    * **When** the venue landing page renders
    * **Then** the caution message appears directly below the FaCT paragraph and above the list links, reading:
      > These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
      > If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.
    * **And** the Welsh caution message is set to the Welsh equivalent
    * *(Rendering already implemented; the data must be entered — see OQ-1.)*

### AC5 — Only two list types are publishable

* **Scenario:** Excel upload dropdown offers exactly the two new Rolls Building lists
    * **Given** a CTSC or Local admin is on `/non-strategic-upload`
    * **When** they open the list-type dropdown
    * **Then** "Business and Property Division Rolls Building Daily Cause List" and "Interim Applications Daily Cause List" are both present
    * **And** "Business & Property Daily Cause List", "Companies Winding Up (ChD) Daily Cause List" and "Financial List (ChD/KB) Daily Cause List" are absent

### AC6 — Superseded list types are soft-deleted, not hard-deleted

* **Scenario:** MI reporting retains removed list types
    * **Given** the removed list types are deleted from `listTypeData`
    * **When** the deploy seed runs
    * **Then** each removed `list_type` row has `deleted_at` set and is still queryable by name for MI reporting
    * **And** any artefact already published against a removed list type still resolves its list-type name and still renders on its existing page
    * **And** those list types no longer appear in any admin dropdown, in `/view-list-types`, or on any venue landing page

### AC7 — Rolls Building Daily Cause List renders 16 sections

* **Scenario:** All sections render in the specified order
    * **Given** a published "Business and Property Division Rolls Building Daily Cause List" artefact
    * **When** a user opens it
    * **Then** 16 `h2` section headings render in this exact sequence: Appeal List, Business List, Commercial Court, Financial List, Insolvency & Companies Court, Intellectual Property and Enterprise Court, Intellectual Property List, London Circuit Commercial Court, Patents Court, Property, Trusts and Probate List, Technology and Construction Court, Admiralty Court, Companies Winding Up, Competition List, Pensions List, Revenue List
    * **And** each section with hearings renders a 7-column table (Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information)

### AC8 — Empty section message

* **Scenario:** A section has no hearings
    * **Given** a section's Excel tab is empty or absent
    * **When** the list renders
    * **Then** that section's heading still renders, followed by "No hearings scheduled for this day" and no table
    * **And** in Welsh the message is `[WELSH TRANSLATION REQUIRED: "No hearings scheduled for this day"]`

### AC9 — Rolls Building open justice wording

* **Scenario:** Updated open-justice text
    * **Given** the Rolls Building Daily Cause List is displayed
    * **When** the user reads the important-information block
    * **Then** it contains the change-until-4:30pm paragraph, a "Remote Hearings" heading with the five listing-office contact email addresses as `mailto:` links, the "The listing office will direct your enquiry to the appropriate person" line, and a "Remote Judgments" heading with its paragraph — full copy in §7.2

### AC10 — Interim Applications list with configurable judge details

* **Scenario:** Judge name and email drive the open-justice wording
    * **Given** an Interim Applications Daily Cause List uploaded with a second tab containing judge name "Mrs Justice Smith" and email "clerk.smith@justice.gov.uk"
    * **When** the list renders
    * **Then** the open-justice text reads "Parties should contact the clerk to the Interim Judge Mrs Justice Smith, clerk.smith@justice.gov.uk as early as possible." with the email as a `mailto:` link
    * **And** the 2-hour-limit paragraph and the "will not additionally appear in their individual list" paragraph follow it

### AC11 — Alphabetical ordering on the venue landing page

* **Scenario:** Rolls Building lists are listed alphabetically
    * **Given** both list types are published for the same content date
    * **When** the venue landing page renders
    * **Then** "Business and Property Division Rolls Building Daily Cause List" appears above "Interim Applications Daily Cause List", below the caution message
    * *(Already implemented by the existing `localeCompare` sort — regression coverage only.)*

### AC12 — PDF, subscription email and search parity

* **Scenario:** Downstream processing works for both new list types
    * **Given** either new list type is published
    * **When** publication processing runs
    * **Then** a PDF is generated containing every section and its hearings
    * **And** subscribers to the venue receive an email summary containing time, case number and case details for every hearing across all sections
    * **And** the on-page case search filters rows across all sections

### AC13 — Welsh language parity

* **Scenario:** Every new page and message has Welsh content
    * **Given** any new page is requested with `?lng=cy`
    * **When** it renders
    * **Then** all headings, section names, table headers, open-justice wording and empty-section messages are Welsh
    * **And** `Object.keys(en)` and `Object.keys(cy)` are identical for every new locale file

---

## 4. User Journey Flow

### 4.1 Public journey — viewing a Rolls Building list

```
┌──────────────────────┐
│ /view-option         │  "What do you want to do?"
│                      │  ◉ Find a court or tribunal
└──────────┬───────────┘
           │ Continue
           ▼
┌──────────────────────┐
│ /search  OR          │  Autocomplete on venue name, or
│ /courts-tribunals-list│  A–Z / filter by region + jurisdiction
│                      │  → "Business and Property Division Rolls Building" under "B"
└──────────┬───────────┘
           │ select venue (locationId=26)
           ▼
┌───────────────────────────────────────────────────────────────┐
│ /summary-of-publications?locationId=26                        │
│                                                               │
│ H1  What do you want to view from Business and Property        │
│     Division Rolls Building?                                  │
│ P   [FaCT link] in England and Wales, and some non-devolved …  │
│ DIV Caution message (from location_metadata)                   │
│ P   Select the list you want to view from the link(s) below:   │
│ UL  • Business and Property Division Rolls Building Daily      │
│       Cause List <date> - English (Saesneg)                    │
│     • Interim Applications Daily Cause List <date> -           │
│       English (Saesneg)                                        │
│                                                               │
│ (no publications → noListMessage, else fallback copy)          │
└───────┬────────────────────────────────┬──────────────────────┘
        │                                │
        ▼                                ▼
┌───────────────────────────┐  ┌────────────────────────────────┐
│ /business-and-property-   │  │ /interim-applications-daily-   │
│  division-rolls-building- │  │  cause-list?artefactId=…       │
│  daily-cause-list         │  │                                │
│  ?artefactId=…            │  │ Single hearings table +        │
│                           │  │ judge-specific open justice    │
│ Contents jump links       │  │ wording                        │
│ 16 × (H2 + table | empty  │  └────────────────────────────────┘
│      message)             │
└───────────────────────────┘
```

### 4.2 Admin journey — publishing a Rolls Building list

```
Sign in (CTSC / Local admin)
        │
        ▼
/admin-dashboard  ──▶  "Manual upload (non-strategic / Excel)"
        │
        ▼
/non-strategic-upload
  • Court                  → Business and Property Division Rolls Building
  • List type              → Business and Property Division Rolls Building
                             Daily Cause List
  • Hearing start date     → dd/mm/yyyy
  • Sensitivity            → Public (default from list type)
  • Language               → English
  • Display from / to      → dd/mm/yyyy
  • File                   → .xlsx, 16 tabs
        │  POST — converter resolved by listTypeName,
        │         each tab → JSON array, then JSON-schema validated
        ▼
/non-strategic-upload-summary   (check answers; Confirm)
        │
        ▼
/non-strategic-upload-success
        │
        ├──▶ artefact + JSON blob stored
        ├──▶ PDF generated via PDF_GENERATOR_REGISTRY
        └──▶ subscription emails sent via notification-service registry
```

### 4.3 Admin journey — removing a superseded list

Removal is a **code + deploy** operation, not a runtime admin action:

```
Delete entry from libs/list-types/common/src/list-type-data.ts
        │
        ▼
Deploy → apps/postgres/start.sh
        │  prisma migrate deploy
        │  tsx prisma/generate-seed-sql.ts > /tmp/seed.sql
        ▼
UPDATE list_types SET deleted_at = NOW()
WHERE deleted_at IS NULL AND name NOT IN (<active names>)
  AND name NOT LIKE 'TEST_%' AND name NOT LIKE 'E2E_%'
        │
        ▼
Row retained for MI reporting; hidden from all dropdowns and
landing pages (every query filters deletedAt: null)
```

---

## 5. Low Fidelity Wireframe

### 5.1 Venue landing page — `/summary-of-publications?locationId=26`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [GOV.UK crest]  Court and tribunal hearings                    English|Cymraeg│
├────────────────────────────────────────────────────────────────────────────┤
│ BETA  This is a new service – your feedback will help us improve it.        │
├────────────────────────────────────────────────────────────────────────────┤
│ ‹ Back                                                                     │
│                                                                            │
│ What do you want to view from Business and                                 │
│ Property Division Rolls Building?                       ← h1 govuk-heading-l│
│                                                                            │
│ Find contact details and other information about courts and tribunals      │
│ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     │
│ (link)  in England and Wales, and some non-devolved tribunals in Scotland. │
│                                                                            │
│ These lists are subject to change until 4:30pm. Any alterations after      │
│ this time will be telephoned or emailed direct to the parties or their      │
│ legal representatives.                                                     │
│ If you do not see a list published for the court you are looking for, it    │
│ means there are no hearings scheduled.                  ← caution message  │
│                                                                            │
│ Select the list you want to view from the link(s) below:                   │
│                                                                            │
│ • Business and Property Division Rolls Building Daily Cause List           │
│   12 September 2026 - English (Saesneg)                  ← alphabetical    │
│                                                                            │
│ • Interim Applications Daily Cause List                                    │
│   12 September 2026 - English (Saesneg)                                    │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Footer: Accessibility statement · Cookies · Privacy policy · Terms         │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Business and Property Division Rolls Building Daily Cause List

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back                                                             #top    │
│                                                                            │
│ Business and Property Division Rolls Building              ← h1 heading-l  │
│ Daily Cause List                                                           │
│                                                                            │
│ Find contact details and other information about courts and tribunals      │
│ in England and Wales, and some non-devolved tribunals in Scotland.         │
│                                                                            │
│ Rolls Building                                              ← bold         │
│ 7 Rolls Buildings, Fetter Lane, London                                     │
│ EC4A 1NL                                                                   │
│                                                                            │
│ List for 12 September 2026                                  ← bold         │
│ Last updated 12 September 2026 at 9:15am                                    │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ▾ Important information                                    (open)      │ │
│ │                                                                        │ │
│ │ These lists are subject to change until 4:30pm. Any alterations after   │ │
│ │ this time will be telephoned or emailed direct to the parties or        │ │
│ │ their legal representatives.                                            │ │
│ │                                                                        │ │
│ │ Remote Hearings                                            ← h3        │ │
│ │ If a member of the public or media wishes to attend a remote hearing,   │ │
│ │ they should contact the relevant listing office. The correct office     │ │
│ │ depends on the judge hearing the case.                                  │ │
│ │                                                                        │ │
│ │ Contact details:                                                       │ │
│ │  • Business and Property Division High Court Judge:                    │ │
│ │    BPD.HCJListing@justice.gov.uk                        ← mailto link  │ │
│ │  • Commercial Court (High Court Judge):                                │ │
│ │    COMCT.Listing@justice.gov.uk                                        │ │
│ │  • Technology and Construction Court (High Court Judge):                │ │
│ │    TCC.Listing@justice.gov.uk                                          │ │
│ │  • Insolvency and Companies Court Judge:                               │ │
│ │    BPD.ICCJClerks@justice.gov.uk                                       │ │
│ │  • Business and Property Master: BPD.Masters@justice.gov.uk             │ │
│ │                                                                        │ │
│ │ The listing office will direct your enquiry to the appropriate person.  │ │
│ │                                                                        │ │
│ │ Remote Judgments                                           ← h3        │ │
│ │ Judgments may be handed down remotely. They are sent to the parties     │ │
│ │ (or their representatives) by email and published on The National       │ │
│ │ Archives website shortly afterwards.                                    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ Search Cases                                                ← h2 heading-s │
│ ┌──────────────────────────────────┐                                       │
│ │                                  │  ← filters rows in every section      │
│ └──────────────────────────────────┘                                       │
│                                                                            │
│ Sections on this page                                       ← h2 heading-s │
│ Appeal List · Business List · Commercial Court · Financial List ·          │
│ Insolvency & Companies Court · Intellectual Property and Enterprise        │
│ Court · Intellectual Property List · London Circuit Commercial Court ·     │
│ Patents Court · Property, Trusts and Probate List · Technology and         │
│ Construction Court · Admiralty Court · Companies Winding Up ·              │
│ Competition List · Pensions List · Revenue List     ← in-page jump links   │
│                                                                            │
│ ── Appeal List ──────────────────────────────────────────── ← h2 heading-l │
│ ┌──────┬───────┬──────┬─────────┬─────────────┬──────────┬──────────────┐ │
│ │Venue │Judge  │Time  │Case     │Case Details │Hearing   │Additional    │ │
│ │      │       │      │Number   │             │Type      │Information   │ │
│ ├──────┼───────┼──────┼─────────┼─────────────┼──────────┼──────────────┤ │
│ │Court │Mr     │10:30am│CH-2026-│Smith v      │Appeal    │Hybrid        │ │
│ │12    │Justice│      │000123  │Jones Ltd    │          │hearing       │ │
│ │      │Brown  │      │        │             │          │              │ │
│ └──────┴───────┴──────┴─────────┴─────────────┴──────────┴──────────────┘ │
│                                                                            │
│ ── Business List ────────────────────────────────────────────────────────── │
│ No hearings scheduled for this day               ← empty-section message   │
│                                                                            │
│ ── Commercial Court ─────────────────────────────────────────────────────── │
│ ┌──────┬───────┬──────┬─────────┬─────────────┬──────────┬──────────────┐ │
│ │ …    │       │      │         │             │          │              │ │
│ └──────┴───────┴──────┴─────────┴─────────────┴──────────┴──────────────┘ │
│                                                                            │
│ … 13 further sections, same shape, in the order listed above …             │
│                                                                            │
│ Data source: Manual upload                                  ← body-s       │
│ Back to top ↑                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Interim Applications Daily Cause List

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ‹ Back                                                             #top    │
│                                                                            │
│ Interim Applications Daily Cause List                       ← h1 heading-l │
│                                                                            │
│ Find contact details and other information about courts and tribunals      │
│ in England and Wales, and some non-devolved tribunals in Scotland.         │
│                                                                            │
│ Rolls Building                                                             │
│ 7 Rolls Buildings, Fetter Lane, London                                     │
│ EC4A 1NL                                                                   │
│                                                                            │
│ List for 12 September 2026                                                 │
│ Last updated 12 September 2026 at 9:15am                                    │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ▾ Important information                                    (open)      │ │
│ │                                                                        │ │
│ │ Parties should contact the clerk to the Interim Judge                   │ │
│ │ Mrs Justice Smith, clerk.smith@justice.gov.uk as early as possible.    │ │
│ │                        ^^^^^^^^^^^^^^^^^^^^^^^^^ mailto, from tab 2    │ │
│ │                                                                        │ │
│ │ An application should not be listed before the Interim Applications     │ │
│ │ Judge unless the overall time required to deal with the application     │ │
│ │ is 2 hours or less. The 2 hour maximum includes the judge's             │ │
│ │ pre-reading time, the hearing of the application, delivery of           │ │
│ │ judgment and time for dealing with costs. If the judge considers        │ │
│ │ that the estimate will exceed the 2 hour limit it may be stood out      │ │
│ │ of the interim applications list.                                       │ │
│ │                                                                        │ │
│ │ Please note that hearings in the interim applications list will not     │ │
│ │ additionally appear in their individual list.                           │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ Search Cases                                                               │
│ ┌──────────────────────────────────┐                                       │
│ └──────────────────────────────────┘                                       │
│                                                                            │
│ ┌──────┬───────┬──────┬─────────┬─────────────┬──────────┬──────────────┐ │
│ │Venue │Judge  │Time  │Case     │Case Details │Hearing   │Additional    │ │
│ │      │       │      │Number   │             │Type      │Information   │ │
│ ├──────┼───────┼──────┼─────────┼─────────────┼──────────┼──────────────┤ │
│ │Court │Mrs    │10:30am│CL-2026-│Acme v Beta  │Interim   │In person     │ │
│ │37    │Justice│      │000456  │             │injunction│              │ │
│ │      │Smith  │      │        │             │          │              │ │
│ └──────┴───────┴──────┴─────────┴─────────────┴──────────┴──────────────┘ │
│                                                                            │
│ (no hearings → "No hearings scheduled for this day")                       │
│                                                                            │
│ Data source: Manual upload                                                 │
│ Back to top ↑                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Excel template shapes

**Business and Property Division Rolls Building Daily Cause List** — 16 tabs, tab names exactly matching the section headings, each tab identical:

```
Tab: "Appeal List"  (…and 15 more)
┌───────┬───────┬───────┬─────────────┬──────────────┬──────────────┬────────────────────────┐
│ Venue │ Judge │ Time  │ Case Number │ Case Details │ Hearing Type │ Additional Information │
├───────┼───────┼───────┼─────────────┼──────────────┼──────────────┼────────────────────────┤
│ …     │ …     │ 10:30am│ …          │ …            │ …            │ (optional)             │
└───────┴───────┴───────┴─────────────┴──────────────┴──────────────┴────────────────────────┘
```

**Interim Applications Daily Cause List** — 2 tabs:

```
Tab 1: "Hearings"
┌───────┬───────┬───────┬─────────────┬──────────────┬──────────────┬────────────────────────┐
│ Venue │ Judge │ Time  │ Case Number │ Case Details │ Hearing Type │ Additional Information │
└───────┴───────┴───────┴─────────────┴──────────────┴──────────────┴────────────────────────┘

Tab 2: "Judge details"          ← single data row; drives the open justice wording
┌────────────────────┬────────────────────────────┐
│ Judge Name         │ Judge Email                │
├────────────────────┼────────────────────────────┤
│ Mrs Justice Smith  │ clerk.smith@justice.gov.uk │
└────────────────────┴────────────────────────────┘
```

---

## 6. Page Specifications

### 6.1 Reference data changes

**`libs/location/src/location-data.ts`** — rename `locationId: 26` in place. Do **not** create a new location; a new `locationId` would orphan every artefact already published against 26 and break existing subscriptions.

```typescript
{
  locationId: 26,
  name: "Business and Property Division Rolls Building",
  welshName: "[TRANSLATE: \"Business and Property Division Rolls Building\"]",
  regions: [11],           // Royal Courts of Justice Group — unchanged
  subJurisdictions: [10]   // High Court — unchanged
}
```

**`libs/list-types/common/src/list-type-data.ts`** — add two entries. `isNonStrategic: true` is what puts them in the Excel-upload dropdown (`findNonStrategicListTypes` filters on it).

```typescript
{
  name: "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST",
  englishFriendlyName: "Business and Property Division Rolls Building Daily Cause List",
  welshFriendlyName: "Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls",
  shortenedFriendlyName: "Business and Property Division Rolls Building Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "business-and-property-division-rolls-building-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]
},
{
  name: "INTERIM_APPLICATIONS_DAILY_CAUSE_LIST",
  englishFriendlyName: "Interim Applications Daily Cause List",
  welshFriendlyName: "[TRANSLATE: \"Interim Applications Daily Cause List\"]",
  shortenedFriendlyName: "Interim Applications Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "interim-applications-daily-cause-list",
  isNonStrategic: true,
  defaultSensitivity: "Public",
  subJurisdictionIds: [10]
}
```

Delete these entries (soft-delete is automatic on deploy):

- `BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST` (line 751)
- `COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST` (line 791)
- `FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST` (line 802)
- `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` (line 761) — pending OQ-2

**Do not** delete the corresponding packages, pages, converters, PDF generators or notification registry entries. Historic artefacts must keep rendering, and MI reporting resolves `list_type.name` from the retained soft-deleted row.

### 6.2 New package — `libs/list-types/business-and-property-division-rolls-building-daily-cause-list`

Structure follows `london-administrative-court-daily-cause-list` exactly:

```
libs/list-types/business-and-property-division-rolls-building-daily-cause-list/
├── package.json                  # copy london-admin; build:nunjucks + build:schemas scripts
├── tsconfig.json
└── src/
    ├── config.ts                 # moduleRoot, schemaPath
    ├── index.ts                  # side-effect import of conversion config + exports
    ├── models/types.ts
    ├── sections.ts               # SECTIONS ordering — single source of truth
    ├── conversion/
    │   ├── business-and-property-division-rolls-building-daily-cause-list-config.ts
    │   └── …-config.test.ts
    ├── schemas/business-and-property-division-rolls-building-daily-cause-list.json
    ├── validation/
    │   ├── json-validator.ts
    │   └── json-validator.test.ts
    ├── rendering/
    │   ├── renderer.ts
    │   └── renderer.test.ts
    ├── email-summary/
    │   ├── summary-builder.ts
    │   └── summary-builder.test.ts
    ├── pdf/
    │   ├── pdf-generator.ts
    │   ├── pdf-generator.test.ts
    │   └── pdf-template.njk
    └── locales/{en.ts,cy.ts}
```

**`src/sections.ts`** — the section list is declared once and drives the Excel tab config, the data model keys, the JSON schema generation check, the renderer and the template loop. Sixteen hand-maintained copies of the same list is the main maintainability risk in this ticket.

```typescript
export const SECTIONS = [
  { dataKey: "appealList", worksheetName: "Appeal List", localeKey: "appealList" },
  { dataKey: "businessList", worksheetName: "Business List", localeKey: "businessList" },
  { dataKey: "commercialCourt", worksheetName: "Commercial Court", localeKey: "commercialCourt" },
  { dataKey: "financialList", worksheetName: "Financial List", localeKey: "financialList" },
  { dataKey: "insolvencyAndCompaniesCourt", worksheetName: "Insolvency & Companies Court", localeKey: "insolvencyAndCompaniesCourt" },
  { dataKey: "intellectualPropertyAndEnterpriseCourt", worksheetName: "Intellectual Property and Enterprise Court", localeKey: "intellectualPropertyAndEnterpriseCourt" },
  { dataKey: "intellectualPropertyList", worksheetName: "Intellectual Property List", localeKey: "intellectualPropertyList" },
  { dataKey: "londonCircuitCommercialCourt", worksheetName: "London Circuit Commercial Court", localeKey: "londonCircuitCommercialCourt" },
  { dataKey: "patentsCourt", worksheetName: "Patents Court", localeKey: "patentsCourt" },
  { dataKey: "propertyTrustsAndProbateList", worksheetName: "Property, Trusts and Probate List", localeKey: "propertyTrustsAndProbateList" },
  { dataKey: "technologyAndConstructionCourt", worksheetName: "Technology and Construction Court", localeKey: "technologyAndConstructionCourt" },
  { dataKey: "admiraltyCourt", worksheetName: "Admiralty Court", localeKey: "admiraltyCourt" },
  { dataKey: "companiesWindingUp", worksheetName: "Companies Winding Up", localeKey: "companiesWindingUp" },
  { dataKey: "competitionList", worksheetName: "Competition List", localeKey: "competitionList" },
  { dataKey: "pensionsList", worksheetName: "Pensions List", localeKey: "pensionsList" },
  { dataKey: "revenueList", worksheetName: "Revenue List", localeKey: "revenueList" }
] as const;
```

**`src/models/types.ts`**

```typescript
import type { StandardHearing } from "@hmcts/list-types-common";

export type RollsBuildingSectionKey = (typeof SECTIONS)[number]["dataKey"];

export type RollsBuildingData = Record<RollsBuildingSectionKey, StandardHearing[]>;

export interface RenderedSection {
  id: string;              // kebab-case anchor, e.g. "appeal-list"
  heading: string;         // localised heading
  hearings: StandardHearing[];
}
```

`StandardHearing` is currently declared locally in each list-type package. Promote it to `@hmcts/list-types-common` (or re-declare locally, matching the existing pattern) — do not import across sibling list-type packages.

**`src/conversion/…-config.ts`** — one converter over 16 sheets, built from `SECTIONS`:

```typescript
import { createMultiSheetConverter, RCJ_EXCEL_CONFIG_SIMPLE_TIME, registerConverterByName } from "@hmcts/list-types-common";
import { SECTIONS } from "../sections.js";

export const SECTION_CONFIG = RCJ_EXCEL_CONFIG_SIMPLE_TIME;   // minRows: 0 — sections may be empty

const SHEETS = SECTIONS.map((section, index) => ({
  worksheetName: section.worksheetName,
  worksheetIndex: index,
  dataKey: section.dataKey,
  config: SECTION_CONFIG
}));

const convertRollsBuildingExcel = (buffer: Buffer) => createMultiSheetConverter(buffer, SHEETS);

registerConverterByName("BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST", {
  config: SECTION_CONFIG,
  convertExcelToJson: convertRollsBuildingExcel as never
});
```

`createMultiSheetConverter` resolves each sheet by name and falls back to the positional index; a missing sheet yields `[]`, which the template renders as the empty-section message. `RCJ_EXCEL_CONFIG_SIMPLE_TIME` has `minRows: 0`, so an empty tab is not an upload error — this is exactly what AC8 needs.

**`src/rendering/renderer.ts`**

```typescript
export function renderRollsBuilding(data: RollsBuildingData, options: RenderOptions): RenderedData {
  const t = options.locale === "cy" ? cy : en;
  return {
    header: {
      listTitle: t.pageTitle,
      listDate: formatDisplayDate(options.contentDate, options.locale),
      ...formatLastUpdatedDateTime(options.lastReceivedDate, options.locale)
    },
    sections: SECTIONS.map((section) => ({
      id: toAnchorId(section.worksheetName),
      heading: t.sectionHeadings[section.localeKey],
      hearings: normaliseHearings(data[section.dataKey] ?? [])
    }))
  };
}
```

Returning an ordered `sections` array — rather than 16 named template variables — keeps the template a single loop and makes AC7's ordering assertion a one-liner.

### 6.3 New package — `libs/list-types/interim-applications-daily-cause-list`

Same structure. Two differences:

**Data model**

```typescript
export interface InterimApplicationsJudgeDetails {
  judgeName: string;
  judgeEmail: string;
}

export interface InterimApplicationsData {
  hearings: StandardHearing[];
  judgeDetails: InterimApplicationsJudgeDetails[];   // 0 or 1 rows
}
```

`createMultiSheetConverter` always returns arrays, so the config tab arrives as a one-element array. The renderer flattens it:

```typescript
const judge = data.judgeDetails?.[0];
const openJusticeIntro = judge?.judgeName
  ? t.judgeContactIntro.replace("{judgeName}", judge.judgeName)
  : t.judgeContactIntroNoJudge;
```

**Judge details tab config** — a new 2-field config, local to this package:

```typescript
export const JUDGE_DETAILS_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge Name", fieldName: "judgeName", required: true,
      validators: [(v, r) => validateNoHtmlTags(v, "Judge Name", r)] },
    { header: "Judge Email", fieldName: "judgeEmail", required: true,
      validators: [validateEmailFormat] }
  ],
  minRows: 0
};

const convertInterimApplicationsExcel = (buffer: Buffer) =>
  createMultiSheetConverter(buffer, [
    { worksheetName: "Hearings", worksheetIndex: 0, dataKey: "hearings", config: RCJ_EXCEL_CONFIG_SIMPLE_TIME },
    { worksheetName: "Judge details", worksheetIndex: 1, dataKey: "judgeDetails", config: JUDGE_DETAILS_CONFIG }
  ]);
```

`validateEmailFormat` does not exist in `libs/list-types/common/src/conversion/validators.ts` — add it there alongside `validateTimeFormat` / `validateTimeFormatSimple`, with its own unit tests.

`minRows: 0` on the judge tab means an admin can publish without judge details; the wording then falls back to `judgeContactIntroNoJudge` (see §7.3). This avoids a hard upload failure over a cosmetic field.

### 6.4 Web pages

**`apps/web/src/pages/(list-types)/business-and-property-division-rolls-building-daily-cause-list/`**

```typescript
// index.ts
export const ROUTES = ["/business-and-property-division-rolls-building-daily-cause-list"];

const SUPPORTED_LIST_TYPE = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const validate = createJsonValidator(schemaPath);

export const GET = createSimpleListTypeHandler<RollsBuildingData>({
  en, cy, validate,
  logPrefix: "business-and-property-division-rolls-building-daily-cause-list",
  guardArtefact: (artefact, res) => {
    if (artefact.listTypeName !== SUPPORTED_LIST_TYPE) {
      res.status(400).render("errors/common", {
        en, cy,
        errorTitle: "Invalid List Type",
        errorMessage: "This list type is not supported by this module"
      });
      return true;
    }
    return false;
  },
  render: ({ artefact, jsonData, locale, res }) => { /* renderRollsBuilding → res.render */ }
});
```

Guard on `artefact.listTypeName`, never `listTypeId` — `list_type.id` is autoincrement and differs per environment.

**Template `…-daily-cause-list.njk`** — one loop, not 16 blocks:

```njk
<h2 class="govuk-heading-s">{{ t.sectionsOnThisPage }}</h2>
<ul class="govuk-list govuk-list--spaced">
  {% for section in sections %}
    <li><a class="govuk-link" href="#{{ section.id }}">{{ section.heading }}</a></li>
  {% endfor %}
</ul>

{% for section in sections %}
  <div class="hearings-section section-divider" id="{{ section.id }}-section">
    <h2 class="govuk-heading-l" id="{{ section.id }}">{{ section.heading }}</h2>
    {% if section.hearings.length > 0 %}
      <table class="govuk-table hearings-table" aria-labelledby="{{ section.id }}">
        …7 headers / 7 cells, identical to london-admin…
      </table>
    {% else %}
      <p class="govuk-body">{{ t.noHearingsMessage }}</p>
    {% endif %}
  </div>
{% endfor %}
```

The section-heading `h2` carries the anchor `id` and the table is bound with `aria-labelledby` to it, so each of the 16 tables has a distinct accessible name without duplicating the heading text into an `aria-label`.

**`apps/web/src/pages/(list-types)/interim-applications-daily-cause-list/`** — same shape, single table, judge-driven open-justice block.

### 6.5 Registration checklist

| Where | Change |
|---|---|
| `tsconfig.json` (root) | Add `@hmcts/business-and-property-division-rolls-building-daily-cause-list` and `@hmcts/interim-applications-daily-cause-list` to `compilerOptions.paths` |
| `apps/web/package.json` | Add both as `workspace:*` dependencies |
| `apps/api/package.json` | Add both if the API resolves converters/PDFs |
| `apps/web/src/pages/(admin)/non-strategic-upload/index.ts` | Add side-effect imports so the converters register on module load |
| `libs/publication/src/processing/service.ts` | Add both to `PDF_GENERATOR_REGISTRY`, keyed on list-type **name** |
| `libs/notifications/src/notification/notification-service.ts` | Add both `{ extract, format }` entries, keyed on list-type name |
| `libs/publication/package.json`, `libs/notifications/package.json` | Add both as `workspace:*` dependencies |

No `apps/web/src/app.ts` change is needed for the pages — `apps/web/src/pages/` is auto-discovered. Add `moduleRoot` to `modulePaths` only if a shared partial is introduced.

---

## 7. Content

All copy below is page-specific and lives in the list-type packages' `src/locales/{en,cy}.ts`, exported through `index.ts`. Welsh strings supplied in the issue are reproduced verbatim; everything else uses a `[TRANSLATE: …]` marker.

### 7.1 Venue landing page

No new content — `apps/web/src/pages/(public)/summary-of-publications/{en,cy}.ts` already carries `titlePrefix`, `titleSuffix`, `factLinkText`, `factLinkUrl` and `factAdditionalText`. The header text in AC2 is produced by `${t.titlePrefix} ${locationName}${t.titleSuffix}`, so renaming the location in §6.1 is sufficient.

**Caution message** (entered as `location_metadata` for `locationId: 26`, not code):

- English:
  > These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
  >
  > If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.
- Welsh:
  > Gall y rhestrau canlynol fod yn destun newid tan 4:30pm. Bydd unrhyw newidiadau ar ôl yr amser hwn yn cael eu cyfathrebu dros y ffôn neu drwy e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
  >
  > `[WELSH TRANSLATION REQUIRED: "If you do not see a list published for the court you are looking for, it means there are no hearings scheduled."]`

### 7.2 Business and Property Division Rolls Building Daily Cause List

**`src/locales/en.ts`**

```typescript
import { provenanceLabelsEn as provenanceLabels } from "@hmcts/list-types-common";

export const en = {
  pageTitle: "Business and Property Division Rolls Building Daily Cause List",
  factLinkText: "Find contact details and other information about courts and tribunals",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "in England and Wales, and some non-devolved tribunals in Scotland.",
  locationLine1: "Rolls Building",
  locationLine2: "7 Rolls Buildings, Fetter Lane, London",
  locationLine3: "EC4A 1NL",
  importantInfoTitle: "Important information",
  subjectToChangeText:
    "These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.",
  remoteHearingsTitle: "Remote Hearings",
  remoteHearingsText:
    "If a member of the public or media wishes to attend a remote hearing, they should contact the relevant listing office. The correct office depends on the judge hearing the case.",
  contactDetailsTitle: "Contact details",
  contactDetails: [
    { role: "Business and Property Division High Court Judge", email: "BPD.HCJListing@justice.gov.uk" },
    { role: "Commercial Court (High Court Judge)", email: "COMCT.Listing@justice.gov.uk" },
    { role: "Technology and Construction Court (High Court Judge)", email: "TCC.Listing@justice.gov.uk" },
    { role: "Insolvency and Companies Court Judge", email: "BPD.ICCJClerks@justice.gov.uk" },
    { role: "Business and Property Master", email: "BPD.Masters@justice.gov.uk" }
  ],
  listingOfficeDirectText: "The listing office will direct your enquiry to the appropriate person.",
  remoteJudgmentsTitle: "Remote Judgments",
  remoteJudgmentsText:
    "Judgments may be handed down remotely. They are sent to the parties (or their representatives) by email and published on The National Archives website shortly afterwards.",
  sectionsOnThisPage: "Sections on this page",
  sectionHeadings: {
    appealList: "Appeal List",
    businessList: "Business List",
    commercialCourt: "Commercial Court",
    financialList: "Financial List",
    insolvencyAndCompaniesCourt: "Insolvency & Companies Court",
    intellectualPropertyAndEnterpriseCourt: "Intellectual Property and Enterprise Court",
    intellectualPropertyList: "Intellectual Property List",
    londonCircuitCommercialCourt: "London Circuit Commercial Court",
    patentsCourt: "Patents Court",
    propertyTrustsAndProbateList: "Property, Trusts and Probate List",
    technologyAndConstructionCourt: "Technology and Construction Court",
    admiraltyCourt: "Admiralty Court",
    companiesWindingUp: "Companies Winding Up",
    competitionList: "Competition List",
    pensionsList: "Pensions List",
    revenueList: "Revenue List"
  },
  searchCasesTitle: "Search Cases",
  searchCasesLabel: "Search by case number, details, venue, judge, or other information",
  tableHeaders: {
    venue: "Venue",
    judge: "Judge",
    time: "Time",
    caseNumber: "Case Number",
    caseDetails: "Case Details",
    hearingType: "Hearing Type",
    additionalInformation: "Additional Information"
  },
  noHearingsMessage: "No hearings scheduled for this day",
  dataSource: "Data source",
  backToTop: "Back to top",
  listFor: "List for",
  lastUpdated: "Last updated",
  at: "at",
  provenanceLabels
};
```

**`src/locales/cy.ts`** — identical key structure. Welsh values supplied by the issue are used verbatim; the rest are markers.

```typescript
import { provenanceLabelsCy as provenanceLabels } from "@hmcts/list-types-common";

export const cy = {
  pageTitle: "Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls",
  factLinkText: "Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd",
  factLinkUrl: "https://www.find-court-tribunal.service.gov.uk/",
  factAdditionalText: "yng Nghymru a Lloegr, a rhai tribiwnlysoedd nad ydynt wedi'u datganoli yn yr Alban.",
  locationLine1: "[TRANSLATE: \"Rolls Building\"]",
  locationLine2: "[TRANSLATE: \"7 Rolls Buildings, Fetter Lane, London\"]",
  locationLine3: "EC4A 1NL",
  importantInfoTitle: "[TRANSLATE: \"Important information\"]",
  subjectToChangeText:
    "Gall y rhestrau canlynol fod yn destun newid tan 4:30pm. Bydd unrhyw newidiadau ar ôl yr amser hwn yn cael eu cyfathrebu dros y ffôn neu drwy e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.",
  remoteHearingsTitle: "Gwrandawiadau o Bell",
  remoteHearingsText:
    "Os yw aelod o'r cyhoedd neu'r cyfryngau eisiau mynychu gwrandawiad o bell, dylent gysylltu â'r swyddfa restru berthnasol. Mae'r swyddfa gywir yn dibynnu ar y barnwr sy'n gwrando'r achos.",
  contactDetailsTitle: "Manylion cyswllt",
  contactDetails: [
    { role: "Barnwr Uchel Lys - Yr Adran Busnes ac Eiddo", email: "BPD.HCJListing@justice.gov.uk" },
    { role: "Y Llys Masnach (Barnwr Uchel Lys)", email: "COMCT.Listing@justice.gov.uk" },
    { role: "Y Llys Technoleg ac Adeiladwaith (Barnwr Uchel Lys)", email: "TCC.Listing@justice.gov.uk" },
    { role: "Barnwr y Llys Ansolfedd a Chwmnïau", email: "BPD.ICCJClerks@justice.gov.uk" },
    { role: "Meistr Busnes ac Eiddo", email: "BPD.Masters@justice.gov.uk" }
  ],
  listingOfficeDirectText: "Bydd y swyddfa restru yn cyfeirio eich ymholiad i'r unigolyn priodol",
  remoteJudgmentsTitle: "Dyfarniadau o Bell",
  remoteJudgmentsText:
    "Gall dyfarniadau gael eu traddodi o bell. Maent yn cael eu hanfon at y partïon (neu eu cynrychiolwyr) trwy e-bost ac yn cael eu cyhoeddi ar wefan yr Archifau Cenedlaethol yn fuan ar ôl hynny.",
  sectionsOnThisPage: "[TRANSLATE: \"Sections on this page\"]",
  sectionHeadings: {
    appealList: "Y Rhestr Apeliadau",
    businessList: "Y Rhestr Fusnes",
    commercialCourt: "Y Llys Masnach",
    financialList: "Rhestr Ariannol",
    insolvencyAndCompaniesCourt: "Y Llys Ansolfedd a Chwmnïau",
    intellectualPropertyAndEnterpriseCourt: "Y Llys Mentrau Eiddo Deallusol",
    intellectualPropertyList: "Y Rhestr Eiddo Deallusol",
    londonCircuitCommercialCourt: "Y Llys Masnach - Cylchdaith Llundain",
    patentsCourt: "Y Llys Patentau",
    propertyTrustsAndProbateList: "Y Rhestr Eiddo, Ymddiriedolaethau a Phrofiant",
    technologyAndConstructionCourt: "Y Llys Technoleg ac Adeiladwaith",
    admiraltyCourt: "Llys y Morlys",
    companiesWindingUp: "Dirwyn Cwmnïau i Ben",
    competitionList: "Y Rhestr Gystadleuaeth",
    pensionsList: "Y Rhestr Pensiynau",
    revenueList: "Y Rhestr Refeniw"
  },
  searchCasesTitle: "[TRANSLATE: \"Search Cases\"]",
  searchCasesLabel: "[TRANSLATE: \"Search by case number, details, venue, judge, or other information\"]",
  tableHeaders: {
    venue: "[TRANSLATE: \"Venue\"]",
    judge: "[TRANSLATE: \"Judge\"]",
    time: "[TRANSLATE: \"Time\"]",
    caseNumber: "[TRANSLATE: \"Case Number\"]",
    caseDetails: "[TRANSLATE: \"Case Details\"]",
    hearingType: "[TRANSLATE: \"Hearing Type\"]",
    additionalInformation: "[TRANSLATE: \"Additional Information\"]"
  },
  noHearingsMessage: "[TRANSLATE: \"No hearings scheduled for this day\"]",
  dataSource: "[TRANSLATE: \"Data source\"]",
  backToTop: "[TRANSLATE: \"Back to top\"]",
  listFor: "[TRANSLATE: \"List for\"]",
  lastUpdated: "[TRANSLATE: \"Last updated\"]",
  at: "[TRANSLATE: \"at\"]",
  provenanceLabels
};
```

**Note on the section order.** The 16 headings are *not* fully alphabetical — items 1–11 are alphabetical, then items 12–16 restart alphabetically (Admiralty Court … Revenue List). The order above is the issue's order, verbatim. See OQ-3.

### 7.3 Interim Applications Daily Cause List

Shares `pageTitle`, FaCT strings, location lines, table headers, search labels, `noHearingsMessage`, `dataSource`, `backToTop`, `listFor`, `lastUpdated`, `at` with §7.2 (same values, own file — these are page-specific per the content-location strategy).

Open-justice copy, English:

```typescript
judgeContactIntro: "Parties should contact the clerk to the Interim Judge {judgeName}, {judgeEmail} as early as possible.",
judgeContactIntroNoJudge: "Parties should contact the clerk to the Interim Judge as early as possible.",
twoHourLimitText:
  "An application should not be listed before the Interim Applications Judge unless the overall time required to deal with the application is 2 hours or less. The 2 hour maximum includes the judge's pre-reading time, the hearing of the application, delivery of judgment and time for dealing with costs. If the judge considers that the estimate will exceed the 2 hour limit it may be stood out of the interim applications list.",
notInIndividualListText:
  "Please note that hearings in the interim applications list will not additionally appear in their individual list."
```

Welsh (supplied by the issue):

```typescript
judgeContactIntro: "Dylai partïon gysylltu â chlerc y Barnwr Interim {judgeName}, {judgeEmail} cyn gynted â phosib.",
judgeContactIntroNoJudge: "[TRANSLATE: \"Parties should contact the clerk to the Interim Judge as early as possible.\"]",
twoHourLimitText:
  "Ni ddylai cais gael ei restru gerbron y Barnwr Ceisiadau Interim oni bai bod cyfanswm yr amser sy'n ofynnol i ymdrin â'r cais yn 2 awr neu'n llai. Mae'r uchafswm o 2 awr yn cynnwys amser darllen ymlaen llaw y barnwr, gwrandawiad y cais, rhoi'r dyfarniad ac amser ar gyfer ymdrin â chostau. Os yw'r barnwr yn ystyried y bydd yr amcangyfrif amser yn fwy na'r uchafswm o 2 awr, gall gael ei dynnu oddi ar y rhestr ceisiadau interim.",
notInIndividualListText:
  "Noder, ni fydd gwrandawiadau yn y rhestr ceisiadau interim yn ymddangos yn ychwanegol yn eu rhestr unigol."
```

`pageTitle` Welsh: `[WELSH TRANSLATION REQUIRED: "Interim Applications Daily Cause List"]`.

The issue's copy embeds a literal `[name, email address]` placeholder. Rendering a bracketed placeholder to the public would be a defect, so `{judgeName}` / `{judgeEmail}` tokens are substituted from the Excel config tab, with a placeholder-free fallback when the tab is blank.

### 7.4 Email interpolation and escaping

Judge name and email come from an uploaded spreadsheet, so they are untrusted input:

- Escape both when rendering (Nunjucks autoescapes by default — do **not** pass them through `| safe`).
- `validateNoHtmlTags` rejects markup at conversion time; the JSON schema repeats the check with the standard `^(?!(.|\r|\n)*<[^>]+>)(.|\r|\n)*$` pattern.
- Build the `mailto:` href with `| urlencode` so a malformed address cannot break out of the attribute.
- The five fixed contact emails in §7.2 are hard-coded locale content and safe to render as static `mailto:` anchors.

---

## 8. URL

| Page | URL | Notes |
|---|---|---|
| Venue landing | `/summary-of-publications?locationId=26` | Existing page; no route change |
| Rolls Building Daily Cause List | `/business-and-property-division-rolls-building-daily-cause-list?artefactId=<uuid>` | New. Must match `listTypeData.urlPath` exactly — the landing page builds links as `/{urlPath}?artefactId={id}` |
| Interim Applications Daily Cause List | `/interim-applications-daily-cause-list?artefactId=<uuid>` | New |
| Welsh variants | append `?lng=cy` (or `&lng=cy`) | Handled by existing i18n middleware |

Routing notes:

- Both pages live under the `(list-types)` route group, so the group name does not appear in the URL. Directory name = URL segment = `urlPath`.
- Both export `ROUTES` explicitly, matching the existing list-type page convention.
- A mismatch between the directory name and `listTypeData.urlPath` produces a silent 404 from the landing page. Assert the two agree in a unit test.
- No route changes for the removed list types. `/companies-winding-up-chd-daily-cause-list` and `/financial-list-chd-kb-daily-cause-list` stay live so historic artefacts remain viewable.

---

## 9. Validation

### 9.1 Excel upload validation (conversion time)

Applies to every hearings tab in both templates, via `RCJ_EXCEL_CONFIG_SIMPLE_TIME`:

| Field | Required | Rule |
|---|---|---|
| Venue | Yes | Non-empty; no HTML tags |
| Judge | Yes | Non-empty; no HTML tags |
| Time | Yes | Matches `^\d{1,2}([:.]\d{2})?[ap]m\s*$` (`validateTimeFormatSimple`) — e.g. `10:30am`, `2pm`, `10.30am` |
| Case Number | Yes | Non-empty; no HTML tags |
| Case Details | Yes | Non-empty; no HTML tags |
| Hearing Type | Yes | Non-empty; no HTML tags |
| Additional Information | No | No HTML tags when present |

- `minRows: 0` — an empty tab is valid and renders the empty-section message. This is required by AC8.
- A tab whose name does not match the expected `worksheetName` falls back to its positional index; if neither resolves, the section is `[]`.

Interim Applications "Judge details" tab (`JUDGE_DETAILS_CONFIG`, `minRows: 0`):

| Field | Required | Rule |
|---|---|---|
| Judge Name | Yes (if the row exists) | Non-empty; no HTML tags; max 200 chars |
| Judge Email | Yes (if the row exists) | Valid email format; no HTML tags |

Only the first data row is read. Rows beyond the first are ignored — flag this in the template's guidance text rather than failing the upload.

### 9.2 JSON schema validation (render time)

`libs/list-types/business-and-property-division-rolls-building-daily-cause-list/src/schemas/business-and-property-division-rolls-building-daily-cause-list.json`:

- Root `"type": "object"`, `"required"` listing all 16 section keys — every section key must be present, even when its array is empty.
- Define the hearing shape once under `$defs` and `$ref` it from all 16 sections rather than repeating 16 identical blocks:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Business and Property Division Rolls Building Daily Cause List",
  "type": "object",
  "required": ["appealList", "businessList", "…all 16…"],
  "properties": {
    "appealList": { "type": "array", "items": { "$ref": "#/$defs/hearing" } }
  },
  "$defs": {
    "hearing": {
      "type": "object",
      "required": ["venue", "judge", "time", "caseNumber", "caseDetails", "hearingType"],
      "properties": {
        "venue": { "type": "string", "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$" },
        "time": { "type": "string", "pattern": "^\\d{1,2}([:.]\\d{2})?[ap]m\\s*$" }
      }
    }
  }
}
```

Confirm the project's AJV instance is configured for draft-07 `$defs`/`$ref` before relying on it; if not, fall back to repeating the block and add a test asserting all 16 sections share an identical shape.

Interim Applications schema: root object, `required: ["hearings", "judgeDetails"]`; `judgeDetails` is an array of objects requiring `judgeName` and `judgeEmail`, with `"maxItems": 1` if a stricter contract is wanted.

### 9.3 Mandatory validator wrappers and tests

Per CLAUDE.md item 6, a schema without a `validate*` export fails the CI guard at `libs/list-types/common/src/validation/guard.test.ts`. Both packages need:

```typescript
// src/validation/json-validator.ts
export function validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList(jsonData: unknown): ValidationResult {
  return createJsonValidator(schemaPath)(jsonData);
}
```

exported from `index.ts`, plus `src/validation/json-validator.test.ts` with a fully-hydrated `VALID_DATA` fixture (all 16 sections populated) and **one `it` block per required field at every nesting level**, each deep-cloning with `JSON.parse(JSON.stringify(VALID_DATA))`. Do not mock `@hmcts/list-types-common` — run the real schema.

That is 16 sections × 6 required fields = 96 individual `it` blocks for the Rolls Building validator if written literally. Generating them from a `describe.each` over `SECTIONS` × required-field names keeps this maintainable while still asserting each field individually.

### 9.4 Upload form validation

No change. `validateNonStrategicUploadForm` in `@hmcts/admin-pages` already covers court, list type, hearing date, sensitivity, language, display window and file presence/type.

---

## 10. Error Messages

### 10.1 Excel upload errors (existing mechanism, new messages)

Errors are thrown by field validators and surfaced on `/non-strategic-upload` in a `govukErrorSummary`. Format follows the existing convention — field name and row number, never a bare "invalid input":

| Condition | Message |
|---|---|
| Missing required hearing field | `Missing required field 'Case Number' in row 4` |
| Bad time format | `Invalid time format in row 7: expected a time like 10:30am` |
| HTML in a cell | `Invalid content in 'Case Details' in row 9: HTML tags are not allowed` |
| Bad judge email | `Invalid email address in 'Judge Email' in row 2` |
| No worksheets at all | `Excel file must contain at least one worksheet` (existing message from `createMultiSheetConverter`) |

The row number is per-sheet. With 16 tabs, "row 4" is ambiguous without the tab name — prefix sheet-scoped errors with the worksheet name (`Appeal List: Missing required field 'Case Number' in row 4`). This needs a small change in `createMultiSheetConverter` to wrap per-sheet errors; without it, an admin cannot locate the offending cell in a 16-tab workbook.

### 10.2 Page-level errors (existing `createSimpleListTypeHandler`)

| Condition | Status | Template | Copy |
|---|---|---|---|
| No `artefactId` query param | 400 | `errors/common` | Bad Request — Missing artefactId parameter |
| Artefact not found | 404 | `errors/common` | Not Found — The requested list could not be found |
| `listTypeName` mismatch | 400 | `errors/common` | Invalid List Type — This list type is not supported by this module |
| Blob missing | 404 | `errors/common` | Not Found — The requested list could not be found |
| Schema validation fails | 400 | `errors/common` | Invalid Data — The list data is invalid |
| Unexpected error | 500 | `errors/common` | Error — An error occurred while displaying the list |

### 10.3 Venue landing page errors

Unchanged: missing, non-numeric or unknown `locationId` redirects to `/400`.

### 10.4 Empty-state messages (not errors)

| Condition | Message |
|---|---|
| A section has no hearings | "No hearings scheduled for this day" |
| No publications for the venue | `location_metadata.no_list_message` if set, otherwise "Sorry, no lists found for this court" |

---

## 11. Navigation

### 11.1 Inbound

- From `/summary-of-publications?locationId=26`, each publication link is built as `/{listType.url}?artefactId={artefact.artefactId}` — no `target="_blank"` for JSON publications (only flat files open in a new window).
- Deep links with `?artefactId=` are valid entry points; both pages are publicly accessible (`Public` sensitivity), no auth middleware.

### 11.2 Within the list pages

- **Back link** — standard `‹ Back` from the base template, returning to the venue landing page via browser history.
- **Contents jump links** — the 16 section names link to `#appeal-list` … `#revenue-list`. Anchor targets are the section `h2` ids, so activating a link moves focus context to the heading, which screen readers announce.
- **Back to top** — `<a href="#top">` at the foot, targeting the `id="top"` on the `h1`. Matches the existing london-admin page.
- **Case search** — client-side row filter across all sections; no navigation, no page reload. Sections whose rows are all filtered out should show the empty-section message so the page never appears truncated.

### 11.3 Language switching

The header language toggle preserves the current path and query string, appending/replacing `lng`. `?artefactId=…&lng=cy` must keep rendering the same artefact.

### 11.4 Admin flow

`/non-strategic-upload` → `/non-strategic-upload-summary` → `/non-strategic-upload-success`. Unchanged; the two new list types simply appear in the dropdown.

### 11.5 Removed list types

- Disappear from `/non-strategic-upload`, `/manual-upload`, `/view-list-types`, `/manage-list-types` and every venue landing page (all queries filter `deletedAt: null`).
- Their `/…-daily-cause-list` routes stay registered so existing artefact links keep working.
- Subscriptions to a removed list type stop generating emails once no new artefacts are published; no data migration is in scope. Flagged as OQ-4.

---

## 12. Accessibility

Target: **WCAG 2.2 AA**. The 16-section page is the main risk — it is by far the longest page in the service.

### 12.1 Headings and document structure

- One `h1` per page, matching the `<title>`: "Business and Property Division Rolls Building Daily Cause List".
- Each of the 16 sections is an `h2`. No level skipping. `h3` only inside the important-information block ("Remote Hearings", "Remote Judgments").
- Section `h2` elements carry the anchor `id`; the "Sections on this page" list is a plain `<ul>` of in-page links, not a `<nav>` landmark (it is content, not site navigation).

### 12.2 Tables

- Every table uses `<thead>` with `<th scope="col">` on all 7 headers.
- Each table is associated with its section heading using `aria-labelledby="<section-id>"` rather than a duplicated `aria-label`, so 16 tables have 16 distinct, non-repetitive accessible names.
- No layout tables, no merged cells, no empty header cells.
- Empty sections render a `<p>`, not a table with zero rows — an empty `<tbody>` is announced as a table with no data and is more confusing than the message.

### 12.3 Links

- FaCT link text is the descriptive phrase, not "click here"; the trailing sentence is outside the anchor.
- Email addresses render as `mailto:` links with the address as the link text, so the accessible name is the address itself.
- Jump links use the visible section name as their text — unique and self-describing out of context.
- "Back to top" is a genuine link to `#top`; the target `h1` is focusable via the fragment.
- Flat-file links elsewhere on the landing page keep their existing "(opens in a new window)" suffix. The two new pages open in the same tab, so no suffix.

### 12.4 Search field

- `<label>` bound with `for`/`id`; visually hidden but present (`govuk-visually-hidden`), so the field is never label-less.
- Filtering is progressive enhancement — with JavaScript off, all rows remain visible and the page is fully usable.
- Announce the filtered result count in an `aria-live="polite"` region. With 16 sections a silent filter gives screen-reader users no feedback about what changed.

### 12.5 Reading order, focus and contrast

- Logical DOM order: heading → FaCT → address → date → important information → search → contents → sections → data source → back to top. No CSS reordering.
- All interactive elements keyboard reachable in DOM order with the default GOV.UK focus style (3:1 minimum against adjacent colour).
- Text contrast 4.5:1 minimum; the `govuk-body-s` "Data source" line included.
- No information conveyed by colour alone; no time limits.
- Touch targets at least 44 × 44px — relevant to the 16 densely packed jump links, which need `govuk-list--spaced` or equivalent vertical spacing.

### 12.6 Details component

The important-information block uses `govukDetails` with `open: true`, matching the existing london-admin page. The component ships correct `<details>`/`<summary>` semantics; the open-by-default state means the open-justice wording is not hidden from users who never expand it.

### 12.7 Automated and manual checks

- Axe-core scan inline in the Playwright journey test, asserting zero violations on all three pages in both languages.
- Manual keyboard-only pass and a screen-reader pass on the 16-section page specifically, checking that table names are distinguishable and jump links land correctly.
- Verify the page with 16 populated sections against a realistic worst-case row count — check that response size and time stay acceptable (see OQ-5).

---

## 13. Test Scenarios

### Unit — reference data

* Renaming `locationId: 26` keeps its region and sub-jurisdiction, and the location resolves by the new name.
* `listTypeData` contains both new entries with `isNonStrategic: true`, a `Public` default sensitivity and sub-jurisdiction 10.
* Each new list type's `urlPath` matches its page directory name under `apps/web/src/pages/(list-types)/`.
* The removed list-type names are absent from `listTypeData`, and the generated seed SQL soft-deletes rather than deletes them.
* Generated seed SQL is idempotent — running it twice produces the same rows and does not resurrect `deleted_at`.

### Unit — Excel conversion

* A 16-tab workbook converts to an object with all 16 section keys populated in the declared order.
* A workbook with some tabs empty yields empty arrays for those sections and does not raise an upload error.
* A workbook missing a tab entirely yields an empty array for that section (name lookup fails, index fallback fails).
* Tabs are matched by name, not position — reordering tabs in the workbook produces identical output.
* A missing required cell, a malformed time, and an HTML-bearing cell each produce an error naming the field, the row and the worksheet.
* The Interim Applications judge tab yields `{ judgeName, judgeEmail }`; an invalid email is rejected; a blank tab yields an empty array.
* Only the first data row of the judge tab is read when several are present.

### Unit — JSON schema validation

* Fully-hydrated 16-section fixture validates.
* Each of the 6 required hearing fields, in each of the 16 sections, individually causes a validation failure when removed (generated per-section, per-field).
* A missing top-level section key fails validation.
* Interim Applications: missing `hearings`, missing `judgeDetails`, and missing `judgeName`/`judgeEmail` each fail individually.

### Unit — renderer

* All 16 sections are returned in the specified order, with localised headings, for both `en` and `cy`.
* Anchor ids are unique, kebab-case, and stable for headings containing `&` and `,`.
* Hearings are normalised (missing optional fields become empty strings, not `undefined`).
* Header carries the localised list title, formatted content date, and last-updated date and time.
* Interim Applications: the judge name and email are interpolated into the open-justice intro; the blank-judge fallback is used when the tab is empty and contains no bracketed placeholder.

### Unit — page controllers

* Renders with the expected view name and view model when the artefact and blob resolve.
* Returns 400 when `artefactId` is absent, 404 when the artefact or blob is missing, 400 when schema validation fails, 500 on an unexpected error.
* Returns 400 when `artefact.listTypeName` is a different list type, using a fixture with an arbitrary `listTypeId` (e.g. `999`) to prove ID-independence.
* Selects Welsh content when `res.locals.locale === "cy"`.

### Template (`.njk.test.ts`, Cheerio)

* 16 `h2` section headings render in the specified order.
* A populated section renders one table with 7 `th[scope="col"]` and one row per hearing, cells in the declared column order.
* An empty section renders its heading and the "No hearings scheduled for this day" paragraph, and no table.
* Both conditional branches are asserted — table present when hearings exist, absent when they do not.
* The FaCT link href and link text are correct, and the trailing sentence sits outside the anchor.
* All five contact emails render as `mailto:` anchors with the address as link text.
* Each table's `aria-labelledby` resolves to its own section heading id; all 16 ids are unique.
* Contents jump-link hrefs match the section heading ids one-to-one.
* Welsh render produces the Welsh headings, section names and empty-section message.
* `Object.keys(en).sort()` equals `Object.keys(cy).sort()`, including the nested `sectionHeadings` and `tableHeaders` objects.
* Interim Applications: judge name and email render escaped; a name containing `<script>` is not executed; the `mailto:` href is encoded.

### Unit — PDF and email summary

* The PDF generator renders all 16 sections, including empty ones with their message, and saves to storage.
* PDF generation failure returns an error result rather than throwing.
* `extractCaseSummary` returns one summary per hearing across all 16 sections, with time, case number and case details.
* Both list types resolve from `PDF_GENERATOR_REGISTRY` and the notification registry by name.

### E2E (Playwright — one journey test per journey, `@nightly`)

* **Public journey:** find the venue on `/courts-tribunals-list` under "B" → open the venue landing page → assert the `h1`, FaCT link and caution message → switch to Welsh and assert the translated heading → run an Axe scan → tab through the jump links with the keyboard → open the Rolls Building list → assert several section headings, one populated table and one empty-section message → run an Axe scan → use the case search and assert filtering → follow "Back to top".
* **Admin publish journey:** sign in as a CTSC admin → `/non-strategic-upload` → assert the two new list types are in the dropdown and the removed ones are not → submit a 16-tab workbook with one empty tab → assert a validation error for a deliberately malformed row naming the worksheet → correct and resubmit → confirm on the summary page → assert the success page → follow through to the published list and assert the sections render.
* **Interim Applications journey:** publish the 2-tab template with judge details → open the list → assert the interpolated judge name and `mailto:` email in the open-justice wording, the 2-hour paragraph and the individual-list paragraph → Welsh check → Axe scan.

---

## 14. Assumptions & Open Questions

### Assumptions

* **A1 — The venue is renamed, not created.** `locationId: 26` already exists as "Business and Property Courts Rolls Building". Creating a second location would orphan existing artefacts and subscriptions, so the existing row is renamed in place and the `locationId` is unchanged.
* **A2 — "Removed" means soft-deleted.** The issue's "removed but retained in the code for MI Reporting from the database" maps exactly onto the existing seed reconciliation: delete the `listTypeData` entry, the deploy sets `deleted_at`, MI reporting still resolves the name. Packages, pages and registry entries stay in the repo so historic artefacts still render.
* **A3 — Both new list types are non-strategic Excel uploads** (`isNonStrategic: true`), which is what places them in the `/non-strategic-upload` dropdown. Sensitivity defaults to `Public` and provenance to `CFT_IDAM`, matching the sibling ChD/KB entries.
* **A4 — Section order is the issue's order, verbatim**, including the non-alphabetical break after "Technology and Construction Court".
* **A5 — All 16 sections always render**, populated or not, because AC8 requires a per-section empty message.
* **A6 — Excel tab names match the section headings exactly.** Name lookup with positional fallback means a renamed tab still resolves by position, but a renamed *and* reordered tab silently lands in the wrong section — worth calling out in the template's guidance.
* **A7 — Each hearings tab uses the standard RCJ 7-field layout** with `validateTimeFormatSimple`, matching London Administrative Court.
* **A8 — Judge details occupy a single row** on tab 2 of the Interim Applications template; extra rows are ignored.
* **A9 — Welsh strings not supplied in the issue** are marked `[TRANSLATE: …]` for the post-processing script; supplied ones are used verbatim.
* **A10 — The Rolls Building address** is "Rolls Building, 7 Rolls Buildings, Fetter Lane, London EC4A 1NL". Confirm with the business before release (OQ-6).

### Open questions

* **OQ-1 — How is the caution message populated?** `location_metadata` is admin-managed via `/location-metadata-manage` and is *not* covered by the reference-data seed. Two options: (a) a system admin enters the English and Welsh caution and no-list messages on each environment — no code change, but manual and easily missed on STG/production; (b) extend `generate-seed-sql.ts` to seed `location_metadata`, which makes it deterministic but would overwrite any subsequent admin edit on every deploy. **Recommendation: (a)**, with the exact copy handed to the ops team as part of the release notes. Needs a decision before the AC4 can be signed off.
* **OQ-2 — Should `CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST` be removed?** The issue names "London Circuit Commercial Court (KB) daily cause list", but the existing entry is "Circuit Commercial Court Daily Cause List", which is not London-scoped and may serve other venues. Removing it would soft-delete a list type possibly still in use elsewhere. **Assumed out of scope until confirmed.**
* **OQ-3 — Is the section order correct?** Items 1–11 are alphabetical and items 12–16 restart alphabetically. This looks like two lists concatenated rather than a deliberate ordering. Confirm whether the intent is the literal order given, or a single alphabetical sequence across all 16.
* **OQ-4 — What happens to existing subscriptions** against the removed list types? Subscribers will silently stop receiving emails rather than being migrated to the new consolidated list or notified. Confirm whether a migration or a notification is required; currently out of scope.
* **OQ-5 — What is the realistic worst-case volume** for a 16-section list? At, say, 40 hearings per section that is 640 rows and roughly 4,500 table cells in one response, plus a PDF. Confirm expected volumes so page weight, PDF size against the existing max-size check, and the client-side search performance can be verified rather than assumed.
* **OQ-6 — Confirm the displayed address** for the Rolls Building, and whether the page should show the Rolls Building address or the Royal Courts of Justice address (the venue sits in the RCJ Group region).
* **OQ-7 — Are the Excel templates to be published anywhere?** The issue says lists are published "using an excel template", but the repo holds no downloadable templates (only two ticket attachments under `docs/tickets/`). Confirm whether the 16-tab and 2-tab templates need to be produced and distributed as part of this ticket, and whether they belong in the repo or in business-owned storage.
* **OQ-8 — Does "Appeal List" correspond to the issue's "Chancery Appeals (ChD) daily cause list"** in the removal list? The section headings and the removed list names do not map one-to-one — "Appeal List" appears as a section but "Chancery Appeals" as a removed list, and "Financial List" appears as a section but not with the "(ChD/KB)" qualifier. Confirm the mapping so MI reporting can reconcile old and new.
* **OQ-9 — Welsh translation of the venue name.** The issue gives the Welsh list-type name as "Rhestr Achosion Dyddiol Adran Busnes ac Eiddo - Adeilad Rolls" but does not give a Welsh venue name. The existing value is "Llysoedd Busnes ac Eiddo - Adeilad Rolls" ("Courts", not "Division"). Confirm whether the venue's Welsh name changes to match the new English name.


### Comment by OgechiOkelu on 2026-08-18T13:34:35Z

@plan 
