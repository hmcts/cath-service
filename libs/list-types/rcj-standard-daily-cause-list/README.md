# RCJ Standard Daily Cause List

This module provides support for 8 Royal Courts of Justice standard daily cause list types:

## Supported List Types

1. **ID 10**: Civil Courts at the RCJ Daily Cause List
2. **ID 11**: County Court at Central London Civil Daily Cause List
3. **ID 12**: Court of Appeal (Criminal Division) Daily Cause List
4. **ID 13**: Family Division of the High Court Daily Cause List
5. **ID 14**: King's Bench Division Daily Cause List
6. **ID 15**: King's Bench Masters Daily Cause List
7. **ID 16**: Mayor & City Civil Daily Cause List
8. **ID 17**: Senior Courts Costs Office Daily Cause List

## Data Format

Each list uses a standard 7-column format:

- **Venue** (required): Court room or location
- **Judge** (required): Name of presiding judge
- **Time** (required): Hearing time in HH:MM format
- **Case Number** (required): Case reference number
- **Case Details** (required): Case description or parties
- **Hearing Type** (required): Type of hearing
- **Additional Information** (optional): Extra notes

## Excel Upload

Upload a single-sheet Excel file (.xlsx) with the column headers matching the field names above. The converter will validate:

- Time format (HH:MM)
- No HTML tags in any field
- All required fields present

## Special Features

- **List ID 12 (Court of Appeal Criminal Division)** includes a link to a quick guide document
- Client-side search across all columns
- Bilingual support (English/Welsh)
- Print-friendly layout

## Usage

This module is automatically registered when imported in the web application. Lists are accessed via URL patterns like:

```
/civil-courts-rcj-daily-cause-list?artefactId=<id>
/court-of-appeal-criminal-division-daily-cause-list?artefactId=<id>
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
