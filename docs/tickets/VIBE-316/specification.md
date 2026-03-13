# VIBE-316: Refactor artefact search extraction and subscription process

## Problem Statement

Currently, verified users can only subscribe to a location. The system needs to support multiple subscription search types (not just location) so that users can subscribe to publications using different identifiers such as case number or case name in the future.

## User Story

**As a** system admin
**I want** the system to support multiple subscription search types (not just location)
**So that** users can subscribe to publications using different identifiers such as case number or case name in the future.

## Technical Requirements

### Database Changes

1. **New Table: list_search_config**
   - Stores JSON field name mappings for each list type
   - Fields:
     - `id` (PK)
     - `list_type_id` (FK to list type)
     - `case_number_field_name` (varchar 100)
     - `case_name_field_name` (varchar 100)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

2. **New Table: artefact_search**
   - Stores extracted case information from publications
   - Fields:
     - `id` (PK)
     - `artefact_id` (FK to artefact)
     - `case_number` (text, nullable)
     - `case_name` (text, nullable)
     - `created_at` (timestamp)

3. **Subscription Table Migration**
   - Add columns:
     - `search_type` (varchar 50)
     - `search_value` (text)
   - Remove column:
     - `location_id`
   - Migrate existing location subscriptions:
     - Set `search_type = 'LOCATION_ID'`
     - Set `search_value` to location ID value

### Admin Configuration Page

**Page: List Search Configuration**

- **URL Pattern**: `/system-admin/list-configuration/:listTypeId/search-config`
- **Access**: System admin only

**Form Fields:**
- Case number JSON field name
  - Type: text
  - Required: Yes
  - Max length: 100 characters
  - Pattern: `^[a-zA-Z0-9_]+$` (letters, numbers, underscores only)
- Case name JSON field name
  - Type: text
  - Required: Yes
  - Max length: 100 characters
  - Pattern: `^[a-zA-Z0-9_]+$` (letters, numbers, underscores only)

**Content:**
- EN: Title "Configure list search fields"
- EN: Body "Enter the JSON field names used to extract case details for this list type."
- EN: Button "Save configuration"
- CY: Welsh translations required

**Validation Errors:**
- EN: "Enter the case number JSON field name"
- EN: "Enter the case name JSON field name"
- EN: "Case number field name must contain only letters, numbers and underscores"
- EN: "Case name field name must contain only letters, numbers and underscores"
- CY: Welsh translations required

**Back Navigation:**
- Returns to System Admin list configuration section

### Publication Processing

When a publication is received (via manual upload or `/api/publication`):

1. Look up configuration in `list_search_config` table using list type
2. Extract case information from JSON using configured field names
3. Store extracted values in `artefact_search` table
4. Handle gracefully if:
   - Configuration doesn't exist for list type
   - JSON fields are missing or null
   - Extraction fails

### Subscription Fulfilment

For location-based subscriptions (existing functionality):

1. Query subscriptions table where:
   - `search_type = 'LOCATION_ID'`
   - `search_value = <location id>`
2. Send notification emails using existing functionality

### Data Migration

Create migration script to:
1. Add new columns to subscription table
2. Migrate existing data: copy `location_id` → `search_value` and set `search_type = 'LOCATION_ID'`
3. Drop `location_id` column after successful migration
4. Create new tables: `list_search_config` and `artefact_search`

## Accessibility Requirements

- WCAG 2.2 AA standards
- Form fields with associated labels
- Accessible error messages
- Screen reader announcements for errors
- Full keyboard navigation support

## Test Scenarios

1. Saving list search configuration with valid JSON field names succeeds
2. Submitting configuration form with missing fields displays validation errors
3. Submitting configuration with invalid characters displays validation errors
4. Publications with configured JSON fields correctly populate `artefact_search`
5. Publications without matching configuration do not cause system failure
6. Publications with missing JSON fields are handled gracefully
7. Existing location subscriptions are migrated to use `search_type = LOCATION_ID`
8. Location-based fulfilment continues to send notification emails correctly
9. No references to `location_id` remain in subscription table after migration
10. Future subscription types can be added without further schema changes

## Out of Scope

- Implementation of case number/case name subscription functionality
- User-facing subscription pages for new search types
- Search functionality using case data
