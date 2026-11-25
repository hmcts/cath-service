# #1622: [A11y] Package 3: Verified user journey – subscriptions and dashboard

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** bug, priority:1-highest
**Created:** 2026-11-23T12:58:05Z
**Updated:** 2026-11-25T12:36:59Z

## Description

## Summary

Fixes to the verified user's dashboard and the email subscription journey, including the critical tooltip issue (item 3.1).

This ticket holds all the requirements for 7 findings from the Accessibility CoE audit of CaTH. Each finding is a numbered item below, with its user impact, recommended solution, current code, acceptance criteria and any mock-up agreed at refinement.

**Audit file:** Audit_details_CaTH_AI_FINAL_041126.xlsx. Spreadsheet row numbers count the header as row 1.

## Overview

| Item | Issue | Service | Priority | Audit tab | Audit ID | Row | WCAG |
|---|---|---|---|---|---|---|---|
| 3.1 | Tooltip content unable to be accessed with a keyboard | Citizen | Critical | Citizen or verified user | 8 | 9 | 2.1.1 (Level A) |
| 3.2 | List of courts presented grouped by letter visually, but not in the page markup | Citizen | High | Citizen or verified user | 7 | 8 | 1.3.1 (Level A) |
| 3.3 | Content does not reflow | Citizen | High | Citizen or verified user | 11 | 12 | 1.4.10 (Level AA) |
| 3.4 | Radio button groups are missing a fieldset and legend | Citizen & Admin | Medium | Citizen or verified user | 10 | 11 | 1.3.1 (Level A) |
|  | ″ | ″ | ″ | System admin | 10 | 11 | ″ |
| 3.5 | Error message overlaps radio button content and no error summary provided | Citizen | Medium | Citizen or verified user | Usability 6 | 20 | Usability (no WCAG) |
| 3.6 | No clear focus indicator on 'remove' elements | Citizen | Medium | Citizen or verified user | Usability 4 | 18 | Usability (no WCAG) |
| 3.7 | Page heading is not used as radio group legend | Citizen | Low | Citizen or verified user | Usability 5 | 19 | Usability (no WCAG) |

**Work together:**

- Item 3.4 and item 3.5 are on the same page, "Are you sure you want to remove this subscription". The admin half of item 3.4 ("Are you sure you want to delete {user}") is the same fix.
- Item 3.4, item 3.7 and item 4.7 (Package 4) are all one fix: put the page `h1` inside the legend. One developer could do all three.
- Item 3.3 (dashboard reflow) and the tile change in item 1.6 (Package 1) are on the same account-home page.

## Before starting

- [ ] Item 3.2: the agreed mock-up says letters are "displayed in standalone separate rows". To pass WCAG 1.3.1, the letters need to be real headings (`h2`) above each group, not rows in the same table. Confirm this before building.

## Definition of done

- [ ] Every item's acceptance criteria below are met
- [ ] Changes are checked with axe and a screen reader on the pages listed for each item
- [ ] Welsh content is updated where wording changed

## Requirements

### 3.1 – Tooltip content unable to be accessed with a keyboard

On "Confirm your email subscriptions", the tooltip explaining what happens when you change language can't be reached or opened with a keyboard. Keyboard-only users can't get this information at all.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID 8, spreadsheet row 9
**Priority:** Critical
**WCAG:** 2.1.1: Keyboard (Level A)
**Category:** Navigation & Focus

#### Where

- Confirm your email subscriptions

**Tested with:** Keyboard on Chrome, Edge, Safari

#### User impact

The tooltip that informs users about any additional information about language selection for subscriptions is unable to be navigated to or activated by the keyboard. This means keyboard-only users are unable to access key information about decisions made on changing language choices.

#### Recommended solution

Include the information included within the tooltip in hint text on the 'What version of the list do you want to receive?' page, rather than in a tooltip on the check answers page. This will also mean that users are given information on the version change before they make it, rather than when they are checking answers.

<img width="561" height="224" alt="image" src="https://github.com/user-attachments/assets/df185685-0dfe-4ee6-b4ba-fcf8cb7bef98" />

#### Acceptance criteria

- [ ] The tooltip is removed from the check answers page
- [ ] Its content is shown as hint text on the "What version of the list do you want to receive?" page, before the user makes their choice
- [ ] There is no information on the journey that only a mouse user can reach
- [ ] Checked with a keyboard only

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Agreed mock up:** location of the caution message is moved from the confirmation page to the previous page.

<img width="1010" height="700" alt="image" src="https://github.com/user-attachments/assets/5edec9bb-cc64-489c-a9ae-e68d2eaa0979" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.2 – List of courts presented grouped by letter visually, but not in the page markup

On "Subscribe by court or tribunal name", courts are laid out in a table and grouped by letter. The letter only appears in the first row of each group, so screen reader users can't tell which letter the later courts belong to.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID 7, spreadsheet row 8
**Priority:** High
**WCAG:** 1.3.1: Info and Relationships (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Subscribe by court or tribunal name

**Tested with:** VoiceOver on Safari

#### User impact

The list of courts uses a table layout to present a list of courts, grouped by letters of the alphabet. The letter of the alphabet that each court is grouped by is only present in the first row, with following rows left blanks, making it difficult for screen reader users to understand the relationships between the letter of the alphabet and the following list of courts.

#### Recommended solution

Remove the table markup and group lists of courts under a heading for each letter, with each court checkbox following it.

Example from the audit:

```html
<h2>A</h2>
<div class="govuk-checkboxes__item">
  <input class="govuk-checkboxes__input" id="location-16" name="locationIds" type="checkbox" value="16">
  <label class="govuk-label govuk-checkboxes__label" for="location-16">
  Asylum Support Tribunal
  </label>
  </div>
```

#### Acceptance criteria

- [ ] Alphabets are displayed in standalone separate rows before the lists for that alphabet are displayed.
- [ ] The table markup is removed
- [ ] Courts are grouped under a heading for each letter, followed by that letter's checkboxes
- [ ] Each checkbox still has a correctly linked label
- [ ] Checked with VoiceOver: the letter headings can be found with heading navigation, and each court is clearly under its letter

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Agreed mock up:** Alphabets are displayed in standalone separate rows before the lists for that alphabet are displayed.

<img width="736" height="694" alt="image" src="https://github.com/user-attachments/assets/1b82c7e1-57da-4f0d-a272-7a0fd18b09a8" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.3 – Content does not reflow

At 400% zoom (or 320px width), the dashboard scrolls both horizontally and vertically instead of reflowing.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID 11, spreadsheet row 12
**Priority:** High
**WCAG:** 1.4.10: Reflow (Level AA)
**Category:** Zoom and legibility

#### Where

- Dashboard

**Tested with:** Chrome, Edge, Safari

#### User impact

When content is reflowed or zoomed to 400%, page content scrolls both horizontally and vertically. This may make it more difficult for users with low vision to read content on the page, due to needing to scroll in two directions to track content.

#### Recommended solution

Ensure that CSS breakpoints are in place, where content can reflow and stack vertically, rather than needing a horizontal scroll.

#### Acceptance criteria

- [ ] At 320px width (400% zoom at 1280px), the dashboard content stacks vertically with no horizontal scrolling
- [ ] Nothing is cut off or overlapping at that size
- [ ] Checked in Chrome, Edge and Safari

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.4 – Radio button groups are missing a fieldset and legend

Some radio button groups aren't wrapped in a fieldset with a legend, so screen readers don't connect the question to its options. Seen on "Are you sure you want to remove this subscription" (citizen) and "Are you sure you want to delete {user}" (admin).

**Service:** Citizen & Admin
**Audit reference:** tab "Citizen or verified user", ID 10, spreadsheet row 11; tab "System admin", ID 10, spreadsheet row 11
**Priority:** Medium
**WCAG:** 1.3.1: Info and Relationships (Level A)
**Category:** Structure & Semantics

#### Where

- **Citizen:** Are you sure you want to remove this subscription
- **Admin:** Are you sure you want to delete {user}

**Tested with:** VoiceOver on Safari, JAWS on Edge (citizen); JAWS on Edge (admin)

#### User impact

Some radio button groups are not wrapped in a fieldset and legend, so the main question is not linked to the individual options when navigated to with a screen reader. This may make it difficult for screen reader users to understand what the options relate to, as they might hear isolated answers without the context of the question.

#### Recommended solution

Wrap the radio buttons in a <fieldset> element and put the overarching question in a <legend> element. Where there is only 1 question per page, the legend should wrap the h1.

#### Current code

```html
<form method="post" novalidate="">
<div class="govuk-form-group">
  <div class="govuk-radios" data-module="govuk-radios" data-govuk-radios-init="">
    <div class="govuk-radios__item">
      <input class="govuk-radios__input" id="confirmDelete" name="confirmDelete" type="radio" value="yes">
      <label class="govuk-label govuk-radios__label" for="confirmDelete">
        Yes
      </label>
    </div>
    <div class="govuk-radios__item">
      <input class="govuk-radios__input" id="confirmDelete-2" name="confirmDelete" type="radio" value="no">
      <label class="govuk-label govuk-radios__label" for="confirmDelete-2">
        No
      </label>
    </div>
  </div>
</div>
<button type="submit" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">
  Continue
</button>
    </form>
```

#### Acceptance criteria

- [ ] Each affected radio group is wrapped in a `<fieldset>` with a `<legend>`
- [ ] Where the page asks a single question, the legend contains the page `<h1>` (GOV.UK `isPageHeading: true`)
- [ ] Both pages above are fixed, and other confirmation pages using radios are checked
- [ ] Checked with a screen reader: the question is announced when focus moves to the first option

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.5 – Error message overlaps radio button content and no error summary provided

On "Are you sure you want to remove this subscription", submitting without choosing an option shows no error summary, and the inline error message overlaps the first radio button.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID Usability 6, spreadsheet row 20
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Cognitive support and predictability

#### Where

- Are you sure you want to remove this subscription

**Tested with:** Visual inspection on Chrome, Safari, Edge

#### User impact

When submitting the form without selecting an option, no error summary message is shown at the top of the page and the error message overlaps the first radio button. This may make it harder for screen reader users to tell that an error has occurred, and it may make it more difficult for sighted users to read the error message and select an answer.

#### Recommended solution

Add an error summary at the top of the page, set focus to it on reload, and update the layout so the inline error message displays clearly above the radio buttons without overlapping.

#### Acceptance criteria

- [ ] Submitting with no option chosen shows a GOV.UK error summary at the top of the page, and focus moves to it
- [ ] The inline error message is shown above the radios without overlapping them
- [ ] The error summary link moves focus to the first radio option

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.6 – No clear focus indicator on 'remove' elements

On "Your email subscriptions", the "Remove" buttons don't show the standard GOV.UK focus style when they're tabbed to.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID Usability 4, spreadsheet row 18
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Navigation & Focus

#### Where

- Your email subscriptions

**Tested with:** Keyboard on Chrome, Edge, Safari

#### User impact

When navigating through page content with the keyboard, 'Remove' buttons do not have the standard gov.uk focus indicator, instead displaying as a dark underline and a thin yellow line. This may make it harder for keyboard-only users to tell which element is currently in focus.

#### Recommended solution

Remove the 'background: none;' CSS property from the 'Remove' button elements, so that the full focus indicator is displayed when navigated to.

#### Acceptance criteria

- [ ] "Remove" controls show the full GOV.UK focus style (yellow background with a black underline) when focused
- [ ] Checked with a keyboard on Chrome, Edge and Safari

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 3.7 – Page heading is not used as radio group legend

On "How do you want to add an email subscription?", the radio group has a visually hidden legend that repeats the page heading. Screen readers may read the question twice.

**Service:** Citizen
**Audit reference:** tab "Citizen or verified user", ID Usability 5, spreadsheet row 19
**Priority:** Low
**Type:** Usability finding (no WCAG criterion)
**Category:** Screen Reader Compatibility

#### Where

- How do you want to add an email subscription?

**Tested with:** VoiceOver on Safari, JAWS on Edge

#### User impact

The radio button group uses a visually hidden legend that matches the page heading, rather than using the heading itself as the legend. This means the question could be announced twice by screen readers. This may cause frustration for screen reader users due to additional noise.

#### Recommended solution

Wrap the <h1> of the page within the <legend> element, ensuring that the <fieldset> wraps the whole radio button section.

#### Acceptance criteria

- [ ] The visually hidden legend is removed
- [ ] The page `<h1>` sits inside the `<legend>` (GOV.UK `isPageHeading: true`), and the `<fieldset>` wraps the whole radio group
- [ ] Checked with a screen reader: the question is announced once

_The audit team's own screenshot is in the spreadsheet, at the row given above._



## Comments

No comments on this issue.
