# #976: Bug: Applicants' and Respondents' full names missing from subscription email PDF

**State:** OPEN
**Assignees:** None
**Author:** ashwini-mv
**Labels:** None
**Created:** 2026-09-01T16:18:21Z
**Updated:** 2026-09-03T10:39:57Z

## Description

**Description**

When a new Family Daily Cause List is uploaded, the Style Guide correctly displays the applicants' and respondents' full names. However, the PDF generated for the subscription email displays only their surnames.

**Steps to reproduce**

Upload a new Family Daily Cause List containing applicants' and respondents' full names.
Verify the names in the Style Guide.
Subscribe to the list and wait for the subscription email.
Open the PDF from the subscription email.
Check the applicants' and respondents' names.

**Expected result**

The subscription email PDF should display the full names of both applicants and respondents, consistent with the information displayed in the Style Guide.

**Actual result**

The subscription email PDF displays only the surnames of the applicants and respondents. Their full names are missing.

**Impact**

The PDF provided through the subscription email does not contain the complete applicant and respondent names and is inconsistent with the Family Daily Cause List displayed in the Style Guide.

## Comments

### Comment by OgechiOkelu on 2026-09-03T10:29:50Z

@spec 

### Comment by hmctsclaudecode on 2026-09-03T10:36:05Z

# Technical Specification — Issue #976

**Bug: Applicants' and Respondents' full names missing from subscription email PDF**

## 1. User Story

**As a** subscriber to a Family Daily Cause List (member of the public, media, or legal professional)
**I want to** see the same applicant and respondent party details in the PDF attached to my subscription email as I see on the published list page
**So that** I can identify the parties to a hearing from the PDF alone, without having to open the service in a browser to get the complete information

---

## 2. Background

The Family Daily Cause List is published in two renderings driven by the **same** upstream data and the **same** rendering function:

| Rendering | Entry point | Template |
|---|---|---|
| Web page ("Style Guide") | `apps/web/src/pages/(list-types)/family-daily-cause-list/index.ts` | `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk` |
| Subscription email PDF | `libs/list-types/family-daily-cause-list/src/pdf/pdf-generator.ts` → `libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.ts` | `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` |

Both call `renderCauseListData` (`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts`). Its `processParties()` function builds **four** derived fields on each case, using `createPartyDetails()` (`libs/list-types/daily-cause-list-common/src/email-summary/party-extractor.ts`), which concatenates `title`, `individualForenames`, `individualMiddleName` and `individualSurname`:

* `case.applicant` — parties with `partyRole: "APPLICANT_PETITIONER"`
* `case.applicantRepresentative` — parties with `partyRole: "APPLICANT_PETITIONER_REPRESENTATIVE"`
* `case.respondent` — parties with `partyRole: "RESPONDENT"`
* `case.respondentRepresentative` — parties with `partyRole: "RESPONDENT_REPRESENTATIVE"`

### Root cause

The PDF template consumes only **two** of those four fields. `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:99-100`:

```njk
<td>{{ case.applicant }}</td>
<td>{{ case.respondent }}</td>
```

The web template renders all four, appending the representative under a `Legal Advisor:` label — `family-daily-cause-list.njk:162-169`:

```njk
{% if case.applicant %}
  {{ case.applicant }}{% if case.applicantRepresentative %}, {{ t.legalAdvisor }}: {{ case.applicantRepresentative }}{% endif %}
{% endif %}
```

So every representative party name present in the uploaded JSON is silently dropped from the PDF. Where the Family data records the applicant/respondent individual with a sparse `individualDetails` block (commonly surname only) and carries the fully-qualified name on the associated representative party, the PDF column collapses to a bare surname — exactly the symptom reported.

The sibling list type already does this correctly. `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk:107,112` renders the representative on a second line inside the same cell:

```njk
{{ case.applicant }}{% if case.applicantRepresentative %}<br><em>{{ t.legalAdvisor }}: {{ case.applicantRepresentative }}</em>{% endif %}
```

`t.legalAdvisor` is **already defined** in the Family locale files (`libs/list-types/family-daily-cause-list/src/locales/en.ts:22` and `cy.ts:22`) and is currently unused by the PDF template — no new content keys are required.

### Why this was not caught

`libs/list-types/family-daily-cause-list/src/pdf/pdf-generator.test.ts` mocks `generateDailyCauseListPdf` entirely, so it asserts only that the provenance label is resolved and delegation happens. There is **no** `pdf-template.njk.test.ts` for this list type, so the PDF table markup has zero test coverage. The renderer is well covered (`libs/list-types/daily-cause-list-common/src/rendering/renderer.test.ts` asserts `applicant === "Mr John Paul Smith"`), which is why the defect sits in the template rather than the data layer.

### Scope

This is a template-and-tests fix in one list type. `renderCauseListData`, the JSON schema, the party extractor, the notification pipeline and the web page are all correct and must not change.

---

## 3. Acceptance Criteria

* **Scenario:** Applicant representative name appears in the PDF
    * **Given** a published Family Daily Cause List whose case has a party with `partyRole: "APPLICANT_PETITIONER"` (`individualSurname: "Smith"`) and a party with `partyRole: "APPLICANT_PETITIONER_REPRESENTATIVE"` (`title: "Mrs"`, `individualForenames: "Jane"`, `individualSurname: "Doe"`)
    * **When** the subscription email PDF is generated for that artefact
    * **Then** the Applicant cell contains `Smith` followed by `Legal Advisor: Mrs Jane Doe`

* **Scenario:** Respondent representative name appears in the PDF
    * **Given** the same list has a party with `partyRole: "RESPONDENT"` and a party with `partyRole: "RESPONDENT_REPRESENTATIVE"`
    * **When** the PDF is generated
    * **Then** the Respondent cell contains the respondent name followed by `Legal Advisor: <representative full name>`

* **Scenario:** Full individual names are rendered unabbreviated
    * **Given** a party with `title: "Mr"`, `individualForenames: "John"`, `individualMiddleName: "Paul"`, `individualSurname: "Smith"`
    * **When** the PDF is generated
    * **Then** the cell reads `Mr John Paul Smith` — no initialising, no truncation to surname

* **Scenario:** Organisation parties are unaffected
    * **Given** a representative party that has `organisationDetails.organisationName: "Smith & Co Solicitors"` and no `individualDetails`
    * **When** the PDF is generated
    * **Then** the cell shows `Legal Advisor: Smith & Co Solicitors`

* **Scenario:** Multiple parties in the same role are comma-separated
    * **Given** a case with two `RESPONDENT` parties, `John Smith` and `Jane Doe`
    * **When** the PDF is generated
    * **Then** the Respondent cell shows `John Smith, Jane Doe`

* **Scenario:** No representative present
    * **Given** a case with an applicant but no `APPLICANT_PETITIONER_REPRESENTATIVE` party
    * **When** the PDF is generated
    * **Then** the Applicant cell shows the applicant name only, with no `Legal Advisor:` label and no trailing punctuation or stray line break

* **Scenario:** No applicant or respondent present
    * **Given** a case with no `APPLICANT_PETITIONER` and no `RESPONDENT` parties
    * **When** the PDF is generated
    * **Then** both cells are empty and the table row still renders with the correct column count

* **Scenario:** PDF matches the published web page
    * **Given** any published Family Daily Cause List
    * **When** the web page and the PDF are compared for the same case
    * **Then** the applicant and respondent party text is equivalent in both (the web page uses `, Legal Advisor:` inline; the PDF uses a line break — the names themselves are identical)

* **Scenario:** Welsh PDF
    * **Given** a Welsh-language artefact (`locale: "cy"`)
    * **When** the PDF is generated
    * **Then** the representative label uses the Welsh `legalAdvisor` value and party names are rendered in full

---

## 4. User Journey Flow

No user-facing journey changes. The affected path is the existing publication → notification pipeline:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. CaTH admin uploads Family Daily Cause List JSON                   │
│    POST /api/publication  (listTypeName = FAMILY_DAILY_CAUSE_LIST)   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. libs/publication/src/processing/service.ts                        │
│    PDF_GENERATOR_REGISTRY["FAMILY_DAILY_CAUSE_LIST"]                 │
│      → generateFamilyDailyCauseListPdf()                             │
│      → generateDailyCauseListPdf()                                   │
│          ├─ renderCauseListData()   ← derives applicant,             │
│          │                            applicantRepresentative,      │
│          │                            respondent,                    │
│          │                            respondentRepresentative       │
│          ├─ loadTranslations(locale)                                 │
│          ├─ env.render("pdf-template.njk", …)  ◀── DEFECT IS HERE    │
│          │     drops both *Representative fields                     │
│          ├─ generatePdfFromHtml()                                    │
│          └─ savePdfToStorage(artefactId, …)                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│ 3a. Subscriber receives email │   │ 3b. Anyone opens the web page    │
│     with the stored PDF       │   │     /family-daily-cause-list     │
│         ⇒ names incomplete    │   │       ?artefactId=<id>           │
│           (bug)               │   │         ⇒ names complete         │
└───────────────────────────────┘   └──────────────────────────────────┘
```

After the fix, step 3a and 3b present the same party information.

---

## 5. Low Fidelity Wireframe

**Current PDF output (defective)** — representative names absent:

```
Oxford Family Court, Court 1, Before: District Judge Smith
┌────────┬───────────┬───────────────┬───────────┬──────────────┬──────────┬──────────┬───────────┬────────────┐
│ Time   │ Case ref  │ Case name     │ Case type │ Hearing type │ Location │ Duration │ Applicant │ Respondent │
├────────┼───────────┼───────────────┼───────────┼──────────────┼──────────┼──────────┼───────────┼────────────┤
│ 10am   │ FD25P001  │ Smith v Jones │ Family    │ Directions   │ In person│ 1 hour   │ Smith     │ Jones      │
└────────┴───────────┴───────────────┴───────────┴──────────────┴──────────┴──────────┴───────────┴────────────┘
                                                                              ▲ incomplete  ▲ incomplete
```

**Required PDF output** — mirrors the web page, following the `civil-and-family-daily-cause-list` precedent:

```
Oxford Family Court, Court 1, Before: District Judge Smith
┌────────┬───────────┬───────────────┬───────────┬──────────────┬──────────┬──────────┬─────────────────────────┬─────────────────────────┐
│ Time   │ Case ref  │ Case name     │ Case type │ Hearing type │ Location │ Duration │ Applicant               │ Respondent              │
├────────┼───────────┼───────────────┼───────────┼──────────────┼──────────┼──────────┼─────────────────────────┼─────────────────────────┤
│ 10am   │ FD25P001  │ Smith v Jones │ Family    │ Directions   │ In person│ 1 hour   │ Mr John Paul Smith      │ Mrs Alice Jones         │
│        │           │               │           │              │          │          │ Legal Advisor:          │ Legal Advisor:          │
│        │           │               │           │              │          │          │ Mrs Jane Doe            │ Brown & Co Solicitors   │
├────────┴───────────┴───────────────┴───────────┴──────────────┴──────────┴──────────┴─────────────────────────┴─────────────────────────┤
│ Reporting Restrictions: Section 4(2) order in force                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**No representative on the case** — no label, no blank second line:

```
│ 2pm    │ FD25P002  │ Green v Blue  │ Family    │ Final        │ Video    │ 30 mins  │ Ms Sarah Green          │ Mr Tom Blue             │
```

---

## 6. Page Specifications

### 6.1 Files changed

| File | Change |
|---|---|
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` | Render `applicantRepresentative` / `respondentRepresentative` in the Applicant and Respondent cells |
| `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` | **New** — template test covering the party columns |
| `e2e-tests/tests/api/subscription-notifications.spec.ts` | Extend the existing Family fixture with representative parties if the journey already asserts on PDF content (see §13) |

No changes to `renderCauseListData`, `createPartyDetails`, the JSON schema, `pdf-generator.ts`, the locale files, or the web template.

### 6.2 Template change

Replace `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:99-100`:

```njk
<td>{{ case.applicant }}</td>
<td>{{ case.respondent }}</td>
```

with the `civil-and-family-daily-cause-list` form:

```njk
<td>
  {% if case.applicant %}
    {{ case.applicant }}{% if case.applicantRepresentative %}<br><em>{{ t.legalAdvisor }}: {{ case.applicantRepresentative }}</em>{% endif %}
  {% endif %}
</td>
<td>
  {% if case.respondent %}
    {{ case.respondent }}{% if case.respondentRepresentative %}<br><em>{{ t.legalAdvisor }}: {{ case.respondentRepresentative }}</em>{% endif %}
  {% endif %}
</td>
```

### 6.3 Specification detail

* **Line break, not comma.** The PDF is a fixed-width A4 print surface where the party columns are the narrowest content. Use `<br>` + `<em>` as `civil-and-family-daily-cause-list` does, rather than the web page's inline `, Legal Advisor:` form. This keeps the two PDFs internally consistent and avoids forcing a wide column.
* **Do not add `class="no-wrap"`** to these two cells. The existing PDF template deliberately omits `no-wrap` on the applicant and respondent cells (unlike Time, Case ref, etc.) so long names can wrap; adding it would push the table past the page width.
* **Label comes from translations.** Use `t.legalAdvisor`, never a hardcoded string. The key already exists in both `en.ts` and `cy.ts`.
* **Guard on the outer field.** Wrap in `{% if case.applicant %}` so a case with no applicant produces a genuinely empty cell rather than an orphan `Legal Advisor:` line. A representative with no principal party is not a shape the schema produces; if it occurs, the representative is not shown — matching the web page.
* **Autoescaping stays on.** `configureNunjucks` (`@hmcts/list-types-common`) is used unchanged; party names are interpolated with `{{ }}` so `&` in organisation names such as `Smith & Co Solicitors` is escaped correctly. The `<br>` and `<em>` are literal template markup, not interpolated data.
* **`colspan` unchanged.** The reporting-restriction row keeps `colspan="9"`; the column count is not affected.
* **Multiple parties.** `processParties()` already joins same-role parties with `", "`. No template-side joining logic is needed.

### 6.4 Regression surface

`libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` is used only by `FAMILY_DAILY_CAUSE_LIST` (registered at `libs/publication/src/processing/service.ts:152`). `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` and `CIVIL_DAILY_CAUSE_LIST` have their own templates and are unaffected. The shared `generateDailyCauseListPdf` is untouched, so no other list type changes behaviour.

**Existing artefacts are not retrospectively fixed.** PDFs are generated once at publication time and written to blob storage by `savePdfToStorage`. Already-published Family lists keep their defective PDFs until the next upload for that location and content date. This is acceptable given daily lists are superseded within 24 hours; see §14.

---

## 7. Content

**No new content keys are required.** Every string needed already exists in the Family locale files and is used by the web template; the PDF template simply does not reference `legalAdvisor` yet.

### 7.1 Keys used by the changed cells

| Key | English (`libs/list-types/family-daily-cause-list/src/locales/en.ts`) | Welsh (`cy.ts`) | Status |
|---|---|---|---|
| `applicant` | `Applicant` | existing value | Unchanged, column header |
| `respondent` | `Respondent` | existing value | Unchanged, column header |
| `legalAdvisor` | `Legal Advisor` | `Cynrychiolydd Cyfreithiol` | Existing (`en.ts:22` / `cy.ts:22`) — newly referenced by the PDF template |

For completeness, the Welsh value already in the repo is the correct translation of the label:

* `legalAdvisor`: [WELSH TRANSLATION REQUIRED: "Legal Advisor"]

**Do not add, rename or re-translate these keys.** If the implementation finds itself needing a new key, that is a signal the template has diverged from the `civil-and-family-daily-cause-list` precedent — revisit §6.2.

### 7.2 Party name composition (reference, not a change)

Party names are assembled by `createPartyDetails()` and are **data**, never translated:

* Individual: `title` + `individualForenames` + `individualMiddleName` + `individualSurname`, space-joined, empty parts dropped
* Organisation: `organisationDetails.organisationName`
* Multiple parties in the same role: joined with `", "`

Titles (`Mr`, `Mrs`, `Ms`) come from the uploaded JSON and are rendered verbatim in both languages. This matches the web page and every other cause-list type — do not attempt to localise them.

### 7.3 Locale parity

`Object.keys(en).sort()` must equal `Object.keys(cy).sort()` for the Family locale files. This already holds and must continue to hold; assert it in the new template test (see §13).

---

## 8. URL

No routing changes.

| Surface | Path |
|---|---|
| Published web page (Style Guide) | `GET /family-daily-cause-list?artefactId=<artefactId>` — auto-discovered from `apps/web/src/pages/(list-types)/family-daily-cause-list/`; `(list-types)` is a route group and contributes no URL segment |
| Welsh web page | `GET /family-daily-cause-list?artefactId=<artefactId>&lng=cy` |
| Subscription email PDF | Not a route. Generated at publication time and stored in blob storage keyed by `artefactId` via `savePdfToStorage`; attached to the notification email by `@hmcts/notifications` |
| Publication upload | `POST /api/publication` with `listTypeName: "FAMILY_DAILY_CAUSE_LIST"` |

`artefactId` is read as `req.query.artefactId` and a missing value yields a 400 rendering of `errors/common` — existing behaviour, unchanged.

---

## 9. Validation

**No validation changes.** There is no user input on this path — the PDF is machine-generated from an already-validated artefact. The existing rules are recorded here because the fix depends on them holding.

### 9.1 JSON schema (unchanged)

`libs/list-types/family-daily-cause-list/src/schemas/family-daily-cause-list.json` already permits everything the fix renders. At the party level (schema lines 303–320):

| Field | Type | Required | Notes |
|---|---|---|---|
| `partyRole` | string | No | Free string; `processParties()` matches `APPLICANT_PETITIONER`, `APPLICANT_PETITIONER_REPRESENTATIVE`, `RESPONDENT`, `RESPONDENT_REPRESENTATIVE`; anything else is ignored |
| `individualDetails.title` | string | No | `"default": ""` |
| `individualDetails.individualForenames` | string | No | `"default": ""` |
| `individualDetails.individualMiddleName` | string | No | `"default": ""` |
| `individualDetails.individualSurname` | string | No | `"default": ""` |
| `organisationDetails.organisationName` | string | No | `"default": ""` |

Consequences the template must tolerate, all already handled by `createPartyDetails()`:

* Every name component is optional, so a party may legitimately be surname-only, forename-only, or empty
* A party may have `individualDetails`, `organisationDetails`, both, or neither
* `party` itself may be absent from a case (`caseItem.party ?? []`)
* An empty-string result is filtered out, so no party contributes a stray `", "`

**Do not tighten the schema** to make representatives mandatory. Representative parties are genuinely optional in Family proceedings and many cases have none.

### 9.2 Invariants the fix must preserve

* The Applicant and Respondent columns render exactly one `<td>` each — the reporting-restriction row's `colspan="9"` must continue to match
* No party data is HTML-unescaped; `{{ }}` interpolation only, never `| safe`
* An absent representative produces no label, no `<br>`, no `<em>`, and no trailing whitespace-only content in the cell

---

## 10. Error Messages

**No new error messages.** There is no user-facing form or interaction in scope.

### 10.1 Existing failure handling (unchanged)

| Condition | Current behaviour | Source |
|---|---|---|
| Nunjucks render throws (e.g. template missing from `dist/pdf/`) | Caught by the `try/catch` in `generateDailyCauseListPdf`; returns `createPdfErrorResult(error)`; publication succeeds without a PDF | `libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.ts:57-59` |
| `generatePdfFromHtml` fails | Returns `{ success: false, error: "PDF generation failed" }` | Same file, lines 49–54 |
| Missing `artefactId` on the web page | 400, `errors/common` with `t.errorMessage` (`Missing artefactId parameter`) | `apps/web/src/pages/(list-types)/list-type-handler.ts:38` |
| Blob not found for the artefact | Logged as `[family-daily-cause-list] Blob not found for artefactId: <id>` and an error page rendered | `list-type-handler.ts:53` |

### 10.2 Silent-failure note

The defect was invisible precisely because the failure mode is silent — a dropped template field produces a valid, well-formed PDF with missing information and no log line. The mitigation is the template test in §13, not a runtime error message. Do **not** add defensive logging or a runtime assertion for missing representative names; representatives are legitimately optional and such a log would fire constantly.

---

## 11. Navigation

**No navigation changes.** The affected artefact is a generated PDF, which has no internal links or navigation.

* The PDF footer continues to show `{{ t.dataSource }}: {{ dataSource }}` when provenance is present — unchanged
* The `openJustice` information box, including the external open-justice link, is unchanged
* The subscription email's link to the published list page is unchanged
* The web page's own back link, breadcrumbs, and language toggle are unchanged

The only behavioural consequence is that a subscriber who previously had to open the web page to obtain the representative's name no longer needs to leave the PDF.

---

## 12. Accessibility

The artefact in scope is a generated PDF, so WCAG 2.2 AA applies to the PDF document rather than to a web page. The web page is unchanged and its existing accessibility posture is unaffected.

### 12.1 This fix improves accessibility

The defect is itself a WCAG failure of **1.3.1 Info and Relationships** in substance: the PDF presents a table column headed *Applicant* whose cell omits information the same column carries on the web. Restoring the representative name closes an information gap that disproportionately affects users who rely on the emailed PDF — screen-reader users who have configured email attachments as their reading path, and users on low-bandwidth or intermittent connections who cannot reliably load the web page.

### 12.2 Requirements for the changed markup

* **Do not convey the representative relationship by styling alone.** `<em>` is used for visual differentiation, but the textual `Legal Advisor:` label carries the meaning. This satisfies **1.4.1 Use of Colour** and **1.3.1**; never drop the label and rely on italics.
* **Keep the cell in reading order.** The representative must follow the principal party inside the *same* `<td>`. Splitting it into an extra column or an extra row would break the `<th scope="col">` associations and change `colspan` arithmetic on the reporting-restriction row.
* **`<br>` is acceptable here** because the two lines are a single logical value (party, then their representative). Do not substitute a list or a nested table, which would add spurious structure to a table cell.
* **Preserve table semantics.** The existing `<thead>`/`<tbody>` split and `<th>` headers in `pdf-template.njk` must remain so PDF tagging maps cells to headers.
* **No new colour, no new font size.** Inherits `PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES`, which already meet the 4.5:1 contrast requirement.

### 12.3 Verification

* **Automated:** the existing Axe checks on `/family-daily-cause-list` continue to pass (the page is unchanged). There is no Axe equivalent for the PDF, so template structure is verified by the Cheerio assertions in the new template test.
* **Manual:** open the generated PDF in a screen reader (NVDA or VoiceOver) and confirm the Applicant cell is announced as a single cell containing both the party name and `Legal Advisor: <name>`, associated with the *Applicant* column header.
* **Reflow (1.4.10):** confirm long representative names — particularly organisation names such as `Smith & Co Solicitors LLP` — wrap within the cell and do not force horizontal overflow of the A4 page. This is why `no-wrap` must not be added to these cells (§6.3).
* **Plain language:** `Legal Advisor` is the term already used on the web page and in `civil-and-family-daily-cause-list`. Keep it consistent; do not introduce `Representative` or `Solicitor` in the PDF only.

---

## 13. Test Scenarios

The gap that let this defect ship is the absence of any test that renders `pdf-template.njk`. The primary deliverable alongside the template change is a new template test file.

### 13.1 New template test — `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`

Use `createTestEnvironment` / `render` from `@hmcts/test-support` with layered `buildCase` / `buildParty` fixture builders and named column-index constants. Assert on structure with Cheerio, no raw-HTML string matching, no AAA comments.

* Renders the applicant's full name (title, forenames, middle name, surname) in the Applicant cell — proves the surname-only symptom is gone
* Renders `Legal Advisor: <name>` in the Applicant cell when `applicantRepresentative` is set
* Renders `Legal Advisor: <name>` in the Respondent cell when `respondentRepresentative` is set
* Omits the `Legal Advisor` label entirely when no representative is present, and the cell text equals the principal party name with no trailing separator
* Renders an empty Applicant cell when the case has no applicant, and does not emit an orphan `Legal Advisor` label
* Renders an organisation representative by `organisationName`, with `&` correctly escaped in the output text
* Renders comma-separated names when two parties share the same role
* Uses the Welsh `legalAdvisor` label when the template is rendered with the `cy` locale object, and still renders full party names
* Confirms the table still has nine column headers and that the reporting-restriction row uses `colspan="9"`
* Confirms the Applicant and Respondent cells do **not** carry the `no-wrap` class, while Time and Case ref do
* Asserts locale-key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`

### 13.2 Cross-rendering consistency test

* A test that renders the same fixture through both `pdf-template.njk` and `family-daily-cause-list.njk` and asserts the applicant and respondent **name text** is equivalent after normalising whitespace — this is the assertion that would have caught #976 directly, and guards against the two templates drifting again

### 13.3 Existing tests to extend, not replace

* `libs/list-types/family-daily-cause-list/src/pdf/pdf-generator.test.ts` — leave as is. It mocks `generateDailyCauseListPdf` and correctly tests only provenance-label resolution and delegation. Do not try to make it cover template output; that is the template test's job
* `libs/list-types/daily-cause-list-common/src/rendering/renderer.test.ts` — already asserts `applicant === "Mr John Paul Smith"` and comma-joining. No change needed; referenced here to confirm the data layer is not the defect
* `apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk.test.ts` — confirm it already asserts the `Legal Advisor` inline form; add the assertion if it does not, so both renderings are pinned

### 13.4 E2E

* Extend the existing Family Daily Cause List journey in `e2e-tests/tests/api/subscription-notifications.spec.ts` so its upload fixture includes `APPLICANT_PETITIONER_REPRESENTATIVE` and `RESPONDENT_REPRESENTATIVE` parties alongside sparse principal parties. Do **not** add a new spec file — per the project's minimum-test-count rule, fold this into the existing publish-then-notify journey
* Within that journey, verify the generated PDF is produced successfully for the artefact and that the web page for the same `artefactId` shows the representative names in both English and Welsh, with an inline Axe check

### 13.5 Manual verification

* Upload a real-shaped Family Daily Cause List JSON containing representatives to a local environment, subscribe, and open the PDF from the resulting email — the acceptance test named in the issue's steps to reproduce
* Compare the PDF side by side with `/family-daily-cause-list?artefactId=<id>` and with `?lng=cy`

---

## 14. Assumptions & Open Questions

### Assumptions

* **The root cause is the template, not the data.** Confirmed by reading the code: `renderCauseListData` derives all four party fields and `renderer.test.ts` asserts full-name output, while `pdf-template.njk:99-100` consumes only two of the four. The uploaded JSON is not being stripped anywhere in the pipeline.
* **The reported "only surnames" symptom is the representative omission.** The Family data the reporter used records principal parties with sparse `individualDetails` (surname populated, forenames absent) and carries the fully-qualified name on the representative party. Dropping the representative therefore reduces the cell to a surname. This is the only divergence between the two templates for these columns, so it is the only mechanism that can produce the reported difference. **This should be confirmed against the reporter's actual upload** — if their principal-party objects do contain forenames and the PDF still showed a bare surname, the diagnosis is incomplete and the PDF-generation path needs re-examination before the fix is accepted.
* **`civil-and-family-daily-cause-list` is the correct precedent.** Its PDF template renders the representative on a second line and is the closest sibling list type. Matching it keeps the two Family-facing PDFs consistent.
* **`legalAdvisor` is already correctly translated** in `cy.ts:22`. No new Welsh content is needed, so no translation lead time.
* **Not retrospectively regenerating existing PDFs is acceptable.** Daily lists are superseded within 24 hours, so the defect self-heals on the next publication cycle for each location.
* **No prod deployment exists yet**, so this reaches users only via local and STG. No prod backfill planning is required.

### Open questions

* **Should the PDF use the web page's inline `, Legal Advisor: X` form instead of the two-line form?** This spec chooses the two-line form to match `civil-and-family-daily-cause-list` and to fit the narrow A4 columns. Confirm with the content designer that a deliberate presentational difference between web and PDF is acceptable, given the issue frames the goal as "consistent with the Style Guide".
* **Do any other list types have the same omission?** `family-daily-cause-list` and `civil-and-family-daily-cause-list` diverged, which suggests the templates were copied at different times. An audit of every `pdf-template.njk` that renders `case.applicant` against its web counterpart would establish whether #976 is one instance of a broader drift. Recommended as a follow-up ticket rather than expanding this fix.
* **Should the cross-rendering consistency check be generalised?** A shared helper that asserts a PDF template and its web template agree on party text, applied across all cause-list types, would prevent recurrence structurally. Out of scope here; worth raising if the audit above finds more instances.
* **Is a one-off regeneration wanted for currently-published Family lists?** Only relevant if a subscriber has an active complaint about a specific list. Confirm with the product owner; default position is no.
* **Does the reporter's Welsh PDF also need checking?** The fix covers both locales, but nobody has reported the Welsh rendering. Worth confirming during manual verification that the Welsh PDF had the same defect and is now fixed.


### Comment by OgechiOkelu on 2026-09-03T10:39:56Z

@plan 
