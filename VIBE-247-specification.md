# VIBE-247: Authentication on Classified Publications - Specification

## Problem Statement

Every list published in CaTH (Courts and Tribunals Hearings) is assigned a sensitivity level which indicates which user group the publication should be made available to. This specification covers the authentication and authorization of publications based on their sensitivity level.

## User Stories

### Primary User Story

**AS A** System
**I WANT** to authenticate publications assigned the 'Classified' sensitivity level in CaTH
**SO THAT** these publication files are only available to CaTH Users with the required clearance levels

### Supporting User Stories

**AS A** Public User
**I WANT** to access only Public publications
**SO THAT** I can view hearing information that is publicly available

**AS A** Verified User (B2C, CFT IDAM, Crime IDAM)
**I WANT** to access Public, Private, and Classified publications based on my provenance
**SO THAT** I can view hearings relevant to my role and clearance level

**AS A** System Administrator
**I WANT** to access all publications (Public, Private, Classified)
**SO THAT** I can manage and oversee all publications in the system

**AS AN** Internal Administrator (Local Admin or CTSC Admin)
**I WANT** to view metadata for Private and Classified publications but not the actual list data
**SO THAT** I can manage publications without viewing sensitive hearing information

## Acceptance Criteria

### AC1: Publication Sensitivity Levels

- Each uploaded publication file in CaTH must have an indicated sensitivity level during the uploading process
- Each list type is linked to a specific sensitivity level
- Three sensitivity levels exist: PUBLIC, PRIVATE, CLASSIFIED
- The sensitivity level is stored in the `artefact` table's `sensitivity` column

### AC2: Public Sensitivity Level (PUBLIC)

- Where a Publication file is assigned the 'Public' sensitivity level, then the Publication file will be available to all users
- Public users (unauthenticated) can view Public publications
- All authenticated users can view Public publications

### AC3: Private Sensitivity Level (PRIVATE)

- Where a Publication file is assigned the 'Private' sensitivity level, then the Publication file will be available to only all verified users
- Private publications are accessible to:
  - System Admin (SSO provenance)
  - Verified users (B2C, CFT IDAM, Crime IDAM provenances)
- Private publications are NOT accessible to:
  - Public users (unauthenticated)
  - Internal Admin Local (SSO provenance)
  - Internal Admin CTSC (SSO provenance)

### AC4: Classified Sensitivity Level (CLASSIFIED)

- Where a Publication file is assigned the 'Classified' sensitivity level, then the Publication file will be available to only verified users who are in a group eligible to view that list
- The validation logic uses the user provenance stored against each user in the database to determine accessibility
- Classified publications require provenance matching:
  - The user's `userProvenance` must match the publication's list type `provenance`
  - Example: SJP press list (provenance: "B2C") is available only to B2C verified users
- Classified publications are accessible to:
  - System Admin (all provenances)
  - Verified users with matching provenance

### AC5: Permission Hierarchy

The data classification level should be configured using a 'Parent Child relationship' as the Rule Hierarchy:

**User Provenance → User Role → Sensitivity Level**

| User Provenance | User Role | Sensitivity Levels Accessible |
|-----------------|-----------|-------------------------------|
| B2C | VERIFIED | PUBLIC, PRIVATE, CLASSIFIED (provenance match) |
| SSO | SYSTEM_ADMIN | PUBLIC, PRIVATE, CLASSIFIED (all) |
| SSO | INTERNAL_ADMIN_LOCAL | PUBLIC only (metadata only for PRIVATE/CLASSIFIED) |
| SSO | INTERNAL_ADMIN_CTSC | PUBLIC only (metadata only for PRIVATE/CLASSIFIED) |
| CFT_IDAM | VERIFIED | PUBLIC, PRIVATE, CLASSIFIED (provenance match) |
| CRIME_IDAM | VERIFIED | PUBLIC, PRIVATE, CLASSIFIED (provenance match) |
| Public (none) | (none) | PUBLIC only |

### AC6: Metadata Access for Internal Admins

- Local Admin and CTSC Admin can view metadata for Private and Classified publications
- Local Admin and CTSC Admin cannot view the actual list data (publication content)
- Metadata includes:
  - Publication ID
  - Location
  - List type
  - Content date
  - Sensitivity level
  - Language
  - Display dates
  - Provenance

### AC7: List Type Provenance Configuration

- Each list type has an associated provenance value that indicates which user provenance group can access Classified publications of that type
- This association is stored in a reference data table or configuration
- The provenance matching occurs at runtime when accessing publications

## Non-Functional Requirements

### Security

- All authorization checks must occur server-side
- No sensitive publication data should be exposed in client-side code
- Authorization failures should result in appropriate HTTP status codes (401 Unauthorized, 403 Forbidden)
- Failed authorization attempts should be logged for security auditing

### Performance

- Authorization checks should not significantly impact page load times
- Database queries should be optimized with appropriate indexes
- Authorization logic should be cacheable where appropriate

### Accessibility

- Error messages for unauthorized access must be WCAG 2.2 AA compliant
- Error pages must be screen reader compatible
- Error messages must be available in both English and Welsh

### Usability

- Users should receive clear, helpful error messages when they cannot access a publication
- Error messages should explain why access was denied
- Users should be directed to appropriate actions (e.g., sign in, contact administrator)

## Out of Scope

The following items are explicitly out of scope for this ticket:

- User role assignment or management
- List type creation or configuration
- Changes to the publication upload process
- Changes to the authentication mechanism (SSO, IDAM integration)
- User provenance modification

## Technical Constraints

- Must use existing User table schema with userProvenance and role columns
- Must use existing Artefact table schema with sensitivity and provenance columns
- Must integrate with existing Passport.js authentication
- Must maintain backward compatibility with existing public publications
- Must support both web page access and API access patterns

## Success Metrics

- All Public publications remain accessible to unauthenticated users
- Private publications are only accessible to verified users and system admins
- Classified publications are only accessible based on provenance matching
- Internal admins can view metadata but not publication content for Private/Classified
- Zero security vulnerabilities related to publication access control
- All authorization checks complete within 100ms
- Error messages receive positive accessibility audit scores

## Dependencies

- Existing User authentication system (Passport.js with SSO and IDAM)
- Existing Artefact and User database schemas
- Existing list type configuration system
- Existing publication rendering infrastructure

## Risks and Mitigations

### Risk: Overly Permissive Access
**Mitigation**: Implement default-deny authorization (deny unless explicitly allowed)

### Risk: Performance Impact
**Mitigation**: Add database indexes, implement query optimization, consider caching

### Risk: Complex Authorization Logic
**Mitigation**: Centralize authorization logic in reusable middleware, comprehensive testing

### Risk: Inconsistent Access Control
**Mitigation**: Single source of truth for authorization rules, automated testing across all access points
