# VIBE-153: Technical Specification

## 1. High Level Technical Implementation Approach

This ticket implements a court/tribunal search page with autocomplete functionality. The implementation follows the existing CaTH patterns:

- **Page controller pattern**: Single file with GET/POST exports for `/search` route
- **Locale-based translations**: English and Welsh content in separate locale objects
- **GOV.UK Design System**: Using accessible autocomplete component
- **Mock data service**: Static JSON data loaded from file (no database)
- **Session storage**: Selected location stored in session for subsequent pages
- **Progressive enhancement**: Works without JavaScript, enhanced with autocomplete

### Key Technical Decisions

1. **Client-side autocomplete with GOV.UK accessible-autocomplete** for better UX
2. **New `libs/location` module** for location data and services
3. **Mock data in JSON file** (not database) as specified in requirements
4. **Search page in `libs/public-pages`** following existing pattern
5. **A-Z list as separate page** at `/courts-tribunals-list`

## 2. File Structure and Routing

### New Module: `libs/location`

```
libs/location/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Exports service functions
    ├── location-data.ts                  # Mock data (JSON structure)
    ├── location-service.ts               # Search and filter functions
    └── location-service.test.ts          # Unit tests
```

### Updated Module: `libs/public-pages`

```
libs/public-pages/src/
├── pages/
│   ├── search.ts                         # Court/tribunal search controller
│   ├── search.test.ts                    # Controller tests
│   ├── courts-tribunals-list.ts          # A-Z list controller
│   └── courts-tribunals-list.test.ts     # Controller tests
├── locales/
│   ├── search.ts                         # EN/CY translations for search
│   └── courts-tribunals-list.ts          # EN/CY translations for A-Z list
├── views/
│   ├── search.njk                        # Search page template
│   └── courts-tribunals-list.njk         # A-Z list template
└── assets/
    └── js/
        └── search-autocomplete.ts        # Client-side autocomplete logic
```

### Routes

- `GET/POST /search` - Court/tribunal search page
- `GET /courts-tribunals-list` - A-Z list of all courts/tribunals

## 3. Implementation Details

### 3.1. Location Data Structure (`libs/location/src/location-data.ts`)

```typescript
export const locationData = {
  locations: [
    {
      locationId: 1,
      name: "Oxford Combined Court Centre",
      welshName: "Oxford Combined Court Centre",
      regions: [3],
      subJurisdictions: [1, 4]
    },
    {
      locationId: 9,
      name: "Single Justice Procedure",
      welshName: "Single Justice Procedure",
      regions: [1, 2],
      subJurisdictions: [7]
    }
  ],
  regions: [...],
  jurisdictions: [...],
  subJurisdictions: [...]
};
```

**Notes**:
- Fixed typo in original data (`subJurisidctions` → `subJurisdictions`)
- Mock data should include 10 locations total for realistic testing (only 2 shown above as examples)

### 3.2. Location Service (`libs/location/src/location-service.ts`)

```typescript
export interface Location {
  locationId: number;
  name: string;
  welshName: string;
  regions: number[];
  subJurisdictions: number[];
}

// Search locations by name (case-insensitive, partial match)
// Returns results prioritized: starts-with matches first, then partial matches
// Minimum 1 character, no maximum limit
export function searchLocations(query: string, language: "en" | "cy"): Location[]

// Get all locations sorted alphabetically
export function getAllLocations(language: "en" | "cy"): Location[]

// Get location by ID
export function getLocationById(id: number): Location | undefined

// Get locations grouped by first letter (for A-Z list)
export function getLocationsGroupedByLetter(language: "en" | "cy"): Record<string, Location[]>
```

### 3.3. Search Page Controller (`libs/public-pages/src/pages/search.ts`)

```typescript
import type { Request, Response } from "express";
import { searchLocations } from "@hmcts/location";
import { en, cy } from "../locales/search.js";

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const query = req.query.q as string | undefined;

  res.render("search", {
    en,
    cy,
    backLink: "/view-option",
    query: query || "",
    suggestions: query ? searchLocations(query, locale) : []
  });
};

export const POST = async (req: Request, res: Response) => {
  const selectedLocationId = req.body?.locationId;
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!selectedLocationId) {
    return res.render("search", {
      en,
      cy,
      errors: [{
        text: t.errorMessage,
        href: "#location"
      }],
      backLink: "/view-option"
    });
  }

  // Redirect to summary page with locationId in URL
  res.redirect(`/summary-of-publications?locationId=${selectedLocationId}`);
};
```

### 3.4. Search Page Template (`libs/public-pages/src/views/search.njk`)

Uses GOV.UK Design System components:
- `govukInput` for search field with autocomplete
- `govukButton` for continue button
- `govukErrorSummary` for validation errors
- Client-side JavaScript for accessible-autocomplete enhancement

### 3.5. A-Z List Page Controller (`libs/public-pages/src/pages/courts-tribunals-list.ts`)

```typescript
import type { Request, Response } from "express";
import { getLocationsGroupedByLetter } from "@hmcts/location";
import { en, cy } from "../locales/courts-tribunals-list.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const groupedLocations = getLocationsGroupedByLetter(locale);

  res.render("courts-tribunals-list", {
    en,
    cy,
    backLink: "/search",
    groupedLocations
  });
};
```

## 4. Error Handling Implementation

### Validation Rules

1. **No location selected**: Show error "Select a court or tribunal from the list"
2. **Invalid location ID**: Show error "Select a valid court or tribunal"
3. **Empty search with continue**: Show error "Enter a court or tribunal name or select from the list"

### Error Messages

```typescript
// libs/public-pages/src/locales/search.ts
export const en = {
  title: "What court or tribunal are you interested in?",
  errorSummaryTitle: "There is a problem",
  errorMessage: "Select a court or tribunal from the list",
  searchLabel: "Search for a court or tribunal",
  searchHint: "Enter the name of a court or tribunal",
  continueButton: "Continue",
  azListLink: "select from an A-Z list of courts and tribunals",
  azListPrefix: "Or"
};

export const cy = {
  title: "Pa lys neu dribiwnlys sydd o ddiddordeb i chi?",
  errorSummaryTitle: "Mae problem",
  errorMessage: "Dewiswch lys neu dribiwnlys o'r rhestr",
  searchLabel: "Chwilio am lys neu dribiwnlys",
  searchHint: "Nodwch enw llys neu dribiwnlys",
  continueButton: "Parhau",
  azListLink: "dewis o restr A-Z o lysoedd a thribiwnlysoedd",
  azListPrefix: "Neu"
};
```

## 5. Autocomplete Implementation

### Approach: Progressive Enhancement

**Without JavaScript**:
- Standard text input
- User types full name and submits
- Server-side validation against location list

**With JavaScript**:
- Enhanced with `accessibleAutocomplete` from GOV.UK
- Client-side filtering of suggestions
- Keyboard accessible (arrow keys, enter to select)
- Screen reader announcements

### Client-Side Implementation (`libs/public-pages/src/assets/js/search-autocomplete.ts`)

```typescript
import accessibleAutocomplete from "accessible-autocomplete";
import { searchLocations } from "@hmcts/location";

// Initialize autocomplete on page load
export function initSearchAutocomplete() {
  const container = document.getElementById("location-autocomplete");
  if (!container) return;

  accessibleAutocomplete({
    element: container,
    id: "location",
    name: "locationId",
    source: (query, populateResults) => {
      const locale = document.documentElement.lang === "cy" ? "cy" : "en";
      const results = searchLocations(query, locale);
      populateResults(results.map(loc => loc.name));
    },
    minLength: 2,
    confirmOnBlur: false
  });
}
```

## 6. Welsh Language Support

All text content must have both English and Welsh translations:

- Page titles and headings
- Form labels and hints
- Error messages
- Button text
- Link text
- Location names (use `welshName` field)

Language switching handled by existing i18n middleware. Templates receive both `en` and `cy` objects, and display based on `res.locals.locale`.

## 7. Navigation Flow

```
Previous: /view-option (What do you want to do?)
Current:  /search (What court or tribunal are you interested in?)
Next:     /summary-of-publications?locationId=X (hearing list - future ticket)
Alt:      /courts-tribunals-list (A-Z list)
```

Location data is passed via URL parameter (`locationId`) rather than session storage.

## 8. Testing Strategy

### Unit Tests

- `location-service.test.ts`: Test search, filter, grouping functions with priority ordering
- `search.test.ts`: Test GET/POST handlers, validation, redirect with locationId
- `courts-tribunals-list.test.ts`: Test A-Z list rendering and grouping

### E2E Tests (Playwright)

- Happy path: Search, select location, continue
- Error cases: No selection, invalid input
- A-Z list navigation
- Welsh language toggle
- Keyboard navigation
- Screen reader compatibility

## 9. Accessibility Requirements

- WCAG 2.2 AA compliance
- Keyboard navigation (Tab, Arrow keys, Enter)
- Screen reader announcements for autocomplete suggestions
- Clear focus indicators
- Error messages linked to form fields
- Semantic HTML structure
- `aria-describedby` for hints and errors

## 10. Module Registration

### Update `apps/web/src/app.ts`

No changes needed - `libs/public-pages` already registered.

### Update `apps/web/vite.config.ts`

Add search-autocomplete.ts to build:

```typescript
import { assets as publicPagesAssets } from "@hmcts/public-pages";
// Already included in existing config
```

## IMPLEMENTATION DECISIONS

1. **Next page**: `/summary-of-publications?locationId=X` where X is the selected location ID. Page will return 404 for now (to be implemented in future ticket).

2. **Location data**: Expand mock data to include 10 locations total for realistic testing.

3. **Search behavior**:
   - Minimum: 1 character before showing suggestions
   - Maximum: No limit (user can scroll through all matches)
   - Match type: Partial match, case-insensitive
   - **Priority**: Results that start with the typed value appear first, followed by partial matches

4. **A-Z list interaction**: Clicking a location in the A-Z list returns user to search page with that location pre-populated.

5. **Session management**: Location ID is NOT stored in session. It is passed via URL parameter only.

6. **Search without JavaScript**: Not required - autocomplete enhancement is optional.

7. **URL parameter**: No pre-population from URL query parameters.

8. **Back navigation**: No memory of previous selections - clean state on return.

## 11. Infrastructure Requirements

**No infrastructure changes required for this ticket.**

This implementation uses:
- Mock data in JSON format (no database schema changes)
- Location ID passed via URL parameters (no session storage needed)
- Standard TypeScript/JavaScript build process (no new build steps)
- No new environment variables or secrets
- No new container, Kubernetes, or Helm chart configuration

The ticket is purely application-level code that leverages existing infrastructure.
