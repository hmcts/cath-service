# Technical Plan: Third Party Subscription Fulfilment

## Overview

When a publication is processed (via manual upload or API blob ingestion), the system must identify third-party users subscribed to that list type and push the publication JSON (and PDF if available) to their registered API endpoint using certificate-based authentication.

The `LegacyThirdPartyUser` and `LegacyThirdPartySubscription` tables already exist from ticket #322. This ticket adds the fulfilment logic: the HTTP push itself.

---

## Technical Approach

### High-Level Strategy

1. **New module**: Create `libs/third-party-fulfilment` containing HTTP push logic, header building, and retry
2. **Integration point**: Extend `processPublication` in `libs/publication/src/processing/service.ts` — the same function used for email notifications and PDF generation
3. **No schema changes**: The existing `LegacyThirdPartyUser` table from #322 is used as-is; endpoint URL and certificate are read from fixed env vars (`COURTEL_API_URL`, `COURTEL_CERTIFICATE`) loaded from Azure Key Vault at startup
4. **Deletion push**: Trigger empty-body push from the remove-list page

### Architecture Decisions

**Why extend `processPublication` rather than hooking individual upload handlers?**

`processPublication` in `libs/publication/src/processing/service.ts` is already called from both manual upload (`libs/admin-pages`) and blob ingestion (`libs/api`). Adding the third-party push here means all upload paths are covered automatically, consistent with how email notifications are handled.

**Why no database changes?**

The endpoint URL and certificate are fixed — there is one third-party push destination (Courtel). The push code reads `process.env.COURTEL_API_URL` and `process.env.COURTEL_CERTIFICATE` directly. No per-user configuration is required in the database.

**Subscription matching by list type only**

`LegacyThirdPartySubscription` stores `listTypeId` with no location field. The push subscription is "I want all publications of list type X" regardless of court. This matches the existing data model.

**CREATE vs UPDATE detection**

The `Artefact` table has a `supersededCount` field (already incremented by `createArtefact` when an artefact is replaced). At push time, check if `supersededCount > 0` — if so, it's an update.

**Key Vault secrets**

Both the endpoint URL and the client certificate (trust store) are retrieved from Azure Key Vault (`pip-ss-kv-stg`). The existing `configurePropertiesVolume` / `addFromAzureVault` pattern in `libs/cloud-native-platform` loads secrets into `process.env` **once at startup** by reading all secrets listed under `keyVaults` in `apps/api/helm/values.yaml`.

The Courtel secrets already exist in `pip-ss-kv-stg` (and `pip-ss-kv-stg` is already a referenced vault in the API Helm chart):

| KV Secret Name | Alias (env var) |
|---|---|
| `auto-pip-stg-courtel-api` | `COURTEL_API_URL` |
| `courtel-certificate` | `COURTEL_CERTIFICATE` |

The push code reads these env vars directly as constants. The certificate value is base64-encoded and must be decoded (`Buffer.from(value, 'base64').toString('utf-8')`) before being passed to `https.Agent`.

**Important constraint**: secrets are not fetched dynamically at push time. They are pre-loaded at startup from the Helm chart. Adding a new third-party user requires adding their secrets to `apps/api/helm/values.yaml` and redeploying the API.

---

## Implementation Details

### 1. Database Schema Changes

None. The `LegacyThirdPartyUser` table from #322 is used as-is. No migration is required.

### 2. Module Structure

```
libs/third-party-fulfilment/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts               # Module config (no pages/routes, no prismaSchemas needed)
    ├── index.ts                # Public API: sendThirdPartyPublications
    ├── push/
    │   ├── headers.ts          # Build custom x-* headers from artefact + location
    │   ├── headers.test.ts
    │   ├── http-client.ts      # HTTPS POST with client certificate from process.env
    │   ├── http-client.test.ts
    │   ├── retry.ts            # Retry up to 3 times with exponential backoff
    │   └── retry.test.ts
    ├── queries.ts              # Find subscribed third-party users by listTypeId
    ├── queries.test.ts
    └── service.ts              # Orchestration: find subscribers → build headers → push
    └── service.test.ts
```

No Prisma schema in this module — queries go directly to `@hmcts/postgres` (same pattern as `libs/location`).

### 3. Core Service

**`libs/third-party-fulfilment/src/service.ts`**

```typescript
export interface ThirdPartyPushParams {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date;
  displayTo: Date;
  provenance: string;
  jsonData?: unknown;
  pdfFilePath?: string;
  isUpdate: boolean;
  logPrefix?: string;
}

export async function sendThirdPartyPublications(params: ThirdPartyPushParams): Promise<void> {
  const subscribers = await findActiveThirdPartySubscribersByListType(params.listTypeId);

  if (subscribers.length === 0) return;

  const location = await getLocationWithDetails(Number.parseInt(params.locationId, 10));
  const headers = buildPushHeaders({ ...params, location });

  // Subscribers exist — push once to Courtel (URL and cert are fixed constants from Key Vault)
  await pushToCourtel(headers, params);
}
```

**Deletion push** (called from remove-list page):

```typescript
export async function sendThirdPartyDeletion(params: Omit<ThirdPartyPushParams, "jsonData" | "pdfFilePath" | "isUpdate">): Promise<void> {
  const subscribers = await findActiveThirdPartySubscribersByListType(params.listTypeId);
  if (subscribers.length === 0) return;

  const location = await getLocationWithDetails(Number.parseInt(params.locationId, 10));
  const headers = buildPushHeaders({ ...params, location });

  // Push empty body once to Courtel
  await pushToCourtel(headers, { ...params, jsonData: undefined, pdfFilePath: undefined });
}
```

### 4. Headers Builder

**`libs/third-party-fulfilment/src/push/headers.ts`**

Required headers from the ticket spec:

| Header | Source |
|--------|--------|
| `x-provenance` | `artefact.provenance` |
| `x-source-artefact-id` | `artefact.artefactId` |
| `x-type` | list type name (from list type ID) |
| `x-list-type` | list type name |
| `x-content-date` | `artefact.contentDate.toISOString()` |
| `x-sensitivity` | `artefact.sensitivity` |
| `x-language` | `artefact.language` |
| `x-display-from` | `artefact.displayFrom.toISOString()` |
| `x-display-to` | `artefact.displayTo.toISOString()` |
| `x-location-name` | `location.name` |
| `x-location-jurisdiction` | `location.subJurisdictions[0]?.jurisdictionName ?? ""` |
| `x-location-region` | `location.regions[0]?.name ?? ""` |

Location details come from `getLocationWithDetails` in `@hmcts/location` which already returns region names and jurisdiction names via `LocationDetails`.

### 5. HTTP Client with Certificate Auth

**`libs/third-party-fulfilment/src/push/http-client.ts`**

```typescript
import https from "node:https";

export async function executePush(url: string, certPem: string, headers: Record<string, string>, body: string | null): Promise<{ statusCode: number; success: boolean }> {
  // url and certPem are both loaded from process.env at push time
  const agent = new https.Agent({ cert: certPem, key: certPem, rejectUnauthorized: true });
  // ... fetch with agent
}
```

Key Vault retrieval at push time — fixed env vars loaded at startup:

```typescript
const url = process.env.COURTEL_API_URL;
const certPem = Buffer.from(process.env.COURTEL_CERTIFICATE, 'base64').toString('utf-8');
```

Both values are pre-loaded into `process.env` at app startup by `configurePropertiesVolume` reading `apps/api/helm/values.yaml` and fetching from `pip-ss-kv-stg`. If either env var is absent, the push is skipped with a clear error log.

### 6. Retry Logic

**`libs/third-party-fulfilment/src/push/retry.ts`**

- Up to 3 attempts
- Exponential backoff: 1s, 2s (skipped after final attempt)
- Do not retry on 4xx (except 429 rate-limit)
- Accept 200, 201, 202, 204 as success

### 7. Subscription Queries

**`libs/third-party-fulfilment/src/queries.ts`**

```typescript
import { prisma } from "@hmcts/postgres";

export async function findActiveThirdPartySubscribersByListType(listTypeId: number) {
  return prisma.legacyThirdPartySubscription.findMany({
    where: { listTypeId },
    include: { user: true }
  });
}
```

### 8. Integration with `processPublication`

Add to `libs/publication/src/processing/service.ts`:

```typescript
import { sendThirdPartyPublications } from "@hmcts/third-party-fulfilment";

// In processPublication, after PDF generation:
if (!skipThirdPartyPush) {
  const artefact = await getArtefactById(artefactId);
  const isUpdate = (artefact?.supersededCount ?? 0) > 0; // supersededCount > 0 means replaced before

  sendThirdPartyPublications({
    artefactId,
    locationId,
    listTypeId,
    contentDate,
    sensitivity: artefact?.sensitivity ?? "",
    language: artefact?.language ?? "",
    displayFrom: displayFrom ?? new Date(),
    displayTo: displayTo ?? new Date(),
    provenance: provenance ?? "",
    jsonData,
    pdfFilePath: result.pdfPath,
    isUpdate,
    logPrefix
  }).catch((error) => {
    console.error(`${logPrefix} Third-party push failed:`, error);
  });
}
```

Add `skipThirdPartyPush?: boolean` to `ProcessPublicationParams`.

This is fire-and-forget (`.catch()` to absorb errors) matching the notification pattern.

### 9. Deletion Push Integration

Find the remove-list page (likely in `libs/admin-pages` or `libs/system-admin-pages`) and add a call to `sendThirdPartyDeletion` after the artefact is deleted, passing artefact metadata retrieved before deletion.

### 10. Module Registration

```typescript
// tsconfig.json — add path:
"@hmcts/third-party-fulfilment": ["libs/third-party-fulfilment/src"]

// libs/publication/package.json — add workspace dependency:
"@hmcts/third-party-fulfilment": "*"
```

No Prisma schema to register — the module queries `@hmcts/postgres` directly.

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| No subscribers for list type | Silent return — expected case |
| `COURTEL_API_URL` or `COURTEL_CERTIFICATE` not in `process.env` | Skip push, log error (Helm chart entry missing) |
| Third-party endpoint returns 4xx | No retry (except 429), log HTTP status |
| Third-party endpoint returns 5xx | Retry up to 3 times |
| Network timeout / connection refused | Retry up to 3 times |
| Location not found | Use empty strings for location headers, log warning |
| Deletion of flat-file publication | Send empty body with same headers |

---

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| Identify Third Party User ID subscribed to publication | `findActiveThirdPartySubscribersByListType(listTypeId)` |
| Retrieve publication metadata from artefact table | `getArtefactById(artefactId)` — fields passed through `processPublication` params |
| Send file in JSON format via POST | `executePush` with `Content-Type: application/json`, JSON body |
| Use third party authorisation certificate | cert PEM from `process.env.COURTEL_CERTIFICATE`; URL from `process.env.COURTEL_API_URL` — both loaded from Azure Key Vault (`pip-ss-kv-stg`) at startup |
| Acknowledgment receipt via HTTP status | `executePush` returns statusCode — success if 2xx |
| Notify on upload/update/delete | `isUpdate` flag from `supersededCount`; deletion via `sendThirdPartyDeletion` with empty body |
| Accept 200/201/202/204 as success | Checked in retry logic |
| Validate no send without trigger | `sendThirdPartyPublications` only called from `processPublication` |
| Differentiate new vs updated | `artefact.supersededCount === 0` → CREATE, `> 0` → UPDATE |
| Integration and unit tests | All service/query/client files have co-located `.test.ts` files |

---

## Open Questions

1. **PDF payload format**: The spec says "It also includes PDF generated for that list." Should the PDF binary be included in the POST body as multipart/form-data, or is JSON-only sufficient? Current plan sends JSON only; PDF path is available if needed.

2. **Key Vault secrets** ✅ Resolved: Courtel secrets already exist in `pip-ss-kv-stg` — `auto-pip-stg-courtel-api` (endpoint URL) and `courtel-certificate` (base64-encoded PEM cert chain). These will be added to `apps/api/helm/values.yaml` under `pip-ss-kv-stg` with aliases `COURTEL_API_URL` and `COURTEL_CERTIFICATE`.

3. **Multiple regions/jurisdictions**: A location may have multiple regions and sub-jurisdictions. The current plan uses the first value. Confirm whether all values should be sent (e.g., comma-separated) or just the first.

4. **Remove-list page location**: Need to identify the exact page/handler where publications are manually deleted to add the deletion push trigger.

5. **Sensitivity filtering**: `LegacyThirdPartySubscription` has a `sensitivity` field. Should the push be filtered by `artefact.sensitivity <= subscription.sensitivity`? Or push regardless?
