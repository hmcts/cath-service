# #339: Add ability for Flat-File only list types in CaTH

**State:** OPEN
**Assignees:** None
**Author:** OgechiOkelu
**Labels:** enhancement, tech-refinement
**Created:** 2026-02-06T09:25:27Z
**Updated:** 2026-02-11T13:39:41Z

## Description

**PROBLEM STATEMENT**
This ticket captures the development of the functionality that supports the ability to add a new list type in CaTH as a flat file without first adding it as if it was a JSON file

**AS A** Service
**I WANT** to add a new list type in CaTH
**SO THAT** I can publish a flat file list type without first adding it as a JSON file

**TECHINAL SPECIFICATION**

- Create a new flag in list type table named is_flat.
- If is_flat is true for a list, no schema validation should be performed and API endpoint /publication must not accept json publication for that list type.
- On configure-list-type-enter-details page, if user selects is_flat, disable is non-strategic radio button.

**ACCEPTANCE CRITERIA**
•	The functionality needed to support the addition of a flat file list type in CaTH is developed and implemented
•	A new flag is created and stored in CaTH back end to identify the new flat file list type
•	List types are assigned flags in the front end to identify if the list type is a flat file only list or not and the default is set to 'Is not' since most list types are not
•	The manual upload/Admin screens are not affected by this change since its only a list type configuration requirement

## Comments

### Comment by OgechiOkelu on 2026-02-06T09:27:15Z
@spec new-feature.md

### Comment by hmctsclaudecode on 2026-02-06T09:29:39Z
# Technical Specification: Add Flat-File Only List Type Flag

## 1. User Story
**As a** Service Administrator
**I want to** add a new list type in CaTH that only supports flat file uploads
**So that** I can publish flat file list types without requiring JSON format conversion

## 2. Background
Currently, list types in CaTH are identified by an `isNonStrategic` boolean flag that determines whether they appear in the manual upload or non-strategic upload screens. However, both upload paths allow JSON files, which trigger validation against list type schemas and enable structured data display.

This feature adds a new `flatFileOnly` flag to prevent JSON uploads for specific list types that should only be published as downloadable flat files (PDF, CSV, XLSX, etc.) without schema validation or structured display.

**Related files:**
- `libs/list-types/common/src/mock-list-types.ts` - List type definitions
- `libs/admin-pages/src/pages/manual-upload/validation.ts` - Upload validation logic
- `libs/admin-pages/src/pages/manual-upload-summary/index.ts` - File processing (line 91)

## 3. Acceptance Criteria

* **Scenario 1:** Add flat file only flag to list type model
    * **Given** the ListType interface exists in `libs/list-types/common/src/mock-list-types.ts`
    * **When** a new list type property is added
    * **Then** the `flatFileOnly?: boolean` optional field is present with default `false`

* **Scenario 2:** Prevent JSON uploads for flat-file-only list types
    * **Given** a list type has `flatFileOnly: true`
    * **When** an admin attempts to upload a .json file for that list type
    * **Then** validation fails with error message "This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed."

* **Scenario 3:** Allow flat file uploads for flat-file-only list types
    * **Given** a list type has `flatFileOnly: true`
    * **When** an admin uploads a .pdf, .csv, .xlsx, .doc, .docx, .htm, or .html file
    * **Then** the upload proceeds successfully and `isFlatFile: true` is set on the artefact

* **Scenario 4:** Skip JSON validation for flat-file-only list types
    * **Given** a list type has `flatFileOnly: true`
    * **When** the validation logic processes the upload
    * **Then** JSON schema validation is skipped (not attempted)

* **Scenario 5:** Existing list types remain unchanged
    * **Given** existing list types do not have `flatFileOnly` set
    * **When** they are used for uploads
    * **Then** they behave as before (allow both JSON and flat files)

## 4. User Journey Flow

No user journey changes. Admins use the existing manual upload screens:

```
1. Admin navigates to /manual-upload
2. Admin selects court, list type, and other metadata
3. Admin uploads file
4. System validates:
   - If listType.flatFileOnly === true AND file ends with .json → REJECT
   - Otherwise → ACCEPT (if passes other validations)
5. Admin confirms on summary page
6. File published as flat file
```

## 5. Low Fidelity Wireframe

No UI changes required. The manual upload form remains identical:

```
┌─────────────────────────────────────────────┐
│  Manual Upload                              │
├─────────────────────────────────────────────┤
│  Court: [Select dropdown]                   │
│  List Type: [Select dropdown] ◄─── Includes │
│             (includes flat-file-only types) │
│  File: [Choose file]                        │
│  Hearing Date: [DD] [MM] [YYYY]             │
│  Sensitivity: [Select dropdown]             │
│  Language: [Select dropdown]                │
│  Display From: [DD] [MM] [YYYY]             │
│  Display To: [DD] [MM] [YYYY]               │
│                                             │
│  [Continue]                                 │
└─────────────────────────────────────────────┘
```

Error display when JSON uploaded to flat-file-only type:

```
┌─────────────────────────────────────────────┐
│  ⚠ There is a problem                       │
├─────────────────────────────────────────────┤
│  • This list type only accepts flat files   │
│    (PDF, CSV, Excel, etc.). JSON files are  │
│    not allowed.                             │
└─────────────────────────────────────────────┘
```

## 6. Page Specifications

No page structure changes. Validation feedback added inline at file input field when JSON rejected.

## 7. Content

### Error Message (English)
```
This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed.
```

### Error Message (Welsh)
```
Mae'r math hwn o restr yn derbyn ffeiliau fflat yn unig (PDF, CSV, Excel, ac ati). Ni chaniateir ffeiliau JSON.
```

## 8. URL

No URL changes. Uses existing routes:
- `/manual-upload` - Upload form
- `/manual-upload-summary` - Confirmation page

## 9. Validation

### New Validation Rule

In `libs/admin-pages/src/manual-upload/validation.ts`:

```typescript
// After line 116, before validateJson check at line 126
if (body.listType && file) {
  const listTypeId = Number.parseInt(body.listType, 10);
  const listType = mockListTypes.find(lt => lt.id === listTypeId);

  if (listType?.flatFileOnly && file.originalname?.endsWith('.json')) {
    errors.push({
      text: errorMessages.flatFileOnlyType,
      href: '#file'
    });
  }
}
```

### Skip JSON Validation

Modify line 126 check:

```typescript
const selectedListType = mockListTypes.find(lt => lt.id === Number.parseInt(body.listType, 10));

if (validateJson && file && body.listType && !selectedListType?.flatFileOnly) {
  const jsonError = await validateJsonFileSchema(file, body.listType);
  // ...
}
```

## 10. Error Messages

Add to `libs/admin-pages/src/locales/en.ts` and `cy.ts`:

**English:**
```typescript
errorMessages: {
  // ... existing errors
  flatFileOnlyType: 'This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed.'
}
```

**Welsh:**
```typescript
errorMessages: {
  // ... existing errors
  flatFileOnlyType: "Mae'r math hwn o restr yn derbyn ffeiliau fflat yn unig (PDF, CSV, Excel, ac ati). Ni chaniateir ffeiliau JSON."
}
```

## 11. Navigation

No navigation changes. Upload flow remains:
1. `/manual-upload` → `/manual-upload-summary` → `/manual-upload-success`
2. Validation errors return to `/manual-upload` with error summary

## 12. Accessibility

No accessibility changes required:
- Error message follows existing GOV.UK error summary pattern
- Linked to file input via `href: '#file'`
- Screen readers will announce error in summary and inline
- WCAG 2.2 AA compliance maintained

## 13. Test Scenarios

### Unit Tests

**File:** `libs/admin-pages/src/manual-upload/validation.test.ts`

* Flat-file-only list type rejects JSON upload
* Flat-file-only list type accepts PDF upload
* Flat-file-only list type accepts CSV upload
* Flat-file-only list type accepts XLSX upload
* Regular list type still accepts JSON upload
* List type without flag (undefined) accepts JSON upload
* Error message includes correct text and href

### Integration Tests

**File:** `libs/admin-pages/src/pages/manual-upload/index.test.ts`

* POST with flat-file-only list type and JSON file returns validation error
* POST with flat-file-only list type and PDF file succeeds
* Session stores error message correctly
* Redirect to form page with errors preserved

### E2E Tests

**File:** `e2e-tests/tests/manual-upload.spec.ts`

* Admin uploads JSON to flat-file-only list type, sees error message
* Admin uploads PDF to flat-file-only list type, upload succeeds
* Welsh translation of error message displays correctly

## 14. Assumptions & Open Questions

### Assumptions
* List types remain in-memory only (no database migration needed)
* The flag defaults to `false` for backward compatibility
* Existing list types (IDs 1-9) do not need `flatFileOnly: true`
* Future list types will be added to `mockListTypes` array with flag as needed
* File extension check (`.json`) is sufficient (no MIME type check needed)
* Non-strategic upload page uses same validation logic

### Open Questions
1. **Which specific list types need `flatFileOnly: true`?**
   - Should this be applied to existing types or only new ones?
   - Does CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST (id: 9) need this flag?

2. **Should non-strategic upload page also respect this flag?**
   - Currently accepts .xlsx only
   - Does the flag apply there or only to manual upload?

3. **Should the flag be visible in admin UI?**
   - Current spec assumes backend-only configuration
   - Should admins see which list types are flat-file-only?

4. **Error message wording approval**
   - Proposed: "This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed."
   - Needs content design review?

5. **Should we prevent creation of new flat-file-only list types through UI?**
   - Or is adding to `mockListTypes` array sufficient for now?

---

## Implementation Checklist

- [ ] Update `ListType` interface in `libs/list-types/common/src/mock-list-types.ts`
- [ ] Add `flatFileOnly?: boolean` field to interface
- [ ] Update validation logic in `libs/admin-pages/src/manual-upload/validation.ts`
- [ ] Add flat-file-only check before JSON validation
- [ ] Add error messages to `libs/admin-pages/src/locales/en.ts`
- [ ] Add Welsh error messages to `libs/admin-pages/src/locales/cy.ts`
- [ ] Write unit tests for validation logic
- [ ] Write integration tests for page controller
- [ ] Write E2E test for upload rejection
- [ ] Update non-strategic upload validation (if applicable)
- [ ] Document flag usage in code comments

### Comment by OgechiOkelu on 2026-02-11T12:28:27Z
Note: Initial requirements may have been updated during the tech-refinement which need to be included in the technical plan and may require changes to the initially generated technical specifications during the development of the technical plan. @plan

### Comment by OgechiOkelu on 2026-02-11T13:39:41Z
Note: Initial requirements may have been updated during the tech-refinement which need to be included in the technical plan and may require changes to the initially generated technical specifications during the development of the technical plan. @plan
