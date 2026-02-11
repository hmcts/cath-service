# Technical Implementation Plan - Third Party User Management

## Technical Approach

### High-Level Strategy
Implement a complete CRUD workflow for third-party users within the `libs/system-admin-pages` module, following existing patterns from delete-court and reference-data-upload flows.

### Architecture Decisions
1. **Module Location**: All pages go in `libs/system-admin-pages/src/pages/` following existing patterns
2. **Database**: Add new Prisma models to `apps/postgres/prisma/schema.prisma`
3. **Session Storage**: Use Express sessions for multi-page flow state (like delete-court pattern)
4. **Authorization**: Use `requireRole([USER_ROLES.SYSTEM_ADMIN])` middleware on all routes
5. **List Types**: Use existing `mockListTypes` from `@hmcts/list-types/common` for subscription options

## Implementation Details

### Database Schema

Add to `apps/postgres/prisma/schema.prisma`:

```prisma
model LegacyThirdPartyUser {
  id          String    @id @default(uuid()) @map("id") @db.Uuid
  name        String    @db.VarChar(255)
  createdDate DateTime  @default(now()) @map("created_date")

  subscriptions LegacyThirdPartySubscription[]

  @@map("legacy_third_party_user")
}

model LegacyThirdPartySubscription {
  id          String    @id @default(uuid()) @map("id") @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  listTypeId  Int       @map("list_type_id")
  channel     String    @default("API") @db.VarChar(20)
  sensitivity String    @db.VarChar(20)  // PUBLIC, PRIVATE, CLASSIFIED
  createdDate DateTime  @default(now()) @map("created_date")

  user        LegacyThirdPartyUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([listTypeId])
  @@map("legacy_third_party_subscription")
}
```

### File Structure

```
libs/system-admin-pages/src/
├── pages/
│   ├── manage-third-party-users/           # List view
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── create-third-party-user/            # Name input form
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── create-third-party-user-summary/    # Review before confirm
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── third-party-user-created/           # Creation confirmation
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── manage-third-party-user/            # Single user details
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── manage-third-party-subscriptions/   # Subscription selection
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── third-party-subscriptions-updated/  # Update confirmation
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   ├── delete-third-party-user/            # Yes/No confirmation
│   │   ├── index.ts
│   │   ├── index.njk
│   │   ├── index.test.ts
│   │   ├── en.ts
│   │   └── cy.ts
│   └── third-party-user-deleted/           # Deletion confirmation
│       ├── index.ts
│       ├── index.njk
│       ├── index.test.ts
│       ├── en.ts
│       └── cy.ts
├── third-party-user/
│   ├── queries.ts                          # Database queries
│   ├── queries.test.ts
│   ├── service.ts                          # Business logic
│   ├── service.test.ts
│   └── validation.ts                       # Input validation
```

### Screen Flow Routes

| Screen | Route | Purpose |
|--------|-------|---------|
| List all users | `/manage-third-party-users` | Table of users with Manage links |
| Create form | `/create-third-party-user` | Name input |
| Create summary | `/create-third-party-user-summary` | Review + Change link |
| Created confirmation | `/third-party-user-created` | Success message |
| Manage single user | `/manage-third-party-user?id=<uuid>` | View details + actions |
| Manage subscriptions | `/manage-third-party-subscriptions?id=<uuid>` | Channel + list types |
| Subscriptions updated | `/third-party-subscriptions-updated` | Success message |
| Delete confirmation | `/delete-third-party-user?id=<uuid>` | Yes/No radios |
| Deleted confirmation | `/third-party-user-deleted` | Success message |

## Error Handling & Edge Cases

### Validation Rules
- **Name required**: Cannot be empty
- **No whitespace-only**: Trim and check length > 0
- **Max length**: 255 characters (database constraint)
- **Character rules**: Allow alphanumeric, spaces, hyphens, apostrophes

### Idempotency on Create
Store a unique token in session when showing summary. On confirm POST, check if token was already consumed (user created). If already consumed, redirect to confirmation page with existing user data instead of creating duplicate.

### Back Navigation
Session stores:
```typescript
interface ThirdPartySession {
  createThirdPartyUser?: {
    name: string;
    idempotencyToken: string;
    createdUserId?: string; // Set after creation
  };
  manageThirdPartyUser?: {
    userId: string;
    originalSubscriptions: number[]; // For audit before/after
  };
}
```

### Edge Cases
1. **User not found**: Return 404 or redirect to list with error flash
2. **Session expired**: Redirect to start of flow
3. **Concurrent deletion**: Check user exists before confirming delete
4. **No list types**: Show empty state message if none configured

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| System Admin only access | `requireRole([USER_ROLES.SYSTEM_ADMIN])` on all routes |
| Back without losing data | Session storage for flow state |
| Page refresh no duplicates | Idempotency token pattern |
| Audit logging | Call audit service on create/update/delete with before/after |
| Table of users with Manage | `/manage-third-party-users` with GOV.UK table component |
| Create new user button | Green button linking to `/create-third-party-user` |
| Name validation | Server-side validation in POST handler |
| Summary with Change link | `/create-third-party-user-summary` renders data and links back |
| Confirmation page | `/third-party-user-created` shows success banner |
| Manage user details | `/manage-third-party-user?id=` shows table of details |
| Subscription checkboxes | All list types from mockListTypes shown as checkboxes |
| Delete confirmation | Yes/No radios with third-party name in title |
| Cascade delete | Prisma `onDelete: Cascade` on subscription relation |

## Audit Logging

Use the audit log middleware pattern from `libs/system-admin-pages/src/audit-log/middleware.ts`. Set `req.auditMetadata` before redirecting on success:

```typescript
// On create (in create-third-party-user-summary POST handler)
req.auditMetadata = {
  shouldLog: true,
  action: "CREATE_THIRD_PARTY_USER",
  entityInfo: `Name: ${user.name}`
};
res.redirect("/third-party-user-created");

// On subscription update (in manage-third-party-subscriptions POST handler)
req.auditMetadata = {
  shouldLog: true,
  action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS",
  entityInfo: `Name: ${user.name}, Before: ${originalSubscriptions.length} subscriptions, After: ${newSubscriptions.length} subscriptions`
};
res.redirect("/third-party-subscriptions-updated");

// On delete (in delete-third-party-user POST handler)
req.auditMetadata = {
  shouldLog: true,
  action: "DELETE_THIRD_PARTY_USER",
  entityInfo: `Name: ${user.name}`
};
res.redirect("/third-party-user-deleted");
```

The middleware automatically captures user details (userId, email, role, provenance) from `req.user` and logs on successful redirects.

## Resolved Clarifications

| Item | Resolution |
|------|------------|
| **Sensitivity values** | `PUBLIC`, `PRIVATE`, `CLASSIFIED` - stored on subscription, display highest on user view |
| **Channel** | Single option: `API` - display as radio button (for future extensibility) |
| **List types source** | Use `mockListTypes` from `@hmcts/list-types/common` |
| **Audit log** | Set `req.auditMetadata` flag - middleware in `libs/system-admin-pages/src/audit-log/middleware.ts` handles logging |
| **Dashboard link** | Add link to system-admin-dashboard as part of this ticket |
| **Deletion cascade** | Subscriptions cascade delete via Prisma relation; no other dependencies block deletion |
