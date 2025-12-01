# VIBE-143: User Table Creation in Database

## Problem Statement
The details of users who sign into CaTH needs to be stored in the database. This ticket is raised to create a user table to be used to store user details.

## User Story
**AS A** Service
**I WANT** to create a user table in the database
**SO THAT** I can store the details of users who access CaTH

## Acceptance Criteria
- A User table is created at the back end in the database to capture and store the details of all users in CaTH including users who sign in through the SSO, B2C (Media), CFT IDAM and Crime IDAM routes

## Technical Acceptance Criteria
1. **SSO Integration**
   - When a user signs in and a user record does not exist based on the provenance ID, a record is created
   - When a user signs in and the record does exist, check if the role matches. If it does, the user continues to sign in. If not, the role is updated

2. **CFT Integration**
   - When a user signs in and a user record does not exist based on the provenance ID, a record is created
   - The role is always 'VERIFIED'

3. `last_signed_in_date` is updated for all users when they sign in
4. `created_date` is set when the user is first created

## Table Schema

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| user_id | UUID | Yes | Unique primary key for user |
| email | VARCHAR(255) | Yes | User email address (unique constraint) |
| first_name | VARCHAR(255) | No | Only stored for CFT_IDAM and CRIME_IDAM |
| surname | VARCHAR(255) | No | Only stored for CFT_IDAM and CRIME_IDAM |
| user_provenance | VARCHAR(20) | Yes | SSO, CFT_IDAM, CRIME_IDAM, B2C_IDAM |
| user_provenance_id | UUID | Yes | Unique ID from provider |
| role | VARCHAR(20) | Yes | VERIFIED, LOCAL_ADMIN, CTSC_ADMIN, SYSTEM_ADMIN |
| created_date | TIMESTAMP | Yes | Date/Time (to seconds) |
| last_signed_in_date | TIMESTAMP | No | Date/Time (to seconds). Can be blank when user is first created |

## Constraints
- **Primary Key:** `user_id`
- **Unique Constraint:** `email` and `user_provenance_id`
- **Default Values:**
  - `role = VERIFIED` for CFT/Crime users
  - `created_date = CURRENT_TIMESTAMP`
- **Timestamps** recorded in UTC
