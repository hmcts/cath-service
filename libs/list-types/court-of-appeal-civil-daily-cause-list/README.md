# Court of Appeal (Civil Division) Daily Cause List

This module provides support for the Court of Appeal (Civil Division) Daily Cause List with special two-tab Excel format.

## Supported List Type

- **ID 19**: Court of Appeal (Civil Division) Daily Cause List

## Data Format

This list uses a two-tab Excel format with different column structures:

### Tab 1: Daily hearings
Standard 7-column format (same as RCJ standard)

**Fields:**
- Venue
- Judge
- Time
- Case Number
- Case Details
- Hearing Type
- Additional Information

### Tab 2: Notice for future judgments
8-column format (adds Date field at the beginning)

**Fields:**
- **Date** (dd/MM/yyyy format) - UNIQUE TO TAB 2
- Venue
- Judge
- Time
- Case Number
- Case Details
- Hearing Type
- Additional Information

## Excel Upload

Upload a two-sheet Excel file (.xlsx):

- **Sheet 1**: Named "Daily hearings" (7 columns)
- **Sheet 2**: Named "Notice for future judgments" (8 columns)

Both sheets can be empty (minRows: 0).

## Validation

- **Tab 1**: Time must be HH:MM format
- **Tab 2**: Date must be dd/MM/yyyy format (e.g., 15/01/2025), Time must be HH:MM format
- All fields sanitized to prevent HTML injection
- All fields except Additional Information are required

## Display

The rendered page shows:
1. Daily hearings section (7 columns, if data exists)
2. Notice for future judgments section (8 columns including Date, if data exists)
3. Search functionality across both sections
4. Dates are formatted according to locale (English: "15 January 2025", Welsh: "15 Ionawr 2025")

## Special Features

- **Date formatting**: Tab 2 dates are formatted for display in both English and Welsh
- **Dual section display**: Clearly separated sections for daily hearings and future judgments
- **Different column counts**: Tab 1 has 7 columns, Tab 2 has 8 columns
- **Client-side search**: Searches across both sections
- **Bilingual support**: Full English/Welsh content
- **Optional sections**: Either section can be empty

## Usage

Lists are accessed via:

```
/court-of-appeal-civil-division-daily-cause-list?artefactId=<id>
```

## Development

```bash
# Build
yarn build

# Run tests
yarn test

# Watch mode
yarn test:watch

# Format code
yarn format

# Lint
yarn lint:fix
```

## Technical Notes

The key difference from other RCJ lists is Tab 2's additional Date field, which requires:
- Date validation in the converter
- Date formatting in the renderer
- An extra table column in the template
- Extended FutureJudgment type (extends StandardHearing with date field)
