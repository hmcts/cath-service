-- 012: reconcile board 2026-07-31
--
-- Append-only change to requirements. Record edits in requirement_change
-- (incrementing the affected requirement's version) so the audit trail stays
-- complete, then make the corresponding change to the requirement row(s).

BEGIN TRANSACTION;

-- ============================================================
-- CHANGED: REQ-0239 (issue #760) — status in_progress → implemented
-- ============================================================
INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (239, 2, 'status_changed', 'reconciled with board', 'in_progress', 'implemented', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

UPDATE requirement
SET status = 'implemented', version = 2, updated_at = '2026-07-31T00:00:00Z', updated_by = 'qk-requirements-sync'
WHERE id = 239;

-- ============================================================
-- CHANGED: REQ-0270 (issue #838) — status approved → implemented
-- ============================================================
INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (270, 2, 'status_changed', 'reconciled with board', 'approved', 'implemented', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

UPDATE requirement
SET status = 'implemented', version = 2, updated_at = '2026-07-31T00:00:00Z', updated_by = 'qk-requirements-sync'
WHERE id = 270;

-- ============================================================
-- CHANGED: REQ-0277 (issue #889) — status in_progress → implemented
-- ============================================================
INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (277, 2, 'status_changed', 'reconciled with board', 'in_progress', 'implemented', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

UPDATE requirement
SET status = 'implemented', version = 2, updated_at = '2026-07-31T00:00:00Z', updated_by = 'qk-requirements-sync'
WHERE id = 277;

-- ============================================================
-- CHANGED: REQ-0110 (issue #438) — status implemented → verified,
--          impl_commit_sha and impl_paths set for the first time
-- ============================================================
INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (110, 3, 'status_changed', 'reconciled with board', 'implemented', 'verified', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (110, 3, 'modified', 'reconciled with board', NULL, '5421d745490bedae826e03b78e61d8ae6146def7', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (110, 3, 'modified', 'reconciled with board', NULL, '["libs/list-types/common/src/list-type-data.test.ts","libs/list-types/common/src/list-type-data.ts","libs/notifications/src/govnotify/template-config.test.ts","libs/notifications/src/govnotify/template-config.ts"]', '2026-07-31T00:00:00Z', 'qk-requirements-sync');

UPDATE requirement
SET status = 'verified',
    impl_commit_sha = '5421d745490bedae826e03b78e61d8ae6146def7',
    impl_paths = '["libs/list-types/common/src/list-type-data.test.ts","libs/list-types/common/src/list-type-data.ts","libs/notifications/src/govnotify/template-config.test.ts","libs/notifications/src/govnotify/template-config.ts"]',
    version = 3, updated_at = '2026-07-31T00:00:00Z', updated_by = 'qk-requirements-sync'
WHERE id = 110;

-- ============================================================
-- NEW: issue #907 — Review GOV.UK Notify subscription template
-- ============================================================
INSERT INTO requirement (id, ref, issue_number, title, statement, status, priority, granularity, kind, created_at, updated_at, created_by, updated_by, version)
VALUES (
  287, 'REQ-0287', 907,
  'Review GOV.UK Notify subscription template',
  'There are many Notify subscription templates and some of them are obsolete. We also have some SJP only template for PDF Excel. This should not be SJP specific as other Crime lists also have PDF.

- Unify all the JSON subscription templates, we should only have 4.
- Remove the unused templates from GOV.UK Notify.',
  'approved', NULL, NULL, 'functional',
  '2026-07-29T15:54:55Z', '2026-07-29T15:54:55Z',
  'qk-requirements-sync', 'qk-requirements-sync', 1
);

INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (287, 1, 'created', 'imported from GitHub issue', NULL, NULL, '2026-07-29T15:54:55Z', 'qk-requirements-sync');

-- ============================================================
-- NEW: issue #910 — Verify GOV.UK Notify email download links end to end for all list types
-- ============================================================
INSERT INTO requirement (id, ref, issue_number, title, statement, status, priority, granularity, kind, created_at, updated_at, created_by, updated_by, version)
VALUES (
  288, 'REQ-0288', 910,
  'Verify GOV.UK Notify email download links end to end for all list types',
  '## Problem

We have no systematic end-to-end verification that subscription emails render the correct
GOV.UK Notify document download links. Coverage today is ad hoc: four hand-written blocks
inside `e2e-tests/tests/api/subscription-notifications.spec.ts` cover Civil & Family, SJP
Public and SJP Press, and every other list type registered in the email pipeline has no
email-content assertion at all.

This matters because the download URL is minted at send time by `prepareUpload()`
(`libs/notifications/src/govnotify/govnotify-client.ts:68-90`) and set as
`personalisation.pdf_link_to_file` / `excel_link_to_file`. It is never persisted — the
`notification_audit_log` row records only `govNotifyId`. Fetching the sent notification
back from the Notify API is therefore the **only** way to assert that a link actually
rendered. A regression in `prepareUpload` handling, in PDF/Excel generation, in the
2 MB size cap, or in the template-selection logic would ship silently for any list
type not in that ad hoc set.

## Template-selection rules under test

`getSubscriptionTemplateId` (`libs/notifications/src/govnotify/template-config.ts:15`)
routes on three inputs — `isSjp`, which buffers exist, and whether files are under 2 MB
— giving four outcomes with distinct expected link counts:

| Case | Template | Expected `documents.service.gov.uk` links |
|---|---|---|
| Non-SJP, PDF, under 2 MB | `..._NON_SJP_PDF` | exactly 1 |
| SJP, PDF + Excel, under 2 MB | `..._SJP_PDF_EXCEL` | at least 2 |
| SJP, Excel only, under 2 MB | `..._SJP_EXCEL_ONLY` | exactly 1 |
| No PDF/Excel, or over 2 MB | `..._NO_LINKS` | exactly 0 |

The expected link count for any list type is derivable from these rules, so the
verification should be data-driven rather than re-written per list type.

## Acceptance criteria

- [ ] `assertEmailDownloadLinks(govNotifyId, expectedLinkCount)` exists in
      `notification-helpers.ts`, with `GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN` relocated there
- [ ] The notification test is data-driven over a table of list-type cases; adding a list
      type requires one table row plus a payload builder
- [ ] All four template branches in the table above are covered with their expected link
      counts
- [ ] Every list type in `EMAIL_BUILDER_REGISTRY` has a case, or a documented reason it is
      excluded
- [ ] The four soft `if (process.env.GOVUK_NOTIFY_API_KEY && ...)` guards are converted to
      `test.skip(...)`
- [ ] `playwright.config.ts` forwards all six `GOVUK_NOTIFY_TEMPLATE_ID_*` vars, and
      `apps/web/.env.example` documents all six
- [ ] Test data is cleaned up via the existing `afterEach` accumulator
- [ ] `yarn test:e2e` passes',
  'approved', 'medium', 'story', 'functional',
  '2026-07-30T15:57:12Z', '2026-07-30T15:57:12Z',
  'qk-requirements-sync', 'qk-requirements-sync', 1
);

INSERT INTO requirement_change (requirement_id, version, change_type, change_summary, old_value, new_value, changed_at, changed_by)
VALUES (288, 1, 'created', 'imported from GitHub issue', NULL, NULL, '2026-07-30T15:57:12Z', 'qk-requirements-sync');

-- ============================================================
-- INFERRED LINKS for new requirements (is_suspect=1, needs review)
-- ============================================================
INSERT INTO requirement_link (id, source_id, target_id, type, origin, confidence, rationale, is_suspect, created_at, created_by)
VALUES
  (90, 288, 287, 'depends_on', 'inferred', 0.75,
   'REQ-0288''s E2E verification tests the four-template model that REQ-0287 is converging to; reliable test results depend on the template set having been unified first.',
   1, '2026-07-31T00:00:00Z', 'qk-requirements-sync'),
  (91, 287, 175, 'refines', 'inferred', 0.70,
   'REQ-0287 explicitly addresses the SJP-only PDF+Excel template introduced by REQ-0175 and proposes extending it to all Crime list types while reducing total templates to four.',
   1, '2026-07-31T00:00:00Z', 'qk-requirements-sync'),
  (92, 288, 99, 'refines', 'inferred', 0.65,
   'REQ-0288 adds systematic data-driven E2E verification of download links for all list types, extending the subscription emails fulfilment journey defined by REQ-0099.',
   1, '2026-07-31T00:00:00Z', 'qk-requirements-sync');

COMMIT;
