-- 001: inferred traceability links between requirements
--
-- 66 links derived from requirement CONTENT (not GitHub structure) by a
-- multi-agent analysis: cluster -> propose per cluster -> adversarial verification
-- (each candidate had to survive a skeptic that defaulted to rejection).
--
-- These are JUDGEMENT, not fact. Every row is origin='inferred' and is_suspect=1
-- (needs human review). The 21 structural links in seed.sql (github_subissue,
-- issue_reference) are origin facts and are NOT touched here.
--
-- To review:   SELECT * FROM requirement_link WHERE origin='inferred' ORDER BY confidence DESC;
-- To confirm:  UPDATE requirement_link SET is_suspect=0 WHERE id=...;
-- To reject:   DELETE FROM requirement_link WHERE id=...;

BEGIN TRANSACTION;

INSERT INTO requirement_link
  (source_id, target_id, type, origin, confidence, rationale, is_suspect, created_at)
VALUES
  (6, 5, 'depends_on', 'inferred', 0.85, 'The CFT IDAM sign-in (6) is one of the sign-in methods a user reaches after choosing on the ''How do you want to sign in'' selection page (5), so it depends on that page existing.', 1, '2026-06-09T00:00:00Z'),
  (6, 8, 'depends_on', 'inferred', 0.6, 'Sign-in (6) stores/reads the details of users who sign in, which requires the user table (8) to exist.', 1, '2026-06-09T00:00:00Z'),
  (6, 34, 'depends_on', 'inferred', 0.6, 'Signing in as a verified user (6) requires a verified account to have been created first (34).', 1, '2026-06-09T00:00:00Z'),
  (9, 6, 'depends_on', 'inferred', 0.7, 'Forgotten-password recovery (9) operates on the verified account credentials used by the CFT IDAM sign-in flow (6), so it presupposes that sign-in mechanism.', 1, '2026-06-09T00:00:00Z'),
  (11, 66, 'depends_on', 'inferred', 0.6, 'Restricting public users from private/classified information depends on the authentication on classified publications mechanism (REQ-0066) that assigns sensitivity levels.', 1, '2026-06-09T00:00:00Z'),
  (20, 19, 'depends_on', 'inferred', 0.85, 'The upload form is reached from the local admin dashboard, so the form step needs the dashboard entry point to exist first.', 1, '2026-06-09T00:00:00Z'),
  (21, 20, 'depends_on', 'inferred', 0.9, 'Confirming upload details requires the upload form to have submitted the file and its metadata first.', 1, '2026-06-09T00:00:00Z'),
  (27, 23, 'depends_on', 'inferred', 0.85, 'Completing the excel upload process requires the initial Excel file upload step to have provided the file.', 1, '2026-06-09T00:00:00Z'),
  (29, 47, 'depends_on', 'inferred', 0.55, 'Removal is restricted to admins who must first authenticate via admin SSO (REQ-0047) to access the removal functionality.', 1, '2026-06-09T00:00:00Z'),
  (31, 29, 'refines', 'inferred', 0.9, '''Select content to remove'' is a specific step within the broader ''Remove publication'' multi-step process described in REQ-0029.', 1, '2026-06-09T00:00:00Z'),
  (31, 30, 'depends_on', 'inferred', 0.85, 'Selecting content to remove requires first finding the venue/content, so the selection step depends on the find step preceding it in the flow.', 1, '2026-06-09T00:00:00Z'),
  (32, 29, 'refines', 'inferred', 0.9, 'The ''Are you sure you want to remove this content?'' confirmation page is a specific step within the broader ''Remove publication'' process in REQ-0029.', 1, '2026-06-09T00:00:00Z'),
  (32, 31, 'depends_on', 'inferred', 0.85, 'The removal confirmation page operates on the content chosen in the ''Select content to remove'' step, so it depends on that selection having been made.', 1, '2026-06-09T00:00:00Z'),
  (33, 29, 'refines', 'inferred', 0.9, '''File Removal Successful'' is the final step of the broader ''Remove publication'' process described in REQ-0029.', 1, '2026-06-09T00:00:00Z'),
  (34, 8, 'depends_on', 'inferred', 0.85, 'Creating a verified account requires persisting user details, which depends on the user table created in REQ-0008.', 1, '2026-06-09T00:00:00Z'),
  (36, 38, 'depends_on', 'inferred', 0.85, 'Uploading reference data (location details) needs the location database schema in place to store it.', 1, '2026-06-09T00:00:00Z'),
  (39, 6, 'depends_on', 'inferred', 0.7, 'The Verified User dashboard is shown after a verified user signs in via CFT IDAM, so it depends on the verified sign-in flow.', 1, '2026-06-09T00:00:00Z'),
  (40, 34, 'depends_on', 'inferred', 0.78, 'Email subscriptions require an approved verified account, which is created via the account-creation requirement (REQ-0034).', 1, '2026-06-09T00:00:00Z'),
  (41, 40, 'refines', 'inferred', 0.8, '''How do you want to add an email subscription'' is a specific step within the broader email-subscriptions feature (REQ-0040).', 1, '2026-06-09T00:00:00Z'),
  (42, 40, 'refines', 'inferred', 0.78, 'This duplicate ''how do you want to add a subscription'' page is a specific step refining the overall email-subscriptions feature (REQ-0040).', 1, '2026-06-09T00:00:00Z'),
  (43, 40, 'depends_on', 'inferred', 0.78, 'Unsubscribing requires existing email subscriptions created via the subscriptions feature (REQ-0040).', 1, '2026-06-09T00:00:00Z'),
  (45, 44, 'depends_on', 'inferred', 0.72, 'Choosing which version of the list to receive presupposes a list type has already been selected (REQ-0044).', 1, '2026-06-09T00:00:00Z'),
  (48, 46, 'depends_on', 'inferred', 0.78, 'The System Admin dashboard is only reachable after a system admin signs in via SSO, so it depends on the System Admin single sign-on.', 1, '2026-06-09T00:00:00Z'),
  (49, 10, 'depends_on', 'inferred', 0.6, 'Landing Page - Part 2 builds on the initial Landing Page header/footer work (REQ-0010), continuing the same landing page navigation.', 1, '2026-06-09T00:00:00Z'),
  (50, 36, 'depends_on', 'inferred', 0.6, 'Creating a court venue relies on reference data (jurisdictions, regions) being uploaded so courts can be associated with valid reference values.', 1, '2026-06-09T00:00:00Z'),
  (50, 38, 'depends_on', 'inferred', 0.9, 'Creating courts requires the location details schema (location, jurisdiction, sub-jurisdiction, region) to exist to store the court against.', 1, '2026-06-09T00:00:00Z'),
  (51, 37, 'depends_on', 'inferred', 0.85, 'Blob ingestion explicitly ingests and validates a JSON file from a source system through an API connection.', 1, '2026-06-09T00:00:00Z'),
  (53, 16, 'refines', 'inferred', 0.6, 'Display of Pubs ''What court or tribunal are you interested in?'' is the publication-display-specific version of the generic select-a-court-or-tribunal step.', 1, '2026-06-09T00:00:00Z'),
  (56, 55, 'depends_on', 'inferred', 0.68, 'Viewing a flat file requires first selecting a publication from the Summary of Pubs page that lists available publications.', 1, '2026-06-09T00:00:00Z'),
  (58, 59, 'depends_on', 'inferred', 0.72, 'REQ-0058 handles errors in the JSON-HTML conversion/rendering process, which is the process defined and governed by the validation schema and style guide integration spec in REQ-0059.', 1, '2026-06-09T00:00:00Z'),
  (60, 40, 'depends_on', 'inferred', 0.82, 'Subscription fulfilment (sending email notifications) can only trigger once users have set up email subscriptions (REQ-0040).', 1, '2026-06-09T00:00:00Z'),
  (62, 34, 'depends_on', 'inferred', 0.85, 'Approving a media account request requires an application that was submitted via the account creation form in REQ-0034.', 1, '2026-06-09T00:00:00Z'),
  (63, 34, 'depends_on', 'inferred', 0.85, 'Rejecting a media account request requires an application submitted via the account creation form in REQ-0034.', 1, '2026-06-09T00:00:00Z'),
  (66, 7, 'depends_on', 'inferred', 0.65, 'Authentication on classified publications (66) gates content by user group, which relies on the public/media authentication established by the B2C sign-in (7).', 1, '2026-06-09T00:00:00Z'),
  (72, 43, 'refines', 'inferred', 0.72, 'Bulk unsubscribe is a more specific batch version of the single unsubscribe process (REQ-0043).', 1, '2026-06-09T00:00:00Z'),
  (75, 48, 'depends_on', 'inferred', 0.9, 'Blob explorer and re-submission trigger are accessed through the System Admin dashboard, which must exist first as the control panel hosting these functions.', 1, '2026-06-09T00:00:00Z'),
  (76, 48, 'depends_on', 'inferred', 0.9, 'The Audit Log View is reached via the System Admin dashboard tile, so the dashboard must exist to host and route to it.', 1, '2026-06-09T00:00:00Z'),
  (77, 50, 'depends_on', 'inferred', 0.9, 'Deleting a court process presupposes courts have been created in CaTH via the create-court functionality.', 1, '2026-06-09T00:00:00Z'),
  (78, 48, 'depends_on', 'inferred', 0.88, 'Third Party User Management (Future) is a system administrative function surfaced through the System Admin dashboard, which it depends on.', 1, '2026-06-09T00:00:00Z'),
  (80, 23, 'depends_on', 'inferred', 0.7, 'RCJ hearing lists use the non-strategic Excel upload route, so they depend on the Excel file upload capability.', 1, '2026-06-09T00:00:00Z'),
  (81, 27, 'depends_on', 'inferred', 0.72, 'REQ-0081 implements Welsh translation for the Care Standards weekly hearing list, which depends on the Care Standards list publishing/display established in REQ-0027.', 1, '2026-06-09T00:00:00Z'),
  (83, 57, 'depends_on', 'inferred', 0.6, 'REQ-0083''s PDF and email summary for the Civil and Family list depends on the list''s validation schema and style guide created in REQ-0057.', 1, '2026-06-09T00:00:00Z'),
  (84, 38, 'depends_on', 'inferred', 0.7, 'The RCJ/Rolls Building caution message requires location metadata changes in the database, depending on the location details schema.', 1, '2026-06-09T00:00:00Z'),
  (85, 8, 'depends_on', 'inferred', 0.8, 'User Management administers user records, which must first exist in the user table created by REQ-0008.', 1, '2026-06-09T00:00:00Z'),
  (85, 48, 'depends_on', 'inferred', 0.8, 'User Management is a system administrative function performed through the System Admin dashboard and depends on it as the host.', 1, '2026-06-09T00:00:00Z'),
  (88, 20, 'depends_on', 'inferred', 0.8, 'Merging manual upload (flat file) tests requires the manual upload functionality and its existing test files to exist.', 1, '2026-06-09T00:00:00Z'),
  (91, 48, 'depends_on', 'inferred', 0.88, 'Third Party User Management (Current) is accessed through the System Admin dashboard and depends on it as the host control panel.', 1, '2026-06-09T00:00:00Z'),
  (95, 38, 'depends_on', 'inferred', 0.8, 'Uploading reference data (location details) requires the location database schema to store it.', 1, '2026-06-09T00:00:00Z'),
  (99, 40, 'depends_on', 'inferred', 0.55, 'Delivering subscription emails for SJP presupposes verified users have set up email subscriptions, the capability defined in REQ-0040.', 1, '2026-06-09T00:00:00Z'),
  (99, 60, 'depends_on', 'inferred', 0.8, 'REQ-0099 is about users receiving the four configured subscription emails, which relies on the backend subscription fulfilment (email notification triggering) defined in REQ-0060.', 1, '2026-06-09T00:00:00Z'),
  (99, 117, 'depends_on', 'inferred', 0.95, 'REQ-0099 explicitly opens ''Once excel generation for SJP has been implemented'', so the complete SJP subscription email journey depends on REQ-0117 generating the SJP Excel file.', 1, '2026-06-09T00:00:00Z'),
  (100, 34, 'depends_on', 'inferred', 0.6, 'The B2C media user creation journey completes the media account application started by the account creation form in REQ-0034.', 1, '2026-06-09T00:00:00Z'),
  (100, 62, 'depends_on', 'inferred', 0.85, 'Azure B2C media user creation is explicitly triggered once the CTSC Admin approves the media application, which is REQ-0062.', 1, '2026-06-09T00:00:00Z'),
  (103, 48, 'depends_on', 'inferred', 0.72, 'System Admin Data Management (reference/jurisdiction data) is an administrative function accessed via the System Admin dashboard control panel.', 1, '2026-06-09T00:00:00Z'),
  (115, 74, 'depends_on', 'inferred', 0.75, 'Pages can only read list types from the database once the list type configuration and database tables have been set up.', 1, '2026-06-09T00:00:00Z'),
  (122, 63, 'refines', 'inferred', 0.88, 'REQ-0122 specifies the proof-of-ID document cleanup behaviour that must occur during the media application rejection flow defined in REQ-0063.', 1, '2026-06-09T00:00:00Z'),
  (123, 132, 'depends_on', 'inferred', 0.5, 'A working STG deployment from master (123) depends on STG/master builds correctly loading secrets from the cath-owned Key Vaults configured in 132.', 1, '2026-06-09T00:00:00Z'),
  (126, 61, 'depends_on', 'inferred', 0.7, 'Creating Flux overlays for additional environments (126) extends the base flux config / k8s namespace and postgres flux db originally set up in 61.', 1, '2026-06-09T00:00:00Z'),
  (128, 36, 'refines', 'inferred', 0.8, 'Adding provenance to reference data upload backend logic is a more specific extension of the reference data upload requirement.', 1, '2026-06-09T00:00:00Z'),
  (128, 103, 'depends_on', 'inferred', 0.65, 'The reference data upload backend logic update builds on the Data Management functionality that handles reference and jurisdiction data upload.', 1, '2026-06-09T00:00:00Z'),
  (129, 127, 'depends_on', 'inferred', 0.6, 'Provisioning per-environment Azure resources and Key Vaults (129) builds on the bootstrap Key Vault infrastructure pattern established in the cath-service infra folder by 127.', 1, '2026-06-09T00:00:00Z'),
  (130, 126, 'depends_on', 'inferred', 0.75, 'Deploy workflows pushing promoted images (130) target the ITHC/Demo/Test environments whose Flux overlays are created in 126.', 1, '2026-06-09T00:00:00Z'),
  (130, 129, 'depends_on', 'inferred', 0.8, 'Environment-specific deploy workflows (130) require the GitHub Actions credentials and Azure resources for those environments configured in 129.', 1, '2026-06-09T00:00:00Z'),
  (131, 130, 'depends_on', 'inferred', 0.8, 'Auto-syncing master to lower environment branches (131) only triggers deployments if the per-branch deploy workflows from 130 exist to react to those pushes.', 1, '2026-06-09T00:00:00Z'),
  (132, 127, 'depends_on', 'inferred', 0.9, 'Configuring Helm values to load secrets from cath-bootstrap-stg-kv and cath-stg (132) requires those bootstrap Key Vaults to be provisioned first by 127.', 1, '2026-06-09T00:00:00Z'),
  (134, 38, 'depends_on', 'inferred', 0.8, 'Seeding regions and sub-jurisdictions requires the location schema that defines region and sub-jurisdiction structures.', 1, '2026-06-09T00:00:00Z');

COMMIT;
