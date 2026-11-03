# Implementation Tasks — #872 Mags Subscription emails updated with new Media Protocol

## Implementation Tasks
- [x] Create `libs/notifications/src/govnotify/subscription-template-helper.ts` with `IS_MAGISTRATES_MEDIA_PROTOCOL`, `IS_NOT_MAGISTRATES_MEDIA_PROTOCOL`, the six-name `MAGISTRATES_LIST_TYPE_NAMES` set, `isMagistratesMediaProtocol(listTypeName)` and `isNotMagistratesMediaProtocol(listTypeName)`
- [x] In `buildEmailDataWithFiles` (`libs/notifications/src/notification/notification-service.ts`), add both flags (`"yes"`/`"no"`) to the personalisation
- [x] In `template-config.ts`, add the `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` constant and a non-SJP Excel-only branch (`hasExcel && !hasPdf`) before the final PDF return, throwing if the var isn't set
- [x] In `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` and `apps/api/helm/values.dev.yaml`: set `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` to `d9095328-839f-455a-98d9-46b000b4400d`, `..._SUBSCRIPTION_PDF_ONLY` to `67e78ce9-9f28-4209-983b-e705f77fb339` and `..._SUBSCRIPTION_PDF_EXCEL` to `01936af9-ab2e-4001-a135-cd70284f7a82`, and add `..._SUBSCRIPTION_EXCEL` = `fb95d98f-30e6-4227-a89d-f9525be4b5df`
- [x] Add a `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL=template-uuid-here` line to `apps/web/.env.example`
- [x] Grep for any other place that sets the subscription template IDs (CI workflows, umbrella chart) and update it

## Tests
- [x] `subscription-template-helper.test.ts`: true for all six Mags names; false for the SJP names, a non-Mags name, `undefined`, `null` and `""`; the inverse predicate; the constant values
- [x] `notification-service.test.ts`: Mags `listTypeName` (with `listTypeId: 999`) → `is_magistrates_media_protocol: "yes"`, `is_not_magistrates_media_protocol: "no"`; non-Mags → the opposite. Cover location/case, list-type and fallback paths
- [x] `template-config.test.ts`: non-SJP Excel-only → `SUBSCRIPTION_EXCEL`; throws when it isn't set; SJP Excel-only still → `SJP_EXCEL_ONLY`; existing cases unchanged
- [x] Run `yarn test` and `yarn lint:fix` from the repo root

## Before merge
- [ ] Check the new Notify templates: square brackets inside the flag blocks, no trailing comma after the email, and only placeholders that CaTH sends (the Excel template has no `pdf_link_*`, the PDF template has no `excel_link_*`)

## Manual verification
- [ ] AAT test send for one Mags list (e.g. `MAGISTRATES_STANDARD_LIST`) shows the new wording only
- [ ] AAT test send for one non-Mags list shows the existing wording only, with all other content unchanged
- [ ] AAT test send for a non-SJP list with Excel but no PDF uses the Excel-only template

## After verification
- [ ] Delete the old Notify templates `5b5c31d0-...`, `ac63ed12-...` and `42f65ada-...`
