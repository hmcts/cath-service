# VIBE-247: Authentication on Classified Publications - Technical Implementation Plan

## Overview

This plan details the technical implementation for authenticating and authorizing users to access publications based on sensitivity levels (PUBLIC, PRIVATE, CLASSIFIED) and user provenance matching.

## Architecture Overview

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  (Publication Pages, Summary Pages, Error Pages)                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP Requests
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     Authorization Middleware                     │
│  - requirePublicationAccess(metadataOnly?: boolean)             │
│  - Checks user authentication status                             │
│  - Validates sensitivity level permissions                       │
│  - Validates provenance matching for CLASSIFIED                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Authorized Request
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   Publication Service Layer                      │
│  - getPublicationWithAccess()                                    │
│  - checkPublicationAccess()                                      │
│  - Query publications with sensitivity filtering                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Database Queries
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Database Layer (Prisma)                     │
│  - Artefact table (with sensitivity column)                      │
│  - User table (with userProvenance and role)                     │
│  - ListType reference data (with provenance)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### 1. Create ListType Table

A new reference data table is needed to store list type information including provenance.

**Location**: `apps/postgres/prisma/schema.prisma`

```prisma
model ListType {
  listTypeId        Int      @id @map("list_type_id")
  name              String   @unique
  englishFriendlyName String @map("english_friendly_name")
  welshFriendlyName String   @map("welsh_friendly_name")
  provenance        String   @db.VarChar(20)
  urlPath           String?  @map("url_path")

  @@map("list_type")
}
```

**Migration Required**: Yes
- Add new table
- Populate with existing list types from `mockListTypes`
- Add foreign key constraint from Artefact.listTypeId to ListType.listTypeId

### 2. Add Indexes for Performance

**Location**: `apps/postgres/prisma/schema.prisma`

```prisma
model Artefact {
  // ... existing fields ...

  @@index([sensitivity])
  @@index([provenance])
  @@index([locationId, sensitivity, displayFrom, displayTo])
}
```

**Migration Required**: Yes
- Add index on `sensitivity` for filtering
- Add index on `provenance` for CLASSIFIED matching
- Add composite index for common query pattern in summary pages

### 3. Update User Model (if needed)

The existing User model already has the required fields:
- `userProvenance` (SSO, CFT_IDAM, CRIME_IDAM, B2C)
- `role` (SYSTEM_ADMIN, INTERNAL_ADMIN_LOCAL, INTERNAL_ADMIN_CTSC, VERIFIED)

No changes required.

## Authorization Middleware

### 1. Publication Access Middleware

**Location**: `libs/auth/src/middleware/publication-access.ts`

```typescript
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Sensitivity } from "@hmcts/publication";
import { USER_ROLES } from "@hmcts/account";

interface PublicationAccessOptions {
  metadataOnly?: boolean;
}

export function requirePublicationAccess(options: PublicationAccessOptions = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { metadataOnly = false } = options;

    // Publication data should be in res.locals (set by page handler)
    const artefact = res.locals.artefact;

    if (!artefact) {
      console.error("Publication access middleware called without artefact in res.locals");
      return res.status(500).redirect("/500");
    }

    const hasAccess = await checkPublicationAccess(
      artefact,
      req.user,
      metadataOnly
    );

    if (!hasAccess) {
      if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect("/sign-in");
      }

      return res.status(403).render("errors/403-publication-access", {
        sensitivity: artefact.sensitivity,
        en: {
          title: "Access denied",
          message: "You do not have permission to view this publication."
        },
        cy: {
          title: "Mynediad wedi'i wrthod",
          message: "Nid oes gennych ganiatâd i weld y cyhoeddiad hwn."
        }
      });
    }

    next();
  };
}

async function checkPublicationAccess(
  artefact: { sensitivity: string; provenance: string; listTypeId: number },
  user: Express.User | undefined,
  metadataOnly: boolean
): Promise<boolean> {
  const sensitivity = artefact.sensitivity;

  // PUBLIC - accessible to everyone
  if (sensitivity === Sensitivity.PUBLIC) {
    return true;
  }

  // Unauthenticated users can only access PUBLIC
  if (!user) {
    return false;
  }

  // SYSTEM_ADMIN can access everything
  if (user.role === USER_ROLES.SYSTEM_ADMIN) {
    return true;
  }

  // Internal admins (LOCAL_ADMIN, CTSC_ADMIN) can only access metadata
  if (
    user.role === USER_ROLES.INTERNAL_ADMIN_LOCAL ||
    user.role === USER_ROLES.INTERNAL_ADMIN_CTSC
  ) {
    // Can view metadata for PRIVATE/CLASSIFIED but not content
    return metadataOnly;
  }

  // PRIVATE - accessible to verified users
  if (sensitivity === Sensitivity.PRIVATE) {
    return user.role === "VERIFIED";
  }

  // CLASSIFIED - requires provenance matching
  if (sensitivity === Sensitivity.CLASSIFIED) {
    if (user.role !== "VERIFIED") {
      return false;
    }

    // Get list type provenance
    const listType = await getListTypeById(artefact.listTypeId);
    if (!listType) {
      console.error(`List type not found: ${artefact.listTypeId}`);
      return false;
    }

    // Check if user provenance matches list type provenance
    return user.userProvenance === listType.provenance;
  }

  // Default deny
  return false;
}
```

### 2. Authorization Service

**Location**: `libs/auth/src/publication-authorization/service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import { Sensitivity } from "@hmcts/publication";
import { USER_ROLES } from "@hmcts/account";

export interface User {
  userProvenance: string;
  role: string;
}

export interface Artefact {
  sensitivity: string;
  listTypeId: number;
}

export async function canAccessPublication(
  artefact: Artefact,
  user: User | undefined
): Promise<boolean> {
  // PUBLIC is accessible to everyone
  if (artefact.sensitivity === Sensitivity.PUBLIC) {
    return true;
  }

  // Unauthenticated users can only access PUBLIC
  if (!user) {
    return false;
  }

  // System admin can access everything
  if (user.role === USER_ROLES.SYSTEM_ADMIN) {
    return true;
  }

  // Internal admins cannot access PRIVATE/CLASSIFIED content
  if (
    user.role === USER_ROLES.INTERNAL_ADMIN_LOCAL ||
    user.role === USER_ROLES.INTERNAL_ADMIN_CTSC
  ) {
    return false;
  }

  // PRIVATE requires verified user
  if (artefact.sensitivity === Sensitivity.PRIVATE) {
    return user.role === "VERIFIED";
  }

  // CLASSIFIED requires verified user with matching provenance
  if (artefact.sensitivity === Sensitivity.CLASSIFIED) {
    if (user.role !== "VERIFIED") {
      return false;
    }

    const listType = await prisma.listType.findUnique({
      where: { listTypeId: artefact.listTypeId },
      select: { provenance: true }
    });

    if (!listType) {
      console.error(`List type not found for artefact: ${artefact.listTypeId}`);
      return false;
    }

    return user.userProvenance === listType.provenance;
  }

  return false;
}

export async function canAccessMetadata(
  artefact: Artefact,
  user: User | undefined
): Promise<boolean> {
  // Everyone can see PUBLIC metadata
  if (artefact.sensitivity === Sensitivity.PUBLIC) {
    return true;
  }

  // Unauthenticated users can only access PUBLIC
  if (!user) {
    return false;
  }

  // System admin can access all metadata
  if (user.role === USER_ROLES.SYSTEM_ADMIN) {
    return true;
  }

  // Internal admins CAN access metadata for PRIVATE/CLASSIFIED
  if (
    user.role === USER_ROLES.INTERNAL_ADMIN_LOCAL ||
    user.role === USER_ROLES.INTERNAL_ADMIN_CTSC
  ) {
    return true;
  }

  // For content access, use canAccessPublication
  return canAccessPublication(artefact, user);
}
```

## Service Layer Changes

### 1. Publication Query Service

**Location**: `libs/publication/src/repository/queries.ts`

Add new query functions that respect sensitivity filtering:

```typescript
export async function getAccessibleArtefacts(
  locationId: string,
  user: { userProvenance: string; role: string } | undefined
): Promise<Artefact[]> {
  const now = new Date();

  // Build where clause based on user permissions
  const whereClause = buildAccessWhereClause(user);

  const artefacts = await prisma.artefact.findMany({
    where: {
      locationId,
      displayFrom: { lte: now },
      displayTo: { gte: now },
      ...whereClause
    },
    orderBy: [{ lastReceivedDate: "desc" }]
  });

  return artefacts.map(mapArtefact);
}

function buildAccessWhereClause(
  user: { userProvenance: string; role: string } | undefined
) {
  // Unauthenticated - only PUBLIC
  if (!user) {
    return { sensitivity: Sensitivity.PUBLIC };
  }

  // System admin - all publications
  if (user.role === USER_ROLES.SYSTEM_ADMIN) {
    return {};
  }

  // Internal admins - only PUBLIC for content
  if (
    user.role === USER_ROLES.INTERNAL_ADMIN_LOCAL ||
    user.role === USER_ROLES.INTERNAL_ADMIN_CTSC
  ) {
    return { sensitivity: Sensitivity.PUBLIC };
  }

  // Verified users - PUBLIC, PRIVATE, and CLASSIFIED with matching provenance
  if (user.role === "VERIFIED") {
    return {
      OR: [
        { sensitivity: Sensitivity.PUBLIC },
        { sensitivity: Sensitivity.PRIVATE },
        {
          AND: [
            { sensitivity: Sensitivity.CLASSIFIED },
            { provenance: user.userProvenance }
          ]
        }
      ]
    };
  }

  // Default to PUBLIC only
  return { sensitivity: Sensitivity.PUBLIC };
}
```

### 2. List Type Service

**Location**: `libs/list-types/common/src/list-type-service.ts` (new file)

```typescript
import { prisma } from "@hmcts/postgres";

export interface ListType {
  listTypeId: number;
  name: string;
  englishFriendlyName: string;
  welshFriendlyName: string;
  provenance: string;
  urlPath?: string;
}

export async function getListTypeById(listTypeId: number): Promise<ListType | null> {
  const listType = await prisma.listType.findUnique({
    where: { listTypeId }
  });

  if (!listType) {
    return null;
  }

  return {
    listTypeId: listType.listTypeId,
    name: listType.name,
    englishFriendlyName: listType.englishFriendlyName,
    welshFriendlyName: listType.welshFriendlyName,
    provenance: listType.provenance,
    urlPath: listType.urlPath || undefined
  };
}

export async function getAllListTypes(): Promise<ListType[]> {
  const listTypes = await prisma.listType.findMany({
    orderBy: { listTypeId: "asc" }
  });

  return listTypes.map(lt => ({
    listTypeId: lt.listTypeId,
    name: lt.name,
    englishFriendlyName: lt.englishFriendlyName,
    welshFriendlyName: lt.welshFriendlyName,
    provenance: lt.provenance,
    urlPath: lt.urlPath || undefined
  }));
}
```

## Page Handler Changes

### 1. Publication Page Handler

**Location**: `libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts`

```typescript
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("errors/common", {
      en, cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }

  try {
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).render("errors/common", {
        en, cy,
        errorTitle: t.errorTitle,
        errorMessage: t.errorMessage
      });
    }

    // Check access permission
    const hasAccess = await canAccessPublication(artefact, req.user);

    if (!hasAccess) {
      if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect("/sign-in");
      }

      return res.status(403).render("errors/403-publication-access", {
        sensitivity: artefact.sensitivity,
        en: {
          title: "Access denied",
          message: "You do not have permission to view this publication.",
          signInPrompt: "You may need to sign in with a different account."
        },
        cy: {
          title: "Mynediad wedi'i wrthod",
          message: "Nid oes gennych ganiatâd i weld y cyhoeddiad hwn.",
          signInPrompt: "Efallai y bydd angen i chi fewngofnodi gyda chyfrif gwahanol."
        }
      });
    }

    // Continue with existing rendering logic...
    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);
    // ... rest of the handler
  } catch (error) {
    console.error("Error rendering cause list:", error);
    return res.status(500).render("errors/common", {
      en, cy,
      errorTitle: t.errorTitle,
      errorMessage: t.errorMessage
    });
  }
};
```

### 2. Summary of Publications Page Handler

**Location**: `libs/public-pages/src/pages/summary-of-publications/index.ts`

```typescript
export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const locationIdParam = req.query.locationId;
  if (!locationIdParam) {
    return res.redirect("/400");
  }

  const locationId = Number.parseInt(locationIdParam as string, 10);
  if (Number.isNaN(locationId)) {
    return res.redirect("/400");
  }

  const location = await getLocationById(locationId);
  if (!location) {
    return res.redirect("/400");
  }

  const locationName = locale === "cy" ? location.welshName : location.name;
  const pageTitle = `${t.titlePrefix} ${locationName}${t.titleSuffix}`;

  // Query artefacts with access control
  const artefacts = await getAccessibleArtefacts(
    locationId.toString(),
    req.user
  );

  // Map list types and format dates
  const publicationsWithDetails = artefacts.map((artefact) => {
    const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
    const listTypeName = locale === "cy"
      ? listType?.welshFriendlyName || "Unknown"
      : listType?.englishFriendlyName || "Unknown";

    const languageLabel = artefact.language === "ENGLISH"
      ? t.languageEnglish
      : t.languageWelsh;

    return {
      id: artefact.artefactId,
      listTypeName,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      language: artefact.language,
      formattedDate: formatDateAndLocale(artefact.contentDate.toISOString(), locale),
      languageLabel,
      urlPath: listType?.urlPath
    };
  });

  // Deduplicate and sort
  const seen = new Set<string>();
  const uniquePublications = publicationsWithDetails.filter((pub) => {
    const key = `${pub.listTypeId}-${pub.contentDate.toISOString()}-${pub.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  uniquePublications.sort((a, b) => {
    if (a.listTypeName !== b.listTypeName) {
      return a.listTypeName.localeCompare(b.listTypeName);
    }
    const dateComparison = new Date(b.contentDate).getTime() - new Date(a.contentDate).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.language.localeCompare(b.language);
  });

  res.render("summary-of-publications/index", {
    en, cy,
    title: pageTitle,
    noPublicationsMessage: t.noPublicationsMessage,
    publications: uniquePublications
  });
};
```

## Error Pages

### 1. 403 Publication Access Error Page

**Location**: `libs/web-core/src/views/errors/403-publication-access.njk`

```html
{% extends "layouts/default.njk" %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-two-thirds">
    <h1 class="govuk-heading-l">{{ title }}</h1>

    <p class="govuk-body">{{ message }}</p>

    {% if sensitivity === "PRIVATE" %}
      <p class="govuk-body">
        This publication is marked as Private and is only available to verified users.
      </p>
    {% elif sensitivity === "CLASSIFIED" %}
      <p class="govuk-body">
        This publication is marked as Classified and requires specific access permissions.
      </p>
    {% endif %}

    <p class="govuk-body">{{ signInPrompt }}</p>

    <p class="govuk-body">
      <a href="/" class="govuk-link">Return to homepage</a>
    </p>
  </div>
</div>
{% endblock %}
```

## Security Considerations

### 1. Defense in Depth

- Authorization checks at multiple layers:
  - Middleware level (before page handler)
  - Service level (in query functions)
  - Page handler level (explicit checks)

### 2. Default Deny

- All authorization logic defaults to denying access
- Explicit checks required to grant access
- Unknown sensitivity levels denied

### 3. Logging and Monitoring

- Log all authorization failures with:
  - User ID (if authenticated)
  - Publication ID
  - Sensitivity level
  - Timestamp
  - User provenance and role

### 4. Input Validation

- Validate all artefactId parameters
- Sanitize error messages (no sensitive data leakage)
- Validate user object structure

### 5. SQL Injection Prevention

- Use Prisma parameterized queries
- Never construct raw SQL with user input
- Validate all numeric IDs

## Testing Strategy

### 1. Unit Tests

**Location**: `libs/auth/src/publication-authorization/service.test.ts`

Test scenarios:
- PUBLIC accessible to everyone
- PRIVATE accessible to verified users and system admins only
- CLASSIFIED accessible based on provenance matching
- System admin can access everything
- Internal admins cannot access PRIVATE/CLASSIFIED content
- Internal admins can access metadata
- Unauthenticated users can only access PUBLIC

### 2. Integration Tests

**Location**: `libs/publication/src/repository/queries.test.ts`

Test scenarios:
- Query filters publications by sensitivity
- Provenance matching works correctly
- Display date filtering works with sensitivity
- Superseded publications handled correctly

### 3. E2E Tests

**Location**: `e2e-tests/publication-access.spec.ts`

Test scenarios:
- Unauthenticated user can view PUBLIC publications
- Unauthenticated user redirected when accessing PRIVATE
- B2C verified user can view PRIVATE publications
- B2C verified user can view CLASSIFIED with matching provenance
- B2C verified user denied CLASSIFIED with non-matching provenance
- System admin can view all publications
- Internal admin can view metadata but not content
- Error messages display correctly in English and Welsh

### 4. Accessibility Tests

Test all error pages with axe-core:
- 403 publication access page
- Sign-in redirect flow
- Error message contrast and readability

## Performance Optimization

### 1. Database Indexes

```sql
-- Add indexes for common query patterns
CREATE INDEX idx_artefact_sensitivity ON artefact(sensitivity);
CREATE INDEX idx_artefact_provenance ON artefact(provenance);
CREATE INDEX idx_artefact_location_sensitivity_display
  ON artefact(location_id, sensitivity, display_from, display_to);
```

### 2. Query Optimization

- Use selective queries that filter at database level
- Avoid N+1 queries by including related data
- Use Prisma's `select` to fetch only needed fields

### 3. Caching Considerations

- Cache list type data (provenance mapping)
- Cache user permissions for session duration
- Invalidate cache on user role changes

## Migration Plan

### Phase 1: Database Migration

1. Create ListType table
2. Populate with existing list type data
3. Add indexes to Artefact table
4. Test migration in development environment

### Phase 2: Service Layer Implementation

1. Implement authorization service
2. Implement publication query service
3. Add unit tests
4. Code review

### Phase 3: Middleware Implementation

1. Implement publication access middleware
2. Add integration tests
3. Code review

### Phase 4: Page Handler Updates

1. Update all publication page handlers
2. Update summary pages
3. Add error pages
4. Update E2E tests

### Phase 5: Deployment

1. Deploy to development environment
2. Run full test suite
3. Manual testing of all user scenarios
4. Deploy to staging
5. Security review
6. Deploy to production

## Rollback Plan

If issues are discovered after deployment:

1. Revert middleware changes (disable authorization)
2. All publications default to PUBLIC access temporarily
3. Fix issues in development
4. Re-deploy with fixes

## Monitoring and Alerting

- Monitor authorization failure rates
- Alert on unexpected spikes in 403 errors
- Track performance of authorization checks
- Monitor database query performance
- Log security events (repeated access attempts)

## Documentation Updates

- Update API documentation with authorization requirements
- Document user permission matrix
- Update deployment guide with migration steps
- Create runbook for authorization issues
