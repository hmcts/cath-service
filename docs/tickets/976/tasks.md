# Tasks — Issue #976

## Implementation Tasks

- [ ] Add `"@hmcts/test-support": "workspace:*"` to `devDependencies` in `libs/list-types/family-daily-cause-list/package.json` and run `yarn install` (no root `tsconfig.json` change needed — the alias is already mapped at line 102)
- [ ] Fix `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk:99-100` — render `case.applicantRepresentative` and `case.respondentRepresentative` on a second line as `<br><em>{{ t.legalAdvisor }}: ...</em>`, guarded by `{% if case.applicant %}` / `{% if case.respondent %}`, copying the form from `libs/list-types/civil-and-family-daily-cause-list/src/pdf/pdf-template.njk:105-118`
- [ ] Confirm no `class="no-wrap"` is added to the two changed cells, `colspan="9"` is unchanged, and no `| safe` filter is applied to party data
- [ ] Create `libs/list-types/family-daily-cause-list/src/pdf/pdf-template.njk.test.ts` using `createTestEnvironment` + `render` from `@hmcts/test-support` (NOT `configureNunjucks`, which mutates the global Nunjucks env)
- [ ] Build layered `buildCase` / `buildSitting` / `buildCourtList` fixture helpers and a `COLUMN` index constant; pass the **real** `en`/`cy` locale objects as `t` (because `t.openJusticeContact` is a function), plus `openJustice` (`venueName`, `email`, `phone`), `header`, and a `pdfStyles` string
- [ ] Test: applicant cell shows the full four-part name (`Mr John Paul Smith`)
- [ ] Test: `Legal Advisor: <name>` appears in the applicant cell when `applicantRepresentative` is set
- [ ] Test: `Legal Advisor: <name>` appears in the respondent cell when `respondentRepresentative` is set
- [ ] Test: no `Legal Advisor` label and no trailing separator when no representative is present
- [ ] Test: empty applicant cell with no orphan label when the case has no applicant
- [ ] Test: organisation representative rendered by `organisationName`, with `&` correctly escaped
- [ ] Test: two parties sharing a role render comma-separated
- [ ] Test: Welsh render uses `cy.legalAdvisor` and still shows full party names
- [ ] Test: nine `<th>` headers and reporting-restriction row still `colspan="9"`
- [ ] Test: applicant/respondent cells have no `no-wrap` class while Time and Case ref do
- [ ] Test: locale-key parity — `Object.keys(en).sort()` equals `Object.keys(cy).sort()`
- [ ] Run `yarn test` from the repo root and confirm the new test file is collected and green
- [ ] Run `yarn lint:fix` and `yarn format`
- [ ] Manual check: upload a Family Daily Cause List with representative parties locally, subscribe, open the emailed PDF, and compare against `/family-daily-cause-list?artefactId=<id>` in both `en` and `&lng=cy`
- [ ] Manual check: long organisation names wrap inside the cell without forcing horizontal overflow of the A4 page (WCAG 1.4.10)

## Explicitly out of scope

- [ ] ~~Extend `e2e-tests/tests/api/subscription-notifications.spec.ts`~~ — that spec only asserts a PDF blob exists with `sizeBytes > 0`; it has no PDF text extraction, so a richer fixture proves nothing (see plan §5)
- [ ] ~~Cross-rendering consistency test rendering both web and PDF templates together~~ — inverts the lib→app dependency direction; both sides are already pinned independently (see plan §5)
- [ ] ~~Changes to `renderCauseListData`, `processParties`, `createPartyDetails`, the JSON schema, `pdf-generator.ts`, the locale files, or the web template~~ — all verified correct
- [ ] ~~Follow-up ticket auditing other list types~~ — audit already done; Family is the only drifted one (see plan §2)
