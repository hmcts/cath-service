# Implementation Tasks

## Template Configuration
- [x] Add new env var constants to `libs/notifications/src/govnotify/template-config.ts` for all 4 template IDs
- [x] Rewrite `getSubscriptionTemplateIdForListType()` → new `getSubscriptionTemplateId()` accepting SJP flag, PDF flag, Excel flag, and size flag
- [x] Add helper function `isSjpListType(listTypeName: string)` to detect SJP list types
- [x] Update `TemplateParameters` interface with new fields (`display_case_num`, `case_num`, `display_case_urn`, `case_urn`)
- [x] Update `buildTemplateParameters()` and `buildEnhancedTemplateParameters()` to populate new fields

## Gov Notify Client
- [x] Add `excelBuffer` to `SendEmailParams` interface in `govnotify-client.ts`
- [x] Update `sendEmailInternal()` to call `prepareUpload()` for Excel buffer and set `excel_link_text`
- [x] Update PDF upload logic to set `pdf_link_text` in addition to `link_to_file`
- [x] Make templateId required (throw if missing)

## Notification Service
- [x] Add Excel file existence check via `getExcelFilePath()` helper
- [x] Pass `isSjp` flag through the notification flow (derive from list type name)
- [x] Replace `buildEmailDataWithPdf()` with `buildEmailDataWithFiles()` handling both PDF and Excel
- [x] Update `EmailTemplateData` interface to include `excelBuffer`
- [x] Update `processUserNotification()` / `processListTypeUserNotification()` to pass Excel buffer to `sendEmail()`
- [x] Handle edge case: Excel/PDF file > 2MB → fall back to no-link template
- [x] Update `buildFallbackEmailData()` to always provide a templateId

## Environment Variables
- [x] Added backward-compatible fallbacks (old env vars still work)
- [ ] Add new template ID env vars to deployment config / `.env.example`

## Tests
- [x] Rewrite `template-config.test.ts` - test all 4 template selection scenarios + isSjpListType
- [x] Fix `notification-service.test.ts` - add missing mocks for all list type modules
- [x] Update `govnotify-client.test.ts` - test Excel buffer upload, both buffers, templateId required

## Cleanup
- [x] Remove old `getSubscriptionTemplateIdForListType` and `getTemplateId` functions
- [x] Remove debug `console.log` statements from notification-service.ts
