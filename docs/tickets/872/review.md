# Code Review: Issue #872

Mags subscription emails updated with the new Media Protocol.
Branch `feature/872-mags-media-protocol`, uncommitted changes against `master`. Reviewed 2026-09-30.

## Summary

The code change is small and correct. A new helper
(`libs/notifications/src/govnotify/subscription-template-helper.ts`) holds the six Magistrates list-type
names and two predicates. `buildEmailDataWithFiles`
(`libs/notifications/src/notification/notification-service.ts:510-546`) adds
`is_magistrates_media_protocol` / `is_not_magistrates_media_protocol` (`"yes"`/`"no"`) to every
subscription personalisation (lines 537-541). `getSubscriptionTemplateId` gets a new non-SJP Excel-only
branch (`libs/notifications/src/govnotify/template-config.ts:46-52`) backed by a new
`GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL`. The helm values for web and api switch all subscription
routes to four new CaTH Notify templates.

The code does the routing and flagging properly. The ticket outcome depends on the four external
GOV.UK Notify templates: the wording, the heading, the mailto link and the unchanged non-Mags text all live
there. None of this can be checked from the repo, and the pre-merge template checks and AAT test sends in
`tasks.md:18-23` are still unticked. The change also moves **every** list type (not only Mags) to new
templates in one deploy, so a mistake in any template breaks all subscription emails. It is not a
Mags-only failure.

Checks run:
- `vitest run --coverage` in `libs/notifications`: 7 files, 110 tests, all pass. 90.94% statements.
- `biome check libs/notifications/src apps/web/helm apps/api/helm`: clean.
- `tsc --noEmit -p libs/notifications/tsconfig.json`: clean.
- `apps/web/helm/values.yaml.test.ts`: 6/6 pass (keyVaults parity is not affected).

The verdict is driven by the acceptance-criteria rules: some criteria can only be met by external template
content, and Welsh has been explicitly descoped. It does not mean the code has defects.

## 🚨 CRITICAL Issues

None of these are code defects. Each one is an acceptance criterion marked `- [ ]` that the repo cannot
satisfy or evidence. Per the review rules they are listed here and need to be closed off before merge,
either with evidence or with the product owner signing off on the descope.

1. **New opening-message wording is not verifiable in the repo** (AC "Opening message ... is updated to read as follows")
   - **Problem**: The exact wording exists only in the four external Notify templates
     (`d9095328-…`, `67e78ce9-…`, `01936af9-…`, `fb95d98f-…`). There is no file:line evidence, and the AAT
     test send (`tasks.md:21`) has not been done.
   - **Impact**: If a template has a typo, or a `)` that closes the `((is_magistrates_media_protocol?? …))`
     block early (the new text contains "(select option 1 for criminal cases)"), journalists get truncated
     or wrong legal guidance.
   - **Solution**: Complete `tasks.md:18` and `tasks.md:21`. Record the evidence (a screenshot or the
     rendered body from the Notify preview for each of the four templates) in the PR. Confirm the
     `mediaandpressenquires@justice.gov.uk` spelling ("enquires" rather than "enquiries",
     `plan.md:248`). A wrong address sends journalists' enquiries to a dead mailbox.

2. **Welsh opening message not delivered** (spec AC "New wording available in both languages")
   - **Problem**: The user confirmed Welsh is out of scope (`plan.md:43`), but the ticket still lists it as
     an acceptance criterion. Welsh-language subscribers to Mags lists will get the English text.
   - **Impact**: Welsh Language Standards and WCAG language-of-parts expectations, as stated in the
     ticket's own spec (§12).
   - **Solution**: Update the ticket to remove or defer this criterion (or raise a follow-up issue), with
     the product owner's sign-off recorded on #872. No code change is expected.

3. **Contact details as usable links: no evidence** (spec AC "Contact details render as usable links")
   - **Problem**: This depends entirely on the Notify template markdown. Notify does not reliably turn a
     bare email address into a `mailto:` link (link formatting depends on the email client), and nothing in
     the repo shows how the templates render it.
   - **Impact**: Screen-reader and keyboard users may not be able to act on the address.
   - **Solution**: Check in the Notify preview and an AAT test email that the address is clickable, has no
     trailing comma (`tasks.md:18`), and that the phone number is plain text. Also check that
     "Contacting magistrates' courts" uses `#` heading markup so it is exposed as a heading.

## ⚠️ HIGH PRIORITY Issues

1. **Mags emails show the new wording: only the code half is done** (ACs "Subscription emails for all Mags lists need to be updated" and "Magistrates subscription email uses the new opening message", both `- [~]`)
   - **Done**: The flags are set for all six names (`subscription-template-helper.ts:4-15`) on every send
     path (`notification-service.ts:537-541`). Enhanced, fallback, location, case and list-type
     subscriptions all go through `buildEmailDataWithFiles` (`notification-service.ts:503, 557`, called from
     `:429` and `:656`). There is no other subscription `sendEmail` caller in the repo.
   - **Missing**: Proof that the new templates render the new block for `"yes"` and hide it for `"no"`
     (AAT send, `tasks.md:21`).

2. **Non-Mags wording "byte-for-byte unchanged" is probably not achievable as specified** (AC "Non-Magistrates subscription email is unchanged", `- [~]`)
   - **Done**: Non-Mags, SJP and unresolved names get `is_magistrates_media_protocol: "no"`,
     `is_not_magistrates_media_protocol: "yes"` (`subscription-template-helper.ts:17-19`,
     `notification-service.ts:539-540`, tests at `notification-service.test.ts:679-716, 730-739`).
   - **Missing**: The existing text contains "(for example on victims and children)". Inside a
     `((is_not_magistrates_media_protocol?? …))` block the `)` ends the conditional early, so the template
     must change it (e.g. to square brackets, as `plan.md:159-160` already requires for the new text). That
     is a visible wording change for every non-Mags subscriber. The templates were also rebuilt from the pip
     V2 structure rather than copied, so other content (headers, footers, link text) may have drifted from
     the old templates too.
   - **Recommendation**: Compare each new template's non-Mags render against the matching old template
     (`5b5c31d0-…`, `ac63ed12-…`, `42f65ada-…`) and record the differences. Get product owner sign-off on the
     bracket change, or restructure the template so the parenthetical sits outside the conditional (for
     example, put the shared sentence outside both blocks if the wording allows).

3. **Blast radius: all list types switch templates in one deploy** (`apps/web/helm/values.yaml:39-42`, `apps/api/helm/values.yaml:10-13`, `apps/api/helm/values.dev.yaml:20-23`)
   - **Impact**: If a template references a personalisation key CaTH does not send, Notify rejects the send
     (400 "Missing personalisation"). For example, a pip V2 key that CaTH never populates, or `pdf_link_*`
     in the Excel template, or `excel_link_*` in the PDF template. `govnotify-client.ts:72-90` only adds
     `link_to_file`/`pdf_link_*` when a PDF buffer exists and `excel_link_*` when an Excel buffer exists.
     Failures are only recorded in the audit log (`notification-service.ts:445`), so nobody is alerted.
   - **Recommendation**: Treat `tasks.md:18` and `tasks.md:21-23` as merge gates, not post-merge tasks. For
     each template, list its `((placeholders))` and check them against the keys CaTH sends on that route:
     `TemplateParameters` (`template-config.ts:88-104`), the two flags, and the file-link keys for that
     route. Also confirm that no environment overrides these IDs outside this repo (for example in
     cnp-flux-config). Otherwise the helm change will not take effect there, and those environments will
     keep using the old templates, which have no Mags block.

## 💡 SUGGESTIONS

1. **Guard against the Mags name set drifting** (`subscription-template-helper.ts:4-11`)
   - **Benefit**: The six names are now kept by hand in three places: this set, `EMAIL_BUILDER_REGISTRY`
     (`notification-service.ts:325-340`) and `libs/list-types/common/src/list-type-data.ts:35,656,710-746`.
     A seventh `MAGISTRATES_*` list type would quietly get the old wording.
   - **Approach**: Add a helper test that loads `listTypeData` and asserts `isMagistratesMediaProtocol`
     returns true for every entry whose name starts with `MAGISTRATES_`, and false for the rest.

2. **Compute the flag once** (`notification-service.ts:539-540`)
   - The ternary appears twice and `isNotMagistratesMediaProtocol` is just a negation. A single
     `const isMags = isMagistratesMediaProtocol(listTypeName);` makes the mutual exclusivity obvious.
     Alternatively, the helper could return the two-key personalisation fragment, which would remove the need
     to import four symbols. This is minor. Mirroring the pip helper is a reasonable choice.

3. **Service-level test for the attachment routes**
   - The new service tests always mock `downloadBlob` to return `null` (`notification-service.test.ts:640`)
     and `getSubscriptionTemplateId` is mocked (`:43`), so only the no-links route is exercised. The ticket
     spec (§13) asks for the PDF path to be covered. Add one case with a PDF buffer and one with an Excel-only
     buffer that assert the flags are sent together with `pdfBuffer`/`excelBuffer`.

4. **Avoid `as any` in the new tests** (`notification-service.test.ts:627, 636, 657`)
   - The same block already uses `as never` (`:661-667`). Use it consistently so the new code does not add
     more `any`.

5. **Keep the old templates for a fixed period** (`tasks.md:26`)
   - The rollback in `plan.md:199-201` depends on the old templates still existing. Deleting them straight
     after one AAT send removes the rollback. Set a date (for example, after a week of production sends) and
     note it in the ticket.

6. **E2E env forwarding is incomplete (pre-existing)** (`e2e-tests/playwright.config.ts:45-46`)
   - Only `…_SUBSCRIPTION` and `…_SUBSCRIPTION_PDF_ONLY` are forwarded. Neither `…_PDF_EXCEL` nor the new
     `…_EXCEL` is. This is not introduced here, but worth adding if E2E notification tests ever send with
     attachments.

7. **Enhanced-path catch is too broad (pre-existing)** (`notification-service.ts:491-507`)
   - The `try` wraps `buildEmailDataWithFiles`, so a template-config error (for example the new "not set"
     throw) or a blob download failure triggers the fallback, which downloads both blobs again and throws the
     same error. Consider catching only the extract/format step.

8. **Comment at `template-config.ts:46`**: This explains *why*, which is allowed. It repeats the comment at
   lines 20-22, though, and could be dropped.

## ✅ Positive Feedback

- Selection is keyed only on the stable `listTypeName` (`subscription-template-helper.ts:13-15`). No
  numeric IDs are used, and the service fixtures use `listTypeId: 999`
  (`notification-service.test.ts:598, 608`), as CLAUDE.md requires.
- The hook point is well chosen. Putting the flags in `buildEmailDataWithFiles` covers every subscription
  send path without changing the `buildTemplateParameters` signatures. Both flags are always sent, so the new
  templates can never fail on a missing flag.
- The default is safe. An unresolved or null list-type name falls back to the existing wording
  (`subscription-template-helper.ts:14`, tested at `subscription-template-helper.test.ts:54-60` and
  `notification-service.test.ts:706-716`).
- The Excel-only branch cannot affect SJP. The SJP branch (`template-config.ts:30-37`) returns or throws
  before line 47 for SJP Excel-only, and SJP PDF+Excel and PDF-only routing is unchanged. There is a
  regression test at `template-config.test.ts:99-110`. The branch also fixes a real pre-existing defect:
  non-SJP Excel-only sends previously went to the PDF template without `pdf_link_*`.
- Functional module with no class, `ReadonlySet`, consts before exported functions, kebab-case file name,
  and the helper is not needlessly exported from the package `index.ts`. This follows CLAUDE.md.
- The tests follow AAA, use `it.each` over all six Mags names and all four SJP names, and cover the enhanced,
  fallback, list-type and location/case paths.
- The rollout is atomic. The code that sends the flags and the helm IDs ship together, the old templates
  ignore the extra keys, and rollback is a values revert.
- No security concerns. The flags carry no personal data, nothing new is logged, and template IDs are
  non-secret, consistent with the existing values.

## Test Coverage Assessment

- **Unit tests**: Good. The helper has 18 tests covering all names, SJP exclusion, the null, undefined and
  empty cases, and the constant values. `template-config` covers the new route, the missing-env throw and the
  SJP regression. The service tests cover both flag states on four paths. Gaps: attachment routes at service
  level (suggestion 3) and a drift guard (suggestion 1).
- **E2E tests**: None, which is appropriate. There is no web UI change, and Playwright cannot see Notify
  content. Verification has to be a manual AAT test send (`tasks.md:21-23`, still outstanding).
- **Accessibility tests**: Not applicable in code. Email accessibility (heading markup, mailto link,
  readable phone number) depends on the template and needs manual checking (CRITICAL 3).
- **Statement coverage per changed workspace**:

| Workspace | Statements | Branches | Notes |
|---|---|---|---|
| `@hmcts/notifications` | **90.94%** | 86.5% | `subscription-template-helper.ts` 100%, `template-config.ts` 97.87%, `notification-service.ts` 86.89% |
| `apps/web`, `apps/api` | n/a | n/a | Only helm values and `.env.example` changed. The helm values test passes. |

No workspace is below 80%.

## Acceptance Criteria Verification

Ticket body criteria:

- [~] **"The subscription emails for all Mags lists need to be updated with the new media protocol. This is to replace the existing wording."**
  Done: the Mags flag is set for all six Mags names on every send path (`libs/notifications/src/govnotify/subscription-template-helper.ts:4-15`, `libs/notifications/src/notification/notification-service.ts:537-541`), and the templates switch at `apps/web/helm/values.yaml:39-42` and `apps/api/helm/values.yaml:10-13`. Missing: evidence that the external templates show only the new wording for Mags (AAT send, `tasks.md:21`).
- [x] **"Logic will be required so that this template is sent for Mags subscriptions only whilst all other lists types use existing wording."**
  The logic is in code at `subscription-template-helper.ts:13-19` and `notification-service.ts:539-540`, and is tested at `subscription-template-helper.test.ts:29-87` and `notification-service.test.ts:666-739`. How the template renders is covered by the next items.
- [ ] **"Opening message for Magistrates court subscription email is updated to read as follows: …"** (the full new text, including the "Contacting magistrates' courts" section, telephone, email and MEDIA ENQUIRY instructions)
  No evidence in the repo. The content lives only in the external Notify templates. This needs a template content check and an AAT send (`tasks.md:18, 21`), and the email spelling needs confirming (`plan.md:248`).

Spec criteria (from the technical specification comment):

- [~] **Scenario: Magistrates subscription email uses the new opening message.** Done: flags for all six names (`subscription-template-helper.ts:4-11`), sent on enhanced, fallback, list-type and location/case paths (`notification-service.ts:503, 537-541, 557`; tests `notification-service.test.ts:666-704, 719-728`). Missing: proof that the external template renders the new block and replaces the old one "in its entirety".
- [~] **Scenario: Non-Magistrates subscription email is unchanged (byte-for-byte).** Done: inverse flags for non-Mags, SJP and unresolved names (`subscription-template-helper.ts:17-19`, `notification-service.ts:539-540`; tests `notification-service.test.ts:679-688, 706-716, 730-739`). Missing: the templates were rebuilt, and the existing text's "(for example on victims and children)" cannot sit inside a Notify conditional unchanged. There is no before/after comparison (HIGH 2).
- [x] **Scenario: Selection is by stable list type name, not numeric ID.** Keyed only on `listTypeName` (`subscription-template-helper.ts:13-15`, `notification-service.ts:539-540`). Fixtures use `listTypeId: 999` (`notification-service.test.ts:598, 608`).
- [ ] **Scenario: New wording available in both languages (Welsh for `cy`).** Not met. Explicitly descoped by the user (`plan.md:43`). This needs the ticket updated or a follow-up issue raised, with product owner sign-off.
- [ ] **Scenario: Contact details render as usable links (mailto link, plain-text phone number).** No evidence in the repo. This depends only on the external template markdown and needs checking in the Notify preview or an AAT email.

Status: 2 fully met, 3 partially met, 3 not met. All three unmet criteria depend on external template content or on descope sign-off, not on code.

## Next Steps

- [ ] For each of the four new templates, list its placeholders and check them against the keys CaTH sends on that route (flags, `TemplateParameters`, and only the file-link keys that route supplies) (`tasks.md:18`)
- [ ] Check there are no round brackets inside either conditional block, including the existing "(for example on victims and children)", and no trailing comma after the email address
- [x] Confirm the email address spelling: the Notify templates now use `mediaandpressenquiries@justice.gov.uk`
- [ ] AAT test sends: one Mags list, one non-Mags list, one non-SJP Excel-only list (`tasks.md:21-23`). Attach the rendered output to the PR, including the mailto link and heading rendering
- [ ] Compare the non-Mags render against the old templates and get sign-off on any wording differences
- [ ] Record the Welsh descope on issue #872 (update the ACs or raise a follow-up)
- [ ] Confirm that no environment overrides the subscription template IDs outside this repo
- [ ] Optional: drift-guard test against `listTypeData`, a service test for attachment routes, and `as never` instead of `as any` in the new tests
- [ ] Keep the old templates until the switch has been proven in production, then delete them

## Overall Assessment

**NEEDS CHANGES**

The code is sound, minimal and well tested. Coverage is 90.94%, and lint and typecheck are clean. I found no
code defects: every send path carries both flags, selection uses the stable name, and the Excel-only fix
cannot affect SJP. The verdict comes from the acceptance criteria. Three criteria depend only on external
Notify template content or on a descope that has not yet been recorded on the ticket, and two are only half
evidenced. The change also moves every list type onto new templates at once. Closing the template checks
and AAT sends in `tasks.md:18-23`, and recording the Welsh descope, should be enough to reach APPROVED
without further code changes. This verdict is advisory.
