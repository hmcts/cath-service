# #1623: [A11y] Package 4: System and local admin journey

**State:** OPEN
**Assignees:** 
**Author:** junaidiqbalmoj
**Labels:** bug, priority:1-highest
**Created:** 2026-11-23T12:58:10Z
**Updated:** 2026-11-26T11:22:40Z

## Description

## Summary

Fixes to the system admin and local admin pages, including the critical duplicate checkbox ID issue (item 4.1). The package has two halves (4a and 4b) that can be picked up by different people.

This ticket holds all the requirements for 15 findings from the Accessibility CoE audit of CaTH. Each finding is a numbered item below, with its user impact, recommended solution, current code, acceptance criteria and any mock-up agreed at refinement.

**Audit file:** Audit_details_CaTH_AI_FINAL_041126.xlsx. Spreadsheet row numbers count the header as row 1.

## 4a – Admin forms and uploads – overview

| Item | Issue | Service | Priority | Audit tab | Audit ID | Row | WCAG |
|---|---|---|---|---|---|---|---|
| 4.1 | Checkboxes share duplicate IDs, causing incorrect label associations | Admin | Critical | System admin | 9 | 10 | 4.1.2 (Level A) |
| 4.2 | Error summary links for date fields do not move focus to the input | Admin | High | System admin | 2 | 3 | 2.4.3 (Level A) |
| 4.3 | Heading like text not marked up as such | Admin | High | System admin | 7 | 8 | 1.3.1 (Level A) |
| 4.4 | Uploaded files are cleared from the input when the form has errors | Admin | Medium | System admin | 3 | 4 | 3.3.7 (Level A) |
| 4.5 | Typeahead search component has multiple labels | Admin | Medium | System admin | 4 | 5 | 1.3.1 (Level A) |
| 4.6 | Form fields do not have individual error messages when the form is submitted empty | Admin | Medium | System admin | 11 | 12 | 3.3.1 (Level A) |
| 4.7 | A visually hidden legend duplicates the main page heading | Admin | Low | System admin | Usability 3 | 19 | Usability (no WCAG) |

**Work together:**

- Item 4.2, item 4.4 and item 4.3 are all on Manual upload.
- Item 4.5 is in the shared `apps/web/src/assets/js/search-autocomplete.ts`, so the fix also corrects the public "Search by court or tribunal name" page.
- Item 4.7 is the same fix as item 3.4 (Package 3) and item 3.7 (Package 3) in Package 3 (page heading inside the legend).

## 4b – Admin tables and media applications – overview

| Item | Issue | Service | Priority | Audit tab | Audit ID | Row | WCAG |
|---|---|---|---|---|---|---|---|
| 4.8 | Table causes the entire page to scroll horizontally | Admin | High | System admin | 6 | 7 | 1.4.10 (Level AA) |
| 4.9 | View link has accessible name overridden to 'opens in new tab' | Admin | High | System admin | 14 | 15 | 2.5.3 (Level A) |
| 4.10 | Table sort controls are coded as links rather than buttons | Admin | Medium | System admin | 5 | 6 | 4.1.2 (Level A) |
| 4.11 | Focus moves back to the top of the page after a table is sorted | Admin | Medium | System admin | 8 | 9 | 2.4.3 (Level A) |
| 4.12 | A table header cell is empty | Admin | Medium | System admin | 12 | 13 | 1.3.1 (Level A) |
| 4.13 | Tables across the service have no captions | Admin | Medium | System admin | Usability 4 | 20 | Usability (no WCAG) |
| 4.14 | View links on application page are non-specific | Admin | Medium | System admin | 13 | 14 | 2.4.4 (Level A) |
| 4.15 | Approve and reject application buttons far apart and hard to see using screen magnifier | Admin | Medium | System admin | Usability 2 | 18 | Usability (no WCAG) |

**Work together:**

- Item 4.10 and item 4.11 are the same sortable table on Remove List Summary. They must be one change.
- Item 4.8, item 4.12 and item 4.13 are general table fixes. item 4.13 covers captions on every admin table, so do it in the same pass.
- Item 4.14, item 4.9 and item 4.15 are all on the media applications pages.

## Before starting

- [ ] Item 4.6: the agreed mock-up keeps all fields on one page with five specific error messages, but the ticket's acceptance criteria still describe the audit's two-step approach. Update the acceptance criteria to match the mock-up.

## Definition of done

- [ ] Every item's acceptance criteria below are met
- [ ] Changes are checked with axe and a screen reader on the pages listed for each item
- [ ] Welsh content is updated where wording changed

## Requirements

## 4a – Admin forms and uploads

### 4.1 – Checkboxes share duplicate IDs, causing incorrect label associations

On "Court – Update jurisdiction data", several checkboxes share the same `id`. Some checkboxes have no label and others have more than one, so screen reader and voice control users can't reliably choose the right one.

**Service:** Admin
**Audit reference:** tab "System admin", ID 9, spreadsheet row 10
**Priority:** Critical
**WCAG:** 4.1.2: Name, Role, Value (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Court - Update jurisdiction data

**Tested with:** JAWS on Edge

#### User impact

Multiple checkboxes page share the same ID attribute, so labels are not correctly linked to the checkbox they are next to. This means some checkboxes have no label, whilst others have multiple. This makes it much more difficult for screen reader users to tell which checkbox they are selecting, as well as voice recognition software users being unable to select checkboxes with voice commands.

#### Recommended solution

Give every checkbox a unique id attribute, and ensure the for attribute on each corresponding <label> matches it exactly.

#### Current code

```html
<form method="post" novalidate="">
<div class="govuk-form-group">
  <fieldset class="govuk-fieldset">
  <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
    Type of civil court
  </legend>
  <div class="govuk-checkboxes" data-module="govuk-checkboxes" data-govuk-checkboxes-init="">
    <div class="govuk-checkboxes__item">
      <input class="govuk-checkboxes__input" id="subJurisdictionIds" name="subJurisdictionIds" type="checkbox" value="1">
      <label class="govuk-label govuk-checkboxes__label" for="subJurisdictionIds">
        Civil Court
      </label>
    </div>
    <div class="govuk-checkboxes__item">
      <input class="govuk-checkboxes__input" id="subJurisdictionIds-2" name="subJurisdictionIds" type="checkbox" value="5">
      <label class="govuk-label govuk-checkboxes__label" for="subJurisdictionIds-2">
        Court of Appeal (Civil Division)
      </label>
    </div>
    <div class="govuk-checkboxes__item">
      <input class="govuk-checkboxes__input" id="subJurisdictionIds-3" name="subJurisdictionIds" type="checkbox" value="10">
      <label class="govuk-label govuk-checkboxes__label" for="subJurisdictionIds-3">
        High Court
      </label>
    </div>
  </div>
</fieldset>
</div>
<div class="govuk-form-group">
  <fieldset class="govuk-fieldset">
```

_Snippet shortened. The full snippet is in the audit spreadsheet._

#### Acceptance criteria

- [ ] Every checkbox has a unique `id`
- [ ] Each `<label for>` matches its own checkbox `id`
- [ ] There are no duplicate `id`s on the page (checked with axe or the HTML validator)
- [ ] Checked with JAWS: each checkbox announces its own label

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.2 – Error summary links for date fields do not move focus to the input

On Manual upload, the error summary links for date fields go to `#hearingStartDate`, which doesn't match any input. The page scrolls, but focus stays on the error summary.

**Service:** Admin
**Audit reference:** tab "System admin", ID 2, spreadsheet row 3
**Priority:** High
**WCAG:** 2.4.3: Focus Order (Level A)
**Category:** Navigation & Focus

#### Where

- Manual upload - Error summary - Date entry

**Tested with:** Keyboard-only, Edge

#### User impact

The error summary contains links intended to take the user directly to the date fields that need correcting, but activating these links only scrolls the page visually and does not move focus to the input. This means the user's focus remains on the error summary link at the top of the page. This could make it harder and slower for keyboard and screen reader users to correct their mistakes, as they must navigate through the page to find the relevant field.

#### Recommended solution

Update the href attribute on the error summary link so it exactly matches the id of the 'day' input, so focus is moved when the link is activated.

#### Current code

```html
<a href="#hearingStartDate">Please enter a valid hearing start date</a>
```

#### Acceptance criteria

- [ ] Each date field error summary link's `href` matches the `id` of the first input in that date (the day field, for example `#hearingStartDate-day`)
- [ ] Activating the link moves focus into the day field
- [ ] Checked for every date field on Manual upload and any other admin form with date inputs

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.3 – Heading like text not marked up as such

On Manual Upload, the labels under the "Sensitivity" heading (such as "Public") are styled as bold text with `<strong>` instead of being marked up as headings.

**Service:** Admin
**Audit reference:** tab "System admin", ID 7, spreadsheet row 8
**Priority:** High
**WCAG:** 1.3.1: Info and Relationships (Level A)
**Category:** Structure & Semantics

#### Where

- Manual Upload

**Tested with:** JAWS on Edge

#### User impact

Text that starts sections of content has been styled using the '<strong>' html element, to look like headings. These are not announced by screen readers as headings, making it more difficult for screen reader users to determine its relationship to the content that follows it.

#### Recommended solution

Change the <strong> text beneath the 'Sensitivity' heading to <h4> elements, to communicate the structure of the page to screen reader users.

#### Current code

```html
<p class="govuk-body">
  <strong>Public</strong><br>
  Publication available to all users.
</p>
```

#### Acceptance criteria

- [ ] The bold sensitivity labels under "Sensitivity" are proper headings at the next level down (the audit suggests `<h4>`)
- [ ] Heading levels on the page are in order, with no skipped levels
- [ ] Checked with a screen reader's heading list

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.4 – Uploaded files are cleared from the input when the form has errors

On Manual upload, if the form has errors when it's submitted, the uploaded file is removed and has to be uploaded again.

**Service:** Admin
**Audit reference:** tab "System admin", ID 3, spreadsheet row 4
**Priority:** Medium
**WCAG:** 3.3.7: Redundant Entry (Level A)
**Category:** Cognitive support and predictability

#### Where

- Manual upload

**Tested with:** Edge

#### User impact

If a manual upload is submitted and has an error, the file uploaded is removed from the file input. This means that users have to reupload files again. This may cause users to resubmit the form in error due to the missing file, causing confusion and frustration for all users, especially those with cognitive impairments.

#### Recommended solution

Store the uploaded file so that users do not have to reupload files if there are errors on the form.

#### Acceptance criteria

- [ ] When the form comes back with errors, the uploaded file is kept and the user can see which file is attached
- [ ] Users can still remove or replace the kept file
- [ ] The kept file is used when the form is resubmitted successfully

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.5 – Typeahead search component has multiple labels

The typeahead (autocomplete) search has two labels linked to the same field: the visible label and a visually hidden "Search" label.

**Service:** Admin
**Audit reference:** tab "System admin", ID 4, spreadsheet row 5
**Priority:** Medium
**WCAG:** 1.3.1: Info and Relationships (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Manual upload
- Search by court or tribunal name

**Tested with:** JAWS on Edge, Dragon on Edge

#### User impact

Typeahead search components have two labels linked to the field. This means that screen reader users have two labels announced when navigating to the field, and voice recognition software users may find it more difficult to target the field by speaking its name.

#### Recommended solution

Ensure that only one label is linked to the field, removing the visually hidden 'search' label, ensuring only the visible field label is linked.

#### Current code

```html
<div class="govuk-form-group">
  <label class="govuk-label govuk-label--m" for="locationId">
    Search by court or tribunal name
  </label>
  <div id="locationId-hint" class="govuk-hint">
    For example, Blackburn Crown Court
  </div>
  <div id="locationId-autocomplete-wrapper"><label class="govuk-label govuk-visually-hidden" for="locationId">Search</label><div class="autocomplete__wrapper"><div class="autocomplete__status" style=" …
<input type="hidden" name="locationId" id="locationIdId" value="1"></div>
```

_Snippet shortened. The full snippet is in the audit spreadsheet._

#### Acceptance criteria

- [ ] Only the visible label is linked to the autocomplete input; the hidden "Search" label is removed
- [ ] Each `id` is used only once on the page
- [ ] Fixed on every page that uses the component, including Manual upload and "Search by court or tribunal name"
- [ ] Checked with JAWS (one label read out) and Dragon (field can be selected by its label)

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.6 – Form fields do not have individual error messages when the form is submitted empty

On "Manage location metadata for {court name}", submitting the form empty doesn't show error messages next to the fields.

**Service:** Admin
**Audit reference:** tab "System admin", ID 11, spreadsheet row 12
**Priority:** Medium
**WCAG:** 3.3.1: Error Identification (Level A)
**Category:** Forms & Error Handling

#### Where

- Manage location metadata for {court name}

**Tested with:** Edge

#### User impact

There are no error messages next to the individual form fields, so the error is not described where the user actually needs to enter the information. This may make it difficult for screen reader users to know there is a problem when they navigate directly to the inputs to fill them out.

#### Recommended solution

Instead of presenting three open text inputs at once, break the interaction into two steps:

Ask the user to make a choice. Present a radio button group (e.g., 'What type of message would you like to add?'). The options would be the two categories (e.g., Caution message, No list message.)

After a user selects an option and submits the form, the next page shows the inputs they need to fill out. They can then add another if they need to also add a list message.

Individual error messages should then be added to any empty fields or fields in error.

#### Acceptance criteria

- [ ] Each empty or invalid field shows its own inline error message, linked with `aria-describedby`
- [ ] An error summary links to each field in error
- [ ] 5 Error messages are displayed in the error message dialogue box under header 'There is a problem' 
1. Enter at least one message
2. Enter English caution message
3. Enter Welsh caution message
4. Enter English no list message
5. Enter Welsh no list message
- [ ] Error messages 2-5 are displayed underneath the header of each associated text box respectively

#### Agreed mock-up from refinement

_Added by OgechiOkelu on 17 Nov 2026_

**Agreed mock up:** 5 Error messages are displayed in the error message dialogue box under header 'There is a problem' Error messages 2-5 are displayed underneath the header of each text box respectively. 
1. Enter at least one message
2. Enter English caution message
3. Enter Welsh caution message
4. Enter English no list message
5. Enter Welsh no list message

<img width="870" height="1531" alt="image" src="https://github.com/user-attachments/assets/43a4f96f-83ec-4b40-94dc-dd68a68633e3" />

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.7 – A visually hidden legend duplicates the main page heading

On "What do you want to do" (admin), a visually hidden legend repeats the page heading, so screen readers read the question twice.

**Service:** Admin
**Audit reference:** tab "System admin", ID Usability 3, spreadsheet row 19
**Priority:** Low
**Type:** Usability finding (no WCAG criterion)
**Category:** Cognitive support and predictability

#### Where

- What do you want to do

**Tested with:** JAWS on Edge

#### User impact

A visually hidden legend repeats the same question as the page heading, so screen reader users hear the same question repeated twice when they navigate through page content. This may frustrate users due to the unnecessary repetition.

#### Recommended solution

Wrap the <h1> of the page within the <legend> element, ensuring that the <fieldset> wraps the whole radio button section. Remove the duplicate visually hidden legend.

#### Current code

```html
<div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-l">What do you want to do?</h1>
    <form method="post" novalidate="">
<div class="govuk-form-group">
  <fieldset class="govuk-fieldset">
  <legend class="govuk-fieldset__legend govuk-visually-hidden">
    What do you want to do?
  </legend>
  <div class="govuk-radios" data-module="govuk-radios" data-govuk-radios-init="">
    <div class="govuk-radios__item">
      <input class="govuk-radios__input" id="action" name="action" type="radio" value="create">
      <label class="govuk-label govuk-radios__label" for="action">
        Create a new jurisdiction or sub-jurisdiction
      </label>
    </div>
    <div class="govuk-radios__item">
      <input class="govuk-radios__input" id="action-2" name="action" type="radio" value="modify">
      <label class="govuk-label govuk-radios__label" for="action-2">
        Modify an existing jurisdiction or sub-jurisdiction
      </label>
    </div>
  </div>
</fieldset>
</div>
<button type="submit" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">
  Continue
</button>
    </form>
  </div>
```

#### Acceptance criteria

- [ ] The visually hidden legend is removed
- [ ] The page `<h1>` sits inside the `<legend>` (GOV.UK `isPageHeading: true`), and the `<fieldset>` wraps the whole radio group
- [ ] Checked with a screen reader: the question is announced once

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

## 4b – Admin tables and media applications

### 4.8 – Table causes the entire page to scroll horizontally

On Blob Explorer Publications, the table makes the whole page scroll sideways on small screens and at high zoom.

**Service:** Admin
**Audit reference:** tab "System admin", ID 6, spreadsheet row 7
**Priority:** High
**WCAG:** 1.4.10: Reflow (Level AA)
**Category:** Zoom and legibility

#### Where

- Blob Explorer Publications

**Tested with:** Edge

#### User impact

The Blob explorer publications page, containing a table, scrolls both horizontally and vertically when content is reflowed or viewed on smaller screen sizes. This means that users may accidentally scroll horizontally and lose their place on the page, or find it more difficult to scroll down the page to view content. This particularly affects users with low vision, or view content at higher zoom levels.

#### Recommended solution

Whilst tables are exempt from reflow requirements, only the table itself should have both horizontal and vertical scrolling at smaller screen sizes.

Ensure only the table itself scrolls both horizontally and vertically at small screen sizes or higher zoom levels. Use CSS media queries and add 'overflow: auto' at screen sizes smaller than 510px width. Ensure that the table receives focus on small screen sizes, so keyboard only users understand the table is scrollable. This can be done using the focus:visible CSS property.

#### Acceptance criteria

- [ ] At small widths and high zoom, only the table scrolls horizontally; the rest of the page doesn't
- [ ] The scrollable table area can be focused with a keyboard and shows a visible focus style
- [ ] Checked at 320px width / 400% zoom

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.9 – View link has accessible name overridden to 'opens in new tab'

On Applicant's details, the "View" link's accessible name is replaced by an `aria-label` that only says it opens in a new window. The visible text "View" isn't part of it.

**Service:** Admin
**Audit reference:** tab "System admin", ID 14, spreadsheet row 15
**Priority:** High
**WCAG:** 2.5.3: Label in Name (Level A)
**Category:** Voice compatibility

#### Where

- Applicants details

**Tested with:** Dragon on Edge

#### User impact

The 'View' link on the 'applicant's details' page has been given an 'aria-label' of 'opens in new window', meaning the accessible name does not match the visible name of 'view'. This means that voice recognition software users may find it difficult to target the link using voice commands.

#### Recommended solution

Remove the 'aria-label' from the link and add some visually hidden text after each link to provide context to the link, linking it back to the 'proof of id'.

Example from the audit:

```html
<a href="/media-applications/efe1cf06-189d-4e6f-938b-f75f546bc3f0" class="govuk-link">View<span class="govuk-visually-hidden">Proof of ID</span></a>
```

#### Acceptance criteria

- [ ] The `aria-label` is removed from the "View" link
- [ ] The link has visually hidden context (for example "View <span class=\"govuk-visually-hidden\">proof of ID</span>")
- [ ] If the link opens in a new tab, this is said in the link text
- [ ] Checked with Dragon: saying "click View" activates the link

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.10 – Table sort controls are coded as links rather than buttons

On Remove List Summary, the sort controls in the table headers are links, so screen readers announce them as links to another page rather than as sort actions.

**Service:** Admin
**Audit reference:** tab "System admin", ID 5, spreadsheet row 6
**Priority:** Medium
**WCAG:** 4.1.2: Name, Role, Value (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Remove List Summary

**Tested with:** JAWS on Edge

#### User impact

Elements used to sort the X table are marked up as links instead of buttons. This means that screen reader users interacting with these links may expect to navigate to a new page, rather than trigger a sort action.

#### Recommended solution

Change the link markup for button markup, as sortable in page actions should be buttons rather than links. This approach is documented in the MoJ design system for sortable tables.

Reference: [MoJ Design System: Sortable table](https://design-patterns.service.justice.gov.uk/components/sortable-table/)

#### Current code

```html
<th scope="col" class="govuk-table__header govuk-table__header--sortable" aria-sort="none">
  <a href="?sort=listType&amp;order=asc" class="govuk-link govuk-link--no-visited-state">
    List Type
      <svg width="22" height="22" focusable="false" aria-hidden="true" role="img" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.1875 9.5L10.9609 3.9570 …
  </a>
</th>
```

_Snippet shortened. The full snippet is in the audit spreadsheet._

#### Acceptance criteria

- [ ] Sortable column headers use `<button>` elements, following the MoJ sortable table pattern
- [ ] `aria-sort` is updated on the sorted column
- [ ] Screen readers announce the controls as buttons

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.11 – Focus moves back to the top of the page after a table is sorted

On Remove List Summary, sorting a column reloads the page and sends focus back to the top, so keyboard and screen reader users lose their place.

**Service:** Admin
**Audit reference:** tab "System admin", ID 8, spreadsheet row 9
**Priority:** Medium
**WCAG:** 2.4.3: Focus Order (Level A)
**Category:** Navigation & Focus

#### Where

- Remove List Summary

**Tested with:** Keyboard on Edge

#### User impact

When a table column is sorted, keyboard and screen reader focus resets to the top of the page instead of staying on the sort button, so the user unexpectedly loses their place on the page. This means keyboard-only and screen reader users need to navigate back through the page to read the sorted results or sort another column.

#### Recommended solution

Change the link markup for button markup, as sortable in page actions should be buttons. ensure focus remains on the button after the table content has been sorted. This approach is documented in the MoJ design system for sortable tables.

Reference: [MoJ Design System: Sortable table](https://design-patterns.service.justice.gov.uk/components/sortable-table/)

#### Acceptance criteria

- [ ] After sorting, focus stays on (or returns to) the sort button that was used
- [ ] Use the MoJ sortable table pattern (best done together with the links-to-buttons ticket for the same table)
- [ ] Checked with a keyboard only

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.12 – A table header cell is empty

On the Audit log viewer, one of the table header cells is empty, so screen reader users don't know what that column is for.

**Service:** Admin
**Audit reference:** tab "System admin", ID 12, spreadsheet row 13
**Priority:** Medium
**WCAG:** 1.3.1: Info and Relationships (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Audit log viewer

**Tested with:** JAWS on Edge

#### User impact

A table header cell (<th>) contains no content, meaning screen reader users get no information about the action or content within the column. This may cause confusion for screen reader users trying to understand the information in the table.

#### Recommended solution

Add a clear, descriptive table header of 'Actions' or similar.

#### Acceptance criteria

- [ ] The empty header cell has descriptive text, for example "Actions" (it can be visually hidden if needed)
- [ ] Checked with a screen reader: the column header is read out with each cell

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.13 – Tables across the service have no captions

Tables across the admin service have no `<caption>`, so screen reader users have to read the surrounding content to work out what each table shows.

**Service:** Admin
**Audit reference:** tab "System admin", ID Usability 4, spreadsheet row 20
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Screen Reader Compatibility

#### Where

- Tables across the service

**Tested with:** JAWS on Edge

#### User impact

Tables across the service have no captions that help screen reader users clearly understand the table purpose. This means screen reader users may need to navigate through surrounding page content to help them better understand the contents of the table.

#### Recommended solution

Add a <caption> element inside each <table> element to provide a clear, descriptive title for the data.

#### Acceptance criteria

- [ ] Every data table in the admin service has a descriptive `<caption>` (GOV.UK `caption`, styled to fit the page)
- [ ] Where a caption would repeat a visible heading, either the heading is used as the caption or the caption is visually hidden
- [ ] An inventory of the tables that were fixed is listed in the PR

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.14 – View links on application page are non-specific

On "Select application to assess", every link just says "View", so screen reader users can't tell which application each link opens.

**Service:** Admin
**Audit reference:** tab "System admin", ID 13, spreadsheet row 14
**Priority:** Medium
**WCAG:** 2.4.4: Link Purpose (in Context) (Level A)
**Category:** Screen Reader Compatibility

#### Where

- Select application to assess

**Tested with:** JAWS on Edge

#### User impact

Links to view different media applications are labelled as 'view' without any clear labelling for what the link relates to. This means screen reader users may find it more difficult to tell where individual 'view' links will lead to, or what link relates to which application.

#### Recommended solution

Add some visually hidden text after each link to provide context to the link, linking it back to the name of the applicant.

Example from the audit:

```html
<a href="/media-applications/efe1cf06-189d-4e6f-938b-f75f546bc3f0" class="govuk-link">View<span class="govuk-visually-hidden">Application for Hannah Cox</span></a>
```

#### Current code

```html
<a href="/media-applications/efe1cf06-189d-4e6f-938b-f75f546bc3f0" class="govuk-link">View</a>
```

#### Acceptance criteria

- [ ] Each "View" link has visually hidden text naming the applicant, for example "View <span class=\"govuk-visually-hidden\">application for [name]</span>"
- [ ] Checked with a screen reader's links list: each link is unique and makes sense

_The audit team's own screenshot is in the spreadsheet, at the row given above._

---

### 4.15 – Approve and reject application buttons far apart and hard to see using screen magnifier

On Applicant's details, the "Approve" and "Reject" buttons are on opposite sides of the page. Screen magnifier users may miss "Reject" entirely.

**Service:** Admin
**Audit reference:** tab "System admin", ID Usability 2, spreadsheet row 18
**Priority:** Medium
**Type:** Usability finding (no WCAG criterion)
**Category:** Zoom and legibility

#### Where

- Applicants details

**Tested with:** ZoomText on Edge

#### User impact

The 'Approve' and 'Reject' buttons on the media applications page are placed on opposite sides of the screen with a large gap between them. This may cause screen magnifier users to miss the 'Reject' button entirely, as they would have to pan across the page to find it.

#### Recommended solution

Group the 'Approve' and 'Reject' buttons together visually. Place them next to each other, in a logical order, aligned to the left side of the container or page layout.

#### Acceptance criteria

- [ ] "Approve" and "Reject" are next to each other, left-aligned, in a logical order (a GOV.UK button group)
- [ ] Checked with a screen magnifier or at high zoom: both buttons can be seen together

_The audit team's own screenshot is in the spreadsheet, at the row given above._



## Comments

No comments on this issue.
