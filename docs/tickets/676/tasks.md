# Implementation Tasks — #676 Excel Download for SJP Hearing Lists

## Implementation Tasks

- [ ] Add `getAllSjpPublicCases` function to `libs/list-types/common/src/sjp/sjp-service.ts` (mirrors `getAllSjpPressCases` but returns `SjpCasePublic[]` without pagination)
- [ ] Create `libs/list-types/common/src/sjp/sjp-excel-generator.ts` with `generateSjpPressListExcel` and `generateSjpPublicListExcel` functions using exceljs
- [ ] Write unit tests for `sjp-excel-generator.ts` (column coverage, header row, empty list, null fields, multi-offence rows)
- [ ] Export new functions from `libs/list-types/common/src/index.ts`
- [ ] Create `apps/web/src/pages/(list-types)/sjp-press-list/download.ts` download endpoint
- [ ] Create `apps/web/src/pages/(list-types)/sjp-public-list/download.ts` download endpoint
- [ ] Create `apps/web/src/pages/(list-types)/sjp-delta-press-list/download.ts` (re-export from sjp-press-list)
- [ ] Create `apps/web/src/pages/(list-types)/sjp-delta-public-list/download.ts` (re-export from sjp-public-list)
- [ ] Write unit tests for the press and public download endpoint handlers (200 with correct headers, 400 missing artefactId, 404 not found)
- [ ] Add `downloadThisList` and `downloadAsExcel` content strings to English and Welsh locale files for sjp-press-list and sjp-public-list pages
- [ ] Update SJP press list template to render Excel download link above case table
- [ ] Update SJP public list template to render Excel download link above case table
- [ ] Add `excelBuffer?: Buffer` to `SendEmailParams` in `libs/notifications/src/govnotify/govnotify-client.ts` and wire it to `prepareUpload` → `link_to_excel_file` personalisation variable
- [ ] Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` env var support to `libs/notifications/src/govnotify/template-config.ts` and `getSubscriptionTemplateIdForListType`
- [ ] Add SJP Excel generation to `libs/notifications/src/notification/notification-service.ts`: generate Excel buffer for list type IDs 24/25/26/27 and pass as `excelBuffer` to `sendEmail` (with 2MB guard)
- [ ] Write unit tests for updated `govnotify-client.ts` (excel buffer attached, omitted when absent)
- [ ] Write unit tests for updated `notification-service.ts` (Excel buffer generated for SJP list types, omitted when over 2MB)
- [ ] Run `yarn lint:fix` and `yarn test` from repo root; fix any issues
