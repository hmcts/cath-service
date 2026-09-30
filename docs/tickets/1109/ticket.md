# #1109: Investigate - CaTH User Groups Banner/Label

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** type:story
**Created:** 2026-09-30T12:58:50Z
**Updated:** 2026-09-30T13:08:42Z

## Description

**PROBLEM STATEMENT**
When communications are sent out to CaTH users (e.g. after an incident/release), the communication is sent out to all CaTH users. This ticket is raised to investigate and implement the possibility of grouping CaTH users by jurisdiction/role such that communication can be sent out to specific user groups as needed (e.g. Crown Advance list Release to CaTH users interested only in Crime hearing lists and not Family/Tribunal hearing lists). 

 

**AS A** Service
**I WANT** to group CaTH users per jurisdiction 
**SO THAT** communications can be sent out to specific user groups 

 

**ACCEPTANCE CRITERIA**
- Explore different options for grouping CaTH users by jurisdiction/role
- Upon agreement with the business, the agreed solution is implemented

## Comments

### Comment by OgechiOkelu on 2026-09-30T12:59:50Z

@spec

### Comment by hmctsclaudecode on 2026-09-30T13:06:48Z

# Technical Specification — Issue #1109: CaTH User Groups (Banner/Label)

## 1. User Story

**As a** CaTH service team member (System Admin)
**I want to** build and export a group of CaTH users filtered by the jurisdiction, sub-jurisdiction, role and provenance they are associated with
**So that** release and incident communications can be sent only to the users who care about that jurisdiction, instead of to every user on the service

---

## 2. Background

### The problem

There is no grouping of CaTH users today. `libs/postgres-prisma/prisma/schema/base.prisma:48` shows the `user` table holds only `email`, `firstName`, `surname`, `userProvenance`, `userProvenanceId`, `role`, `createdDate` and `lastSignedInDate`. There is no jurisdiction, region or interest column, and no `user_group` table. Consequently any communication (e.g. "Crown Advance List is now live") has to go to every verified user, including users who only ever look at Family or Tribunal lists.

There is also no bulk-communication feature in the codebase to target. GOV.UK Notify is used only for transactional, single-recipient emails (`libs/notification/src/govuk-notify-service.ts` — media rejection, new account, duplicate account) and for subscription notifications (`libs/notifications/src/notification/notification-service.ts`). Release/incident comms are currently composed and sent outside the service. So the deliverable is **the recipient list**, not a new send mechanism.

### Options investigated

| # | Option | How it works | Verdict |
|---|--------|--------------|---------|
| **A** | **Derive groups from existing subscription data** | A user's jurisdiction interest is inferred from what they already subscribe to: `subscription.searchValue` (where `searchType = 'LOCATION_ID'`) → `location_sub_jurisdictions` → `sub_jurisdiction` → `jurisdiction`; and `subscription_list_type.listTypeIds` → `list_types_sub_jurisdictions` → `sub_jurisdiction` → `jurisdiction`. Combine with `user.role` and `user.userProvenance`. | **Recommended.** No schema change, no data migration, no new user-facing journey, and the data is already accurate because users maintain their own subscriptions. Every join already exists (`libs/postgres-prisma/prisma/schema/location.prisma`). |
| B | New self-declared field on `user` (e.g. `user.jurisdictions String[]`) | Ask users to pick their jurisdictions at registration and in account settings. | Rejected for this slice. Requires a schema change, a migration, two new user-facing pages in both languages, and leaves ~all existing users with a null value until they next sign in — so comms would still have to fall back to "send to everyone". |
| C | Static `user_group` table with manual admin assignment | System Admin assigns users to named groups. | Rejected. Manual upkeep for thousands of users, immediately goes stale, and duplicates information the subscription data already holds. |
| D | Manage groups entirely in GOV.UK Notify | Maintain separate recipient lists inside Notify. | Rejected as the primary mechanism — the lists cannot be refreshed from CaTH data and drift as users subscribe/unsubscribe. However Notify **is** the send channel: option A produces the CSV that Notify's bulk send consumes. |

### Chosen scope

Option A, delivered as one new System Admin page that filters users, shows the matching count and list, and downloads the recipient emails as a CSV for upload to GOV.UK Notify bulk send. This mirrors the existing `/mi-report` pattern (filter → generate file → `Content-Disposition: attachment`) and the existing `/find-users` filter UI (`mojFilter` sidebar, session-held filters, tag-based selected filters).

### Deliberately out of scope

- Sending email from CaTH. A bulk send loop would need rate limiting, retry, per-recipient audit rows and unsubscribe handling — a separate, much larger piece of work.
- Any change to the public-facing site, including a notification banner shown to specific user groups. The ticket title mentions "Banner/Label" but the problem statement and acceptance criteria are entirely about outbound communications; see §14.
- Changing how users declare their interests (option B).

### Existing code this builds on

- `libs/system-admin-pages/src/user-management/queries.ts` — `searchUsers` filter/pagination pattern to extend.
- `apps/web/src/pages/(system-admin)/find-users/` — `mojFilter` sidebar, session filters, `clear-filters` / `remove-filter` sub-routes.
- `apps/web/src/pages/(system-admin)/mi-report/index.ts` — file-download controller and `req.auditMetadata` usage.
- `libs/system-admin-pages/src/audit-log/logger.ts` — `AuditLogAction` enum, needs a new member.
- `libs/location/src/location-data.ts` — the four jurisdictions (Civil, Family, Crime, Tribunal) and their sub-jurisdictions, with Welsh names already present.

---

## 3. Acceptance Criteria

* **Scenario:** System Admin opens the user groups page
    * **Given** I am signed in with the `SYSTEM_ADMIN` role
    * **When** I select "User Groups" from the System Admin Dashboard
    * **Then** the user groups page is shown with no filters applied, the total count of verified users, and the first page of results

* **Scenario:** Non-admin cannot reach the page
    * **Given** I am signed in with the `VERIFIED`, `INTERNAL_ADMIN_CTSC` or `INTERNAL_ADMIN_LOCAL` role
    * **When** I request `/user-groups`
    * **Then** I am refused access by the existing `requireRole` middleware and do not see any user data

* **Scenario:** Group users by a single jurisdiction
    * **Given** I am on the user groups page
    * **When** I tick "Crime" under Jurisdiction and select "Apply filters"
    * **Then** only users with at least one court subscription or list-type subscription mapped to the Crime jurisdiction are listed
    * **And** the result count reads "N users found"
    * **And** "Crime" appears as a removable tag under "Selected filters"

* **Scenario:** Combine jurisdiction with role
    * **Given** I have ticked "Crime" under Jurisdiction
    * **When** I also tick "Verified" under Role and select "Apply filters"
    * **Then** only users who are both interested in Crime **and** hold the `VERIFIED` role are listed

* **Scenario:** Choose how interest is matched
    * **Given** I am on the user groups page with "Crime" selected
    * **When** I choose "Courts they subscribe to" as the matching method
    * **Then** users whose only Crime signal is a list-type subscription are excluded from the results

* **Scenario:** Narrow to a sub-jurisdiction
    * **Given** I have ticked "Crime" under Jurisdiction
    * **When** I tick "Crown Court" under Sub-jurisdiction and select "Apply filters"
    * **Then** only users interested in the Crown Court sub-jurisdiction are listed, excluding Magistrates-only users

* **Scenario:** No users match the group
    * **Given** I am on the user groups page
    * **When** I apply a combination of filters that matches no users
    * **Then** an error summary is shown saying no users match the criteria, and the results table is not rendered

* **Scenario:** Download the recipient list
    * **Given** filters are applied and at least one user matches
    * **When** I select "Download email list"
    * **Then** a CSV file downloads containing one row per matched user with their email address and matched jurisdictions
    * **And** the filename includes the applied filters and the date
    * **And** an audit log entry is written recording the action, the filters used and the recipient count

* **Scenario:** Download is blocked when the group is empty
    * **Given** no users match the applied filters
    * **When** I select "Download email list"
    * **Then** no file is produced and an error summary tells me there are no users to download

* **Scenario:** Clearing filters
    * **Given** I have several filters applied
    * **When** I select "Clear filters"
    * **Then** all filters are removed from my session and the unfiltered list is shown

* **Scenario:** Removing a single filter
    * **Given** I have "Crime" and "Family" selected under Jurisdiction
    * **When** I select the remove link on the "Family" tag
    * **Then** only the Family filter is removed and the results are re-run with "Crime" still applied

* **Scenario:** Welsh language
    * **Given** I am on the user groups page
    * **When** I append `?lng=cy` or select "Cymraeg"
    * **Then** all page headings, filter legends, jurisdiction names, button text and error messages are shown in Welsh

* **Scenario:** Pagination
    * **Given** a filter matches more than 25 users
    * **When** I select "Next"
    * **Then** the second page of results is shown with the filters still applied
    * **And** downloading the CSV returns **all** matched users, not just the current page

---

## 4. User Journey Flow

```
                       System Admin Dashboard
                                │
                     select "User Groups" tile
                                │
                                ▼
                    ┌───────────────────────────┐
                    │  GET /user-groups         │
                    │  (unfiltered, page 1)     │
                    └───────────┬───────────────┘
                                │
              tick filters, select "Apply filters"
                                │
                                ▼
                    ┌───────────────────────────┐
                    │  POST /user-groups        │
                    │  validate + save filters  │
                    │  to session               │
                    └───────────┬───────────────┘
                                │
                 ┌──────────────┴──────────────┐
          invalid│                             │valid
                 ▼                             ▼
    ┌────────────────────────┐    302 redirect to GET /user-groups
    │ re-render with error   │                 │
    │ summary, filters kept  │                 ▼
    └────────────────────────┘    ┌───────────────────────────┐
                                  │  results: count, table,   │
                                  │  selected filter tags,    │
                                  │  pagination               │
                                  └───────┬───────────┬───────┘
                                          │           │
                          "Download email │           │ "Clear filters" /
                                   list"  │           │ remove a tag
                                          ▼           ▼
                        ┌────────────────────────┐  ┌──────────────────────────┐
                        │ POST /user-groups/     │  │ GET /user-groups/        │
                        │      download          │  │   clear-filters   OR    │
                        │ • re-run query, no     │  │   remove-filter?...      │
                        │   pagination           │  │ • mutate session         │
                        │ • build CSV            │  │ • 302 → GET /user-groups │
                        │ • write audit log      │  └──────────────────────────┘
                        │ • Content-Disposition: │
                        │   attachment           │
                        └────────────┬───────────┘
                                     │
                                     ▼
                       CSV saved to admin's machine
                                     │
                                     ▼
                   (outside CaTH) upload to GOV.UK Notify
                        bulk send → targeted comms
```

No new page is added after the download: the browser stays on the results page, exactly as `/mi-report` behaves today.

---

## 5. Low Fidelity Wireframe

### `/user-groups` — desktop, filters applied

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  GOV.UK                    Court and tribunal hearings            English|Cymraeg│
├──────────────────────────────────────────────────────────────────────────────────┤
│  BETA  This is a new service – your feedback will help us improve it.            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  < Back                                                                          │
│                                                                                  │
│  User Groups                                                        [h1, xl]     │
│                                                                                  │
│  Build a group of users by the jurisdictions they follow, then download           │
│  their email addresses to send a targeted communication.                         │
│                                                                                  │
│ ┌─── Filter ──────────────┐  ┌──────────────────────────────────────────────────┐ │
│ │                         │  │  128 users found                     [h2, m]    │ │
│ │ Selected filters        │  │                                                  │ │
│ │  Jurisdiction           │  ├──────────────┬──────────┬────────────────────────┤ │
│ │   [Crime      ✕]        │  │ Email        │ Role     │ Jurisdictions          │ │
│ │  Role                   │  ├──────────────┼──────────┼────────────────────────┤ │
│ │   [Verified   ✕]        │  │ a@test.com   │ Verified │ Crime                  │ │
│ │  Clear filters          │  ├──────────────┼──────────┼────────────────────────┤ │
│ │ ─────────────────────── │  │ b@test.com   │ Verified │ Crime, Family          │ │
│ │                         │  ├──────────────┼──────────┼────────────────────────┤ │
│ │ How users are matched   │  │ c@test.com   │ Verified │ Crime                  │ │
│ │  (•) Courts or lists    │  ├──────────────┼──────────┼────────────────────────┤ │
│ │  ( ) Courts they        │  │ d@test.com   │ Verified │ Crime, Civil           │ │
│ │      subscribe to       │  └──────────────┴──────────┴────────────────────────┘ │
│ │  ( ) List types they    │  │                                                  │ │
│ │      subscribe to       │  │      [ Download email list ]   (secondary btn)   │ │
│ │                         │  │                                                  │ │
│ │ Jurisdiction            │  │   < Previous    1  2  [3]  4  5    Next >        │ │
│ │  [x] Crime              │  │                                                  │ │
│ │  [ ] Civil              │  └──────────────────────────────────────────────────┘ │
│ │  [ ] Family             │                                                       │
│ │  [ ] Tribunal           │                                                       │
│ │                         │                                                       │
│ │ Sub-jurisdiction        │                                                       │
│ │  [ ] Crown Court        │                                                       │
│ │  [ ] Magistrates Court  │                                                       │
│ │  [ ] Civil Court        │                                                       │
│ │  [ ] Family Court       │                                                       │
│ │  [ ] Employment Trib…   │                                                       │
│ │  … (all sub-jurisdicts) │                                                       │
│ │                         │                                                       │
│ │ Role                    │                                                       │
│ │  [x] Verified           │                                                       │
│ │  [ ] CTSC Admin         │                                                       │
│ │  [ ] Local Admin        │                                                       │
│ │  [ ] System Admin       │                                                       │
│ │                         │                                                       │
│ │ Provenance              │                                                       │
│ │  [ ] CFT IdAM           │                                                       │
│ │  [ ] SSO                │                                                       │
│ │  [ ] B2C                │                                                       │
│ │  [ ] Crime IdAM         │                                                       │
│ │                         │                                                       │
│ │  [ Apply filters ]      │                                                       │
│ └─────────────────────────┘                                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Footer: Accessibility statement | Cookies | Privacy policy | Terms              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile / narrow viewport (MOJ filter collapses)

```
┌───────────────────────────────┐
│ < Back                        │
│                               │
│ User Groups                   │
│                               │
│ Build a group of users by…    │
│                               │
│ [ Show filters ]              │
│                               │
│ 128 users found               │
│ ┌───────────────────────────┐ │
│ │ Email     a@test.com      │ │
│ │ Role      Verified        │ │
│ │ Jurisdic. Crime           │ │
│ ├───────────────────────────┤ │
│ │ Email     b@test.com      │ │
│ │ Role      Verified        │ │
│ │ Jurisdic. Crime, Family   │ │
│ └───────────────────────────┘ │
│                               │
│ [ Download email list ]       │
│                               │
│ < Previous   1 2 [3]   Next > │
└───────────────────────────────┘
```

### Error state — no users match

```
┌──────────────────────────────────────────────────────────────────┐
│  User Groups                                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ !! There is a problem                                      │  │
│  │                                                            │  │
│  │ • No users match the selected filters. Try removing or      │  │
│  │   clearing a filter.                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  (filter sidebar retains selections; no results table;           │
│   no download button)                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Page Specifications

### 6.1 Files to create

```
libs/system-admin-pages/src/user-groups/
├── queries.ts              # searchUserGroups, countUserGroup, fetchAllGroupEmails
├── queries.test.ts
├── service.ts              # buildUserGroupCsv (filters -> { buffer, filename })
├── service.test.ts
├── validation.ts           # validateUserGroupFilters
└── validation.test.ts

apps/web/src/pages/(system-admin)/user-groups/
├── index.ts                # GET (results) + POST (apply filters)
├── index.njk
├── index.njk.test.ts
├── index.test.ts
├── en.ts
├── cy.ts
├── download/
│   ├── index.ts            # POST -> CSV attachment
│   └── index.test.ts
├── clear-filters/
│   └── index.ts            # GET -> clears session, redirects
└── remove-filter/
    └── index.ts            # GET -> removes one filter value, redirects
```

### 6.2 Files to modify

| File | Change |
|------|--------|
| `libs/system-admin-pages/src/index.ts` | Export `searchUserGroups`, `buildUserGroupCsv`, `validateUserGroupFilters` |
| `libs/system-admin-pages/src/audit-log/logger.ts` | Add `DOWNLOAD_USER_GROUP = "Download user group"` to `AuditLogAction` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/en.ts` | Add tile: title "User Groups", description "Group users by jurisdiction and download email lists for communications", href `/user-groups` |
| `apps/web/src/pages/(system-admin)/system-admin-dashboard/cy.ts` | Same tile, Welsh |

No Prisma schema change. No migration. No change to `location-data.ts` or `list-type-data.ts`.

### 6.3 Layout

- Extends `layouts/base-template.njk`.
- Back link to `/system-admin-dashboard` (preserving `lng`), in the `backLink` block — matching `find-users/index.njk`.
- `govuk-grid-column-full` for the heading and error summary.
- `moj-filter-layout` with `app-filter-layout--sidebar`, `mojFilter` macro for the sidebar — identical structure to `find-users/index.njk`, so no new CSS is needed.
- Results in `govukTable` with three columns: Email, Role, Jurisdictions. `govukPagination` beneath, then the download button.
- The download button sits inside its own `<form method="post" action="/user-groups/download">` so it is a real submit, not a link — the CSV is generated from server-side session state, and a `GET` link would be cached and would bypass the audit write.

### 6.4 Filter components

| Filter | Component | `name` | Values |
|--------|-----------|--------|--------|
| How users are matched | `govukRadios` (small) | `matchOn` | `either` (default), `courts`, `listTypes` |
| Jurisdiction | `govukCheckboxes` (small) | `jurisdictions` | Jurisdiction `name` values read from the `jurisdiction` table: `Civil`, `Family`, `Crime`, `Tribunal` |
| Sub-jurisdiction | `govukCheckboxes` (small) | `subJurisdictions` | Sub-jurisdiction `name` values read from the `sub_jurisdiction` table |
| Role | `govukCheckboxes` (small) | `roles` | `VERIFIED`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`, `SYSTEM_ADMIN` |
| Provenance | `govukCheckboxes` (small) | `provenances` | `CFT_IDAM`, `SSO`, `B2C_IDAM` (expanded to `B2C_IDAM` + `PI_AAD` server-side, as `searchUsers` already does), `CRIME_IDAM` |

Jurisdiction and sub-jurisdiction options are loaded from the database at render time, not hardcoded — new jurisdictions added via `/jurisdiction-data` must appear here automatically. Display uses `name` in English and `welshName` in Welsh, both of which already exist on those tables.

### 6.5 Query logic

Filters are combined with **AND** across groups and **OR** within a group. `matchOn` selects which interest signals contribute:

```
matched users =
    users WHERE (role IN selectedRoles OR no roles selected)
      AND (userProvenance IN expandedProvenances OR no provenances selected)
      AND ( no jurisdiction/sub-jurisdiction selected
            OR userId IN courtInterestUserIds       (when matchOn is 'courts' or 'either')
            OR userId IN listTypeInterestUserIds    (when matchOn is 'listTypes' or 'either') )
```

**Court interest** — for each `subscription` with `searchType = 'LOCATION_ID'`, the `searchValue` is the `location_id`; join `location_sub_jurisdictions` → `sub_jurisdiction` → `jurisdiction` and keep users whose resulting jurisdiction (or sub-jurisdiction) name is selected. `subscription.searchValue` is a `String` while `location.locationId` is an `Int`, so the cast happens in the join, and non-numeric `searchValue` rows are ignored rather than throwing.

**List-type interest** — `subscription_list_type.listTypeIds` is an `Int[]` of `list_types.id` values; join `list_types_sub_jurisdictions` → `sub_jurisdiction` → `jurisdiction` and keep users whose resulting names are selected.

Resolving `listTypeIds` through a live join is correct and does **not** breach the "never use `listTypeId`" rule in `CLAUDE.md`: the rule forbids *hardcoding* numeric IDs in application code because they differ per environment. Joining a stored foreign key to `list_types` inside a single database is environment-safe. No numeric list type or jurisdiction ID may appear as a literal anywhere in this feature — all constants are names.

The "Jurisdictions" column shows the distinct jurisdiction names that caused each user to match, deduplicated and alphabetically sorted, so an admin can sanity-check the group before sending. Where a user matched with no interest signal (because only role/provenance filters were applied) the cell reads "—".

### 6.6 Pagination and counts

- `PAGE_SIZE = 25`, consistent with `searchUsers` in `libs/system-admin-pages/src/user-management/queries.ts:31`.
- The displayed count is the **total** matched users, not the page size.
- The CSV export runs the same query with pagination removed. If the matched set exceeds `MAX_EXPORT_ROWS = 50000` the export is refused with an error (see §10) rather than streaming an unbounded result set into memory.

### 6.7 CSV output

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="user-group-<slug>-<YYYY-MM-DD>.csv"` where `<slug>` is the applied jurisdiction/role filters, lowercased and kebab-cased (e.g. `user-group-crime-verified-2026-09-30.csv`); with no filters applied it is `user-group-all-2026-09-30.csv`.
- Header row: `email,role,jurisdictions`
- One row per user. `jurisdictions` is a semicolon-separated list so it does not break CSV parsing.
- Fields are quoted and embedded double quotes are doubled. Any field beginning with `=`, `+`, `-` or `@` is prefixed with a single quote to prevent formula injection when the file is opened in Excel.
- The file contains **English** column headers and English jurisdiction names regardless of the admin's chosen interface language — it is a machine-consumed file destined for GOV.UK Notify, not user-facing content.

### 6.8 Access control and audit

- `GET` and `POST` on every route are wrapped in `requireRole([USER_ROLES.SYSTEM_ADMIN])`, exactly as the `find-users` and `mi-report` controllers do.
- The download handler sets `req.auditMetadata = { action: AuditLogAction.DOWNLOAD_USER_GROUP, entityInfo: "Filters: <serialised filters>, Recipients: <count>" }`. The existing `auditLogMiddleware` picks this up on `res.send`, so exporting a list of user email addresses is always attributable.
- Filter state lives in `req.session.userGroups` (`{ filters, page }`), mirroring the `session.userManagement` shape. Nothing is persisted to the database.

---

## 7. Content

Page content is co-located with the controller at `apps/web/src/pages/(system-admin)/user-groups/en.ts` and `cy.ts` — this content is used by one page only, so it does not belong in a lib locale file.

### 7.1 English — `en.ts`

| Key | Value |
|-----|-------|
| `backLink` | Back |
| `pageTitle` | User Groups |
| `description` | Build a group of users by the jurisdictions they follow, then download their email addresses to send a targeted communication. |
| `filterHeading` | Filter |
| `selectedFiltersHeading` | Selected filters |
| `matchOnLabel` | How users are matched |
| `matchOnHint` | Choose which subscriptions count as an interest in a jurisdiction. |
| `matchOnEither` | Courts or list types they subscribe to |
| `matchOnCourts` | Courts they subscribe to |
| `matchOnListTypes` | List types they subscribe to |
| `jurisdictionLabel` | Jurisdiction |
| `subJurisdictionLabel` | Sub-jurisdiction |
| `roleLabel` | Role |
| `provenanceLabel` | Provenance |
| `applyFiltersButton` | Apply filters |
| `clearFiltersButton` | Clear filters |
| `showFilters` | Show filters |
| `hideFilters` | Hide filters |
| `downloadButton` | Download email list |
| `tableHeadEmail` | Email |
| `tableHeadRole` | Role |
| `tableHeadJurisdictions` | Jurisdictions |
| `noJurisdictions` | — |
| `resultsCount` | `(count) => \`${count} user${count === 1 ? "" : "s"} found\`` |
| `paginationPrevious` | Previous |
| `paginationNext` | Next |
| `paginationLabel` | `(current, total) => \`Page ${current} of ${total}\`` |
| `errorSummaryTitle` | There is a problem |
| `noResultsError` | No users match the selected filters. Try removing or clearing a filter. |
| `noDownloadError` | There are no users to download. Change the filters so at least one user matches. |
| `tooManyResultsError` | This group is too large to download. Add a filter to reduce it to 50,000 users or fewer. |
| `invalidJurisdictionError` | Select a jurisdiction from the list |
| `invalidRoleError` | Select a role from the list |
| `invalidProvenanceError` | Select a provenance from the list |
| `invalidMatchOnError` | Select how users are matched |
| `downloadFailedError` | The email list could not be downloaded. Try again. |
| `roleVerified` | Verified |
| `roleCtscAdmin` | CTSC Admin |
| `roleLocalAdmin` | Local Admin |
| `roleSystemAdmin` | System Admin |
| `provenanceCftIdam` | CFT IdAM |
| `provenanceSso` | SSO |
| `provenanceB2c` | B2C |
| `provenanceCrimeIdam` | Crime IdAM |

### 7.2 Welsh — `cy.ts`

Same keys, same structure, same function signatures. Jurisdiction and sub-jurisdiction option labels are **not** listed here — they come from the `welshName` columns on `jurisdiction` and `sub_jurisdiction`, which are already populated in `libs/location/src/location-data.ts`.

| Key | Value |
|-----|-------|
| `backLink` | Yn ôl |
| `pageTitle` | [WELSH TRANSLATION REQUIRED: "User Groups"] |
| `description` | [WELSH TRANSLATION REQUIRED: "Build a group of users by the jurisdictions they follow, then download their email addresses to send a targeted communication."] |
| `filterHeading` | Ffiltro |
| `selectedFiltersHeading` | [WELSH TRANSLATION REQUIRED: "Selected filters"] |
| `matchOnLabel` | [WELSH TRANSLATION REQUIRED: "How users are matched"] |
| `matchOnHint` | [WELSH TRANSLATION REQUIRED: "Choose which subscriptions count as an interest in a jurisdiction."] |
| `matchOnEither` | [WELSH TRANSLATION REQUIRED: "Courts or list types they subscribe to"] |
| `matchOnCourts` | [WELSH TRANSLATION REQUIRED: "Courts they subscribe to"] |
| `matchOnListTypes` | [WELSH TRANSLATION REQUIRED: "List types they subscribe to"] |
| `jurisdictionLabel` | Awdurdodaeth |
| `subJurisdictionLabel` | [WELSH TRANSLATION REQUIRED: "Sub-jurisdiction"] |
| `roleLabel` | [WELSH TRANSLATION REQUIRED: "Role"] |
| `provenanceLabel` | [WELSH TRANSLATION REQUIRED: "Provenance"] |
| `applyFiltersButton` | Cadarnhau hidlwyr |
| `clearFiltersButton` | Clirio'r ffiltrau |
| `showFilters` | [WELSH TRANSLATION REQUIRED: "Show filters"] |
| `hideFilters` | [WELSH TRANSLATION REQUIRED: "Hide filters"] |
| `downloadButton` | [WELSH TRANSLATION REQUIRED: "Download email list"] |
| `tableHeadEmail` | E-bost |
| `tableHeadRole` | [WELSH TRANSLATION REQUIRED: "Role"] |
| `tableHeadJurisdictions` | [WELSH TRANSLATION REQUIRED: "Jurisdictions"] |
| `noJurisdictions` | — |
| `resultsCount` | `(count) => ` + [WELSH TRANSLATION REQUIRED: "{count} users found"] |
| `paginationPrevious` | [WELSH TRANSLATION REQUIRED: "Previous"] |
| `paginationNext` | [WELSH TRANSLATION REQUIRED: "Next"] |
| `paginationLabel` | `(current, total) => ` + [WELSH TRANSLATION REQUIRED: "Page {current} of {total}"] |
| `errorSummaryTitle` | Mae problem |
| `noResultsError` | [WELSH TRANSLATION REQUIRED: "No users match the selected filters. Try removing or clearing a filter."] |
| `noDownloadError` | [WELSH TRANSLATION REQUIRED: "There are no users to download. Change the filters so at least one user matches."] |
| `tooManyResultsError` | [WELSH TRANSLATION REQUIRED: "This group is too large to download. Add a filter to reduce it to 50,000 users or fewer."] |
| `invalidJurisdictionError` | [WELSH TRANSLATION REQUIRED: "Select a jurisdiction from the list"] |
| `invalidRoleError` | [WELSH TRANSLATION REQUIRED: "Select a role from the list"] |
| `invalidProvenanceError` | [WELSH TRANSLATION REQUIRED: "Select a provenance from the list"] |
| `invalidMatchOnError` | [WELSH TRANSLATION REQUIRED: "Select how users are matched"] |
| `downloadFailedError` | [WELSH TRANSLATION REQUIRED: "The email list could not be downloaded. Try again."] |
| `roleVerified` | [WELSH TRANSLATION REQUIRED: "Verified"] |
| `roleCtscAdmin` | [WELSH TRANSLATION REQUIRED: "CTSC Admin"] |
| `roleLocalAdmin` | [WELSH TRANSLATION REQUIRED: "Local Admin"] |
| `roleSystemAdmin` | Gweinyddwr y System |
| `provenanceCftIdam` | [WELSH TRANSLATION REQUIRED: "CFT IdAM"] |
| `provenanceSso` | [WELSH TRANSLATION REQUIRED: "SSO"] |
| `provenanceB2c` | [WELSH TRANSLATION REQUIRED: "B2C"] |
| `provenanceCrimeIdam` | [WELSH TRANSLATION REQUIRED: "Crime IdAM"] |

### 7.3 Dashboard tile

| Locale | Title | Description |
|--------|-------|-------------|
| English | User Groups | Group users by jurisdiction and download email lists for communications |
| Welsh | [WELSH TRANSLATION REQUIRED: "User Groups"] | [WELSH TRANSLATION REQUIRED: "Group users by jurisdiction and download email lists for communications"] |

### 7.4 Content notes

- Sentence case throughout, per GDS. "User Groups" is title-cased only to match the existing System Admin Dashboard tiles, which are all title-cased.
- The word "jurisdiction" is retained rather than simplified because this is an internal admin tool used by staff who use the term daily; the plain-English reading-age-9 rule applies to citizen-facing pages.
- Error messages state what to do, not that a field is invalid — e.g. "Add a filter to reduce it to 50,000 users or fewer" rather than "Too many results".
- Locale key parity is enforced by a test: `expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort())`.

---

## 8. URL

Routes are auto-discovered from `apps/web/src/pages/`. The `(system-admin)` route group adds no URL prefix, so directory names map straight to paths.

| Method | URL | Handler | Purpose |
|--------|-----|---------|---------|
| `GET` | `/user-groups` | `(system-admin)/user-groups/index.ts` | Render filters and matched users; reads filters from session |
| `GET` | `/user-groups?page=N` | same | Page N of results |
| `GET` | `/user-groups?lng=cy` | same | Welsh |
| `POST` | `/user-groups` | same | Validate and store filters in session, redirect to `GET /user-groups` |
| `POST` | `/user-groups/download` | `(system-admin)/user-groups/download/index.ts` | Return CSV of all matched users |
| `GET` | `/user-groups/clear-filters` | `(system-admin)/user-groups/clear-filters/index.ts` | Clear all session filters, redirect to `GET /user-groups` |
| `GET` | `/user-groups/remove-filter?filter=<group>&value=<value>` | `(system-admin)/user-groups/remove-filter/index.ts` | Remove one filter value, redirect to `GET /user-groups` |

The `lng` query parameter is preserved on every redirect, as `find-users` does.

Post/Redirect/Get is used for filter application so that a browser refresh does not re-post. The download is a `POST` with no redirect — the response body *is* the file.

No new API routes are needed; this is a web-only feature and nothing outside the service consumes the group.

---

## 9. Validation

Validation lives in `libs/system-admin-pages/src/user-groups/validation.ts` as `validateUserGroupFilters`, following the shape of `validateSearchFilters` in `libs/system-admin-pages/src/user-management/validation.ts`.

### 9.1 Input rules

| Field | Rule | On failure |
|-------|------|-----------|
| `matchOn` | Optional. If present must be one of `either`, `courts`, `listTypes`. Absent defaults to `either`. | `invalidMatchOnError`, anchored to `#matchOn` |
| `jurisdictions` | Optional. Array of strings. Every value must match a `name` in the `jurisdiction` table. | `invalidJurisdictionError`, anchored to `#jurisdictions` |
| `subJurisdictions` | Optional. Array of strings. Every value must match a `name` in the `sub_jurisdiction` table. | `invalidJurisdictionError`, anchored to `#subJurisdictions` |
| `roles` | Optional. Array of strings. Every value must be a member of `USER_ROLES` (`libs/account/src/roles.ts`). | `invalidRoleError`, anchored to `#roles` |
| `provenances` | Optional. Array of strings. Every value must be one of `CFT_IDAM`, `SSO`, `B2C_IDAM`, `CRIME_IDAM`. | `invalidProvenanceError`, anchored to `#provenances` |
| `page` | Optional. `Number(req.query.page)`; must be a positive integer. Anything else falls back to `1` silently. | No error shown |

### 9.2 Normalisation

- A single checkbox produces a string, several produce an array. Both are normalised to `string[]` with the existing idiom: `Array.isArray(x) ? x : x ? [x] : undefined`.
- Empty arrays are normalised to `undefined` so "no filter" and "empty filter" behave identically.
- Whitespace is trimmed from every value before comparison.
- `B2C_IDAM` is expanded server-side to `["B2C_IDAM", "PI_AAD"]`, matching `searchUsers` at `libs/system-admin-pages/src/user-management/queries.ts:55`, because legacy accounts carry the `PI_AAD` provenance.

### 9.3 Constraints

- **No filters is valid.** An unfiltered page shows all users; that is the current de facto comms audience and the honest default.
- All filter values are validated against a server-side allow-list before reaching Prisma. Combined with Prisma's parameterised queries this closes off injection through the checkbox values. Hand-written SQL is not used; the jurisdiction joins are expressed as Prisma relation filters.
- Selecting a sub-jurisdiction whose parent jurisdiction is not selected is permitted — the two groups are independent OR-sets within the interest clause, so `Crime` + `Employment Tribunal` returns users interested in either. This is the same behaviour as every other MOJ filter in the service.
- Export size is capped at `MAX_EXPORT_ROWS = 50000`. Exceeding it is a validation failure on the download, not a truncated file — a silently truncated recipient list is worse than no list.
- The download is refused when the matched count is zero.

### 9.4 Not validated

There is no "group name" field, no saving, and therefore no uniqueness or length validation. Groups are transient query results, not stored entities. If the business later asks for named, saved groups, that is a follow-on ticket with its own schema.

---

## 10. Error Messages

All errors render through `govukErrorSummary` with `titleText` set to `errorSummaryTitle` ("There is a problem"), placed immediately after the `h1`, with `href` anchors to the offending fieldset. Field-level `govukErrorMessage` is attached to the relevant checkbox or radio group.

| Condition | Error summary text | Anchor | HTTP behaviour |
|-----------|-------------------|--------|----------------|
| Filters applied, zero users matched | No users match the selected filters. Try removing or clearing a filter. | `#jurisdictions` | 200, page re-renders with filters kept, no results table, no download button |
| Download requested with zero matches | There are no users to download. Change the filters so at least one user matches. | `#jurisdictions` | 200, page re-renders; no file sent |
| Download exceeds 50,000 users | This group is too large to download. Add a filter to reduce it to 50,000 users or fewer. | `#jurisdictions` | 200, page re-renders; no file sent |
| `jurisdictions` or `subJurisdictions` contains an unknown value | Select a jurisdiction from the list | `#jurisdictions` / `#subJurisdictions` | 200, page re-renders with submitted values discarded |
| `roles` contains an unknown value | Select a role from the list | `#roles` | 200, re-render |
| `provenances` contains an unknown value | Select a provenance from the list | `#provenances` | 200, re-render |
| `matchOn` contains an unknown value | Select how users are matched | `#matchOn` | 200, re-render |
| Database error while querying | (no summary — the page renders with an empty result set and the failure is logged) | — | 200; matches the existing `find-users` behaviour, which catches and logs rather than 500-ing an admin page |
| CSV generation throws | The email list could not be downloaded. Try again. | `#downloadButton` | 200, re-render |
| Non-`SYSTEM_ADMIN` requests any route | Handled by `requireRole` — existing 403 page | — | 403 |

Notes:

- Unknown filter values are only reachable by hand-crafting a request, since the UI only offers valid checkboxes. The message is still specific rather than "Invalid input".
- Nothing echoes a raw submitted value back into the page, so a crafted filter value cannot be reflected into the HTML.
- Database and CSV failures log the error, the filters and a timestamp via `console.error` — the same structured shape used in `find-users/index.ts`. Email addresses are never written to the log.

---

## 11. Navigation

### 11.1 Entry points

- System Admin Dashboard (`/system-admin-dashboard`) — a new tile, positioned after "User Management" so the two user-facing admin tools sit together.
- Direct URL for admins who bookmark it.

### 11.2 Exits and redirects

| From | Trigger | Goes to |
|------|---------|---------|
| `/user-groups` | Back link | `/system-admin-dashboard` (with `?lng=cy` when Welsh) |
| `POST /user-groups` | Valid filters | `302` → `/user-groups` (PRG) |
| `POST /user-groups` | Invalid filters | Re-renders `/user-groups` in place, `200` |
| `POST /user-groups/download` | Success | Stays on `/user-groups`; browser receives the file |
| `POST /user-groups/download` | Empty or oversized group | Re-renders `/user-groups` with an error, `200` |
| `/user-groups/clear-filters` | Selected | `302` → `/user-groups` with an empty filter set |
| `/user-groups/remove-filter` | Tag remove link | `302` → `/user-groups` with that one value dropped |
| Pagination | Previous / Next / page number | `/user-groups?page=N` (plus `&lng=cy`) |

### 11.3 State behaviour

- Filters persist in the session for the length of the admin's session. Returning to `/user-groups` from the dashboard shows the last applied filters — consistent with `find-users`, and useful when an admin iterates on a group before exporting.
- `remove-filter` removes a **single value** from a group (e.g. drop `Family`, keep `Crime`); it does not clear the whole group.
- Applying or changing any filter resets `page` to `1`, so an admin cannot be left on page 5 of a two-page result.
- The language toggle preserves filters and the current page.
- There is no confirmation interstitial before download. The action is read-only, reversible by simply deleting the file, and already audited.

---

## 12. Accessibility

Target: **WCAG 2.2 AA**, mandatory for all government services.

### 12.1 Structure and semantics

- One `<h1>` per page: "User Groups". The `<title>` is "User Groups - Court and tribunal hearings - GOV.UK", and changes to "Error: User Groups - …" when the error summary is present, so screen reader users hear the failure on page load.
- Heading order is `h1` (page title) → `h2` ("Filter", "N users found") → `h3` (selected filter group headings) with no skipped levels.
- The results table is a real `<table>` via `govukTable`, with `<th scope="col">` on every header cell. It is a genuine data table, not layout.
- Each checkbox group is wrapped in a `<fieldset>` with a `<legend>` ("Jurisdiction", "Sub-jurisdiction", "Role", "Provenance") — `govukCheckboxes` does this when passed `fieldset.legend`.
- The match-method radios use a `<fieldset>`/`<legend>` with the hint associated via `aria-describedby`.
- The skip link from `base-template.njk` targets `#main-content`, which precedes the filter sidebar.

### 12.2 Dynamic content and the result count

- "N users found" is a static `h2` rendered on a fresh page load after the PRG redirect, so it is announced naturally. No live region is needed because nothing updates without a navigation — the filter form is a real `POST`, not client-side filtering.
- The error summary receives focus on render (standard GOV.UK Frontend behaviour) and its list items are links to the offending fieldset.

### 12.3 Selected filter tags

- Each removable tag is a link whose accessible name must state what it removes, not just the value. Visible text is the value ("Family"), with visually hidden text completing it: `<span class="govuk-visually-hidden">Remove this filter</span>`. This satisfies 2.4.4 Link Purpose and avoids a page full of links named only "Family".
- The remove links are keyboard reachable in reading order and are real links, so they work without JavaScript.

### 12.4 Progressive enhancement

- Without JavaScript: the filter sidebar renders expanded, the form submits by `POST`, results render server-side, pagination is plain links, and the download is a plain form submit. Every acceptance criterion is satisfiable with JavaScript disabled.
- With JavaScript: the MOJ filter component adds the "Show filters" / "Hide filters" toggle on narrow viewports, with `aria-expanded` on the toggle button.

### 12.5 The download button

- Rendered as `govukButton` with `classes: "govuk-button--secondary"` inside its own form. It is a `<button type="submit">`, focusable and operable by `Enter` and `Space`.
- Its accessible name is "Download email list". Because a file download gives no visual page change, the button text explicitly says what will happen; the file name also states the filters and date.

### 12.6 Visual and motor

- All colours come from GOV.UK Frontend, which already meets 4.5:1 for body text and 3:1 for interactive components. No custom colours are introduced.
- No information is conveyed by colour alone; the "Jurisdictions" column is text, and matched/unmatched is expressed by presence in the table.
- Checkbox targets use `govuk-checkboxes--small`, which retains a 40×40px touch target with the surrounding label — acceptable under 2.5.8 Target Size (Minimum) at AA, and matching the existing `find-users` page.
- The table scrolls horizontally rather than reflowing into unreadable columns at 320px width; content is legible at 400% zoom (1.4.10 Reflow).

### 12.7 Testing

- Axe-core runs inline within the Playwright journey test at the unfiltered state, the filtered state and the error state.
- Keyboard-only traversal is asserted in the journey test: tab to a jurisdiction checkbox, `Space` to tick, tab to "Apply filters", `Enter` to submit.
- Screen reader behaviour of the error summary focus and the `Error:` title prefix is covered by the template tests asserting the DOM, and manually verified with NVDA before release.

---

## 13. Test Scenarios

### 13.1 Unit — `libs/system-admin-pages/src/user-groups/queries.test.ts`

* Returns all users, paginated at 25 per page, when no filters are supplied
* Returns only users with a court subscription mapped to the selected jurisdiction when `matchOn` is `courts`
* Returns only users with a list-type subscription mapped to the selected jurisdiction when `matchOn` is `listTypes`
* Returns the union of court-matched and list-type-matched users when `matchOn` is `either`
* Deduplicates a user who matches through both a court and a list-type subscription so they appear once
* Narrows results correctly when a sub-jurisdiction is selected alongside its parent jurisdiction
* Applies role and provenance filters as an AND against the jurisdiction interest clause
* Expands a `B2C_IDAM` provenance filter to include `PI_AAD` accounts
* Ignores subscription rows whose `searchValue` is not a numeric location id, without throwing
* Returns an empty result set and a zero total when no user matches
* Reports the total matched count independently of the requested page
* Resolves list-type interest through the `list_types` join rather than any hardcoded numeric id (asserted by fixtures using arbitrary `id` values)
* Returns the distinct, sorted jurisdiction names that caused each user to match

### 13.2 Unit — `libs/system-admin-pages/src/user-groups/validation.test.ts`

* Accepts an empty filter object
* Accepts a single checkbox value delivered as a bare string and normalises it to an array
* Rejects a jurisdiction name that is not in the jurisdiction table
* Rejects a sub-jurisdiction name that is not in the sub-jurisdiction table
* Rejects a role outside `USER_ROLES`
* Rejects a provenance outside the allowed set
* Rejects a `matchOn` value that is not `either`, `courts` or `listTypes`
* Defaults `matchOn` to `either` when absent
* Normalises an empty array to `undefined`
* Trims whitespace from submitted values before validating

### 13.3 Unit — `libs/system-admin-pages/src/user-groups/service.test.ts`

* Builds a CSV with the header row `email,role,jurisdictions`
* Emits one row per matched user with jurisdictions joined by semicolons
* Quotes fields containing commas and doubles embedded double quotes
* Prefixes a field beginning with `=`, `+`, `-` or `@` to prevent formula injection
* Builds a filename containing the applied filters and the current date
* Builds the filename `user-group-all-<date>.csv` when no filters are applied
* Throws when the matched set exceeds `MAX_EXPORT_ROWS`
* Throws when the matched set is empty
* Emits English headers and English jurisdiction names even when the caller's locale is Welsh

### 13.4 Unit — `apps/web/src/pages/(system-admin)/user-groups/index.test.ts`

* `GET` renders the page with `en`, `cy` and `t` and the current filters from session
* `GET` renders Welsh content when the locale is `cy`
* `GET` reads the page number from the query string and falls back to `1` for a non-numeric value
* `GET` renders the no-results error when filters are applied and nothing matches
* `GET` does not render the no-results error when no filters are applied
* `GET` renders an empty result set and logs when the query throws
* `GET` builds removable filter tags for every selected value across all filter groups
* `POST` stores validated filters in the session and redirects to `/user-groups`
* `POST` preserves `?lng=cy` on the redirect
* `POST` resets the page number to 1
* `POST` re-renders with an error summary when validation fails, without touching the session
* `GET` and `POST` are both wrapped in `requireRole([SYSTEM_ADMIN])`

### 13.5 Unit — `apps/web/src/pages/(system-admin)/user-groups/download/index.test.ts`

* Sends the CSV with `text/csv` content type and an `attachment` disposition
* Sets `req.auditMetadata` with `DOWNLOAD_USER_GROUP`, the serialised filters and the recipient count
* Re-renders with the empty-group error and sends no file when nothing matches
* Re-renders with the too-large error and sends no file when the cap is exceeded
* Re-renders with the generic download error when CSV generation throws
* Queries using the session filters, not the request body
* Is wrapped in `requireRole([SYSTEM_ADMIN])`

### 13.6 Unit — clear-filters and remove-filter

* `clear-filters` empties the session filters and redirects to `/user-groups`
* `clear-filters` preserves the `lng` parameter
* `remove-filter` removes only the named value from the named group, leaving other values intact
* `remove-filter` leaves the session untouched for an unknown group or value
* Both are wrapped in `requireRole([SYSTEM_ADMIN])`

### 13.7 Template — `apps/web/src/pages/(system-admin)/user-groups/index.njk.test.ts`

* Renders the `h1` with the page title
* Renders the Welsh `h1` when passed the `cy` locale object
* Renders a fieldset and legend for each of the four checkbox groups
* Renders jurisdiction checkboxes from the supplied options rather than a hardcoded list
* Marks a checkbox as checked when its value is in the current filters
* Renders one table row per user and three header cells
* Renders the em-dash placeholder in the Jurisdictions cell when a user matched with no interest signal
* Renders the download button only when there is at least one result
* Does not render the results table when the result set is empty
* Renders the error summary with the given messages when errors are passed
* Renders no error summary when errors are absent
* Renders a removable tag per selected filter value, each with visually hidden "Remove this filter" text
* Renders pagination previous and next links only when those pages exist
* Confirms locale key parity between `en` and `cy`

### 13.8 E2E — `e2e-tests/tests/user-groups.spec.ts`

One journey test, tagged `@nightly`, covering the whole path — not one test per assertion:

* **System admin builds and downloads a jurisdiction user group**: sign in as system admin → open the User Groups tile from the dashboard → assert the unfiltered count → run an Axe scan → apply a jurisdiction filter using keyboard only (`Tab`, `Space`, `Enter`) → assert the count drops and the selected filter tag appears → switch to Welsh and assert the Welsh heading and Welsh jurisdiction label → switch back → apply a filter combination that matches nobody and assert the error summary, then Axe-scan the error state → remove one tag and assert the other filter survives → download the CSV and assert the filename and the header row → assert an audit log entry for the download appears in `/audit-log-list`

A second, separate journey only because it is a genuinely different path:

* **Non-admin is refused access**: sign in as a verified user → request `/user-groups` directly → assert access is refused and no email addresses are rendered

---

## 14. Assumptions & Open Questions

### Assumptions

* Subscription data is a good enough proxy for jurisdiction interest. A user who subscribes to Birmingham Crown Court wants Crime comms. Users with no subscriptions match no jurisdiction filter and will be reached only by unfiltered sends — this is stated on the page so admins are not surprised.
* GOV.UK Notify remains the send channel, and its bulk-send CSV upload is available to the team. This feature produces the list; it does not send.
* The audience for this page is `SYSTEM_ADMIN` only. CTSC and Local Admins do not send service-wide comms.
* Exporting user email addresses is already within the System Admin role's remit — `/find-users` displays them and `/mi-report` exports user account data today — so no new DPIA-level change is introduced. This should still be confirmed with the service's information governance contact before release.
* `location_sub_jurisdictions` and `list_types_sub_jurisdictions` are populated for the locations and list types in use. Where a location has no sub-jurisdiction mapping, its subscribers cannot be matched by jurisdiction; the data quality of those mapping tables directly determines how good the groups are.
* 50,000 is an acceptable export cap. Current user volumes are far below this; the cap exists to stop an unbounded query, not because the business asked for it.

### Open questions — need business agreement before implementation

The acceptance criteria say "upon agreement with the business, the agreed solution is implemented". These need answering first:

1. **Is derived grouping (option A) acceptable, or does the business want users to self-declare their interests (option B)?** Option A ships without a schema change or a new user journey and covers existing users immediately; option B is more explicit but leaves every current user ungrouped until they next sign in. This spec assumes A. If B is chosen, most of §6–§13 is replaced.
2. **What does "Banner/Label" in the ticket title mean?** The problem statement and acceptance criteria are entirely about outbound communications, so this spec delivers targeted comms. If the intent is also a GOV.UK notification banner shown on the site to a specific user group, that is a separate feature — it needs a stored group, a banner content editor and audience evaluation on every request. It should be raised as its own ticket rather than folded in here.
3. **Should CaTH send the emails itself rather than exporting a CSV?** Sending in-service needs Notify rate limiting, retry, per-recipient audit rows, a send-preview step and an approval gate. If the business wants this, it is a materially larger piece of work and should be a follow-on ticket once the grouping logic is proven.
4. **Do groups need to be named and saved?** Recurring sends to the same audience would be easier with saved groups, but that means a `user_group` table and CRUD pages. Deliberately excluded under YAGNI. Confirm the business is happy re-selecting filters each time.
5. **Should region be a filter too?** `location_regions` exists and would let comms target, say, Wales-only users. Not in the acceptance criteria, so excluded — but it is a one-column addition to the same query if wanted.
6. **How should users with no subscriptions be treated?** They currently match no jurisdiction filter. Options: exclude them (current behaviour), or add an "Users with no subscriptions" checkbox so they can be deliberately included. Needs a decision.
7. **Is "interest" better measured by recent activity than by subscription existence?** A user who subscribed two years ago and has not signed in since is still counted. A `lastSignedInDate` filter could be added; not in scope unless asked for.

### Risks

* **Data quality of the sub-jurisdiction mapping tables is the single biggest risk.** If a Crown Court location is not mapped to the Crown Court sub-jurisdiction, its subscribers silently drop out of a Crime group and miss the comms. Before release, run a reconciliation over `location` and `list_types` and report any row with no sub-jurisdiction mapping.
* **Query cost.** The interest clause spans `subscription`, `subscription_list_type`, `location_sub_jurisdictions` and `list_types_sub_jurisdictions`. `idx_subscription_search` on `(search_type, search_value)` helps the court path; the list-type path scans `subscription_list_type`, which is one row per user. Measure against production-scale data before release and add an index if the page is slow.
* **An exported CSV of user email addresses leaves the service's control.** It is audited on the way out but not afterwards. The audit entry is the only control; make sure the team's handling guidance for the downloaded file is written down.

### Comment by OgechiOkelu on 2026-09-30T13:08:42Z

@plan
