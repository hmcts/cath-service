# SJP (Single Justice Procedure) Module

This module provides functionality for managing Single Justice Procedure cases in the Court and Tribunal Hearings (CaTH) system.

## Features

- **Public List Display**: View SJP cases with basic information (name, postcode, offence, prosecutor)
- **Press List Display**: View detailed SJP cases with additional information (DOB, address, reporting restrictions) - requires verified user access
- **Search & Filter**: Search cases and filter by postcode and prosecutor
- **Pagination**: Handle large case loads efficiently (up to 30,000 cases)
- **Download**: Export case lists in CSV format
- **Data Ingestion**: Import SJP lists from JSON files

## Pages

### 1. SJP Selection Page
`/sjp-selection`
- Landing page for choosing between public and press lists
- Available to all users

### 2. SJP Public List
`/sjp-public-list?listId=<uuid>`
- Displays public SJP cases in a table
- Available to all users
- Features: search, postcode/prosecutor filters, pagination, download

### 3. SJP Press List
`/sjp-press-list?listId=<uuid>`
- Displays detailed SJP cases with full information
- **Restricted to verified users only**
- Features: search, postcode/prosecutor filters, pagination, download
- Includes "What are SJP Cases?" and "Important Information" accordions

## Data Ingestion

### Importing SJP JSON Files

The module includes a script to import SJP JSON files that conform to the HMCTS schemas:
- [SJP Public List Schema](https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/single_justice_procedure_public.json)
- [SJP Press List Schema](https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/single_justice_procedure_press.json)

#### Usage

```bash
# From the root of the project
yarn workspace @hmcts/sjp import <json-file-path> <location-id>

# Example: Import public list for Bristol (location ID 9)
yarn workspace @hmcts/sjp import libs/sjp/data/sample-sjp-public.json 9

# Example: Import press list for Bristol
yarn workspace @hmcts/sjp import libs/sjp/data/sample-sjp-press.json 9
```

#### Parameters

- `<json-file-path>`: Path to the SJP JSON file to import
- `<location-id>`: Numeric location ID from the location reference data

#### Output

On success:
```
✓ Import successful!
  List ID: <generated-uuid>
  Cases imported: 150
```

**Note**: The List ID is dynamically generated for each import. It is not a fixed value.

On failure:
```
✗ Import failed:
  - document.publicationDate: Required
  - courtLists.0: Expected array, received object
```

### Sample Data

Sample JSON files are provided in `libs/sjp/data/`:
- `sample-sjp-public.json` - Example public list with 5 cases
- `sample-sjp-press.json` - Example press list with 3 cases (includes DOB, address, reporting restrictions)

### Ingestion Service API

The ingestion functionality is also available programmatically:

```typescript
import { ingestSjpJson, ingestSjpJsonFile } from "@hmcts/sjp";

// Import from parsed JSON object
const result = await ingestSjpJson(jsonData, locationId);

// Import from file path
const result = await ingestSjpJsonFile("/path/to/file.json", locationId);

if (result.success) {
  console.log(`Imported ${result.caseCount} cases`);
  console.log(`List ID: ${result.listId}`);
} else {
  console.error("Errors:", result.errors);
}
```

#### How It Works

1. **Validation**: JSON is validated against Zod schema derived from HMCTS specifications
2. **List Type Detection**: Automatically determines if list is "public" or "press" based on presence of DOB/address fields
3. **Data Transformation**:
   - Extracts accused and prosecutor from parties array
   - Formats names from individual/organisation details
   - Extracts outward postcode only (e.g., "BS8" from "BS8 1AB")
   - Combines offence information
   - Checks for reporting restrictions
4. **Database Storage**: Creates SJP list record and associated cases in a transaction

## Database Schema

### `sjp_list`
- `list_id` (UUID, PK)
- `list_type` ("public" or "press")
- `location_id` (FK to location)
- `generated_at` (timestamp)
- `published_at` (timestamp)
- `content_date` (date)
- `case_count` (integer)

### `sjp_case`
- `case_id` (UUID, PK)
- `list_id` (UUID, FK)
- `name` (string)
- `postcode` (string, nullable) - outward code only
- `offence` (string, nullable)
- `prosecutor` (string, nullable)
- `date_of_birth` (date, nullable) - press only
- `reference` (string, nullable) - case URN
- `address` (string, nullable) - press only
- `reporting_restriction` (boolean)

Indexes on: `list_id`, `postcode`, `prosecutor`, `name`

## Development

### Running Tests

```bash
# Run all SJP tests
yarn workspace @hmcts/sjp test

# Run tests in watch mode
yarn workspace @hmcts/sjp test:watch
```

### E2E Testing

End-to-end tests for SJP pages are located in `e2e-tests/tests/`:
- `sjp-public-list.spec.ts` - Tests for the public list page
- `sjp-press-list.spec.ts` - Tests for the press list page

**Important**: E2E tests create their own test data dynamically using the blob ingestion API. Test data is NOT pre-loaded in the database. Each test suite creates the necessary SJP list data before running tests.

```bash
# Run only SJP public list E2E tests
yarn test:e2e sjp-public-list

# Run only SJP press list E2E tests
yarn test:e2e sjp-press-list

# Run all E2E tests including nightly tests
yarn test:e2e:all
```

### Linting and Formatting

```bash
# Check code style
yarn workspace @hmcts/sjp lint

# Fix code style issues
yarn workspace @hmcts/sjp lint:fix

# Format code
yarn workspace @hmcts/sjp format
```

### Building

```bash
# Build TypeScript and copy assets
yarn workspace @hmcts/sjp build
```

## Technical Details

### Postcode Handling

The system stores only the **outward code** of postcodes (the first part before the space):
- Full postcode: `BS8 1AB` → Stored as: `BS8`
- Full postcode: `M1 2AA` → Stored as: `M1`
- Full postcode: `EC1A 1BB` → Stored as: `EC1A`

This approach:
- Reduces storage requirements
- Provides sufficient granularity for filtering
- Protects privacy by not storing exact addresses in public lists

### Filter Behavior

- Filters use AND logic (all active filters must match)
- Postcode filter validates UK postcode format
- Prosecutor options are dynamically generated from actual case data
- "Clear filters" link resets all filters and returns to page 1

### Accessibility

All pages comply with WCAG 2.2 AA:
- Proper ARIA attributes on interactive elements
- Keyboard navigation support
- Screen reader announcements for state changes
- Logical tab order
- High contrast support

### Welsh Language Support

All content is available in both English and Welsh through i18n middleware.

## Dependencies

- `@hmcts/location` - Location reference data
- `@hmcts/postgres` - Database access via Prisma
- `zod` - JSON schema validation
- `express` (peer) - Web framework

## Related Documentation

- [VIBE-151 Ticket Specification](../../docs/tickets/VIBE-151/ticket-spec.md)
- [Implementation Plan](../../docs/tickets/VIBE-151/plan.md)
- [Implementation Tasks](../../docs/tickets/VIBE-151/ticket-tasks.md)
