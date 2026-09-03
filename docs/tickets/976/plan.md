# Technical Plan — Issue #976

**Bug: Applicants' and Respondents' full names missing from subscription email PDF**

A `@spec` comment already exists on the issue. This plan verifies that spec against the
code, corrects two of its recommendations, and closes one of its open questions with a
definitive answer.

---

## 1. Root Cause (verified in code)

Both renderings of the Family Daily Cause List are driven by the **same** derived data.
`generateDailyCauseListPdf` (`libs/list-types/daily-cause-list-common/src/pdf/pdf-generator.ts:31`)
and the web page both call `renderCauseListData`, whose `processParties()`
(`libs/list-types/daily-cause-list-common/src/rendering/renderer.ts:122-157`) writes **four**
fields onto every case:

| Field | `partyRole` matched |
|---|---|
| `case.applicant` | `APPLICANT_PETITIONER` |
| `case.applicantRepresentative` | `APPLICANT_PETITIONER_REPRESENTATIVE` |
| `case.respondent` | `RESPONDENT` |
| `case.respondentRepresentative` | `RESPONDENT_REPRESENTATIVE` |

The PDF template consumes only two of the four.
`libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:99-100`:

```njk
<td>{{ case.applicant }}</td>
<td>{{ case.respondent }}</td>
```

The web template renders all four —
`apps/web/src/pages/(list-types)/family-daily-cause-list/family-daily-cause-list.njk:162-169`:

```njk
{% if case.applicant %}
  {{ case.applicant }}{% if case.applicantRepresentative %}, {{ t.legalAdvisor }}: {{ case.applicantRepresentative }}{% endif %}
{% endif %}
```

**This is the only field-level divergence between the two templates in these two columns.**
Because both read the identical `case.applicant` / `case.respondent` strings produced by the
same function, no other mechanism can make the PDF show less than the web page. The
representative omission is therefore the root cause by construction, not by inference.

`t.legalAdvisor` already exists in both Family locale files
(`libs/list-types/family-daily-cause-list/src/locales/en.ts:22` = `"Legal Advisor"`,
`cy.ts:22` = `"Cynrychiolydd Cyfreithiol"`) and is currently unreferenced by the PDF
template. **No new content keys are needed and no translation lead time is required.**

### Why the symptom presents as "only surnames"

`createPartyDetails()` (`libs/list-types/daily-cause-list-common/src/email-summary/party-extractor.ts:3`)
space-joins `title` + `individualForenames` + `individualMiddleName` + `individualSurname`,
dropping empties. Every one of those fields is optional in the schema. Where the uploaded
Family data records the principal party sparsely (surname only) and carries the
fully-qualified name on the associated representative party, dropping the representative
collapses the cell to a bare surname — the reported symptom.

That last step is an **assumption about the reporter's data**, not something the code proves.
See §7 Q1: if the reporter's `APPLICANT_PETITIONER` objects *did* contain forenames and the
PDF still showed a bare surname, the diagnosis is incomplete. The fix below is correct
either way, but the acceptance check differs.

### Why it was not caught

- `libs/list-types/family-daily-cause-list/src/pdf/pdf-generator.test.ts` mocks
  `generateDailyCauseListPdf` outright, so it only asserts provenance-label resolution and
  delegation. It never renders the template.
- There is **no PDF template test anywhere in the repo.** All 159 `*.njk.test.ts` files live
  under `apps/web/src/pages/`; zero cover a `libs/list-types/*/src/pdf/pdf-template.njk`.
  The PDF table markup for every list type has no test coverage.
- The data layer *is* covered — `renderer.test.ts` asserts `applicant === "Mr John Paul Smith"`
  — which is why the defect sits in the template.

---

## 2. Cross-list-type audit — RESOLVED, family is the only one affected

The existing spec left "do any other list types have the same omission?" open and suggested a
follow-up ticket. I ran the audit; **no follow-up ticket is needed.**

| List type | PDF template renders `*Representative` | Web template renders `*Representative` | Verdict |
|---|---|---|---|
| `family-daily-cause-list` | ✗ | ✓ | **Drifted — this bug** |
| `civil-and-family-daily-cause-list` | ✓ | ✓ | Consistent |
| `et-fortnightly-list` | ✓ | ✓ | Consistent |
| `et-daily-list` | ✗ | ✗ | Consistent (neither shows representatives) |

Those four are the only templates on either side that reference `case.applicant` or
`applicantRepresentative`. Family is a single isolated regression, not systemic drift.

---

## 3. Technical Approach

A template fix plus the first PDF-template test in the repo. Scope is deliberately narrow:

**Changed:**
- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` — render the two
  representative fields
- `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` — **new**
- `libs/list-types/family-daily-cause-list/package.json` — add `@hmcts/test-support` devDependency

**Explicitly not changed:** `renderCauseListData`, `processParties`, `createPartyDetails`,
the JSON schema, `pdf-generator.ts`, either locale file, the web template, the notification
pipeline, or any other list type. All are correct.

### 3.1 Template change

Replace `pdf-template.njk:99-100` with the `civil-and-family-daily-cause-list` form
(`libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk:105-118`):

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

Constraints:

- **Two-line `<br><em>` form, not the web page's inline `, Legal Advisor: X`.** The PDF is a
  fixed-width A4 surface with nine columns; the party columns are the narrowest content.
  Matching `civil-and-family-daily-cause-list` keeps the two Family-facing PDFs internally
  consistent. This is a deliberate presentational difference from the web page — see §7 Q2.
- **Do not add `class="no-wrap"`.** The current PDF template omits `no-wrap` on exactly these
  two cells while every other cell has it; that is intentional so long names wrap instead of
  widening the table past the page. (The *web* template does use `no-wrap` here — do not copy
  that across.)
- **Label from `t.legalAdvisor`**, never a hardcoded string.
- **Guard on the outer field** so a case with no applicant yields a genuinely empty cell, not
  an orphan `Legal Advisor:` line.
- **`{{ }}` interpolation only, never `| safe`.** Autoescaping is on via `configureNunjucks`;
  `&` in organisation names such as `Smith & Co Solicitors` must escape. The `<br>`/`<em>` are
  literal template markup.
- **`colspan="9"` on the reporting-restriction row is unchanged** — the column count does not move.
- **No template-side joining.** `processParties()` already joins same-role parties with `", "`.

### 3.2 Test placement and wiring

The test belongs next to the template it exercises:
`libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`.

Two pieces of wiring are required because this is the first test of its kind:

1. **Add `"@hmcts/test-support": "workspace:*"` to `devDependencies`** in
   `libs/list-types/family-daily-cause-list/package.json`, then `yarn install`. Today only
   `apps/web` and `apps/api` declare it. The root `tsconfig.json:102` already maps the alias,
   so no tsconfig change is needed.
2. **Use `createTestEnvironment` from `@hmcts/test-support`, NOT `configureNunjucks` from
   `@hmcts/list-types-common`.** `configureNunjucks`
   (`libs/list-types/common/src/pdf/pdf-utilities.ts:26`) calls global `nunjucks.configure()`,
   which mutates one shared environment and lets concurrent test files clobber each other's
   search paths — exactly what `.claude/rules/testing.md` forbids. `createTestEnvironment`
   builds an isolated `nunjucks.Environment` with the same `autoescape: true`, so escaping
   behaviour still matches production.

Root `vitest.config.ts` has no `include` override, so `*.njk.test.ts` under `libs/` is picked
up by the default glob without config changes.

### 3.3 Fixture gotchas (will otherwise fail confusingly)

`pdf-template.njk` is a standalone document — it extends no layout — so rendering it is
straightforward, but two things must be supplied or the render throws:

- **`t.openJusticeContact` is a function**, not a string (`en.ts:9`). The template calls
  `{{ t.openJusticeContact(openJustice.venueName, openJustice.email, openJustice.phone) }}`.
  Pass the **real** `en` / `cy` locale objects (never a hand-rolled `t` stub) plus an
  `openJustice` object with `venueName`, `email`, `phone`.
- **`pdfStyles` is piped through `| safe`.** Pass a string; `""` is fine.
- `header` needs `locationName`, `addressLines`, `contentDate`, `lastUpdated`.

Use layered `buildCase` / `buildSitting` / `buildCourtList` builders that each default to a
realistic minimal shape and accept overrides, so individual tests pass only the leaf field
they vary. Name the columns with an index constant
(`const COLUMN = { time: 0, caseRef: 1, ..., applicant: 7, respondent: 8 }`).

---

## 4. Error Handling & Edge Cases

No new error handling. There is no user input on this path — the PDF is machine-generated
from an already-validated artefact. Existing behaviour, unchanged:

| Condition | Current behaviour | Source |
|---|---|---|
| Nunjucks render throws | Caught by `try/catch`; returns `createPdfErrorResult`; publication still succeeds, without a PDF | `daily-cause-list-common/src/pdf/pdf-generator.ts` |
| `generatePdfFromHtml` fails | `{ success: false, error: "PDF generation failed" }` | same file |
| Missing `artefactId` on the web page | 400 + `errors/common` | `apps/web/src/pages/(list-types)/list-type-handler.ts:38` |

Edge cases the changed markup must tolerate — all already handled upstream by
`createPartyDetails()`, so the template needs no defensive logic beyond the outer `{% if %}`:

- Every name component is optional; a party may be surname-only, forename-only, or empty
- A party may carry `individualDetails`, `organisationDetails`, both, or neither
- `party` may be absent from the case entirely (`caseItem.party ?? []`)
- Empty-string party results are filtered out, so no stray `", "` is contributed
- Representative present with **no** principal party → representative is not shown, matching
  the web page. Not a shape the schema produces in practice.

**Do not add defensive logging for a missing representative.** Representatives are
legitimately optional in Family proceedings; such a log would fire constantly. The mitigation
for the silent-failure class is the template test, not a runtime warning.

**Do not tighten the JSON schema.** `family-daily-cause-list.json` already permits everything
rendered here, and representatives must stay optional.

**Existing published PDFs are not retrospectively fixed.** PDFs are written to blob storage
once at publication time by `savePdfToStorage`. Already-published Family lists keep their
defective PDF until the next upload for that location and content date. Acceptable — daily
lists are superseded within 24 hours. There is no prod deployment, so this only ever reached
local and STG. See §7 Q4.

---

## 5. Acceptance Criteria Mapping

| # | Criterion (from the spec on the issue) | How satisfied | Verified by |
|---|---|---|---|
| 1 | Applicant representative appears in the PDF | Template renders `case.applicantRepresentative` after `case.applicant` | Template test: `Legal Advisor: Mrs Jane Doe` present in applicant cell |
| 2 | Respondent representative appears | Same for `respondentRepresentative` | Template test |
| 3 | Full individual names rendered unabbreviated (`Mr John Paul Smith`) | Already correct in `createPartyDetails`; template no longer truncates the cell's information | Template test asserts full four-part name; `renderer.test.ts` already pins the data layer |
| 4 | Organisation representatives unaffected | `createPartyDetails` falls back to `organisationName`; template is field-agnostic | Template test with `Smith & Co Solicitors`, also asserting `&` escapes correctly |
| 5 | Multiple same-role parties comma-separated | `processParties` joins with `", "`; no template logic | Template test |
| 6 | No representative → no label, no stray punctuation or line break | Inner `{% if %}` guard | Template test asserts cell text equals the party name exactly |
| 7 | No applicant/respondent → empty cells, row still has correct column count | Outer `{% if %}` guard; `colspan="9"` untouched | Template test asserts 9 `<th>` and empty cell text |
| 8 | PDF matches the published web page | Both now render all four fields from the same derived data | Web test already pins the inline form at `family-daily-cause-list.njk.test.ts:503,526`; new PDF test pins the two-line form. Names identical, separator differs by design (§7 Q2) |
| 9 | Welsh PDF | `t` is the `cy` object when `locale === "cy"`; `cy.legalAdvisor` already translated | Template test renders with `cy` and asserts `Cynrychiolydd Cyfreithiol` + full names; plus locale-key parity assertion |

### Test plan

**New — `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts`**
(Cheerio structural assertions, no raw-HTML string matching, no AAA comments per
`.claude/rules/testing.md`):

- Applicant cell shows the full four-part name (`Mr John Paul Smith`) — proves the
  surname-only symptom is gone
- `Legal Advisor: <name>` appears in the applicant cell when `applicantRepresentative` is set
- `Legal Advisor: <name>` appears in the respondent cell when `respondentRepresentative` is set
- No `Legal Advisor` label at all when no representative; cell text equals the party name
- Empty applicant cell when the case has no applicant, with no orphan label
- Organisation representative rendered by `organisationName`, `&` correctly escaped
- Comma-separated names when two parties share a role
- Welsh: renders with the `cy` locale object, asserts the Welsh label and full names
- Nine `<th>` headers, and the reporting-restriction row still uses `colspan="9"`
- Applicant and Respondent cells carry **no** `no-wrap` class, while Time and Case ref do
- Locale-key parity: `Object.keys(en).sort()` equals `Object.keys(cy).sort()`

**Unchanged:**
- `pdf-generator.test.ts` — leave alone. It correctly tests only provenance and delegation;
  do not try to make it cover template output.
- `renderer.test.ts` — already covers the data layer. Referenced only to confirm it is not
  the defect.
- `family-daily-cause-list.njk.test.ts` — already asserts the inline `Legal Advisor` form
  (lines 503, 526). No change needed.

**Manual verification** (reproduces the issue's own steps):
- Upload a real-shaped Family Daily Cause List JSON containing representative parties locally,
  subscribe, open the PDF from the resulting email
- Compare side by side with `/family-daily-cause-list?artefactId=<id>` and `&lng=cy`
- Confirm long organisation names wrap inside the cell and do not force the A4 page to
  overflow horizontally (WCAG 1.4.10 reflow; this is why `no-wrap` must stay off)
- Screen-reader spot check (NVDA/VoiceOver): the applicant cell should be announced as one
  cell containing both the party name and `Legal Advisor: <name>`, associated with the
  *Applicant* column header

### Accessibility

WCAG 2.2 AA applies to the generated PDF; the web page is untouched. The fix *improves*
1.3.1 Info and Relationships — a column headed *Applicant* currently omits information the
same column carries on the web. Requirements for the new markup:

- The textual `Legal Advisor:` label carries the meaning; `<em>` is visual only. Never drop
  the label and rely on italics (1.4.1 Use of Colour, 1.3.1).
- The representative must stay inside the **same** `<td>`, after the principal party. An extra
  column or row would break `<th scope="col">` association and the `colspan` arithmetic.
- `<br>` is acceptable — the two lines are one logical value. Do not substitute a list or
  nested table.
- Keep the `<thead>`/`<tbody>` split and `<th>` headers so PDF tagging maps cells to headers.
- No new colour or font size; inherits `PDF_BASE_STYLES + PDF_CIVIL_FAMILY_STYLES`.

### Deviations from the spec on the issue

Two of its test recommendations do not earn their cost:

- **§13.4 — extending `e2e-tests/tests/api/subscription-notifications.spec.ts` with
  representative parties: skip.** That spec asserts only that a PDF blob *exists* with
  `sizeBytes > 0` (lines 441-446); it has no PDF text extraction. Adding representatives to
  the upload fixture would prove nothing about the rendered output while adding fixture
  maintenance. YAGNI. The template test is the assertion that actually catches this class of
  defect.
- **§13.2 — a cross-rendering consistency test rendering both templates in one test: skip.**
  The web template lives in `apps/web` and extends a layout; the PDF template lives in `libs`.
  A lib test reaching into `apps/web/src/pages/` via relative traversal inverts the dependency
  direction and would be the only such test in the repo. Both sides are already pinned
  independently, which gives the same regression protection without the coupling. Raise it as
  a shared helper only if the audit in §2 ever finds more instances — and it currently
  finds none.

---

## 6. Implementation Details

**TEMPLATE SOURCE: n/a**

No new page or list-type view. This is a bug fix to an existing PDF template, following the
in-repo `civil-and-family-daily-cause-list` precedent — nothing is migrated from pip-frontend.

**No API endpoint changes.** The PDF is not served by a route; it is generated at publication
time and stored in blob storage keyed by `artefactId`, then attached to the notification email
by `@hmcts/notifications`.

**No database schema changes.**

**No module registration changes.** `FAMILY_DAILY_CAUSE_LIST` is already registered in
`PDF_GENERATOR_REGISTRY` at `libs/publication/src/processing/service.ts:152`.

**Regression surface.** `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk` is
used only by `FAMILY_DAILY_CAUSE_LIST`. `CIVIL_AND_FAMILY_DAILY_CAUSE_LIST` and
`CIVIL_DAILY_CAUSE_LIST` have their own templates. The shared `generateDailyCauseListPdf` is
untouched, so no other list type changes behaviour.

**Build note.** `package.json` already ships the template into `dist` via
`"build:pdf-templates": "mkdir -p dist/pdf && cp src/pdf/*.njk dist/pdf/"`. No build change
needed, and the new `.njk.test.ts` is excluded from `tsc` output by the existing
`tsconfig.json` `exclude` glob (`**/*.test.ts`).

---

## 7. CLARIFICATIONS NEEDED

**Q1 — Can you share the JSON that reproduced this (or just one party object)?**
Blocking only for the acceptance check, not for the fix. The fix is correct regardless, but
the diagnosis rests on one unverified assumption: that your `APPLICANT_PETITIONER` /
`RESPONDENT` objects carried a surname with no forenames, and the full name sat on the
associated `*_REPRESENTATIVE` party. If your principal-party objects **did** include
`individualForenames` and the PDF still showed a bare surname, then something beyond the
representative omission is wrong and the PDF path needs re-examination before this is signed
off. Both templates read the identical `case.applicant` string from the same function, so I
can't see a second mechanism — but the data would settle it.

**Q2 — Content design: is a deliberate layout difference between web and PDF acceptable?**
The web page shows `Mr John Smith, Legal Advisor: Mrs Jane Doe` inline on one line. This plan
puts the representative on a **second line in italics** in the PDF, matching
`civil-and-family-daily-cause-list`, because the PDF is a fixed-width A4 page with nine
columns and the inline form would force these columns wide. The **names are identical** in
both; only the separator differs. The issue frames the goal as "consistent with the Style
Guide", so please confirm this reading of "consistent" (same information, format suited to the
medium) rather than character-identical output.

**Q3 — Should the Welsh PDF be checked as part of acceptance?**
The fix covers both locales and `cy.legalAdvisor` is already translated, but nobody has
reported the Welsh rendering. Confirm whether Welsh verification is in scope for sign-off.

**Q4 — Do you want existing published Family list PDFs regenerated?**
Default position: **no.** PDFs are generated once at publication and daily lists are
superseded within 24 hours, so the defect self-heals on the next upload per location. A
one-off regeneration is only worth building if a subscriber has an active complaint about a
specific list. Confirm.

**Q5 — FYI, no follow-up ticket needed for other list types.**
The spec on the issue asked whether this omission exists elsewhere and suggested a follow-up
ticket. I audited every PDF and web template that touches these fields (§2): Family is the
only drifted one. `civil-and-family-daily-cause-list` and `et-fortnightly-list` render
representatives in both surfaces; `et-daily-list` renders them in neither, consistently. No
further ticket required unless you disagree with `et-daily-list` omitting representatives by
design — which is a separate product question, not a bug.
