# VIBE-247: Authenticate Publications Based on Sensitivity Level

## Problem Statement
Every list published in CaTH is assigned a sensitivity level which indicates which user group the publication should be made available to. This ticket covers the authentication of publications based on the sensitivity level.

## User Story
**AS A** System
**I WANT** to Authenticate publications assigned the 'Classified' sensitivity level in CaTH
**SO THAT** these publication files are only available to CaTH Users with the required clearance levels

## Acceptance Criteria

1. Each uploaded publication file in CaTH must have an indicated sensitivity level indication during the uploading process such that each list type is linked to a specific sensitivity level

2. **Public Sensitivity Level**: Where a Publication file is assigned the 'Public' sensitivity level, then the Publication file will be available to all users

3. **Private Sensitivity Level**: Where a Publication file is assigned the 'Private' sensitivity level, then the Publication file will be available to only all verified users (e.g. Legal professionals and media)

4. **Classified Sensitivity Level**: Where a Publication file is assigned the 'Classified' sensitivity level, then the Publication file will be available to only verified users who are in a group eligible to view that list (e.g. SJP press list available to Media)

5. The validation logic for each sensitivity level will be inferred by using the user provenance stored against each user in the database to determine the accessibility of user groups when any file is published in CaTH

6. The data classification level should be configured in the user table using a 'Parent Child relationship' as the Rule Hierarchy. This should follow the User Provenance - User Role - Sensitivity levelling

7. System admin can see Public, Private, Classified

8. If it is a verified user and list is classified, user provenance of the user will be compared with list type provenance

9. For Local and CTSC admin, they should be able to delete and view metadata for private and classified publication but not able to see the actual list data (only can access list metadata for the classified list)

10. Public users can only access Public Lists. They must not be allowed to view private and classified lists

## Permissions Matrix

| User Provenance | User Role | Accessible Sensitivity Levels |
|----------------|-----------|-------------------------------|
| B2C | Verified | Public, Private, Classified |
| SSO | System Admin | Public, Private, Classified |
| SSO | Local Admin, CTSC Admin | Public (metadata only for Private/Classified) |
| CFT IdAM | Verified | Public, Private, Classified |
| Crime IdAM | Verified | Public, Private, Classified |
| Public | Public | Public |

## Key Requirements

### Access Control Rules
- **System Admin (SSO)**: Full access to all sensitivity levels
- **Verified Users (B2C, CFT IdAM, Crime IdAM)**: Access to Public, Private, and Classified lists (Classified requires matching provenance)
- **Local Admin / CTSC Admin (SSO)**:
  - Can view Public lists (full access)
  - Can view metadata and delete Private/Classified lists
  - Cannot view actual list data for Private/Classified
- **Public Users**: Only Public lists

### Classified List Logic
- For Classified lists, verify user provenance matches the list type provenance
- Only verified users with matching provenance can access the actual list data
