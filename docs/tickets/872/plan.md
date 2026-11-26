# Technical Plan: #872 — Mags Subscription emails updated with new Media Protocol

> Revised 2026-09-30. New CaTH Notify templates have been created following the pip V2 structure:
> both opening messages in the same template, each shown or hidden by a personalisation flag. The
> code sets the flags from `listTypeName`, and the Helm values switch to the new template IDs in the
> same PR. A new Excel-only template also fixes the existing non-SJP Excel-without-PDF routing bug.

## 1. Technical Approach

### Where the opening message lives

The opening message is in the GOV.UK Notify template body. Application code only chooses the
template ID and supplies personalisation. Nothing in the repo holds the new wording, and the
existing `SPECIAL_CATEGORY_DATA_WARNING` constant (`libs/list-types/common`) is never sent.

### The templates

The pip V2 templates (`MEDIA_SUBSCRIPTION_*_V2`) belong to pip's Notify service, and CaTH's API
key can't use them. New templates have been created in **CaTH's** Notify service instead, following
the pip V2 structure. The old templates are left untouched, so nothing breaks before the switch, and
rolling back only means reverting the Helm values.

| CaTH env var | Old ID | New ID | pip equivalent |
|---|---|---|---|
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION` (read as `NO_LINKS`) | `5b5c31d0-27a3-466b-b750-bd1a858cd50f` | `d9095328-839f-455a-98d9-46b000b4400d` | `MEDIA_SUBSCRIPTION_NO_DOWNLOAD_LINK_EMAIL_V2` |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY` (read as `NON_SJP_PDF`) | `ac63ed12-c179-416d-b9af-83b2b37752bf` | `67e78ce9-9f28-4209-983b-e705f77fb339` | `MEDIA_SUBSCRIPTION_PDF_EMAIL_V2` |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL` | `42f65ada-6de0-45da-822a-9632f6f682fd` | `01936af9-ab2e-4001-a135-cd70284f7a82` | `MEDIA_SUBSCRIPTION_PDF_EXCEL_EMAIL_V2` |
| `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` (**new var**) | none | `fb95d98f-30e6-4227-a89d-f9525be4b5df` | Excel-only |

Each new template wraps the opening message in two conditional blocks:

- `((is_magistrates_media_protocol?? ...))`: the new Third Party media protocol wording.
- `((is_not_magistrates_media_protocol?? ...))`: the existing "Special Category Data" wording.

Notify fails a send if the template references a personalisation key that isn't supplied. The new
IDs and the code that sends the flags ship in the same PR, so there's never a point where a template
needs a flag that isn't sent. The old templates ignore the extra keys.

`GOVUK_NOTIFY_TEMPLATE_ID_SJP_EXCEL_ONLY` is used only for SJP lists, which are never Magistrates,
so it doesn't change. (It isn't set in any Helm values today, so SJP Excel-only sends already throw.
That's out of scope.)

Welsh: English only for this ticket (confirmed).

### How templates are selected

`getSubscriptionTemplateId({ isSjp, hasPdf, hasExcel, filesUnder2MB })` in
`libs/notifications/src/govnotify/template-config.ts` gets one new branch. It needs no
Magistrates-specific branch.

| Condition (in order) | Template |
|---|---|
| Any file >= 2MB, or no PDF and no Excel | `NO_LINKS` (unchanged) |
| SJP, Excel but no PDF | `SJP_EXCEL_ONLY` (unchanged) |
| PDF + Excel | `SUBSCRIPTION_PDF_EXCEL` (unchanged) |
| **Non-SJP, Excel but no PDF** | **`SUBSCRIPTION_EXCEL` (new)**. Previously this fell through to the PDF template without `pdf_link_*` personalisation |
| Otherwise (PDF only) | `NON_SJP_PDF` (unchanged) |

### Hook point

Every subscription email (location, case and list-type subscriptions, on both the enhanced and
the fallback path) goes through `buildEmailDataWithFiles(publicationId, pdfFilePath, listTypeName,
templateParameters)` in `libs/notifications/src/notification/notification-service.ts`. It already
has `listTypeName` (resolved from `list_types.name`) and the final `templateParameters`. The two
flags are added there, so `buildTemplateParameters` / `buildEnhancedTemplateParameters` and their
callers keep the same signatures.

### Magistrates list types

These are the six names from `libs/list-types/common/src/list-type-data.ts`. They match the
`SubscriptionTemplateHelper` you gave:

`MAGISTRATES_PUBLIC_LIST`, `MAGISTRATES_STANDARD_LIST`, `MAGISTRATES_ADULT_COURT_LIST_DAILY`,
`MAGISTRATES_ADULT_COURT_LIST_FUTURE`, `MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY`,
`MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE`.

SJP lists are excluded, the same as in the reference helper.

## 2. Implementation Details

TEMPLATE SOURCE: n/a

No web pages, API endpoints, database schema changes, migrations or `list-type-data.ts` changes.

### 2.1 New module: `libs/notifications/src/govnotify/subscription-template-helper.ts`

This is the TypeScript version of the Java `SubscriptionTemplateHelper`. It is a plain module
(exported consts and functions, not a class), following the functional style in CLAUDE.md. It is
keyed on the stable `listTypeName` string instead of a `ListType` enum:

```typescript
export const IS_MAGISTRATES_MEDIA_PROTOCOL = "is_magistrates_media_protocol";
export const IS_NOT_MAGISTRATES_MEDIA_PROTOCOL = "is_not_magistrates_media_protocol";

const MAGISTRATES_LIST_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MAGISTRATES_PUBLIC_LIST",
  "MAGISTRATES_STANDARD_LIST",
  "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"
]);

export function isMagistratesMediaProtocol(listTypeName: string | null | undefined): boolean {
  return !!listTypeName && MAGISTRATES_LIST_TYPE_NAMES.has(listTypeName);
}

export function isNotMagistratesMediaProtocol(listTypeName: string | null | undefined): boolean {
  return !isMagistratesMediaProtocol(listTypeName);
}
```

Module ordering follows CLAUDE.md: consts at the top, then exported functions. The helper is used
only inside `libs/notifications`, so it isn't exported from the package `index.ts`.

### 2.2 `libs/notifications/src/notification/notification-service.ts`

In `buildEmailDataWithFiles`, merge the flags into the personalisation before it is returned or
sent. The values are `"yes"`/`"no"`, matching the existing `display_*` flags that Notify
conditionals already read:

```typescript
const personalisation = {
  ...templateParameters,
  [IS_MAGISTRATES_MEDIA_PROTOCOL]: isMagistratesMediaProtocol(listTypeName) ? "yes" : "no",
  [IS_NOT_MAGISTRATES_MEDIA_PROTOCOL]: isNotMagistratesMediaProtocol(listTypeName) ? "yes" : "no"
};
```

`TemplateParameters` already has an index signature (`[key: string]: ...`), so the type doesn't
need to change.

### 2.3 `libs/notifications/src/govnotify/template-config.ts`

- Add a constant at the top, next to the other template IDs:
  `const GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL = process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL || "";`
- In `getSubscriptionTemplateId`, after the PDF + Excel branch and before the final PDF return,
  add: if `hasExcel && !hasPdf`, return `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL`, and throw
  `"GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL environment variable is not set"` if it's empty.
  This matches the existing branches. The SJP branch above already handles SJP Excel-only, so only
  non-SJP lists reach this branch.

### 2.4 Environment and deployment config

In `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml` and `apps/api/helm/values.dev.yaml`:

- `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION`: `d9095328-839f-455a-98d9-46b000b4400d`
- `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY`: `67e78ce9-9f28-4209-983b-e705f77fb339`
- `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_EXCEL`: `01936af9-ab2e-4001-a135-cd70284f7a82`
- Add `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL`: `fb95d98f-30e6-4227-a89d-f9525be4b5df`

In `apps/web/.env.example`, add a `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL=template-uuid-here`
line next to the existing subscription lines. Grep for any other place that sets these vars (CI
workflows, the `helm/cath-service` umbrella chart) and update it too.

### 2.5 External: GOV.UK Notify (CaTH service)

The four templates have already been created. Before merging, check that each one:
- uses square brackets rather than round ones inside the conditional blocks (e.g.
  `[select option 1 for criminal cases]`), because a `)` closes the `((flag?? ...))` block early;
- has no trailing comma after the email address;
- uses only placeholders that CaTH sends (see §3).

After the switch has been verified, delete the old templates so nobody edits the wrong one.

### 2.6 Files touched

| File | Change |
|---|---|
| `libs/notifications/src/govnotify/subscription-template-helper.ts` | New: flag constants, Magistrates name set, two predicates |
| `libs/notifications/src/govnotify/subscription-template-helper.test.ts` | New: unit tests |
| `libs/notifications/src/notification/notification-service.ts` | Add both flags to the personalisation in `buildEmailDataWithFiles` |
| `libs/notifications/src/notification/notification-service.test.ts` | Assert the flags for Mags and non-Mags names |
| `libs/notifications/src/govnotify/template-config.ts` | `SUBSCRIPTION_EXCEL` constant and a non-SJP Excel-only branch |
| `libs/notifications/src/govnotify/template-config.test.ts` | Excel-only routing tests |
| `apps/web/helm/values.yaml`, `apps/api/helm/values.yaml`, `apps/api/helm/values.dev.yaml` | 3 new template IDs, plus the new `SUBSCRIPTION_EXCEL` var |
| `apps/web/.env.example` | `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` placeholder |

## 3. Error Handling & Edge Cases

- **`listTypeName` is unknown or not resolved.** The name lookup is guarded with `.catch(() => null)`.
  `isMagistratesMediaProtocol(undefined)` returns false, so the existing wording is shown. That's
  the right default.
- **Both flags are always supplied.** This matters because the new templates fail if a flag is
  missing. Setting both in `buildEmailDataWithFiles` covers every path: enhanced, fallback,
  location, case and list-type subscriptions, and the no-links, PDF + Excel, Excel and PDF routes.
- **Placeholders in the new templates.** Every list type moves to the new templates, so each one
  must use only keys that CaTH sends: `buildTemplateParameters` fields, the two flags, and
  `link_to_file` / `pdf_link_to_file` / `pdf_link_text` (only when a PDF is attached) and
  `excel_link_to_file` / `excel_link_text` (only when an Excel file is attached), from
  `govnotify-client.ts`. The Excel template must not reference `pdf_link_*`, and the PDF template
  must not reference `excel_link_*`.
- **The flags are mutually exclusive.** `isNotMagistratesMediaProtocol` is defined as the negation,
  so exactly one block is ever shown.
- **SJP Excel-only template.** It hasn't changed and doesn't reference the flags. The extra keys
  are ignored.
- **`SUBSCRIPTION_EXCEL` isn't set.** It throws, like the other template vars. The Helm values ship
  in the same PR, so this only affects a misconfigured environment.
- **Rollback.** Revert the Helm values to the old IDs. The old templates still exist and ignore the
  extra flags. (Keep the new branch, or revert it too. The old PDF template can't render Excel-only
  sends properly, so that path was broken before anyway.)
- **Independence from IDs.** The decision uses only `listTypeName`. Test fixtures use
  `listTypeId: 999`.
- **Excel-without-PDF defect, now fixed.** A non-SJP list with Excel but no PDF used to go to the
  PDF template without `pdf_link_*` personalisation. It now goes to `SUBSCRIPTION_EXCEL`.

## 4. Acceptance Criteria Mapping

| Acceptance criterion | How it is met | Verification |
|---|---|---|
| Mags subscription emails show the new media protocol wording | For the six Mags names, `is_magistrates_media_protocol = "yes"` and `is_not_... = "no"`, sent to the new templates | Unit: helper returns true for all six names. Service test: the personalisation passed to Notify has the Mags flags |
| All other list types keep the existing wording | Non-Mags and SJP names get `is_magistrates_media_protocol = "no"` and `is_not_... = "yes"` | Unit: helper returns false for SJP, Crown, Civil and undefined names. Service test for a non-Mags name |
| "Logic ... sent for Mags subscriptions only" | `isMagistratesMediaProtocol(listTypeName)` in `buildEmailDataWithFiles` | Unit and service tests as above |
| Selection by stable name (CLAUDE.md) | Keyed only on `listTypeName` | Fixtures use `listTypeId: 999` |
| Correct rendering in Notify | New CaTH template content (external) | Manual AAT test send for one Mags list and one non-Mags list |

No E2E test. Nothing user-facing on the web changes, and Playwright can't see Notify content.

## 5. Testing

- `subscription-template-helper.test.ts`, following AAA:
  - `isMagistratesMediaProtocol` returns true for each of the six names (`it.each`).
  - It returns false for the four SJP names, for a non-Mags name (e.g. `CROWN_DAILY_LIST`), for
    `undefined`, for `null` and for `""`.
  - `isNotMagistratesMediaProtocol` is the inverse for a Mags name and a non-Mags name.
  - The constants equal `"is_magistrates_media_protocol"` and `"is_not_magistrates_media_protocol"`.
- `notification-service.test.ts`: for a Mags `listTypeName` (with `listTypeId: 999`), assert that
  the personalisation sent to Notify has `is_magistrates_media_protocol: "yes"` and
  `is_not_magistrates_media_protocol: "no"`. For a non-Mags name, assert the opposite. Cover
  `sendLocationAndCaseSubscriptionNotifications`, `sendListTypePublicationNotifications`, and the
  fallback path.
- `template-config.test.ts` (existing `vi.resetModules()` + `vi.stubEnv` + dynamic import pattern):
  - A non-SJP list with Excel and no PDF returns the `SUBSCRIPTION_EXCEL` ID.
  - It throws when `GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_EXCEL` isn't set.
  - SJP Excel-only still returns `SJP_EXCEL_ONLY` (regression).
  - The existing PDF-only, PDF + Excel and no-links cases still pass unchanged.
- Run `yarn test` and `yarn lint:fix` from the repo root.

## CLARIFICATIONS NEEDED

Resolved: the pip V2 IDs can't be used, so new CaTH templates have been created with the new IDs
above. The flags follow the pip naming, the email is English only, and the new Excel-only template
fixes the Excel-without-PDF defect.

1. **Flag values.** The plan assumes `"yes"`/`"no"` strings (consistent with CaTH's `display_*`
   flags). Make sure the new templates don't compare against a specific value; plain
   `((flag?? ...))` works with `"yes"`/`"no"`.
2. **Email address spelling.** Resolved: the issue said `mediaandpressenquires@justice.gov.uk`
   ("enquires"), and the Notify templates were changed to `mediaandpressenquiries@justice.gov.uk`.
