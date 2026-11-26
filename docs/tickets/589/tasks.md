# Tasks — #589: Set payload limits for publication file generation and summary

## Implementation Tasks

- [x] Create `libs/publication/src/processing/payload-limits.ts` (`MAX_PDF_PAYLOAD_BYTES` = 2MB, `MAX_EXCEL_PAYLOAD_BYTES` = 10MB, `payloadSizeBytes` helper) — colocated with the PDF/Excel generation consumer, mirroring legacy pip-data-management
- [x] Create `libs/notifications/src/notification/payload-limits.ts` (`MAX_SUMMARY_PAYLOAD_BYTES` = 256KB, `payloadSizeBytes` helper) — colocated with the summary consumer, mirroring legacy pip-publication-services
- [x] Add co-located `payload-limits.test.ts` in each lib (byte-length helper + constant values)
- [x] Gate PDF generation in `processPublication` (`service.ts`): skip when source ≥ PDF limit, leave `pdfPath` unset, `log()` the skip
- [x] Gate Excel generation in `processPublication` (`service.ts`): skip when source ≥ Excel limit, leave `excelPath` unset, `log()` the skip
- [x] Gate email summary in `notification-service.ts` (`buildEmailTemplateData`/`buildEnhancedEmailData`): fall back to no-summary path when `jsonData` ≥ summary limit
- [x] Update/extend `service.ts` unit tests: under → generated, at/over → skipped, other outputs still generate, publication still succeeds
- [x] Update/extend `notification-service.ts` unit tests: under → enhanced summary, over → fallback/no-summary template
- [x] Run `yarn test` (libs/publication + libs/notifications) and `yarn lint:fix`
