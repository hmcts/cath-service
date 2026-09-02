-- 004: sync github 2026-07-04
--
-- Reconciles the requirements baseline with the live state of GitHub Project #43
-- (CaTH Kanban) as of 2026-07-04. Board project GraphQL was inaccessible (token
-- lacks read:project scope); board status was inferred from GitHub issue state
-- labels (for open issues) and merged closing-PR evidence (for closed issues).
--
-- Delta (gate = "Refined Tickets" and beyond):
--   2 NEW requirements (by status label):
--       REQ-0138 (#304 VIBE-322, status:ready-for-test  -> implemented)
--       REQ-0139 (#331 VIBE-317, status:in-test         -> implemented)
--   9 STATUS changes to verified (closed by merged PR):
--       REQ-0105 (#428), REQ-0106 (#429), REQ-0107 (#431), REQ-0108 (#434),
--       REQ-0109 (#436), REQ-0112 (#467), REQ-0124 (#563), REQ-0135 (#569),
--       REQ-0137 (#729)
--   7 IMPL changes (same 9 except #431 and #436 already had no impl and their
--       PRs only confirmed status; actually all 9 gain impl data):
--       impl_commit_sha + impl_paths set from merged closing PR for each.
--
-- ⚠ Human review needed:
--   Issue #331 (REQ-0139) shares JIRA key VIBE-317 with issue #303 (REQ-0080,
--   already verified). Confirm whether #331 is a duplicate or distinct scope.
--
-- Board access note: GitHub Project #43 node query returned FORBIDDEN for this
-- token (App installation token missing read:project scope). Status inferred from:
--   (a) status:* labels on open issues (REQ-0138 via status:ready-for-test,
--       REQ-0139 via status:in-test).
--   (b) GitHub issues closed by a merged PR → treated as Done = verified.

BEGIN TRANSACTION;

-- ============================================================================
-- NEW requirements (REQ-0138..REQ-0139), ordered by issue number.
-- ============================================================================

INSERT INTO requirement
  (id, ref, title, statement, kind, status, priority, granularity,
   issue_number, issue_url, impl_commit_sha, impl_paths,
   created_at, updated_at, created_by, updated_by)
VALUES
  (138, 'REQ-0138', '[VIBE-322] Optimise Tests for non-strategic-upload Functionality by Removing Redundancies and Merging Related Scenarios', '> **Migrated from [VIBE-322](https://tools.hmcts.net/jira/browse/VIBE-322)**

The current test file for non~~strategic~~upload contains several redundant or fragmented test cases that validate similar flows using separate tests. This increases test execution time and maintenance overhead.

We should review and optimise these tests by:
 * Removing unnecessary or duplicate test cases.

 * Combining smaller tests that validate separate but related behaviours into longer end~~to~~end paths.

 * Ensuring the merged tests maintain full coverage of critical validations and edge cases.

**Goals:**
 * Reduce total number of test cases.

 * Increase test efficiency and functional coverage.

 * Maintain or improve overall quality of validation.

**Acceptance Criteria:**
 * Redundant tests are identified and removed.

 * Tests validating related flows are merged into longer, end~~to~~end paths.

 * Final set of optimised tests is documented and reviewed.

 * No loss in functional coverage.

---

## Original JIRA Metadata

- **Status**: Ready for Test
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Makanakatte Venkatesha, Ashwini | She/Hers
- **Created**: 12/16/2025
- **Updated**: 1/8/2026
- **Original Labels**: cath


',
   'functional', 'implemented', 'medium', 'story',
   304, 'https://github.com/hmcts/cath-service/issues/304',
   NULL, NULL,
   '2026-01-20T17:22:14Z', '2026-01-20T17:22:14Z', 'github-actions[bot]', 'github-actions[bot]'),
  (139, 'REQ-0139', '[VIBE-317] The RCJ Hearing Lists', '> **Migrated from [VIBE-317](https://tools.hmcts.net/jira/browse/VIBE-317)**

**PROBLEM STATEMENT**

Hearing lists are published in CaTH through various routes. This ticket covers the non-strategic publishing of hearing lists from The Royal Court of Justice (through the upload of excel files in CaTH) which would require the creation of validation schema and style guides.

 
|**Type of court**|**Jurisdiction**|**Venue name**|**Region**|**List type (in the excel upload drop down options)**|
|High court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|London Administrative Court Daily Cause List|
|Civil|Civil|Royal Courts of Justice|Royal Courts of Justice Group|County Court at Central London Civil Daily Cause List |
|Civil|Civil |Royal Courts of Justice|Royal Courts of Justice Group|Civil Courts at the RCJ Daily Cause List |
|Court of Appeal (Criminal Division)|Criminal|Royal Courts of Justice|Royal Courts of Justice Group|Court of Appeal (Criminal Division) Daily Cause List |
|High Court of the Family Division|Family|Royal Courts of Justice|Royal Courts of Justice Group|Family Division of the High Court Daily Cause List |
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|King’s Bench Division Daily Cause List |
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|King’s Bench Masters Daily Cause List|
|High Court|Civil|Royal Courts of Justice|Royal Courts of Justice Group|Senior Courts Costs Office Daily Cause List |
|Civil|Civil|Royal Courts of Justice|Royal Courts of Justice Group|Mayor & City Civil Daily Cause List|
|High court|Civil|Birmingham Administrative Court|Midlands|Birmingham Administrative Court Daily Cause List|
|High court|Civil|Leeds Administrative Court |Yorkshire|Leeds Administrative Court Daily Cause List|
|High court|Civil|Bristol and Cardiff Administrative Court|Wales and South West|Bristol and Cardiff Administrative Court Daily Cause List|
|High court|Civil|Manchester Administrative Court|North West|Manchester Administrative Court Daily Cause List|

 

 

**AS A** Service

**I WANT** to create the validation schema and style guides for hearing lists published in The Royal Court of Justice

**SO THAT** these hearing lists can be published in CaTH

 

 

**ACCEPTANCE CRITERIA**
 * The venue **“Royal Courts of Justice”** is created and available in CaTH and linked to the **“Royal Courts of Justice Group”** region.

 * All hearing lists defined in this ticket are linked to the ''Royal Courts of Justice'' venue, ''Royal Courts of Justice Group'' region and to the jurisdiction specified in the source configuration table (see attached).

 * In the front end, the following text is displayed as a page header; 

**What do you want to view from Royal Courts of Justice?**
 * The link to FaCT is displayed after the text above in the following text and masked in the highlighted part of the text; 

<Find contact details and other information about courts and tribunals>(https://www.find~~court~~tribunal.service.gov.uk/) in England and Wales, and some non-devolved tribunals in Scotland.
 * The following caution message is displayed under the FaCT link;

''These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives. 
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.''
 * The Royal Courts of Justice hearing lists are arranged in an alphabetical order under the caution message
 * The Validation schema for each list provided below is created with the following data fields which are to be displayed in order of appearance are; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. 

 

County Court at Central London Civil Daily Cause List

Court of Appeal (Civil Division) Daily Cause List

Court of Appeal (Criminal Division) Daily Cause List

Civil Courts at the RCJ Daily Cause List 

Family Division of the High Court Daily Cause List

King’s Bench Division Daily Cause List

King’s Bench Masters Daily Cause List

London Administrative Court Daily Cause List

Mayor & City Civil Daily Cause List

Senior Courts Costs Office Daily Cause List

 
 * The Validation schema and excel template for the ''Court of Appeal (Civil Division) Daily Cause List'' also has a different format/layout as defined in the mock~~up and must not reuse the layout defined above. The excel template is created with 2 tabs. The First tab is created with the following data fields; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. The Second tab is created with a header (Notice for future judgements) and the following data fields; Date, Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. This supports the creation of a sub~~section where notices for future judgements are published in the style guide.
 * The Validation schema and excel template for the ''London Administrative Court daily cause list'' also has a different format/layout as defined in the mock~~up and must not reuse the layouts defined above. The excel template is created with 2 tabs with the same data fields which are as follows; Venue, Judge, Time, Case Number, Case Details, Hearing Type and Additional Information. The Second tab is created with a header (Planning Court) and this supports the creation of a sub~~section within the London Administrative Court daily cause list where the Planning Court hearing cases are published
 * In the Court of Appeal (Criminal Division) Daily Cause List, a link is to to be masked in the text ''this quick guide'' in the following sentence ''For further information about our hearings, please see <this quick guide>(https://www.judiciary.uk/wp~~content/uploads/2025/07/A~~QUICK~~GUIDE~~TO~~HEARINGS~~IN~~THE~~CACD.docx)
 * The Style guide for all the lists are created using the attached mock ups.
 * A confluence page containing all the data fields is created for each hearing list.
 * A PDF downloadable version of each hearing list is created.
 * The email summary is created

 

 

**User Story**
 * As a Service
I WANT to create the validation schema and style guides for hearing lists published from the Royal Courts of Justice using the non-strategic Excel upload route
SO THAT these hearing lists can be published consistently and correctly in CaTH

~~--~~
## Page 1 — Royal Courts of Justice landing page

**Form fields**
 * Search cases

 ** Input type: text

 ** Required: No

 ** Validation rules:

 *** Maximum length: 200 characters

 *** Format: free text

 *** Filters visible hearing lists and case content on the page

**Content**
 * EN: Title/H1 “What do you want to view from Royal Courts of Justice?”

 * CY: Title/H1 “Beth hoffech chi ei weld o Lys Barn Brenhinol?”

 * EN: Link text “Find contact details and other information about courts and tribunals in England and Wales, and some non-devolved tribunals in Scotland.”

 * CY: Link text “Dewch o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban.”

 * EN: Caution message
“These lists are subject to change until 4:30pm. Any alterations after this time will be telephoned or emailed direct to the parties or their legal representatives.
If you do not see a list published for the court you are looking for, it means there are no hearings scheduled.”

 * CY: Caution message
“Mae''r rhestrau hyn yn destun newid tan 4:30pm. Os bydd unrhyw newidiadau ar ôl yr amser hwn, byddwn yn ffonio neu’n anfon e-bost yn uniongyrchol at y partïon neu eu cynrychiolwyr cyfreithiol.
Os nad ydych yn gweld rhestr wedi’i chyhoeddi ar gyfer y llys rydych yn chwilio amdano, mae’n golygu nad oes gwrandawiadau wedi’u trefnu.”

 * EN: Hearing lists (displayed in alphabetical order)

 * CY: Hearing lists (wedi’u trefnu yn nhrefn yr wyddor)

**Errors**
 * EN: “There are no hearing lists available.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Not applicable (top-level landing page)

~~--~~
## Page 2 — Standard Daily Cause List (Royal Courts of Justice)

Applies to:
 * County Court at Central London Civil Daily Cause List

 * Civil Courts at the RCJ Daily Cause List

 * Court of Appeal (Criminal Division) Daily Cause List

 * Family Division of the High Court Daily Cause List

 * King’s Bench Division Daily Cause List

 * King’s Bench Masters Daily Cause List

 * Mayor & City Civil Daily Cause List

 * Senior Courts Costs Office Daily Cause List

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “\{Daily Cause List name}”

 * CY: Title/H1 “\{Welsh Daily Cause List name}”

 * EN: Column headers (displayed in this order):
“Venue”, “Judge”, “Time”, “Case Number”, “Case Details”, “Hearing Type”, “Additional Information”

 * CY: Column headers (displayed in this order):
“Lleoliad”, “Barnwr”, “Amser”, “Rhif yr Achos”, “Manylion yr achos”, “Math o Wrandawiad”, “Gwybodaeth ychwanegol”

 * EN: Button “Download PDF”

 * CY: Button “Welsh placeholder”

**Errors**
 * EN: “There are no hearings scheduled.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 3 — Court of Appeal (Civil Division) Daily Cause List (special layout)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “Court of Appeal (Civil Division) Daily Cause List”

 * CY: Title/H1 “Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)”

 * EN: Section heading “Daily hearings”

 * CY: Section heading “Gwrandawiadau dyddiol”

 * EN: Section heading “Notice for future judgements”

 * CY: Section heading “Hysbysiad ar gyfer dyfarniadau’r dyfodol”

 * EN: Daily hearings table fields (tab 1):
Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY: Daily hearings table fields:
Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

 * EN: Notice for future judgements table fields (tab 2):
Date, Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY: Notice for future judgements table fields:
Dyddiad, Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

**Errors**
 * EN: “No future judgments have been published.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 4 — London Administrative Court Daily Cause List (special layout)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

 ** Validation rules: None

**Content**
 * EN: Title/H1 “London Administrative Court Daily Cause List”

 * CY: Title/H1 “Rhestr Achosion Dyddiol Llys Gweinyddol Llundain”

 * EN: Section heading “Administrative Court”

 * CY: Section heading “Welsh placeholder”

 * EN: Section heading “Planning Court”

 * CY: Section heading “Welsh placeholder”

 * EN: Both sections use the same data fields:
Venue, Judge, Time, Case Number, Case Details, Hearing Type, Additional Information

 * CY:
Lleoliad, Barnwr, Amser, Rhif yr Achos, Manylion yr achos, Math o Wrandawiad, Gwybodaeth ychwanegol

**Errors**
 * EN: “There are no hearings scheduled.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Page 5 — Court of Appeal (Criminal Division) Daily Cause List (link masking)

**Form fields**
 * Download PDF

 ** Input type: button/link

 ** Required: No

**Content**
 * EN: Informational text
“For further information about our hearings, please see this quick guide”

 * CY: Informational text
“Am ragor o wybodaeth am ein gwrandawiadau gweler y canllaw cyflym hwn”

 * EN: Masked link text “this quick guide”

 * CY: Masked link text “y canllaw cyflym hwn”

**Errors**
 * EN: “Unable to display additional guidance.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the Royal Courts of Justice landing page.

~~--~~
## Admin — Non-strategic publishing (Excel upload)

**Form fields**
 * List type

 ** Input type: select

 ** Required: Yes

 ** Validation rules:

 *** Must match configured list types for RCJ and Administrative Courts

 * Upload file

 ** Input type: file upload

 ** Required: Yes

 ** Validation rules:

 *** File type: .xlsx only

 *** Must match validation schema for selected list type

 *** Schema validation failure blocks publishing

**Content**
 * EN: Button “Publish”

 * CY: Button “Welsh placeholder”

**Errors**
 * EN: “The file does not match the required format for this hearing list.”

 * CY: “Welsh placeholder”

 * EN: “Upload an Excel (.xlsx) file.”

 * CY: “Welsh placeholder”

**Back navigation**
 * Back returns to the previous admin screen without publishing.

~~--~~
## Accessibility
 * All pages meet WCAG 2.2 AA.

 * Tables use semantic table markup with correctly associated headers.

 * Masked links are accessible to screen readers with meaningful link text.

 * PDF download links are keyboard accessible and announced correctly.

 * Error messages are programmatically associated with the relevant controls.

~~--~~
## Test Scenarios
 * Venue configuration:

 ** “Royal Courts of Justice” exists and is linked to “Royal Courts of Justice Group”.

 * Landing page:

 ** Header, FaCT link, caution message, and alphabetical ordering display correctly.

 * Standard lists:

 ** Columns render in the correct order and match the validation schema.

 * Court of Appeal (Civil Division):

 ** Two Excel tabs render correctly as separate on-screen sections.

 * London Administrative Court:

 ** Administrative Court and Planning Court sections render correctly from separate tabs.

 * Court of Appeal (Criminal Division):

 ** “This quick guide” link is correctly masked.

 * Admin upload:

 ** Invalid files are rejected with validation errors.

 ** Valid files publish successfully.

 * Outputs:

 ** PDF downloads are available for each list.

 ** Email summaries are generated on publication.

---

## Original JIRA Metadata

- **Status**: In Test
- **Priority**: 3-Medium
- **Issue Type**: Story
- **Assignee**: Chance, Melanie
- **Created**: 12/15/2025
- **Updated**: 1/28/2026
- **Original Labels**: CaTH


_Attachments will be added in a comment below._
',
   'functional', 'implemented', 'medium', 'story',
   331, 'https://github.com/hmcts/cath-service/issues/331',
   NULL, NULL,
   '2026-01-30T14:04:09Z', '2026-01-30T14:04:09Z', 'github-actions[bot]', 'github-actions[bot]');

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (138, 1, NULL, NULL, NULL, 'created', 'imported from GitHub issue', 'github-actions[bot]', '2026-01-20T17:22:14Z'),
  (139, 1, NULL, NULL, NULL, 'created', 'imported from GitHub issue', 'github-actions[bot]', '2026-01-30T14:04:09Z');

-- ============================================================================
-- STATUS + IMPL changes: issues closed by merged PRs → verified.
-- Each row: UPDATE requirement then INSERT requirement_change rows.
-- Single version bump per requirement even when both status and impl change.
-- ============================================================================

-- REQ-0105 (#428) — in_progress → verified, impl from PR #749
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '3b7d84bcf664b86a949951131f69dbaafe9f530e',
    impl_paths = '["apps/web/src/app.ts", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/ftt-lands-registration-tribunal-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/ftt-tax-chamber-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts", "biome.json", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-utilities.test.ts", "libs/list-types/common/src/pdf/pdf-utilities.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/package.json", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/conversion/ftt-lrt-config.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/schemas/ftt-lands-registration-tribunal-weekly-hearing-list.json", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/tsconfig.json", "libs/list-types/ftt-rpt-weekly-hearing-list/package.json", "libs/list-types/ftt-rpt-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/schemas/ftt-rpt-weekly-hearing-list.json", "libs/list-types/ftt-rpt-weekly-hearing-list/src/views/ftt-rpt-weekly-hearing-list.njk", "libs/list-types/ftt-rpt-weekly-hearing-list/tsconfig.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/package.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/conversion/ftt-tax-config.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/schemas/ftt-tax-chamber-weekly-hearing-list.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/tsconfig.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/package.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/conversion/siac-poac-paac-config.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/index.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/en.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/models/types.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/schemas/siac-poac-paac-weekly-hearing-list.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/views/siac-poac-paac-weekly-hearing-list.njk", "libs/list-types/siac-poac-paac-weekly-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.ts", "libs/publication/src/repository/model.ts", "libs/publication/src/repository/queries.test.ts", "libs/publication/src/repository/queries.ts", "templates/tech-spec-references/welsh-translations-catalogue.json", "tsconfig.json"]',
    version = 3,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 105;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (105, 3, 'status', 'in_progress', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (105, 3, 'impl_commit_sha', NULL, '3b7d84bcf664b86a949951131f69dbaafe9f530e',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (105, 3, 'impl_paths', NULL, '["apps/web/src/app.ts", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/ftt-lands-registration-tribunal-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-lands-registration-tribunal-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/ftt-rpt-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-rpt-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/ftt-tax-chamber-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ftt-tax-chamber-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/siac-poac-paac-weekly-hearing-list/index.ts", "biome.json", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-utilities.test.ts", "libs/list-types/common/src/pdf/pdf-utilities.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/package.json", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/conversion/ftt-lrt-config.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/src/schemas/ftt-lands-registration-tribunal-weekly-hearing-list.json", "libs/list-types/ftt-lands-registration-tribunal-weekly-hearing-list/tsconfig.json", "libs/list-types/ftt-rpt-weekly-hearing-list/package.json", "libs/list-types/ftt-rpt-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/conversion/ftt-rpt-config.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-rpt-weekly-hearing-list/src/schemas/ftt-rpt-weekly-hearing-list.json", "libs/list-types/ftt-rpt-weekly-hearing-list/src/views/ftt-rpt-weekly-hearing-list.njk", "libs/list-types/ftt-rpt-weekly-hearing-list/tsconfig.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/package.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/config.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/conversion/ftt-tax-config.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/index.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/locales/en.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/models/types.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/src/schemas/ftt-tax-chamber-weekly-hearing-list.json", "libs/list-types/ftt-tax-chamber-weekly-hearing-list/tsconfig.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/package.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/config.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/conversion/siac-poac-paac-config.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/index.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/en.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/locales/locales.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/models/types.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/schemas/siac-poac-paac-weekly-hearing-list.json", "libs/list-types/siac-poac-paac-weekly-hearing-list/src/views/siac-poac-paac-weekly-hearing-list.njk", "libs/list-types/siac-poac-paac-weekly-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.ts", "libs/publication/src/repository/model.ts", "libs/publication/src/repository/queries.test.ts", "libs/publication/src/repository/queries.ts", "templates/tech-spec-references/welsh-translations-catalogue.json", "tsconfig.json"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0106 (#429) — approved → verified, impl from PR #761
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = 'dace5aad04ef9f9d3441a6296f80a494d3b059bd',
    impl_paths = '["apps/web/src/app.ts", "apps/web/src/assets/css/back-to-top.scss", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/grc-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/list-type-handler.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/utiac-jr-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/utiac-jr-london-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/utiac-statutory-appeal-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/wpafcc-weekly-hearing-list.njk", "apps/web/src/pages/(public)/summary-of-publications/index.test.ts", "libs/list-types/common/src/rendering/date-formatting.test.ts", "libs/list-types/common/src/validation/list-type-validator.ts", "libs/list-types/grc-weekly-hearing-list/package.json", "libs/list-types/grc-weekly-hearing-list/src/config.ts", "libs/list-types/grc-weekly-hearing-list/src/conversion/grc-config.ts", "libs/list-types/grc-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/grc-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/grc-weekly-hearing-list/src/index.ts", "libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/grc-weekly-hearing-list/src/locales/en.ts", "libs/list-types/grc-weekly-hearing-list/src/models/types.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/grc-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/grc-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/grc-weekly-hearing-list/src/schemas/grc-weekly-hearing-list.json", "libs/list-types/grc-weekly-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/grc-weekly-hearing-list/src/validation/json-validator.ts", "libs/list-types/grc-weekly-hearing-list/tsconfig.json", "libs/list-types/utiac-jr-daily-hearing-list/package.json", "libs/list-types/utiac-jr-daily-hearing-list/src/config.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/conversion/utiac-jr-config.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/conversion/utiac-jr-config.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/index.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/locales/cy.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/locales/en.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/models/types.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-template-london.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/schemas/utiac-jr-daily-hearing-list.json", "libs/list-types/utiac-jr-daily-hearing-list/src/schemas/utiac-jr-london-daily-hearing-list.json", "libs/list-types/utiac-jr-daily-hearing-list/src/utiac-jr-daily-hearing-list.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator.ts", "libs/list-types/utiac-jr-daily-hearing-list/tsconfig.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/package.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/config.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/conversion/utiac-sa-config.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/index.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/locales/cy.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/locales/en.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/models/types.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/schemas/utiac-statutory-appeal-daily-hearing-list.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/validation/json-validator.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/tsconfig.json", "libs/list-types/wpafcc-weekly-hearing-list/package.json", "libs/list-types/wpafcc-weekly-hearing-list/src/config.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/index.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/locales/en.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/models/types.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/wpafcc-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/schemas/wpafcc-weekly-hearing-list.json", "libs/list-types/wpafcc-weekly-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/validation/json-validator.ts", "libs/list-types/wpafcc-weekly-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "libs/publication/src/repository/queries.test.ts", "libs/publication/src/repository/queries.ts", "tsconfig.json"]',
    version = 2,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 106;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (106, 2, 'status', 'approved', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (106, 2, 'impl_commit_sha', NULL, 'dace5aad04ef9f9d3441a6296f80a494d3b059bd',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (106, 2, 'impl_paths', NULL, '["apps/web/src/app.ts", "apps/web/src/assets/css/back-to-top.scss", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/grc-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/grc-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/list-type-handler.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/utiac-jr-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/utiac-jr-daily-hearing-list/utiac-jr-london-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/utiac-statutory-appeal-daily-hearing-list/utiac-statutory-appeal-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/wpafcc-weekly-hearing-list/wpafcc-weekly-hearing-list.njk", "apps/web/src/pages/(public)/summary-of-publications/index.test.ts", "libs/list-types/common/src/rendering/date-formatting.test.ts", "libs/list-types/common/src/validation/list-type-validator.ts", "libs/list-types/grc-weekly-hearing-list/package.json", "libs/list-types/grc-weekly-hearing-list/src/config.ts", "libs/list-types/grc-weekly-hearing-list/src/conversion/grc-config.ts", "libs/list-types/grc-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/grc-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/grc-weekly-hearing-list/src/index.ts", "libs/list-types/grc-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/grc-weekly-hearing-list/src/locales/en.ts", "libs/list-types/grc-weekly-hearing-list/src/models/types.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/grc-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/grc-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/grc-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/grc-weekly-hearing-list/src/schemas/grc-weekly-hearing-list.json", "libs/list-types/grc-weekly-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/grc-weekly-hearing-list/src/validation/json-validator.ts", "libs/list-types/grc-weekly-hearing-list/tsconfig.json", "libs/list-types/utiac-jr-daily-hearing-list/package.json", "libs/list-types/utiac-jr-daily-hearing-list/src/config.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/conversion/utiac-jr-config.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/conversion/utiac-jr-config.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/index.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/locales/cy.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/locales/en.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/models/types.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-template-london.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/schemas/utiac-jr-daily-hearing-list.json", "libs/list-types/utiac-jr-daily-hearing-list/src/schemas/utiac-jr-london-daily-hearing-list.json", "libs/list-types/utiac-jr-daily-hearing-list/src/utiac-jr-daily-hearing-list.njk", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator-london.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator-london.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/utiac-jr-daily-hearing-list/src/validation/json-validator.ts", "libs/list-types/utiac-jr-daily-hearing-list/tsconfig.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/package.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/config.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/conversion/utiac-sa-config.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/index.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/locales/cy.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/locales/en.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/models/types.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/schemas/utiac-statutory-appeal-daily-hearing-list.json", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/src/validation/json-validator.ts", "libs/list-types/utiac-statutory-appeal-daily-hearing-list/tsconfig.json", "libs/list-types/wpafcc-weekly-hearing-list/package.json", "libs/list-types/wpafcc-weekly-hearing-list/src/config.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/conversion/wpafcc-config.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/index.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/locales/en.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/models/types.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/wpafcc-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/schemas/wpafcc-weekly-hearing-list.json", "libs/list-types/wpafcc-weekly-hearing-list/src/validation/json-validator.test.ts", "libs/list-types/wpafcc-weekly-hearing-list/src/validation/json-validator.ts", "libs/list-types/wpafcc-weekly-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "libs/publication/src/repository/queries.test.ts", "libs/publication/src/repository/queries.ts", "tsconfig.json"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0107 (#431) — implemented → verified, impl from PR #701
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '8698affaaecca24c7732644405dc2f0ce14d8e37',
    impl_paths = '["apps/web/src/app.test.ts", "apps/web/src/app.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/sscs-daily-hearing-list.njk", "e2e-tests/tests/admin/non-strategic-upload.spec.ts", "libs/admin-pages/package.json", "libs/list-types/common/src/validation/list-type-validator.test.ts", "libs/list-types/sscs-daily-hearing-list/package.json", "libs/list-types/sscs-daily-hearing-list/src/config.test.ts", "libs/list-types/sscs-daily-hearing-list/src/config.ts", "libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.test.ts", "libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts", "libs/list-types/sscs-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/sscs-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/sscs-daily-hearing-list/src/index.ts", "libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts", "libs/list-types/sscs-daily-hearing-list/src/locales/en.ts", "libs/list-types/sscs-daily-hearing-list/src/models/types.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/sscs-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/sscs-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/sscs-daily-hearing-list/src/schemas/sscs-daily-hearing-list.json", "libs/list-types/sscs-daily-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "libs/test-support/src/routes/test-support/regions.test.ts", "libs/test-support/src/routes/test-support/regions.ts", "tsconfig.json"]',
    version = 3,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 107;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (107, 3, 'status', 'implemented', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (107, 3, 'impl_commit_sha', NULL, '8698affaaecca24c7732644405dc2f0ce14d8e37',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (107, 3, 'impl_paths', NULL, '["apps/web/src/app.test.ts", "apps/web/src/app.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/sscs-daily-hearing-list/sscs-daily-hearing-list.njk", "e2e-tests/tests/admin/non-strategic-upload.spec.ts", "libs/admin-pages/package.json", "libs/list-types/common/src/validation/list-type-validator.test.ts", "libs/list-types/sscs-daily-hearing-list/package.json", "libs/list-types/sscs-daily-hearing-list/src/config.test.ts", "libs/list-types/sscs-daily-hearing-list/src/config.ts", "libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.test.ts", "libs/list-types/sscs-daily-hearing-list/src/conversion/sscs-config.ts", "libs/list-types/sscs-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/sscs-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/sscs-daily-hearing-list/src/index.ts", "libs/list-types/sscs-daily-hearing-list/src/locales/cy.ts", "libs/list-types/sscs-daily-hearing-list/src/locales/en.ts", "libs/list-types/sscs-daily-hearing-list/src/models/types.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/sscs-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/sscs-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/sscs-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/sscs-daily-hearing-list/src/schemas/sscs-daily-hearing-list.json", "libs/list-types/sscs-daily-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "libs/test-support/src/routes/test-support/regions.test.ts", "libs/test-support/src/routes/test-support/regions.ts", "tsconfig.json"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0108 (#434) — approved → verified, impl from PR #772
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '78ce5927ea1b56329282decffc523744b2be51ef',
    impl_paths = '["apps/web/package.json", "apps/web/src/pages/(admin)/manual-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/manual-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.ts", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/ast-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/cic-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/send-daily-hearing-list.njk", "apps/web/src/pages/(public)/summary-of-publications/index.test.ts", "apps/web/src/pages/(public)/summary-of-publications/index.ts", "libs/list-types/ast-daily-hearing-list/package.json", "libs/list-types/ast-daily-hearing-list/src/config.test.ts", "libs/list-types/ast-daily-hearing-list/src/config.ts", "libs/list-types/ast-daily-hearing-list/src/conversion/ast-config.ts", "libs/list-types/ast-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ast-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ast-daily-hearing-list/src/index.ts", "libs/list-types/ast-daily-hearing-list/src/locales/cy.ts", "libs/list-types/ast-daily-hearing-list/src/locales/en.ts", "libs/list-types/ast-daily-hearing-list/src/models/types.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ast-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ast-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/ast-daily-hearing-list/src/schemas/ast-daily-hearing-list.json", "libs/list-types/ast-daily-hearing-list/tsconfig.json", "libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/cic-weekly-hearing-list/package.json", "libs/list-types/cic-weekly-hearing-list/src/config.test.ts", "libs/list-types/cic-weekly-hearing-list/src/config.ts", "libs/list-types/cic-weekly-hearing-list/src/conversion/cic-config.ts", "libs/list-types/cic-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/cic-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/cic-weekly-hearing-list/src/index.ts", "libs/list-types/cic-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/cic-weekly-hearing-list/src/locales/en.ts", "libs/list-types/cic-weekly-hearing-list/src/models/types.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/cic-weekly-hearing-list/src/schemas/cic-weekly-hearing-list.json", "libs/list-types/cic-weekly-hearing-list/tsconfig.json", "libs/list-types/common/package.json", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-utilities.test.ts", "libs/list-types/common/src/pdf/pdf-utilities.ts", "libs/list-types/common/src/rendering/date-formatting.test.ts", "libs/list-types/common/src/rendering/date-formatting.ts", "libs/list-types/send-daily-hearing-list/package.json", "libs/list-types/send-daily-hearing-list/src/config.test.ts", "libs/list-types/send-daily-hearing-list/src/config.ts", "libs/list-types/send-daily-hearing-list/src/conversion/send-config.ts", "libs/list-types/send-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/send-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/send-daily-hearing-list/src/index.ts", "libs/list-types/send-daily-hearing-list/src/locales/cy.ts", "libs/list-types/send-daily-hearing-list/src/locales/en.ts", "libs/list-types/send-daily-hearing-list/src/models/types.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/send-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/send-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/send-daily-hearing-list/src/schemas/send-daily-hearing-list.json", "libs/list-types/send-daily-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/location/src/repository/model.ts", "libs/location/src/seed-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "tsconfig.json"]',
    version = 2,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 108;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (108, 2, 'status', 'approved', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (108, 2, 'impl_commit_sha', NULL, '78ce5927ea1b56329282decffc523744b2be51ef',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (108, 2, 'impl_paths', NULL, '["apps/web/package.json", "apps/web/src/pages/(admin)/manual-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/manual-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.test.ts", "apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts", "apps/web/src/pages/(admin)/non-strategic-upload/index.ts", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/ast-daily-hearing-list.njk", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/ast-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/cic-weekly-hearing-list.njk", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/cic-weekly-hearing-list/index.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/index.test.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/index.ts", "apps/web/src/pages/(list-types)/send-daily-hearing-list/send-daily-hearing-list.njk", "apps/web/src/pages/(public)/summary-of-publications/index.test.ts", "apps/web/src/pages/(public)/summary-of-publications/index.ts", "libs/list-types/ast-daily-hearing-list/package.json", "libs/list-types/ast-daily-hearing-list/src/config.test.ts", "libs/list-types/ast-daily-hearing-list/src/config.ts", "libs/list-types/ast-daily-hearing-list/src/conversion/ast-config.ts", "libs/list-types/ast-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/ast-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/ast-daily-hearing-list/src/index.ts", "libs/list-types/ast-daily-hearing-list/src/locales/cy.ts", "libs/list-types/ast-daily-hearing-list/src/locales/en.ts", "libs/list-types/ast-daily-hearing-list/src/models/types.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/ast-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/ast-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/ast-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/ast-daily-hearing-list/src/schemas/ast-daily-hearing-list.json", "libs/list-types/ast-daily-hearing-list/tsconfig.json", "libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/cic-weekly-hearing-list/package.json", "libs/list-types/cic-weekly-hearing-list/src/config.test.ts", "libs/list-types/cic-weekly-hearing-list/src/config.ts", "libs/list-types/cic-weekly-hearing-list/src/conversion/cic-config.ts", "libs/list-types/cic-weekly-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/cic-weekly-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/cic-weekly-hearing-list/src/index.ts", "libs/list-types/cic-weekly-hearing-list/src/locales/cy.ts", "libs/list-types/cic-weekly-hearing-list/src/locales/en.ts", "libs/list-types/cic-weekly-hearing-list/src/models/types.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/cic-weekly-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/cic-weekly-hearing-list/src/rendering/renderer.ts", "libs/list-types/cic-weekly-hearing-list/src/schemas/cic-weekly-hearing-list.json", "libs/list-types/cic-weekly-hearing-list/tsconfig.json", "libs/list-types/common/package.json", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-utilities.test.ts", "libs/list-types/common/src/pdf/pdf-utilities.ts", "libs/list-types/common/src/rendering/date-formatting.test.ts", "libs/list-types/common/src/rendering/date-formatting.ts", "libs/list-types/send-daily-hearing-list/package.json", "libs/list-types/send-daily-hearing-list/src/config.test.ts", "libs/list-types/send-daily-hearing-list/src/config.ts", "libs/list-types/send-daily-hearing-list/src/conversion/send-config.ts", "libs/list-types/send-daily-hearing-list/src/email-summary/summary-builder.test.ts", "libs/list-types/send-daily-hearing-list/src/email-summary/summary-builder.ts", "libs/list-types/send-daily-hearing-list/src/index.ts", "libs/list-types/send-daily-hearing-list/src/locales/cy.ts", "libs/list-types/send-daily-hearing-list/src/locales/en.ts", "libs/list-types/send-daily-hearing-list/src/models/types.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-generator.test.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-generator.ts", "libs/list-types/send-daily-hearing-list/src/pdf/pdf-template.njk", "libs/list-types/send-daily-hearing-list/src/rendering/renderer.test.ts", "libs/list-types/send-daily-hearing-list/src/rendering/renderer.ts", "libs/list-types/send-daily-hearing-list/src/schemas/send-daily-hearing-list.json", "libs/list-types/send-daily-hearing-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/location/src/location-data.ts", "libs/location/src/repository/model.ts", "libs/location/src/seed-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "tsconfig.json"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0109 (#436) — implemented → verified, impl from PR #727
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = 'a0904b11bcad0b7b174afc8ecb105bdef57c26e6',
    impl_paths = '["apps/web/src/app.ts", "apps/web/src/assets/css/web.scss", "apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk", "apps/web/src/pages/(list-types)/crown-daily-cause-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-daily-cause-list/index.ts", "apps/web/src/pages/(list-types)/crown-firm-list/crown-firm-list.njk", "apps/web/src/pages/(list-types)/crown-firm-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-firm-list/index.ts", "apps/web/src/pages/(list-types)/crown-warned-list/crown-warned-list.njk", "apps/web/src/pages/(list-types)/crown-warned-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-warned-list/index.ts", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-styles.ts", "libs/list-types/common/src/rendering/crown-utilities.test.ts", "libs/list-types/common/src/rendering/crown-utilities.ts", "libs/list-types/common/src/rendering/pdda-name-formatting.test.ts", "libs/list-types/common/src/validation/list-type-validator.test.ts", "libs/list-types/crown-daily-list/package.json", "libs/list-types/crown-daily-list/src/config.ts", "libs/list-types/crown-daily-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-daily-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-daily-list/src/index.ts", "libs/list-types/crown-daily-list/src/locales/cy.ts", "libs/list-types/crown-daily-list/src/locales/en.ts", "libs/list-types/crown-daily-list/src/models/types.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-template.njk", "libs/list-types/crown-daily-list/src/rendering/renderer.test.ts", "libs/list-types/crown-daily-list/src/rendering/renderer.ts", "libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json", "libs/list-types/crown-daily-list/src/validation/json-validator.test.ts", "libs/list-types/crown-daily-list/src/validation/json-validator.ts", "libs/list-types/crown-daily-list/tsconfig.json", "libs/list-types/crown-firm-list/package.json", "libs/list-types/crown-firm-list/src/config.ts", "libs/list-types/crown-firm-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-firm-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-firm-list/src/index.ts", "libs/list-types/crown-firm-list/src/locales/cy.ts", "libs/list-types/crown-firm-list/src/locales/en.ts", "libs/list-types/crown-firm-list/src/models/types.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-template.njk", "libs/list-types/crown-firm-list/src/rendering/renderer.test.ts", "libs/list-types/crown-firm-list/src/rendering/renderer.ts", "libs/list-types/crown-firm-list/src/schemas/crown-firm-list.json", "libs/list-types/crown-firm-list/src/validation/json-validator.test.ts", "libs/list-types/crown-firm-list/src/validation/json-validator.ts", "libs/list-types/crown-firm-list/tsconfig.json", "libs/list-types/crown-warned-list/package.json", "libs/list-types/crown-warned-list/src/config.ts", "libs/list-types/crown-warned-list/src/date-formatting.ts", "libs/list-types/crown-warned-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-warned-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-warned-list/src/index.ts", "libs/list-types/crown-warned-list/src/locales/cy.ts", "libs/list-types/crown-warned-list/src/locales/en.ts", "libs/list-types/crown-warned-list/src/models/types.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-template.njk", "libs/list-types/crown-warned-list/src/rendering/renderer.test.ts", "libs/list-types/crown-warned-list/src/rendering/renderer.ts", "libs/list-types/crown-warned-list/src/schemas/crown-warned-list.json", "libs/list-types/crown-warned-list/src/validation/json-validator.test.ts", "libs/list-types/crown-warned-list/src/validation/json-validator.ts", "libs/list-types/crown-warned-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "tsconfig.json"]',
    version = 3,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 109;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (109, 3, 'status', 'implemented', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (109, 3, 'impl_commit_sha', NULL, 'a0904b11bcad0b7b174afc8ecb105bdef57c26e6',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (109, 3, 'impl_paths', NULL, '["apps/web/src/app.ts", "apps/web/src/assets/css/web.scss", "apps/web/src/pages/(list-types)/crown-daily-cause-list/crown-daily-cause-list.njk", "apps/web/src/pages/(list-types)/crown-daily-cause-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-daily-cause-list/index.ts", "apps/web/src/pages/(list-types)/crown-firm-list/crown-firm-list.njk", "apps/web/src/pages/(list-types)/crown-firm-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-firm-list/index.ts", "apps/web/src/pages/(list-types)/crown-warned-list/crown-warned-list.njk", "apps/web/src/pages/(list-types)/crown-warned-list/index.test.ts", "apps/web/src/pages/(list-types)/crown-warned-list/index.ts", "libs/list-types/common/src/index.ts", "libs/list-types/common/src/pdf/pdf-styles.ts", "libs/list-types/common/src/rendering/crown-utilities.test.ts", "libs/list-types/common/src/rendering/crown-utilities.ts", "libs/list-types/common/src/rendering/pdda-name-formatting.test.ts", "libs/list-types/common/src/validation/list-type-validator.test.ts", "libs/list-types/crown-daily-list/package.json", "libs/list-types/crown-daily-list/src/config.ts", "libs/list-types/crown-daily-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-daily-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-daily-list/src/index.ts", "libs/list-types/crown-daily-list/src/locales/cy.ts", "libs/list-types/crown-daily-list/src/locales/en.ts", "libs/list-types/crown-daily-list/src/models/types.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-daily-list/src/pdf/pdf-template.njk", "libs/list-types/crown-daily-list/src/rendering/renderer.test.ts", "libs/list-types/crown-daily-list/src/rendering/renderer.ts", "libs/list-types/crown-daily-list/src/schemas/crown-daily-list.json", "libs/list-types/crown-daily-list/src/validation/json-validator.test.ts", "libs/list-types/crown-daily-list/src/validation/json-validator.ts", "libs/list-types/crown-daily-list/tsconfig.json", "libs/list-types/crown-firm-list/package.json", "libs/list-types/crown-firm-list/src/config.ts", "libs/list-types/crown-firm-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-firm-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-firm-list/src/index.ts", "libs/list-types/crown-firm-list/src/locales/cy.ts", "libs/list-types/crown-firm-list/src/locales/en.ts", "libs/list-types/crown-firm-list/src/models/types.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-firm-list/src/pdf/pdf-template.njk", "libs/list-types/crown-firm-list/src/rendering/renderer.test.ts", "libs/list-types/crown-firm-list/src/rendering/renderer.ts", "libs/list-types/crown-firm-list/src/schemas/crown-firm-list.json", "libs/list-types/crown-firm-list/src/validation/json-validator.test.ts", "libs/list-types/crown-firm-list/src/validation/json-validator.ts", "libs/list-types/crown-firm-list/tsconfig.json", "libs/list-types/crown-warned-list/package.json", "libs/list-types/crown-warned-list/src/config.ts", "libs/list-types/crown-warned-list/src/date-formatting.ts", "libs/list-types/crown-warned-list/src/email-summary/summary-builder.test.ts", "libs/list-types/crown-warned-list/src/email-summary/summary-builder.ts", "libs/list-types/crown-warned-list/src/index.ts", "libs/list-types/crown-warned-list/src/locales/cy.ts", "libs/list-types/crown-warned-list/src/locales/en.ts", "libs/list-types/crown-warned-list/src/models/types.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-generator.test.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-generator.ts", "libs/list-types/crown-warned-list/src/pdf/pdf-template.njk", "libs/list-types/crown-warned-list/src/rendering/renderer.test.ts", "libs/list-types/crown-warned-list/src/rendering/renderer.ts", "libs/list-types/crown-warned-list/src/schemas/crown-warned-list.json", "libs/list-types/crown-warned-list/src/validation/json-validator.test.ts", "libs/list-types/crown-warned-list/src/validation/json-validator.ts", "libs/list-types/crown-warned-list/tsconfig.json", "libs/location/src/list-type-data.ts", "libs/notifications/package.json", "libs/notifications/src/notification/notification-service.ts", "libs/publication/package.json", "libs/publication/src/processing/service.test.ts", "libs/publication/src/processing/service.ts", "tsconfig.json"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0112 (#467) — implemented → verified, impl from PR #670
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '9cecc43956427532b005b790484dfcdc519429e7',
    impl_paths = '["apps/web/src/assets/css/dashboard.scss", "apps/web/src/pages/(system-admin)/audit-log-detail/cy.ts", "apps/web/src/pages/(system-admin)/audit-log-detail/en.ts", "apps/web/src/pages/(system-admin)/audit-log-list/index.njk", "libs/list-types/common/package.json", "libs/list-types/common/src/validation/list-type-validator.ts", "libs/system-admin-pages/src/audit-log/service.test.ts", "libs/system-admin-pages/src/audit-log/service.ts", "sonar-project.properties"]',
    version = 3,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 112;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (112, 3, 'status', 'implemented', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (112, 3, 'impl_commit_sha', NULL, '9cecc43956427532b005b790484dfcdc519429e7',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (112, 3, 'impl_paths', NULL, '["apps/web/src/assets/css/dashboard.scss", "apps/web/src/pages/(system-admin)/audit-log-detail/cy.ts", "apps/web/src/pages/(system-admin)/audit-log-detail/en.ts", "apps/web/src/pages/(system-admin)/audit-log-list/index.njk", "libs/list-types/common/package.json", "libs/list-types/common/src/validation/list-type-validator.ts", "libs/system-admin-pages/src/audit-log/service.test.ts", "libs/system-admin-pages/src/audit-log/service.ts", "sonar-project.properties"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0124 (#563) — approved → verified, impl from PR #782
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = 'd3f054083b1f4e98a584042ec0448991c9364009',
    impl_paths = '[".dockerignore", ".gitignore", "package.json", "scripts/install-hooks.js"]',
    version = 2,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 124;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (124, 2, 'status', 'approved', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (124, 2, 'impl_commit_sha', NULL, 'd3f054083b1f4e98a584042ec0448991c9364009',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (124, 2, 'impl_paths', NULL, '[".dockerignore", ".gitignore", "package.json", "scripts/install-hooks.js"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0135 (#569) — in_progress → verified, impl from PR #748
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '575225f584ce9dab87c84fe16f0af72fef4fc863',
    impl_paths = '["apps/web/.env.example", "infrastructure/storage.tf", "infrastructure/variables.tf"]',
    version = 2,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 135;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (135, 2, 'status', 'in_progress', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (135, 2, 'impl_commit_sha', NULL, '575225f584ce9dab87c84fe16f0af72fef4fc863',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (135, 2, 'impl_paths', NULL, '["apps/web/.env.example", "infrastructure/storage.tf", "infrastructure/variables.tf"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

-- REQ-0137 (#729) — approved → verified, impl from PR #766
UPDATE requirement
SET status = 'verified',
    impl_commit_sha = 'f247aa21ada7d0ba99717f260177493d77081df9',
    impl_paths = '["apps/web/src/assets/css/web.scss"]',
    version = 2,
    updated_at = '2026-07-04T00:00:00Z',
    updated_by = 'github-actions[bot]'
WHERE id = 137;

INSERT INTO requirement_change
  (requirement_id, version, field, old_value, new_value,
   change_type, change_summary, changed_by, changed_at)
VALUES
  (137, 2, 'status', 'approved', 'verified',
   'status_changed', 'board status moved', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (137, 2, 'impl_commit_sha', NULL, 'f247aa21ada7d0ba99717f260177493d77081df9',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z'),
  (137, 2, 'impl_paths', NULL, '["apps/web/src/assets/css/web.scss"]',
   'modified', 'merged PR(s) changed', 'github-actions[bot]', '2026-07-04T00:00:00Z');

COMMIT;
