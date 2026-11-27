# #1620: [A11y] Package 1: Shared components across the whole site

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** bug, priority:2-high
**Created:** 2026-11-23T12:54:31Z
**Updated:** 2026-11-23T14:03:53Z

## Description

## Summary

These fixes are to parts of the site shared by the citizen and admin services: the page layout, the phase banner, session handling, dashboard tiles and the filter panel. Each change fixes both services at once.

This ticket holds all the requirements for 6 findings from the Accessibility CoE audit of CaTH. Each finding is a numbered item below, with its user impact, recommended solution, current code, acceptance criteria and any mock-up agreed at refinement.

**Audit file:** Audit_details_CaTH_AI_FINAL_041126.xlsx. Spreadsheet row numbers count the header as row 1.

## Overview

| Item | Issue | Service | Priority | Audit tab | Audit ID | Row | WCAG |
|---|---|---|---|---|---|---|---|
| 1.1 | Signed out after inactivity with no warning or way to extend the session | Citizen & Admin | High | Citizen or verified user | 12 | 13 | 2.2.1 (Level A) |
|  | ″ | ″ | ″ | System admin | 15 | 16 | ″ |
| 1.2 | Visible link name does not match accessible name | Citizen | High | Citizen or verified user | 9 | 10 | 2.5.3 (Level A) |
| 1.3 | Back to top link doesn't move focus for keyboard-only and screen reader users | Citizen & Admin | Medium | Citizen or verified user | 5 | 6 | 2.4.3 (Level A) |
|  | ″ | ″ | ″ | System admin | 1 | 2 | ″ |
| 1.4 | Feedback link opens in a new tab with no warning | Citizen & Admin | Medium | Citizen or verified user | Usability 1 | 15 | Usability (no WCAG) |
|  | ″ | ″ | ″ | System admin | Usability 6 | 22 | ″ |
| 1.5 | Apply filters button is only at the top of the filter panel | Citizen & Admin | Medium | Citizen or verified user | Usability 2 | 16 | Usability (no WCAG) |
|  | ″ | ″ | ″ | System admin | Usability 5 | 21 | ″ |
| 1.6 | All card content is wrapped in a single link | Citizen & Admin | Medium | Citizen or verified user | Usability 3 | 17 | Usability (no WCAG) |
|  | ″ | ″ | ″ | System admin | Usability 1 | 17 | ″ |

**Work together:**

- Item 1.2 and item 1.4 are both in the phase banner (`libs/web-core/src/views/components/phase-banner-content.njk` and its locale strings). Do them as one change.
- Item 1.3: the "back to top" link is copied into 10 templates (the court list, list types, the cookie, accessibility and publishing policy pages, and Manual upload). Consider making it a shared partial while fixing it.
- Item 1.6: the tiles are on four dashboards: account home, admin, system admin and reference data. item 3.3 (Package 3) also changes the account-home dashboard, so coordinate with whoever has that package.
- Item 1.5: the filter panel is shared between "Find a court or tribunal" and the admin lists, such as the audit log.

## Before starting

- [ ] Item 1.1: retest against the session-expiring warning merged on 18 Nov 2026 in Feature-764 (#1322), which came after the audit. It may already meet most of the acceptance criteria and the agreed mock-up.

## Definition of done

- [ ] Every item's acceptance criteria below are met
- [ ] Changes are checked with axe and a screen reader on the pages listed for each item
- [ ] Welsh content is updated where wording changed

## Requirements

### 1.1 – Signed out after inactivity with no warning or way to extend the session

After a period of inactivity, users are signed out with no warning and no way to extend their session. This affects both verified (citizen) users and system admins.

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID 12, spreadsheet row 13; tab "System admin", ID 15, spreadsheet row 16
**Priority:** High
**WCAG:** 2.2.1: Timing Adjustable (Level A)
**Category:** Timing and interruptions

#### Where

- **Citizen:** All pages
- **Admin:** All pages

**Tested with:** Chrome, Edge, Safari (citizen); Edge (admin)

#### User impact

After a period of inactivity, users are signed out of the service, with no warning or way to extend the time limit. This means that some users who may be switching between tasks, or take longer to process information may be logged out mid journey. This may cause confusion or disorientation for some users, especially those with cognitive or motor disabilities who may need more time.

#### Recommended solution

Add a 'Timeout warning' where users have limited time to edit forms. The warning should show after 10 minutes of inactivity, include a five minute timer and allow users to extend the time limit.

Reference: [MoJ Design System: Timeout warning](https://design-patterns.service.justice.gov.uk/components/timeout-warning/)

#### Acceptance criteria

- [ ] A timeout warning dialog appears before the session ends: after 10 minutes of inactivity, with a 5 minute countdown
- [ ] The header message displayed in the timeout box read as 'You're about to be signed out due to inactivity.' a 2nd sentence is displayed underneath with the timer 'For your security, you will be signed out in -- minutes -- seconds.'
- [ ] Users can extend their session from the dialog by clicking the 'Continue' button 
- [ ] if user does not extend session, and session ends, the following message is displayed 'You have been signed out, due to inactivity.'
- [ ] The dialog is accessible: focus moves into it, the countdown is announced to screen readers at sensible intervals, and it can be closed with a keyboard
- [ ] Works for both verified users and system admins
- [ ] Follows the MoJ timeout warning component

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Mock up:**

<img width="637" height="304" alt="timeout mock up" src="https://github.com/user-attachments/assets/beff0dd2-b163-4b5f-9dec-7e1753451c4e" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 1.2 – Visible link name does not match accessible name

The "Cymraeg" language link shows the text "Cymraeg", but its `aria-label` ("Change language to Welsh") replaces that as its accessible name. Voice control users who say "Cymraeg" may not be able to activate it.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID 9, spreadsheet row 10
**Priority:** High
**WCAG:** 2.5.3: Label in Name (Level A)
**Category:** Voice compatibility

#### Where

- All pages

**Tested with:** Voice Control on Safari, Dragon on Edge

#### User impact

The link that lets users switch language to Welsh as the visible name of 'Cymraeg', but the accessible name is 'Change languages to Welsh'. This may make it difficult for voice recognition software users to target the link, due to the mismatch in names.

#### Recommended solution

Remove the 'aria-label' from the link.

#### Current code

```html
<a class="govuk-link app-phase-banner__language" href="?artefactId=4ce31968-92ac-4496-84e0-1ed5f07e43c0&amp;lng=cy" lang="cy" aria-label="Change language to Welsh">Cymraeg</a>
```

#### Acceptance criteria

- [ ] The `aria-label` is removed from the language toggle link, so its accessible name is "Cymraeg"
- [ ] `lang="cy"` stays on the link
- [ ] The English toggle on Welsh pages is checked and fixed the same way
- [ ] Checked with Voice Control or Dragon: saying "click Cymraeg" activates the link

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 1.3 – Back to top link doesn't move focus for keyboard-only and screen reader users

The "Back to top" link scrolls the page visually, but keyboard focus stays on the link. This happens on both the citizen and the admin service.

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID 5, spreadsheet row 6; tab "System admin", ID 1, spreadsheet row 2
**Priority:** Medium
**WCAG:** 2.4.3: Focus Order (Level A)
**Category:** Navigation & Focus

#### Where

- **Citizen:** Find a court or tribunal
- **Admin:** Manual upload

**Tested with:** Keyboard-only, Chrome, Safari, Edge (citizen); Keyboard-only, Edge (admin)

#### User impact

When trying to activate the 'back to top' link with the keyboard or screen reader, the page visibly scrolls back to the top but keyboard focus remains on the  link. This may be confusing for keyboard-only or screen reader users, who would expect focus to be moved back to the top of the page.

#### Recommended solution

When the 'back to top' link is activated with the keyboard or screen reader, ensure focus is moved back to a logical point in the page, such as the main content. This can be done by targeting the 'id' of the 'main' within the 'href' of the link.

Example from the audit:

```html
<a href="#mainContent" class="govuk-link back-to-top-link"><span aria-hidden="true">▴ </span>Back to top</a>
```

#### Current code

```html
<a href="#" class="govuk-link back-to-top-link"><span aria-hidden="true">▴ </span>Back to top</a>
```

#### Acceptance criteria

- [ ] "Back to top" links point at the main content `id` (for example `#main-content`) rather than `#`
- [ ] Activating the link with the keyboard moves focus to the top of the main content, so the next Tab goes to the first focusable element there
- [ ] Fixed on every page where the link appears, in both the citizen and the admin service

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 1.4 – Feedback link opens in a new tab with no warning

The "feedback" link in the phase banner opens in a new tab without telling users. It also has an `aria-label` that differs from its visible text. This happens on both the citizen and the admin service.

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID Usability 1, spreadsheet row 15; tab "System admin", ID Usability 6, spreadsheet row 22
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Cognitive support and predictability

#### Where

- **Citizen:** All pages - Phase banner
- **Admin:** All pages - Phase banner

**Tested with:** VoiceOver on Safari, JAWS on Edge, Visual inspection (citizen); JAWS on Edge, Visual inspection (admin)

#### User impact

The feedback link in the phase banner opens in a new tab without warning users. This may be confusing and disorientating for all users, especially screen reader users, who may find it difficult to navigate back to the page that they were on.

#### Recommended solution

Add '(opens in a new tab)' to any links that open in a new tab, warning users what will happen when they select the link.

The link's `aria-label` ("Give feedback about this page") also replaces its visible name. Remove it, or make sure the accessible name starts with the visible text, so voice control users can still activate it.

#### Current code

```html
<a class="govuk-link" aria-label="Give feedback about this page" href="https://www.smartsurvey.co.uk/s/FBSPI22/?pageurl=courts-tribunals-list" target="_blank">feedback</a>
```

#### Acceptance criteria

- [ ] The feedback link text says it opens in a new tab, for example "feedback (opens in new tab)"
- [ ] The link's accessible name contains its visible text (no conflicting `aria-label`)
- [ ] Fixed in the phase banner for both the citizen and the admin service

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Agreed mock up:** (opens in a new tab) is added after the feedback link.

<img width="1088" height="251" alt="image" src="https://github.com/user-attachments/assets/37cf4b27-6b16-4058-b67b-fe541fa1e92e" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 1.5 – Apply filters button is only at the top of the filter panel

Keyboard users have to tab back up through every filter option to reach "Apply filters" after choosing their options. Seen on "Find a court or tribunal" (citizen) and on filters across the admin service.

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID Usability 2, spreadsheet row 16; tab "System admin", ID Usability 5, spreadsheet row 21
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Navigation & Focus

#### Where

- **Citizen:** Find a court or tribunal
- **Admin:** Filters across the service

**Tested with:** Keyboard on Chrome, Safari, Edge (citizen); Keyboard on Edge (admin)

#### User impact

Users have to navigate backwards through options multiple filter to apply filters after selecting them. This can make filters harder to apply for keyboard-only users, due to needing to navigate backwards through the page.

#### Recommended solution

Add the 'Apply filters' button at the bottom of the filters section.

#### Acceptance criteria

- [ ] An "Apply filters" button comes after the last filter option
- [ ] The following message is displayed on the top filter button; 'Select one or more filters and then select the apply filters button'
- [ ] Keyboard users can choose filters and apply them without tabbing backwards
- [ ] Applied to every filter panel in both the citizen and the admin service

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Agreed mock up:** The 'Apply filters' button is moved to the bottom and the following message is displayed at the top of the filter options 'Select one or more filters and then select the apply filters button'.

<img width="227" height="862" alt="bottom filter button" src="https://github.com/user-attachments/assets/9f894215-f030-4069-91f7-370f2c99f41c" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 1.6 – All card content is wrapped in a single link

Dashboard cards wrap the heading and description in one link, so screen readers read the whole card as one long link name. This happens on both the verified user dashboard and the admin dashboard.

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID Usability 3, spreadsheet row 17; tab "System admin", ID Usability 1, spreadsheet row 17
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Screen Reader Compatibility

#### Where

- **Citizen:** Dashboard
- **Admin:** Dashboard, Admin Dashboard

**Tested with:** JAWS on Edge, VoiceOver on Safari (citizen); JAWS on Edge (admin)

#### User impact

All card content is wrapped inside a single link, so all the text within the card is combined into one long link name. This may make it difficult for screen reader users to understand the link's purpose clearly due to the long, verbose name.

#### Recommended solution

Wrap only the heading of the card within the link. The whole card can be kept as clickable using CSS and JS, but only one area of link text should be able to be navigated to by screen reader users.

Example from the audit:

```html
<div class="card card--clickable" data-test="global-search">
  <h2 class="govuk-heading-m card__heading">
  <a class="govuk-link card__link govuk-link--no-visited-state" href="#" onclick="showAlert()">Court and tribunal hearings</a>
  </h2>
  <p class="govuk-body card__description">View time, location, type of hearings and more.</p>
  </div>
```

Reference: [MoJ Design System: Card](https://design-patterns.service.justice.gov.uk/components/card/)

#### Current code

Citizen:

```html
<a href="/search" class="verified-tile">
  <h2 class="govuk-heading-s verified-tile-heading">
    Court and tribunal hearings
  </h2>
  <p class="govuk-body verified-tile-description">
    View time, location, type of hearings and more.
  </p>
</a>
```

Admin:

```html
<a href="/manual-upload" class="admin-tile">
      <h2 class="admin-tile__heading">Upload</h2>
      <p class="admin-tile__description">Upload a file to be published on the external facing service on GOV.UK</p>
    </a>
```

#### Acceptance criteria

- [ ] Only the card heading is a link; the description is plain text
- [ ] The whole card can still be clickable using CSS/JS, but there's only one focusable link per card
- [ ] The focus style is still clearly visible
- [ ] Fixed on both the verified user dashboard and the admin dashboard

_The audit team's own screenshot is in the spreadsheet, at the row given above._



## Comments

No comments on this issue.
