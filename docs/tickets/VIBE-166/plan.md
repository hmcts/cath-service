# VIBE-166: Technical Implementation Plan

**Schema Reference:** `https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/non-strategic/cst_weekly_hearing_list.json`

This plan has been updated to match the official Care Standards Tribunal schema from pip-data-management.

---

## 1. Technical Approach

### High-Level Strategy

The upload flow (form → summary → success) is **already implemented** in `libs/admin-pages`. This ticket focuses on:

1. Adding **Care Standards Tribunal Weekly Hearing List** as a new list type
2. Implementing **Excel-to-JSON conversion** for flat file uploads
3. Creating the **front-end display page** for Care Standards Tribunal lists
4. Validating JSON against a **custom schema** specific to Care Standards Tribunal

### Architecture Decisions

**Modular List Type Architecture**
- Follow the existing pattern in `libs/list-types/civil-and-family-daily-cause-list`
- Create a new module: `libs/list-types/care-standards-tribunal-weekly-hearing-list`
- Each list type is self-contained with its own schema, validation, rendering, and display page

**Excel Processing Strategy**
- Excel-to-JSON conversion should happen **after** the user confirms on the summary page
- Conversion logic will be part of the new list type module
- Use `xlsx` library (already available in dependencies) to parse Excel files
- Store the converted JSON file alongside the original Excel file
- Validation runs on the JSON output to ensure schema compliance

**File Storage Pattern**
- Excel files stored in `storage/temp/uploads/{artefactId}.xlsx`
- JSON files stored in `storage/temp/uploads/{artefactId}.json`
- Both files associated with the same `artefactId` in the database
- The `isFlatFile` flag distinguishes Excel uploads (true) from JSON uploads (false)

---

## 2. Implementation Details

### File Structure

```
libs/list-types/care-standards-tribunal-weekly-hearing-list/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts                          # Module configuration exports
    ├── index.ts                           # Business logic exports
    ├── models/
    │   └── types.ts                       # TypeScript types for CST data
    ├── pages/
    │   ├── index.ts                       # GET handler for list display
    │   ├── care-standards-tribunal-weekly-hearing-list.njk  # Template
    │   ├── en.ts                          # English content
    │   └── cy.ts                          # Welsh content
    ├── schemas/
    │   └── care-standards-tribunal-weekly-hearing-list.json  # JSON schema
    ├── validation/
    │   └── json-validator.ts              # Schema validation
    ├── rendering/
    │   └── renderer.ts                    # Transform JSON → view data
    └── conversion/
        ├── excel-to-json.ts               # Excel → JSON conversion
        └── excel-to-json.test.ts          # Unit tests
```

### Component Details

#### 1. List Type Registration

Add to `libs/list-types/common/src/mock-list-types.ts`:

```typescript
{
  id: 9,
  name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
  englishFriendlyName: "Care Standards Tribunal Weekly Hearing List",
  welshFriendlyName: "Welsh placeholder",
  provenance: "MANUAL_UPLOAD",
  urlPath: "care-standards-tribunal-weekly-hearing-list"
}
```

#### 2. JSON Schema

**Schema Location:** `https://github.com/hmcts/pip-data-management/blob/master/src/main/resources/schemas/non-strategic/cst_weekly_hearing_list.json`

**Schema Structure (from pip-data-management):**

Each hearing record contains:

```json
{
  "date": {
    "title": "Date",
    "type": "string",
    "pattern": "^\\d{2}/\\d{2}/\\d{4}$",
    "examples": ["02/01/2025"]
  },
  "caseName": {
    "title": "Case name",
    "type": "string",
    "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
    "examples": ["A Vs B"]
  },
  "hearingLength": {
    "title": "Length of hearing",
    "type": "string",
    "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
    "examples": ["1 hour"]
  },
  "hearingType": {
    "title": "Type of hearing being presented",
    "type": "string",
    "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
    "examples": ["mda"]
  },
  "venue": {
    "title": "Venue name of the hearing",
    "type": "string",
    "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
    "examples": ["This is the venue of the hearing"]
  },
  "additionalInformation": {
    "title": "Additional information",
    "type": "string",
    "pattern": "^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$",
    "examples": ["This is additional information"]
  }
}
```

**Key Validation Rules:**
- `date`: Must match `dd/MM/yyyy` format (e.g., "02/01/2025")
- All text fields: Must not contain HTML tags (XSS protection via pattern `^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$`)
- All fields are required (as per ticket specification)

#### 3. Excel-to-JSON Conversion

**Function Signature:**
```typescript
export async function convertExcelToJson(
  excelBuffer: Buffer
): Promise<CareStandardsTribunalHearing[]>

interface CareStandardsTribunalHearing {
  date: string;              // dd/MM/yyyy format
  caseName: string;
  hearingLength: string;
  hearingType: string;
  venue: string;
  additionalInformation: string;
}
```

**Process:**
1. Parse Excel buffer using `xlsx` library
2. Read first worksheet
3. Validate headers match expected columns (case-insensitive):
   - "Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"
4. Map each row to a hearing object
5. Validate each field:
   - `date`: Must match `dd/MM/yyyy` pattern (e.g., "02/01/2025")
   - All text fields: Must not contain HTML tags (XSS protection)
6. Return array of hearing objects matching schema
7. **Note:** Date transformation from `dd/MM/yyyy` to `d MMMM yyyy` happens during rendering, not conversion

#### 4. Integration with Upload Summary

Modify `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`:

**POST handler enhancement:**
```typescript
// After creating artefact, before saving file
if (isFlatFile && listTypeId === 9) {
  // Import conversion and validation functions
  const { convertExcelToJson, validateCareStandardsTribunalList } = await import(
    "@hmcts/care-standards-tribunal-weekly-hearing-list"
  );

  // Convert Excel to JSON (array of hearing objects)
  const hearingsData = await convertExcelToJson(uploadData.file);

  // Validate against pip-data-management schema
  const validation = validateCareStandardsTribunalList(hearingsData);
  if (!validation.isValid) {
    throw new Error(`Invalid Excel format: ${validation.errors.join(", ")}`);
  }

  // Save both Excel and JSON
  await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
  await saveUploadedFile(
    artefactId,
    `${artefactId}.json`,
    Buffer.from(JSON.stringify(hearingsData))
  );
}
```

**Note:** The conversion returns an array of hearing objects directly. Metadata like court name, list title, and duration will be stored separately in the artefact record and combined during rendering.

#### 5. Front-End Display Page

**Route:** `/care-standards-tribunal-weekly-hearing-list?artefactId={id}`

**Template Structure:**
```nunjucks
{# Header #}
<h1>Care Standards Tribunal Weekly Hearing List</h1>
<p>List for week commencing {{ header.duration }}</p>
<p>Last updated {{ header.lastUpdated }}</p>

{# Important Information Accordion #}
<details class="govuk-details">
  <summary>Important information</summary>
  <p>Please contact the Care Standards Office at cst@justice.gov.uk...</p>
  <a href="...">Observe a court or tribunal hearing...</a>
</details>

{# Search Cases #}
<h2>Search Cases</h2>
<input id="case-search-input" type="text" />

{# Cases Table #}
<table class="govuk-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Case name</th>
      <th>Hearing length</th>
      <th>Hearing type</th>
      <th>Venue</th>
      <th>Additional information</th>
    </tr>
  </thead>
  <tbody>
    {% for hearing in hearings %}
      <tr>
        <td>{{ hearing.date }}</td>
        <td>{{ hearing.caseName }}</td>
        <td>{{ hearing.hearingLength }}</td>
        <td>{{ hearing.hearingType }}</td>
        <td>{{ hearing.venue }}</td>
        <td>{{ hearing.additionalInformation }}</td>
      </tr>
    {% endfor %}
  </tbody>
</table>

{# Footer #}
<p>Data source: Care Standards Tribunal</p>
<a href="#top">Back to top</a>
```

**Search Functionality:**
- Client-side JavaScript search (same pattern as civil-and-family list)
- Highlights matching text with yellow background
- Searches across all table columns

#### 6. Application Registration

**Register page routes** in `apps/web/src/app.ts`:
```typescript
import { pageRoutes as cstPages } from "@hmcts/care-standards-tribunal-weekly-hearing-list/config";

app.use(await createSimpleRouter(cstPages));
```

**Register in tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/care-standards-tribunal-weekly-hearing-list": [
        "libs/list-types/care-standards-tribunal-weekly-hearing-list/src"
      ]
    }
  }
}
```

---

## 3. Error Handling & Edge Cases

### Excel Validation Errors

**Scenario:** Excel file has wrong headers or missing columns

**Handling:**
- Validate headers during conversion (case-insensitive match)
- Expected headers: "Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"
- Throw descriptive error: "Excel file must contain columns: Date, Case name, Hearing length, Hearing type, Venue, Additional information"
- Catch error in POST handler and render error on summary page
- Error message: "The uploaded file format is invalid. Please check your file and try again."

### Date Format Errors

**Scenario:** Date column contains invalid dates (e.g., "32/01/2025", "2025-01-01", "1/1/2025")

**Handling:**
- Validate each date against pattern `^\\d{2}/\\d{2}/\\d{4}$` during conversion
- Must be exactly `dd/MM/yyyy` format (e.g., "02/01/2025" not "2/1/2025")
- Validate date is actually valid (e.g., not "32/01/2025")
- Throw error: "Invalid date format in row X: '{value}'. Expected format: dd/MM/yyyy (e.g., 02/01/2025)"
- Display error on summary page with row number
- User must fix Excel and re-upload

### HTML/XSS Validation Errors

**Scenario:** Excel contains HTML tags in any field (e.g., case name contains "<script>alert('xss')</script>")

**Handling:**
- Validate all text fields against pattern `^(?!(.|\\r|\\n)*<[^>]+>)(.|\\r|\\n)*$`
- Pattern rejects any string containing HTML tags
- Throw error: "Invalid content in row X, column {fieldName}: HTML tags are not allowed"
- Display error on summary page
- User must remove HTML tags from Excel and re-upload

### Empty Excel File

**Scenario:** Excel file has no data rows (only headers)

**Handling:**
- Check row count after parsing
- Throw error: "Excel file must contain at least one hearing"
- Display error on summary page

### Missing Required Fields

**Scenario:** Excel row has empty cells for required fields

**Handling:**
- All 6 fields are required per the schema
- Validate each field is non-empty during conversion
- Throw error: "Missing required field '{fieldName}' in row X"
- Display error on summary page with row and field details

### JSON Schema Validation Failure

**Scenario:** Converted JSON doesn't match schema (edge case if conversion logic has bugs)

**Handling:**
- Log validation errors to console
- Display generic error: "We could not process your upload. Please try again."
- Admin can check logs for details

### File Not Found on Display

**Scenario:** User navigates to list display but JSON file is missing

**Handling:**
- Check file existence in GET handler
- Return 404 with error template
- Error message: "The requested list could not be found"

### Session Expiry

**Scenario:** User takes too long on summary page (Redis TTL expires)

**Handling:**
- Already handled by existing code
- uploadData will be null
- Returns 404: "Upload not found"
- User must start upload again

---

## 4. Acceptance Criteria Mapping

| Criterion | Implementation | Verification |
|-----------|---------------|--------------|
| Access verified account | Already implemented in auth middleware | E2E test: Sign in as Local Admin |
| Summary page displays details | Already implemented | E2E test: Upload file, verify summary table |
| Change links work | Already implemented | E2E test: Click Change, verify navigation |
| Continue completes upload | Already implemented | E2E test: Submit summary, verify database record |
| Success banner displayed | Already implemented using govukPanel | E2E test: Verify green panel with "Success" |
| Success links present | Already implemented | E2E test: Verify Upload another, Remove, Home links |
| Excel to JSON conversion | New: Excel-to-JSON converter | Unit test: Parse sample Excel, verify JSON structure |
| JSON validation | New: JSON schema validator | Unit test: Valid/invalid JSON, verify results |
| CST list type created | New: List type registration | Verify list type appears in dropdown |
| Front-end list display | New: Display page with specific format | E2E test: View published list, verify headers/table |
| List title format | Renderer formats title with date/language | E2E test: Verify "Care Standards Tribunal Weekly Hearing List for week commencing..." |
| Duration display | Renderer formats duration | Verify "List for week commencing 24 November 2025" |
| Last updated timestamp | Uses artefact.lastReceivedDate | Verify timestamp format "24 November 2025 at 9:55am" |
| Important Information accordion | Nunjucks template with GOV.UK details | E2E test: Open accordion, verify content and link |
| Search functionality | Client-side JS (same as civil-and-family) | E2E test: Enter search term, verify highlighting |
| Table with 6 columns | Nunjucks template renders all columns | E2E test: Verify all column headers present |
| Data source footer | Template renders provenance | Verify "Data source: Care Standards Tribunal" |
| Back to top link | Template includes anchor link | E2E test: Click link, verify scroll |
| WCAG 2.2 AA compliance | GOV.UK components + semantic HTML | Accessibility audit with axe-core |

---

## 5. Open Questions & Clarifications

### CLARIFICATIONS NEEDED

1. **Welsh translations**
   - The ticket specifies "Welsh placeholder" for Welsh content
   - Should we implement placeholder text (e.g., "Welsh placeholder") or leave Welsh implementation for a future ticket?
   - Recommendation: Use placeholder strings matching ticket specification

2. **Data source label**
   - Ticket shows: "Data source: Care Standards Tribunal"
   - Should this always say "Care Standards Tribunal" or should it dynamically pull from provenance?
   - Current assumption: Hard-code "Care Standards Tribunal" in template since this list type is CST-specific

3. **Excel file validation timing**
   - Should we validate Excel format on the **upload form** (before summary) or on the **summary page** (before submission)?
   - Trade-off: Early validation = better UX, Late validation = simpler implementation
   - Current approach: Validate on summary page POST (during conversion)

4. **Invalid Excel error handling**
   - Should invalid Excel files show errors on the summary page or redirect back to upload form?
   - Current approach: Show error on summary page (keep user context)

5. **Search functionality scope**
   - Should search be client-side only (current implementation) or support server-side filtering for large lists?
   - Current approach: Client-side only (consistent with civil-and-family list)

6. **Excel field validation rules** ✅ ANSWERED
   - **Answer from schema:** All 6 fields are mandatory
   - Date must match `dd/MM/yyyy` pattern exactly
   - All text fields validated against HTML tag pattern for XSS protection
   - No additional format validation for hearing length or other text fields (free text)

7. **Date range for duration**
   - Ticket shows "List for week commencing 24 November 2025"
   - Should this always be a week? Should we calculate end date or just show start date?
   - Current approach: Use displayFrom and displayTo from upload form metadata

8. **Multiple sheets in Excel**
   - If Excel file has multiple worksheets, which sheet should we read?
   - Current assumption: Always read first sheet

9. **Excel to JSON caching**
   - Should we cache the converted JSON or regenerate it on each page load?
   - Current approach: Save JSON file once during upload, read from file on display

10. **Provenance value**
    - Should Care Standards Tribunal uploads use `Provenance.MANUAL_UPLOAD` or a new `Provenance.CARE_STANDARDS_TRIBUNAL`?
    - Current approach: Use existing `MANUAL_UPLOAD`
