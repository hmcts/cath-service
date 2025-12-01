# VIBE-247: Authentication on Classified Publications

## Quick Start Guide

This directory contains comprehensive technical planning documentation for implementing authentication and authorization controls on classified publications in the CaTH service.

## Documents Overview

### 1. VIBE-247-specification.md
**Purpose**: Requirements and acceptance criteria
**Read this first to understand**:
- Business requirements and user stories
- Permission matrix for all user types
- Acceptance criteria for each sensitivity level
- Non-functional requirements (security, performance, accessibility)

### 2. VIBE-247-plan.md
**Purpose**: Technical implementation details
**Read this for**:
- Architecture overview and component design
- Database schema changes (Prisma models and migrations)
- Authorization middleware implementation
- Service layer changes
- Page handler modifications
- Security considerations and best practices
- Migration and deployment strategy

### 3. VIBE-247-tasks.md
**Purpose**: Detailed implementation task breakdown
**Use this for**:
- Step-by-step implementation tasks organized by phase
- Time estimates for each task
- Acceptance criteria for each task
- File locations and code snippets
- Dependency graph showing task relationships
- Risk mitigation strategies

## Implementation Summary

### Problem
Publications in CaTH have three sensitivity levels (PUBLIC, PRIVATE, CLASSIFIED) but currently lack proper access control. All users can view all publications regardless of their authentication status or permissions.

### Solution
Implement a comprehensive authorization system based on:
- **User Provenance**: SSO, B2C, CFT_IDAM, CRIME_IDAM
- **User Role**: SYSTEM_ADMIN, INTERNAL_ADMIN_LOCAL, INTERNAL_ADMIN_CTSC, VERIFIED
- **Publication Sensitivity**: PUBLIC, PRIVATE, CLASSIFIED
- **Provenance Matching**: For CLASSIFIED publications, user provenance must match list type provenance

### Key Technical Changes

1. **Database**:
   - New `ListType` reference table with provenance mapping
   - Performance indexes on `Artefact.sensitivity` and `Artefact.provenance`

2. **Authorization Service** (new module `libs/publication-access`):
   - `canAccessPublication()` - Check if user can view publication content
   - `canAccessMetadata()` - Check if user can view publication metadata

3. **Middleware** (`libs/auth/src/middleware/publication-access.ts`):
   - `requirePublicationAccess()` - Express middleware for route protection

4. **Service Layer** (`libs/publication/src/repository/queries.ts`):
   - `getAccessibleArtefacts()` - Query only accessible publications for user
   - `buildAccessWhereClause()` - Build Prisma where clause based on permissions

5. **Page Handlers**: Update all publication page handlers to enforce authorization

6. **Error Pages**: New 403 error page for unauthorized access attempts

### Permission Matrix

| User Type | Provenance | Role | PUBLIC | PRIVATE | CLASSIFIED |
|-----------|------------|------|--------|---------|------------|
| Public (unauthenticated) | - | - | ✓ | ✗ | ✗ |
| Verified User | B2C | VERIFIED | ✓ | ✓ | ✓ (if provenance matches) |
| Verified User | CFT_IDAM | VERIFIED | ✓ | ✓ | ✓ (if provenance matches) |
| Verified User | CRIME_IDAM | VERIFIED | ✓ | ✓ | ✓ (if provenance matches) |
| System Admin | SSO | SYSTEM_ADMIN | ✓ | ✓ | ✓ (all) |
| Internal Admin | SSO | INTERNAL_ADMIN_LOCAL | ✓ | Metadata only | Metadata only |
| Internal Admin | SSO | INTERNAL_ADMIN_CTSC | ✓ | Metadata only | Metadata only |

### Implementation Phases

**Phase 1**: Database Schema (3 tasks, ~5 hours)
- Create ListType table
- Add performance indexes
- Migrate mock data to database

**Phase 2**: Authorization Service (2 tasks, ~7 hours)
- Create authorization service module
- Update publication query service

**Phase 3**: Middleware (1 task, ~3 hours)
- Create publication access middleware

**Phase 4**: Error Pages (2 tasks, ~3 hours)
- Create 403 error page
- Update sign-in flow

**Phase 5**: Page Handlers (3 tasks, ~6 hours)
- Update all publication page handlers

**Phase 6**: Admin Features (1 task, ~4 hours)
- Create metadata-only admin view

**Phase 7**: Testing (4 tasks, ~12 hours)
- Unit tests, integration tests, E2E tests, accessibility tests

**Phase 8**: Documentation & Security (3 tasks, ~9 hours)
- Update API documentation
- Security review
- Performance testing

**Phase 9**: Deployment (4 tasks, ~7 hours + monitoring)
- Deploy to dev, staging, production
- Monitor performance and errors

**Total Estimated Time**: ~56 hours (7-8 working days)

## Quick Reference: Key Files

### Files to Create
```
libs/publication-access/                    # New authorization module
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config.ts
    └── publication-access/
        ├── service.ts
        └── service.test.ts

libs/auth/src/middleware/
└── publication-access.ts                   # New middleware

libs/list-types/common/src/
└── list-type-service.ts                    # Database-backed list types

libs/web-core/src/views/errors/
└── 403-publication-access.njk              # New error page

libs/admin-pages/src/pages/publications-list/  # Admin metadata view
├── index.ts
├── index.njk
├── en.ts
└── cy.ts
```

### Files to Modify
```
apps/postgres/prisma/schema.prisma          # Add ListType table, indexes
libs/publication/src/repository/queries.ts   # Add authorization-aware queries
libs/auth/src/index.ts                       # Export new middleware
libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts
libs/public-pages/src/pages/summary-of-publications/index.ts
libs/public-pages/src/pages/publication/[id].ts
tsconfig.json                                # Register new module
```

## Getting Started

1. **Review the specification** (VIBE-247-specification.md) to understand requirements
2. **Study the architecture** in the plan (VIBE-247-plan.md)
3. **Follow the tasks** in order (VIBE-247-tasks.md)
4. **Start with Phase 1** (Database changes) as all other phases depend on it

## Testing Strategy

- **Unit Tests**: Cover authorization logic with all user/sensitivity combinations
- **Integration Tests**: Verify database queries filter correctly
- **E2E Tests**: Test complete user journeys for all user types
- **Accessibility Tests**: Ensure WCAG 2.2 AA compliance for error pages
- **Performance Tests**: Verify authorization checks complete in < 100ms
- **Security Review**: Comprehensive security audit before production deployment

## Security Principles

1. **Default Deny**: All authorization logic denies access by default
2. **Server-Side Only**: All checks performed on the server
3. **Defense in Depth**: Authorization at multiple layers (middleware, service, query)
4. **No Information Leakage**: Error messages don't reveal sensitive information
5. **Audit Logging**: All authorization failures logged for security monitoring

## Performance Targets

- Authorization checks: < 50ms (p95)
- Database queries: < 100ms (p95)
- No degradation under load (1000 concurrent users)
- Cache hit rate: > 80% for list type lookups

## Accessibility Requirements

- WCAG 2.2 AA compliance for all pages
- Screen reader compatible error messages
- Keyboard navigation support
- English and Welsh content for all user-facing text
- Clear, helpful error messages

## Rollback Plan

If issues are discovered after production deployment:

1. Revert application code to previous version
2. Keep database changes (backward compatible)
3. All publications temporarily accessible to authenticated users
4. Fix issues in development
5. Re-deploy with fixes

## Monitoring and Alerts

After deployment, monitor:
- 403 error rates (should be low, consistent)
- Authorization check performance
- Database query performance
- User feedback and support tickets
- Security events (repeated access attempts)

Alert on:
- 403 error rate > 10% of publication requests
- Authorization check time > 100ms (p95)
- Any SQL errors related to ListType table

## Questions or Issues?

For questions about:
- **Requirements**: Refer to VIBE-247-specification.md
- **Technical approach**: Refer to VIBE-247-plan.md
- **Implementation details**: Refer to VIBE-247-tasks.md
- **Code patterns**: Refer to CLAUDE.md in repository root

## Moving Files to .claude Directory

Once you've reviewed these documents, you can move them to the `.claude/` directory:

```bash
mv VIBE-247-specification.md .claude/specification.md
mv VIBE-247-plan.md .claude/plan.md
mv VIBE-247-tasks.md .claude/tasks.md
mv VIBE-247-README.md .claude/README.md
```

## Next Steps

1. Review all three documents
2. Get stakeholder approval on the specification
3. Set up development environment
4. Create a feature branch: `git checkout -b feature/VIBE-247-publication-authorization`
5. Start with Task 1.1: Create ListType table
6. Follow the task list in order, completing each phase before moving to the next

Good luck with the implementation!
