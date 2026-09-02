# Technical Plan: #301 — Third Party User Management

## 1. Technical Approach

This feature adds a full CRUD workflow for third-party users to the System Admin section. All pages live in `libs/system-admin-pages` (consistent with existing admin pages). A new Prisma schema is introduced in a dedicated `libs/third-party-user` module that owns the data model and service layer.

LaunchDarkly is introduced for the first time in this codebase to A/B test the subscriptions UI (radio buttons vs dropdown). The `cath-ld-key` secret has been provisioned to the `pip-ss-kv-stg` keyvault.

### Screen flows

**Create:** `/third-party-users` → `/third-party-users/create` → `/third-party-users/create/summary` → `/third-party-users/create/confirmation`

**Manage:** `/third-party-users` → `/third-party-users/[id]` → `/third-party-users/[id]/subscriptions` → `/third-party-users/[id]/subscriptions/confirmation`

**Delete:** `/third-party-users/[id]` → `/third-party-users/[id]/delete` → `/third-party-users/[id]/delete/confirmation`

---

## 2. Implementation Details

### 2.1 New library: `libs/third-party-user`

Owns the Prisma schema, database service functions, and shared validation. Pages remain in `libs/system-admin-pages`.

**Prisma schema** (`libs/third-party-user/prisma/schema.prisma`):

```prisma
model ThirdPartyUser {
  id           String                    @id @default(cuid())
  name         String                    @db.VarChar(255)
  createdAt    DateTime                  @default(now()) @map("created_at")
  subscriptions ThirdPartySubscription[]

  @@map("third_party_user")
}

model ThirdPartySubscription {
  id              String         @id @default(cuid())
  thirdPartyUserId String        @map("third_party_user_id")
  listType        String         @map("list_type") @db.VarChar(100)
  sensitivity     String         @db.VarChar(20)  // "PUBLIC" | "PRIVATE" | "CLASSIFIED"

  thirdPartyUser ThirdPartyUser @relation(fields: [thirdPartyUserId], references: [id], onDelete: Cascade)

  @@unique([thirdPartyUserId, listType])
  @@map("third_party_subscription")
}
```

**Service functions** (`libs/third-party-user/src/third-party-user-service.ts`):
- `findAllThirdPartyUsers(): Promise<ThirdPartyUser[]>`
- `findThirdPartyUserById(id: string): Promise<ThirdPartyUser & { subscriptions }>`
- `createThirdPartyUser(name: string): Promise<ThirdPartyUser>` — idempotency: use `findFirst({ where: { name } })` before creating
- `updateThirdPartySubscriptions(userId: string, subscriptions: Record<string, string>): Promise<void>` — delete all then re-insert
- `deleteThirdPartyUser(id: string): Promise<void>`
- `thirdPartyUserExists(name: string): Promise<boolean>`

**Validation** (`libs/third-party-user/src/name-validation.ts`):
- Not empty after trim
- Not whitespace-only
- Max 255 chars
- Allowed chars: `^[a-zA-Z0-9 '\-]+$`

**Config** (`libs/third-party-user/src/config.ts`):
```typescript
export const prismaSchemas = path.join(__dirname, "../prisma");
```

**Package**: `@hmcts/third-party-user`

### 2.2 New pages in `libs/system-admin-pages`

Each page follows the existing pattern: `index.ts` (controller), `en.ts`, `cy.ts`, `index.njk`, `index.test.ts`.

```
libs/system-admin-pages/src/pages/
├── third-party-users/
│   ├── index.ts            # GET: list all third-party users
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/create/
│   ├── index.ts            # GET+POST: name input form
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/create/summary/
│   ├── index.ts            # GET+POST: confirm before create
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/create/confirmation/
│   ├── index.ts            # GET: success panel
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/[id]/
│   ├── index.ts            # GET: manage user details
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/[id]/subscriptions/
│   ├── index.ts            # GET+POST: manage subscriptions (paginated)
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/[id]/subscriptions/confirmation/
│   ├── index.ts            # GET: success panel
│   ├── en.ts / cy.ts
│   └── index.njk
├── third-party-users/[id]/delete/
│   ├── index.ts            # GET+POST: yes/no confirmation
│   ├── en.ts / cy.ts
│   └── index.njk
└── third-party-users/[id]/delete/confirmation/
    ├── index.ts            # GET: success panel
    ├── en.ts / cy.ts
    └── index.njk
```

### 2.3 Session management

A typed session interface per flow to retain data across back-navigation:

```typescript
interface ThirdPartyUserSession {
  thirdPartyUserCreate?: {
    name: string;
    createdId?: string;  // set after successful creation for idempotency
  };
  thirdPartyUserSubscriptions?: {
    userId: string;
    pendingSubscriptions: Record<string, string>;  // listType -> sensitivity
  };
}
```

### 2.4 LaunchDarkly integration (new)

A new `libs/cloud-native-platform` module already exists. LaunchDarkly should be introduced as a thin wrapper:

**New file**: `libs/system-admin-pages/src/feature-flags/launch-darkly.ts`

```typescript
import { init, LDClient } from "@launchdarkly/node-server-sdk";

const LD_SDK_KEY = process.env.CATH_LD_KEY ?? "";

let client: LDClient | null = null;

export async function getLdClient(): Promise<LDClient> {
  if (!client) {
    client = init(LD_SDK_KEY);
    await client.waitForInitialization({ timeout: 5 });
  }
  return client;
}

export async function isFeatureEnabled(flagKey: string, userId: string): Promise<boolean> {
  const ldClient = await getLdClient();
  return ldClient.variation(flagKey, { key: userId }, false);
}
```

**Flag key**: `third-party-subscriptions-dropdown` — `false` = radio buttons (Option 1), `true` = dropdown (Option 2)

The subscriptions page controller reads the flag per admin user and passes `useDropdown: boolean` to the template. The Nunjucks template conditionally renders the appropriate table variant.

### 2.5 Subscriptions page: pagination

All list types come from the existing `@hmcts/list-types` module. Paginate at 20 per page using query param `?page=1`. The POST handler accumulates subscription state across pages via session (`pendingSubscriptions`). "Save Subscriptions" on the last page writes to the database.

### 2.6 Audit logging

Follow existing pattern from `delete-court-confirm/index.ts`: set `req.auditMetadata` before `res.redirect()`.

```typescript
req.auditMetadata = {
  shouldLog: true,
  action: "CREATE_THIRD_PARTY_USER",
  entityInfo: `Name: ${name}`
};
```

Actions to audit:
- `CREATE_THIRD_PARTY_USER` — after confirmation POST
- `UPDATE_THIRD_PARTY_SUBSCRIPTIONS` — with before/after as JSON in entityInfo
- `DELETE_THIRD_PARTY_USER` — after delete confirmation POST (Yes)

### 2.7 Idempotency on create confirmation

Store the created user's `id` in session after first creation. On subsequent POSTs to the summary confirmation page, if `session.thirdPartyUserCreate.createdId` is set, skip re-creation and redirect directly to the confirmation page.

### 2.8 App registration

**`apps/postgres/src/schema-discovery.ts`**: add `prismaSchemas` from `@hmcts/third-party-user/config`

**`apps/web/src/app.ts`**: add `pageRoutes` from `@hmcts/system-admin-pages/config` (already registered — no change needed since pages are added to the existing module)

**`root tsconfig.json`**: add `"@hmcts/third-party-user": ["libs/third-party-user/src"]`

---

## 3. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| User navigates directly to summary without session | Redirect to `/third-party-users/create` |
| User navigates directly to manage page with invalid ID | 404 / redirect to `/third-party-users` |
| Duplicate name on confirm | Re-render summary with "This third party user already exists" error |
| Page refresh on confirmation | Idempotency check via `session.createdId` — skip re-create |
| Delete with "No" selected | Redirect back to manage user page |
| LaunchDarkly unavailable | Default to `false` (radio buttons) — safe fallback |
| Empty list types | Show empty state with message |

---

## 4. Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| System Admin role only | `requireRole([USER_ROLES.SYSTEM_ADMIN])` in all GET/POST middleware arrays |
| Back preserves data | Session stores `thirdPartyUserCreate` / `thirdPartyUserSubscriptions` typed objects |
| No duplicate on refresh | `session.createdId` idempotency check on summary confirm POST |
| Audit log on create | `req.auditMetadata` set in create confirmation POST |
| Audit log on update subscriptions | `req.auditMetadata` set with before/after JSON in subscriptions POST |
| Audit log on delete | `req.auditMetadata` set in delete confirmation POST |
| Name validation | `name-validation.ts` — empty, whitespace, 255 chars, allowed chars |
| DB table | `third_party_user` + `third_party_subscription` Prisma models |
| Subscriptions A/B test | LaunchDarkly flag `third-party-subscriptions-dropdown` |
| Welsh translations | All `cy.ts` files with provided translations |
| WCAG 2.2 AA | GOV.UK Design System components; error associations via `aria-describedby` |

---

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **LaunchDarkly SDK version**: The codebase has no existing LD dependency. Which SDK package should be used — `@launchdarkly/node-server-sdk` (v9+) or the legacy `launchdarkly-node-server-sdk`?

2. **List types source**: The `@hmcts/list-types` module provides list type definitions. Should subscriptions display the full human-readable name of each list type, or a code? What is the exact data structure the subscriptions page should reference?

3. **Sensitivity field semantics**: The issue says "where 'classified' is selected, the user has access to public, private and classified lists." Is this access-level hierarchy enforced at query time (i.e., show all lists where sensitivity ≤ user's sensitivity), or is it a display note only?

4. **Dependency check on delete**: The issue says "System prevents deletion of users with dependencies (if applicable)." What counts as a dependency? Is it sufficient to treat associated subscriptions as cascaded (auto-deleted), or are there external systems that reference third-party users?

5. **Missing Welsh translations**: Several Welsh strings are listed as "Welsh placeholder" in the issue (e.g., confirmation messages, error messages). Are these to be delivered as part of this ticket or deferred?

6. **LaunchDarkly user context**: Should the LD flag evaluation use the admin user's ID from session, or an anonymous/static context (e.g., for consistent rollout)?

7. **Subscriptions pagination**: Should subscription selections be held in session across pages, or should the entire form be submitted on each page with partial saves? The session approach is simpler but requires the admin to not abandon mid-flow.
