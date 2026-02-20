# Plan: #354 CaTH Cron Trigger - Generate and Send MI Report

## 1. Technical Approach

The MI report is a periodic Excel (XLSX) report containing four data tabs — Publication, User Accounts, Location Subscriptions, and All Subscriptions — delivered to a recipient email address via GOV.UK Notify's file attachment API.

### Architecture Decisions

**Direct import, not HTTP call.**
The cron script (`apps/crons/src/mi-report.ts`) will import and call `generateAndSendMiReport()` from the new `@hmcts/mi-report` library directly, rather than making an HTTP request to the `/v1/mi/report` API endpoint. This avoids OAuth token management complexity in the cron, follows the KISS principle, and is consistent with how the cron runner works today (it imports and calls scripts, it does not make HTTP calls). The API endpoint is still created but serves as an alternative trigger path (e.g., for ad-hoc manual runs or future integration).

**New `libs/mi-report` library.**
All domain logic for the report — Prisma queries, XLSX generation, and email orchestration — lives in a new module `libs/mi-report`. It has no page routes; it exposes only business logic from `src/index.ts` and module config from `src/config.ts`.

**XLSX via exceljs.**
`exceljs` is added as a dependency of `@hmcts/mi-report`. It produces an in-memory `Buffer` which is passed directly to `notifyClient.prepareUpload()` without writing to disk.

**File attachment via `sendEmailWithFile` extension.**
A new exported function `sendEmailWithFile` is added to `libs/notifications/src/govnotify/govnotify-client.ts`. It accepts a `Buffer` and a pre-resolved template ID (passed in as a parameter rather than read from the subscription template env var), avoiding coupling the MI report to the existing subscription template config.

**Subscription `channel` / `searchType` — YAGNI, no migration.**
The `Subscription` model has no `channel` or `search_type` columns. Since all subscriptions in the system are currently location-based email subscriptions, the report hardcodes `channel = 'EMAIL'` and `searchType = 'LOCATION_ID'` in the XLSX row data. No Prisma migration is required at this stage. The spec comment in the ticket acknowledges this is a known open question; we apply YAGNI.

**`Artefact.locationId` is a String; `Location.locationId` is an Int.**
The join requires `parseInt(artefact.locationId, 10)` when building a lookup map from `Location` records in application code. Prisma cannot join across these two models in a single query because they live in different schemas. The query fetches all artefacts, then fetches location names in a second query, and resolves them in memory using a `Map<number, string>`.

**"Publications from the last 31 days" definition.**
Following the ticket spec, the Publication tab includes records where `lastReceivedDate >= (now - 31 days) OR displayTo < now()`. This captures both recent publications and all archived ones.

**Single recipient.**
`MI_REPORT_RECIPIENT_EMAIL` env var holds the recipient address. Multiple recipients are out of scope (YAGNI).

---

## 2. Implementation Details

### File Structure

```
libs/mi-report/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts              # Module config (apiRoutes path only — no page routes)
    ├── index.ts               # Exports generateAndSendMiReport
    ├── generate-xlsx.ts       # XLSX buffer generation using exceljs
    ├── generate-xlsx.test.ts
    ├── report-queries.ts      # Prisma queries for all four tabs
    ├── report-queries.test.ts
    ├── report-service.ts      # Orchestrates queries + XLSX + email send
    └── report-service.test.ts

libs/notifications/src/govnotify/
└── govnotify-client.ts        # Extend with sendEmailWithFile function

libs/api/src/routes/v1/mi/
└── report.ts                  # GET /v1/mi/report — calls generateAndSendMiReport

apps/crons/src/
└── mi-report.ts               # Cron script — imports and calls generateAndSendMiReport
```

### `libs/mi-report/src/config.ts`

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRoutes = { path: path.join(__dirname, "routes") };
```

No `pageRoutes` or `assets` — this module is backend-only.

### `libs/mi-report/src/index.ts`

```typescript
export { generateAndSendMiReport } from "./report-service.js";
```

### `libs/mi-report/src/report-queries.ts`

Four async functions, each returning typed plain objects (no Prisma types leaked outside the file):

```typescript
import { prisma } from "@hmcts/postgres";

export async function fetchPublicationRows(): Promise<PublicationRow[]>
export async function fetchUserAccountRows(): Promise<UserAccountRow[]>
export async function fetchLocationSubscriptionRows(): Promise<LocationSubscriptionRow[]>
export async function fetchAllSubscriptionRows(): Promise<AllSubscriptionRow[]>

interface PublicationRow {
  artefactId: string;
  locationId: string;
  locationName: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date;
  displayTo: Date;
  lastReceivedDate: Date;
  provenance: string;
  supersededCount: number;
  noMatch: boolean;
}

interface UserAccountRow { ... }
interface LocationSubscriptionRow { ... }
interface AllSubscriptionRow { ... }
```

**Publication query logic:**
```typescript
const thirtyOneDaysAgo = new Date();
thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
const now = new Date();

const artefacts = await prisma.artefact.findMany({
  where: {
    OR: [
      { lastReceivedDate: { gte: thirtyOneDaysAgo } },
      { displayTo: { lt: now } }
    ]
  }
});

const locationIds = [...new Set(artefacts.map(a => parseInt(a.locationId, 10)).filter(n => !isNaN(n)))];
const locations = await prisma.location.findMany({
  where: { locationId: { in: locationIds } },
  select: { locationId: true, name: true }
});
const locationMap = new Map(locations.map(l => [l.locationId, l.name]));
```

Note: `prisma.location` is accessed from a different Prisma schema (`libs/location`). In practice this is the same Prisma client instance pointing at the same database, so both models are available on the single `prisma` client imported from `@hmcts/postgres`.

**Subscription queries logic:**
Both subscription tabs join `Subscription` with `Location` via Prisma's `include`:
```typescript
const subscriptions = await prisma.subscription.findMany({
  include: { location: { select: { name: true } } }
});
```
Rows are mapped with hardcoded `channel: 'EMAIL'` and `searchType: 'LOCATION_ID'`.

### `libs/mi-report/src/generate-xlsx.ts`

Uses `exceljs` to build a `Workbook` with four worksheets. Returns a `Buffer`.

```typescript
import ExcelJS from "exceljs";
import type { PublicationRow, UserAccountRow, LocationSubscriptionRow, AllSubscriptionRow } from "./report-queries.js";

export interface ReportData {
  publications: PublicationRow[];
  userAccounts: UserAccountRow[];
  locationSubscriptions: LocationSubscriptionRow[];
  allSubscriptions: AllSubscriptionRow[];
}

export async function generateXlsx(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  addPublicationSheet(workbook, data.publications);
  addUserAccountsSheet(workbook, data.userAccounts);
  addLocationSubscriptionsSheet(workbook, data.locationSubscriptions);
  addAllSubscriptionsSheet(workbook, data.allSubscriptions);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
```

Each `addXxxSheet` function creates the worksheet, sets the header row with bold styling, and adds data rows.

### `libs/mi-report/src/report-service.ts`

```typescript
import { fetchPublicationRows, fetchUserAccountRows, fetchLocationSubscriptionRows, fetchAllSubscriptionRows } from "./report-queries.js";
import { generateXlsx } from "./generate-xlsx.js";
import { sendEmailWithFile } from "@hmcts/notifications";

const MI_REPORT_TEMPLATE_ID = process.env.GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT || "";
const MI_REPORT_RECIPIENT_EMAIL = process.env.MI_REPORT_RECIPIENT_EMAIL || "";

export async function generateAndSendMiReport(): Promise<void> {
  if (!MI_REPORT_TEMPLATE_ID) throw new Error("GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT is not set");
  if (!MI_REPORT_RECIPIENT_EMAIL) throw new Error("MI_REPORT_RECIPIENT_EMAIL is not set");

  console.log("[mi-report] Fetching report data");
  const [publications, userAccounts, locationSubscriptions, allSubscriptions] = await Promise.all([
    fetchPublicationRows(),
    fetchUserAccountRows(),
    fetchLocationSubscriptionRows(),
    fetchAllSubscriptionRows()
  ]);

  console.log("[mi-report] Generating XLSX");
  const buffer = await generateXlsx({ publications, userAccounts, locationSubscriptions, allSubscriptions });

  console.log("[mi-report] Sending email via GOV.UK Notify");
  const result = await sendEmailWithFile({
    emailAddress: MI_REPORT_RECIPIENT_EMAIL,
    templateId: MI_REPORT_TEMPLATE_ID,
    fileBuffer: buffer,
    filename: `mi-report-${new Date().toISOString().slice(0, 10)}.xlsx`
  });

  if (!result.success) {
    throw new Error(`Failed to send MI report email: ${result.error}`);
  }

  console.log("[mi-report] Successfully sent. Notification ID:", result.notificationId);
}
```

### `libs/notifications/src/govnotify/govnotify-client.ts` — extension

Add `sendEmailWithFile` as a new exported function alongside `sendEmail`. It accepts the template ID as a parameter (rather than reading from `getTemplateId()`, which reads the subscription template env var). This keeps concerns separated.

```typescript
export interface SendEmailWithFileParams {
  emailAddress: string;
  templateId: string;
  fileBuffer: Buffer;
  filename: string;
}

export async function sendEmailWithFile(params: SendEmailWithFileParams): Promise<SendEmailResult> {
  const notifyClient = new NotifyClient(getApiKey());
  try {
    const uploadedFile = notifyClient.prepareUpload(params.fileBuffer, {
      filename: params.filename,
      confirmEmailBeforeDownload: false,
      retentionPeriod: "1 week"
    });
    const response = await (notifyClient as any).sendEmail(params.templateId, params.emailAddress, {
      personalisation: { link_to_file: uploadedFile }
    }) as unknown as AxiosEmailResponse;
    const notificationId = response?.data?.id;
    if (!notificationId) throw new Error("Unable to extract notification ID from response");
    console.log("[govnotify-client] File email sent, notification ID:", notificationId);
    return { success: true, notificationId };
  } catch (error: any) {
    const errorDetails = error.response?.data?.errors || error.message || String(error);
    const detailedError = typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails;
    return { success: false, error: `GOV.UK Notify error: ${detailedError}` };
  }
}
```

The `sendEmailWithFile` export must also be added to `libs/notifications/src/index.ts`.

### `libs/api/src/routes/v1/mi/report.ts`

```typescript
import type { Request, Response } from "express";
import { generateAndSendMiReport } from "@hmcts/mi-report";
import { authenticateApi } from "../../../middleware/oauth-middleware.js";

export const GET = [
  authenticateApi(),
  async (_req: Request, res: Response) => {
    try {
      await generateAndSendMiReport();
      return res.status(200).json({ success: true, message: "MI report generated and sent" });
    } catch (error) {
      console.error("[mi/report] Error generating MI report:", error instanceof Error ? error.message : String(error));
      return res.status(500).json({ success: false, message: "Failed to generate MI report" });
    }
  }
];
```

The route lives at `routes/v1/mi/report.ts`. The `simple-router` auto-discovers it, producing the path `/v1/mi/report` under the API app's base path.

### `apps/crons/src/mi-report.ts`

```typescript
import { generateAndSendMiReport } from "@hmcts/mi-report";

export default async function miReport(): Promise<void> {
  console.log("[mi-report-cron] Starting MI report generation");
  try {
    await generateAndSendMiReport();
    console.log("[mi-report-cron] Completed successfully");
  } catch (error) {
    console.error("[mi-report-cron] Failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

Activated by setting `SCRIPT_NAME=mi-report` in the cron Helm values.

---

## 3. XLSX Report Structure

### Tab 1: Publication

Worksheet name: `Publication`

| Column Header | Source |
|---|---|
| Artefact ID | `artefact.artefactId` |
| Location ID | `artefact.locationId` |
| Location Name | Resolved from `location.name` via `parseInt(locationId)` lookup |
| List Type ID | `artefact.listTypeId` |
| Content Date | `artefact.contentDate` |
| Sensitivity | `artefact.sensitivity` |
| Language | `artefact.language` |
| Display From | `artefact.displayFrom` |
| Display To | `artefact.displayTo` |
| Last Received Date | `artefact.lastReceivedDate` |
| Provenance | `artefact.provenance` |
| Superseded Count | `artefact.supersededCount` |
| No Match | `artefact.noMatch` |

**Filter:** `lastReceivedDate >= (now - 31 days) OR displayTo < now()`

**Location resolution:** `Artefact.locationId` is a `String`. Parse to `Int` with `parseInt(locationId, 10)` to look up `Location.locationId` (which is an `Int`). Rows where `locationId` is not a valid integer (e.g., empty string) should have `locationName = ''`.

### Tab 2: User Accounts

Worksheet name: `User Accounts`

| Column Header | Source |
|---|---|
| User ID | `user.userId` |
| Provenance User ID | `user.userProvenanceId` |
| User Provenance | `user.userProvenance` |
| Role | `user.role` |
| Account Creation Date | `user.createdDate` |
| Last Sign-In Date | `user.lastSignedInDate` (nullable — empty string if null) |

**Filter:** All users, no filter.

### Tab 3: Location Subscriptions

Worksheet name: `Location Subscriptions`

| Column Header | Source |
|---|---|
| Subscription ID | `subscription.subscriptionId` |
| Search Value | `subscription.location.name` (the location name acts as the search value) |
| Channel | Hardcoded `'EMAIL'` |
| User ID | `subscription.userId` |
| Location Name | `subscription.location.name` |
| Subscription Date | `subscription.dateAdded` |

**Filter:** All subscriptions (all are LOCATION_ID type). No schema filter needed since there is no `searchType` column.

**Note on "search value":** Since all subscriptions are location-based, the search value is the location name. This is consistent with how the ticket describes the column ("search value (location name)").

### Tab 4: All Subscriptions

Worksheet name: `All Subscriptions`

| Column Header | Source |
|---|---|
| Subscription ID | `subscription.subscriptionId` |
| Channel | Hardcoded `'EMAIL'` |
| Search Type | Hardcoded `'LOCATION_ID'` |
| User ID | `subscription.userId` |
| Location Name | `subscription.location.name` |
| Subscription Date | `subscription.dateAdded` |

**Filter:** All subscriptions.

---

## 4. Environment Variables Required

| Variable | Where Set | Description |
|---|---|---|
| `GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT` | Key Vault / env | GOV.UK Notify template UUID. Template must contain a `((link_to_file))` personalisation placeholder. |
| `MI_REPORT_RECIPIENT_EMAIL` | Key Vault / env | Email address to send the report to. |
| `GOVUK_NOTIFY_API_KEY` | Already exists | Shared with the notification library (already in Key Vault). |

These must be added to `apps/crons/helm/values.yaml` under `job.environment` (non-secret values) or `job.keyVaults.cath.secrets` (secret values). Both `GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT` and `MI_REPORT_RECIPIENT_EMAIL` should be stored as Key Vault secrets.

---

## 5. Error Handling and Edge Cases

**Empty result sets.** If any query returns zero rows (e.g., no publications in the last 31 days), the corresponding XLSX sheet is still created with headers and zero data rows. The report is still sent.

**Invalid `locationId` in `Artefact`.**  `locationId` is stored as a `String` and not validated on ingestion. `parseInt` may return `NaN` for non-numeric values. These rows will have `locationName` set to an empty string and will still be included in the report.

**Location not found.** If a valid integer `locationId` from `Artefact` has no corresponding `Location` row (deleted location, reference data gap), the row's `locationName` will be empty string.

**Missing env vars.** `generateAndSendMiReport` checks both required env vars at the start and throws immediately with a descriptive message before any database query or XLSX generation.

**GOV.UK Notify file attachment limits.** Notify imposes a 2MB limit on file attachments. If the XLSX exceeds this (unlikely for MI data volumes but possible), `sendEmailWithFile` will receive an error from Notify's API and return `{ success: false }`. The service will throw, which will be caught and logged. Consider adding a buffer size guard in the service if volumes grow.

**Cron process exit.** The cron script (`mi-report.ts`) calls `process.exit(1)` on error, ensuring the Kubernetes job reports failure and the concurrency policy (`Forbid`) prevents double-runs.

**Concurrent API calls.** The API route (`GET /v1/mi/report`) is protected by `authenticateApi()`. It is not idempotent but has no side effects beyond Notify API calls, so concurrent calls are safe though wasteful.

---

## 6. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Cron triggers with `SCRIPT_NAME=mi-report` | `apps/crons/src/mi-report.ts` exports `default` function; `index.ts` discovers it by name |
| Endpoint returns 200 on success | `GET /v1/mi/report` returns `res.status(200).json(...)` |
| Endpoint returns 500 on error | `catch` block returns `res.status(500).json(...)` |
| Publication tab: last 31 days + archived | `fetchPublicationRows` uses OR filter on `lastReceivedDate` / `displayTo` |
| Publication tab: location names resolved | Two-query approach with in-memory `Map<number, string>` |
| User Accounts tab: correct columns | `fetchUserAccountRows` selects required fields from `User` |
| Location Subscriptions tab: filtered to LOCATION_ID | All subscriptions included (all are location-based); `searchType` hardcoded |
| All Subscriptions tab: all subscriptions | `fetchAllSubscriptionRows` with no filter |
| Error logged with details | `console.error` in `report-service.ts` and cron script |
| Success logged with reference ID | `console.log("[mi-report] Successfully sent. Notification ID:", result.notificationId)` |
| Email sent via GOV.UK Notify | `sendEmailWithFile` in `@hmcts/notifications` using `prepareUpload` |

---

## 7. Clarifications Needed

1. **GOV.UK Notify plan / file attachment availability.** The `prepareUpload` / `link_to_file` feature requires that the Notify service account is enabled for file uploads. Confirm with the team that the existing API key's plan supports this. If not, the alternative is to generate a pre-signed Azure Blob Storage URL and include it as a plain link in the email.

2. **Report schedule.** The `values.yaml` currently has `schedule: "0 0/10 * * *"` as a placeholder. The business-required frequency (daily, weekly, monthly) needs confirmation from stakeholders before the Helm values are finalised.

3. **Multiple recipients.** The plan uses a single `MI_REPORT_RECIPIENT_EMAIL`. If multiple recipients are needed, a distribution list email address is the simplest solution without code changes. Confirm with the team.

4. **`Artefact.locationId` data quality.** The field is a `String` and may contain non-integer values in practice. Confirm whether any such records exist in production and whether they should be excluded from the report or included with a blank location name.

5. **GOV.UK Notify template.** A new template must be created in the GOV.UK Notify dashboard with a `((link_to_file))` personalisation placeholder before deployment. The resulting template UUID becomes the value of `GOVUK_NOTIFY_TEMPLATE_ID_MI_REPORT`.

6. **`@hmcts/postgres` Prisma client scope.** The codebase uses a single Prisma client generated from merged schemas. Confirm that `prisma.subscription` and `prisma.location` (from `libs/subscriptions` and `libs/location` schemas) are available on the same client instance imported from `@hmcts/postgres`, as assumed in this plan.
