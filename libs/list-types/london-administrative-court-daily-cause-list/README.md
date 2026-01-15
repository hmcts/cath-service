# London Administrative Court Daily Cause List

This module provides support for the London Administrative Court Daily Cause List with special two-tab Excel format.

## Supported List Type

- **ID 18**: London Administrative Court Daily Cause List

## Data Format

This list uses a two-tab Excel format:

### Tab 1: Main hearings
Standard 7-column format with main court hearings

### Tab 2: Planning Court
Same 7-column format for Planning Court hearings, displayed as a separate section

**Fields (both tabs):**
- **Venue** (required): Court room or location
- **Judge** (required): Name of presiding judge
- **Time** (required): Hearing time in HH:MM format
- **Case Number** (required): Case reference number
- **Case Details** (required): Case description or parties
- **Hearing Type** (required): Type of hearing
- **Additional Information** (optional): Extra notes

## Excel Upload

Upload a two-sheet Excel file (.xlsx):

- **Sheet 1**: Named "Main hearings"
- **Sheet 2**: Named "Planning Court"

Both sheets use the same column structure. Either or both sheets can be empty (minRows: 0).

## Special Features

- **Two-tab Excel support**: Handles multiple sheets with separate data
- **Dual sections**: Displays Main hearings and Planning Court as separate sections
- **Client-side search**: Searches across both sections
- **Bilingual support**: English/Welsh content
- **Optional sections**: Either section can be empty

## Display

The rendered page shows:
1. Main hearings section (if data exists)
2. Planning Court section (if data exists)
3. Search functionality across both sections

## Usage

Lists are accessed via:

```
/london-administrative-court-daily-cause-list?artefactId=<id>
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
