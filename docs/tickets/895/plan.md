# Technical Plan — #895: CaTH account verification requirement added in CaTH account creation T&C

## 1. Technical Approach

This is a **content and markup-only change** to one existing page. No new module, no
API route, no database change, no service logic.

The page already exists at `apps/web/src/pages/(public)/create-media-account/` and is
fully wired up (auto-discovered route, session-backed error handling, Multer upload).
Two things are wrong today:

1. There is **no "Terms and conditions" section heading**. The T&C copy is crammed into
   the `hint.html` of the `govukCheckboxes` macro as a single `<p>` containing two
   merged paragraphs.
2. The **annual verification paragraph is missing entirely** from both locales.

### Key decision: move the T&C copy out of the checkbox hint

Today:

```njk
{{ govukCheckboxes({
  name: "termsAccepted",
  hint: { html: "<p class='govuk-body'>" + termsText + "</p>" },
  ...
```

The AC requires "Terms and conditions" to be "displayed boldly as a section header".
A hint cannot legitimately contain an `<h2>` — GOV.UK hint text is rendered inside a
`<div class="govuk-hint">` that is wired to the input via `aria-describedby`, so
injecting a heading there both breaks the document outline and makes a screen reader
read ~120 words of legalese as the checkbox's accessible description.

**Therefore:** render the T&C block as ordinary page content inside the `<form>`,
between the ID-upload form group and the checkbox:

```njk
<h2 class="govuk-heading-m">{{ termsHeading }}</h2>
<p class="govuk-body">{{ termsText1 }}</p>
<p class="govuk-body">{{ termsText2 }}</p>
<p class="govuk-body">{{ termsText3 }}</p>

{{ govukCheckboxes({
  name: "termsAccepted",
  fieldset: { legend: { text: "", classes: "govuk-visually-hidden" } },
  items: [ { value: "on", text: termsCheckboxLabel, ... } ],
  errorMessage: ...
}) }}
```

The checkbox keeps its label ("Please tick this box to agree to the above terms and
conditions") — that label already refers to "the above terms and conditions", so the
copy still reads correctly once the paragraphs sit above it. The `hint` key is dropped
from the macro call.

This also satisfies the ordering requirement: heading sits **below** the ID-upload
section and **above** the "A Court and tribunal hearing account is granted…" paragraph.

### Key decision: split `termsText` into four keys

`termsText` is currently one string holding two paragraphs. It must become:

| Key | Content |
|-----|---------|
| `termsHeading` | "Terms and conditions" |
| `termsText1` | "A Court and tribunal hearing account is granted based on you having legitimate reasons…" |
| `termsText2` | **NEW** — "As part of our annual verification process, you will be sent an email…" |
| `termsText3` | "If your circumstances change and you no longer have legitimate reasons…" |

`termsText` is deleted. Verified by grep that `termsText` is referenced **only** in
this page's `en.ts`, `cy.ts`, `index.njk` and `index.njk.test.ts` — no lib, no other
page, no e2e test reads it. Nothing else breaks.

## 2. Implementation Details

### TEMPLATE SOURCE

> n/a

The page already exists in this repo; this is an edit to an existing `.njk` + its
co-located locale files, not a page migration. The pip-frontend / production page
referenced in the AC (`https://www.court-tribunal-hearings.service.gov.uk/create-media-account`)
is the **content reference** for the target copy and section ordering only — do not
re-migrate the template. If, during implementation, the production page turns out to
differ from this repo's page in ways beyond the T&C section, stop and raise it against
open question Q3 rather than widening the change.

### Files to change

```
apps/web/src/pages/(public)/create-media-account/
├── en.ts               # remove termsText; add termsHeading, termsText1..3
├── cy.ts               # same keys, Welsh copy from the ticket
├── index.njk           # add h2 + 3 paragraphs; drop hint from govukCheckboxes
├── index.njk.test.ts   # update terms assertions + requiredKeys list
└── index.test.ts       # verify no assertion depends on termsText (likely no change)

e2e-tests/tests/create-media-account.spec.ts   # extend existing display test
```

No changes to `libs/public-pages` — `validateForm` keys off `termsAccepted` and the
`errorTermsRequired` string, neither of which moves.

### Content — English (`en.ts`)

```typescript
termsHeading: "Terms and conditions",
termsText1:
  "A Court and tribunal hearing account is granted based on you having legitimate reasons to access information not open to the public e.g. you are a member of a media organisation and require extra information to report on hearings.",
termsText2:
  "As part of our annual verification process, you will be sent an email to verify you still have access to the email address that was used to create your account. If you do not verify your email address within the stipulated time, your account will be removed and you will need to apply for a new account if you still require access.",
termsText3:
  "If your circumstances change and you no longer have legitimate reasons to hold a Court and tribunal hearings account e.g. you leave your employer entered above. It is your responsibility to inform HMCTS of this for your account to be deactivated.",
```

`termsText1` and `termsText3` are the existing `termsText` split at the sentence
boundary — copy verbatim, do not reword.

### Content — Welsh (`cy.ts`)

All four strings are supplied in the ticket, so no `[WELSH TRANSLATION REQUIRED]`
placeholder is needed:

```typescript
termsHeading: "Telerau ac Amodau",
termsText1:
  "Caniateir ichi gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys ar yr amod bod gennych resymau cyfreithiol dros gael mynediad at wybodaeth nad yw ar gael i'r cyhoedd e.e. rydych yn aelod o sefydliad cyfryngau ac angen gwybodaeth ychwanegol i riportio ar wrandawiadau.",
termsText2:
  "Fel rhan o'n proses ddilysu flynyddol, fe anfonir e-bost atoch yn gofyn i chi gadarnhau bod gennych dal fynediad i'r cyfeiriad e-bost a ddefnyddiwyd i greu eich cyfrif. Os na fyddwch yn dilysu eich cyfeiriad e-bost o fewn yr amser a bennwyd, caiff eich cyfrif ei ddileu, a bydd rhaid i chi wneud cais am gyfrif newydd os bydd angen mynediad arnoch o hyd.",
termsText3:
  "Os bydd eich amgylchiadau'n newid ac nid oes gennych mwyach resymau cyfreithiol dros gael cyfrif ar gyfer gwrandawiadau Llys a thribiwnlys e.e. rydych yn gadael eich cyflogwr a enwyd uchod, eich cyfrifoldeb chi yw hysbysu GLlTEF am hyn fel y gellir dadactifadu eich cyfrif.",
```

**Note a real discrepancy:** the current `cy.ts` `termsText` ends with **"GLlTEM"**.
The ticket's Welsh copy uses **"GLlTEF"** (Gwasanaeth Llysoedd a Thribiwnlysoedd EF),
which is the correct abbreviation and matches the existing typo-free usage elsewhere.
Take the ticket's `GLlTEF` — this is a bug fix that falls out of the split. Flagged as
Q4 in case it is contested.

### Markup ordering in `index.njk`

Insert the block after the closing `</div>` of the `idProof` form group (line ~98) and
before `{% set termsErrorText = ... %}`. Heading level `h2` — the page's only `h1` is
the page title, and there are currently no other `h2`s, so no hierarchy is skipped.

Use `govuk-heading-m`. Do not use `<strong>` or `<b>`: "displayed boldly as a section
header" is satisfied by a real heading element, which is both bold and correct for
assistive tech.

## 3. Error Handling & Edge Cases

Validation is untouched, but there are three concrete regressions to guard against:

| Risk | Mitigation |
|------|------------|
| `#termsAccepted-hint` no longer exists, so the checkbox's `aria-describedby` changes. If a hint is removed but `aria-describedby` is hand-rolled anywhere, it would dangle. | The macro generates `aria-describedby` itself — removing the `hint` key removes the reference cleanly. Assert in the template test that `input[name="termsAccepted"]` has no `aria-describedby` pointing at a non-existent id. |
| Existing template test asserts `$("#termsAccepted-hint").text()` contains `termsText` (en and cy). | Both assertions must be rewritten to target the new `<h2>` and paragraphs. Failing to update = red build, so this is self-detecting. |
| Locale-key parity test (`Object.keys(en).sort()` vs `cy`) | Both files must gain/lose exactly the same keys. Self-detecting. |
| `requiredKeys` array in `index.njk.test.ts` still lists `"termsText"` | Must be updated to `termsHeading`, `termsText1`, `termsText2`, `termsText3`. Self-detecting. |

Edge cases considered and dismissed:

- **Error state rendering** — the terms error message stays attached to the checkbox
  via `errorMessage`, and the error summary `href: "#termsAccepted"` still lands on the
  input. Unchanged.
- **Data preservation** — `data.termsAccepted` still drives the `checked` attribute.
  Unchanged.
- **Apostrophes in Welsh copy** — the strings move from `hint.html` (string
  concatenation into HTML) to `{{ }}` interpolation, which Nunjucks auto-escapes. Welsh
  copy contains `'` typographic apostrophes; these render fine escaped. This is
  strictly safer than the current concatenation-into-HTML approach.
- **Text length / reflow** — three paragraphs at `govuk-body` inside
  `govuk-grid-column-two-thirds`; no styling needed.

## 4. Acceptance Criteria Mapping

| AC | How it is satisfied | Verification |
|----|---------------------|--------------|
| Form updated to follow the same format as production | T&C copy is promoted out of the checkbox hint into a headed section with three discrete paragraphs, matching the production page's structure. Scope is limited to the T&C section (see Q3). | Visual check against production page; template test asserts the section exists with 3 paragraphs |
| "Terms and conditions" displayed boldly as a section header, below the ID-upload section and above "A Court and tribunal hearing account is granted…" | `<h2 class="govuk-heading-m">` inserted after the `idProof` form group and immediately before `termsText1` | Template test asserts `$("h2").text()` contains `en.termsHeading`; assert DOM order — the `h2` appears after `#idProof` and before the paragraph containing `termsText1` |
| Paragraph defining annual verification requirements added to the T&C section | New `termsText2` key, rendered as the second paragraph of the section | Template test asserts the rendered body contains `en.termsText2`, and the Welsh test asserts `cy.termsText2` |
| Welsh translation applied | `cy.ts` carries all four strings from the ticket verbatim | Welsh render test + locale-key parity test; manual check at `/create-media-account?lng=cy` |

### Test plan

**Template tests** (`index.njk.test.ts` — extend, don't duplicate):
- Replace the existing "should render the terms and conditions text and checkbox label"
  test: assert the `h2` text, the three paragraph strings, and the checkbox label.
- Add an ordering assertion (heading follows the ID-upload group).
- Update the Welsh "opening text, hints and terms content" test to the new keys.
- Update `requiredKeys`.

**Controller tests** (`index.test.ts`): expected to need no change — it asserts on
`res.render` being called with `...content`, not on individual terms keys. Confirm by
running, do not pre-emptively edit.

**E2E** (`create-media-account.spec.ts`): per the repo's minimise-test-count rule, do
**not** add a new spec. Extend the existing `"should display form with all required
fields"` test with an assertion that the "Terms and conditions" heading and the annual
verification sentence are visible. The suite already has an inline axe check pattern;
the new `h2` must not introduce a heading-order violation.

## 5. Open Questions

### CLARIFICATIONS NEEDED

1. **Welsh heading capitalisation.** The ticket specifies `Telerau ac Amodau`
   (title case). GOV.UK content style is sentence case, which would give
   `Telerau ac amodau`. The plan takes the ticket's `Telerau ac Amodau` verbatim.
   Should we follow the ticket or house style?

2. **Does the checkbox keep any hint text?** Moving the T&C copy out of the hint leaves
   the checkbox with only its label. Confirm no separate hint is wanted — the label
   already reads "…agree to the above terms and conditions", which reads correctly with
   the paragraphs above it.

3. **How wide is "follow the same format as is presented here"?** The first AC points at
   the whole production page, but the remaining ACs only describe the T&C section. This
   plan changes **only** the T&C section. Are there other differences between the
   staging page and production (field order, opening paragraphs, the ID-upload hint
   wording) that are also in scope for this ticket?

4. **`GLlTEM` → `GLlTEF` in the Welsh copy.** The live `cy.ts` says `GLlTEM`; the
   ticket's Welsh says `GLlTEF`. The plan adopts `GLlTEF` as the correct abbreviation.
   Confirm this is an intended correction and not a transcription slip in the ticket.

5. **Welsh `uploadHint` is missing a sentence (pre-existing, likely out of scope).**
   The English `uploadHint` opens with "Upload a clear photo of your UK Press Card or
   work ID." — the Welsh `uploadHint` has no equivalent for that sentence and starts at
   "Dim ond i gadarnhau…". Since the ACs reference the "Upload a clear photo of your UK
   Press Card or work ID" section by name as the anchor for the new heading, should this
   missing Welsh sentence be fixed here, or raised as a separate ticket?

6. **Content-only confirmation.** This ticket adds a *description* of the annual
   verification process. It does not build the verification emails, the "stipulated
   time" window, or the account-removal job. Confirm those are delivered elsewhere and
   nothing behavioural is expected here. Related: the copy says "within the stipulated
   time" without naming a duration — is that deliberately vague, or should a concrete
   period be stated?
