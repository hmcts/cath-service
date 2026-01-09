# VIBE-323: Technical Implementation Plan - Care Standards Weekly Hearing List Welsh Translation

## Overview
Implement comprehensive Welsh language support for the Care Standards Tribunal Weekly Hearing List. This includes translating all static UI text, maintaining bilingual display with language toggle, and ensuring PDF downloads work in both languages.

## Current State Analysis

### Existing Infrastructure
The Care Standards Tribunal Weekly Hearing List module is fully implemented at:
- **Module**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- **List Type ID**: 9
- **URL Path**: `/care-standards-tribunal-weekly-hearing-list`
- **Provenance**: MANUAL_UPLOAD (non-strategic publishing)

#### Key Files
1. **Controller** (`/src/pages/index.ts`)
   - GET handler with artefactId query parameter
   - Loads JSON data from file system
   - Validates against schema
   - Renders using `renderCareStandardsTribunalData`
   - Already supports English/Welsh localization through `res.locals.locale`

2. **Template** (`/src/pages/care-standards-tribunal-weekly-hearing-list.njk`)
   - GOV.UK Design System components
   - Important Information accordion with CST contact details
   - Search input for case filtering
   - Table with 6 columns: Date, Case name, Hearing length, Hearing type, Venue, Additional information
   - Data source attribution
   - Back to top link

3. **Translations**
   - **English** (`/src/pages/en.ts`): Fully implemented with all content
   - **Welsh** (`/src/pages/cy.ts`): Structure exists but all values are "Welsh placeholder"

4. **Data Rendering** (`/src/rendering/renderer.ts`)
   - Already handles locale-based date formatting
   - Uses Luxon for time formatting with 12-hour clock
   - Supports `en-GB` and `cy-GB` locales

### Gap Analysis

**Welsh Translation Status:**
- ❌ All Welsh content in `cy.ts` is placeholder text
- ❌ Template does not show language toggle (EN | CY)
- ❌ No Welsh route (`/rhestr-gwrandawiadau-wythnosol-y-cst`)
- ❌ PDF generation not implemented (required for bilingual PDF download)
- ❌ Search functionality not implemented (template has input but no JS)
- ❌ Error messages for Welsh not defined

**Required Translations:**
All translations from specification need to be added to `cy.ts`:
- Page titles and headings
- Important information text
- Table column headers
- Search labels
- Back navigation
- Data source labels
- Contact information
- Error states

## Technical Architecture

### Module Structure (No Changes)
The existing module structure is well-designed and follows HMCTS patterns. We only need to update content files:

```
libs/list-types/care-standards-tribunal-weekly-hearing-list/
├── src/
│   ├── pages/
│   │   ├── index.ts              # NO CHANGES - already supports i18n
│   │   ├── index.njk             # UPDATE - add language toggle, ensure all text uses locale variables
│   │   ├── en.ts                 # REVIEW - ensure complete
│   │   └── cy.ts                 # UPDATE - replace all placeholders with Welsh translations
│   └── rendering/
│       └── renderer.ts            # VERIFY - ensure Welsh date/time formatting works correctly
```

### Translation Strategy

#### 1. Update Welsh Content File

Replace all "Welsh placeholder" values in `/src/pages/cy.ts` with approved Welsh translations:

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/cy.ts
export const cy = {
  pageTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal",
  listForWeekCommencing: "Rhestr ar gyfer yr wythnos yn dechrau ar",
  lastUpdated: "Diweddarwyd diwethaf",
  importantInformation: {
    heading: "Gwybodaeth Bwysig",
    content: "Cysylltwch â'r Swyddfa Safonau Gofal yn cst@justice.gov.uk i gael manylion am sut i gael mynediad at wrandawiadau fideo.",
    link: {
      text: "Arsylwi gwrandawiad llys neu dribiwnlys fel newyddiadurwr, ymchwilydd neu aelod o'r cyhoedd",
      url: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing-as-a-journalist-researcher-or-member-of-the-public.cy"
    }
  },
  search: {
    label: "chwilio achosion"
  },
  tableHeaders: {
    date: "Dyddiad",
    caseName: "Enw'r Achos",
    hearingLength: "Hyd y gwrandawiad",
    hearingType: "Math o wrandawiad",
    venue: "Lleoliad",
    additionalInformation: "Gwybodaeth ychwanegol"
  },
  dataSource: {
    label: "Ffynhonnell Data",
    value: "Lanlwytho â llaw"
  },
  backToTop: "Yn ôl",
  downloadPdf: "Llwytho'r PDF yma ar eich dyfais",
  errors: {
    noHearings: "Nid oes gwrandawiadau wedi'u trefnu ar gyfer yr wythnos hon.",
    searchNoResults: "Nid oes unrhyw achosion yn cyfateb i'ch chwiliad.",
    cannotDisplay: "Ni allwn arddangos y rhestr gwrandawiadau hon ar hyn o bryd.",
    pdfNotAvailable: "Nid yw'r PDF ar gael ar hyn o bryd. Rhowch gynnig arall arni yn nes ymlaen.",
    invalidFile: "Rhaid i'r ffeil fod yn Excel .xlsx",
    invalidSchema: "Nid yw'r ffeil yn cyd-fynd â'r fformat gofynnol ar gyfer Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal."
  }
};
```

#### 2. Verify English Content Completeness

Ensure `/src/pages/en.ts` includes all required content matching the specification:

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/en.ts
export const en = {
  pageTitle: "Care Standards Tribunal Weekly Hearing List",
  listForWeekCommencing: "List for week commencing",
  lastUpdated: "Last updated",
  importantInformation: {
    heading: "Important Information",
    content: "Please contact the Care Standards Office at cst@justice.gov.uk for details of how to access video hearings.",
    link: {
      text: "Observe a court or tribunal hearing as a journalist, researcher or member of the public",
      url: "https://www.gov.uk/guidance/observe-a-court-or-tribunal-hearing-as-a-journalist-researcher-or-member-of-the-public"
    }
  },
  search: {
    label: "Search cases"
  },
  tableHeaders: {
    date: "Date",
    caseName: "Case Name",
    hearingLength: "Hearing length",
    hearingType: "Hearing type",
    venue: "Venue",
    additionalInformation: "Additional information"
  },
  dataSource: {
    label: "Data Source",
    value: "Manual Upload"
  },
  backToTop: "Back",
  downloadPdf: "Download this PDF to your device",
  errors: {
    noHearings: "There are no hearings scheduled for this week.",
    searchNoResults: "No cases match your search.",
    cannotDisplay: "We cannot display this hearing list at the moment.",
    pdfNotAvailable: "The PDF is not available right now. Try again later.",
    invalidFile: "The file must be an Excel .xlsx",
    invalidSchema: "The file does not match the required format for the Care Standards Weekly Hearing List."
  }
};
```

#### 3. Update Template for Language Toggle

The template needs to display language toggle and use locale-aware content variables:

```html
<!-- libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/care-standards-tribunal-weekly-hearing-list.njk -->
{% extends "layouts/base-template.njk" %}
{% from "govuk/components/accordion/macro.njk" import govukAccordion %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/table/macro.njk" import govukTable %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block content %}
<div class="govuk-grid-row">
  <div class="govuk-grid-column-full">

    {# Page title with language toggle #}
    <h1 class="govuk-heading-xl">{{ content.pageTitle }}</h1>

    {# Week commencing and last updated metadata #}
    <p class="govuk-body">
      <strong>{{ content.listForWeekCommencing }}</strong> {{ header.weekCommencing }}
    </p>
    <p class="govuk-body-s govuk-!-margin-bottom-6">
      {{ content.lastUpdated }} {{ header.lastUpdated }}
    </p>

    {# Important Information Accordion #}
    {{ govukAccordion({
      id: "important-info",
      items: [
        {
          heading: {
            text: content.importantInformation.heading
          },
          content: {
            html: '<p class="govuk-body">' + content.importantInformation.content + '</p>' +
                  '<p class="govuk-body"><a href="' + content.importantInformation.link.url + '" class="govuk-link" target="_blank" rel="noopener noreferrer">' +
                  content.importantInformation.link.text + '</a></p>'
          }
        }
      ]
    }) }}

    {# Search Input #}
    {{ govukInput({
      id: "search-cases",
      name: "searchCases",
      label: {
        text: content.search.label,
        classes: "govuk-label--m"
      },
      classes: "govuk-!-width-one-half"
    }) }}

    {# Hearings Table #}
    {% if data.length > 0 %}
      {{ govukTable({
        head: [
          { text: content.tableHeaders.date },
          { text: content.tableHeaders.caseName },
          { text: content.tableHeaders.hearingLength },
          { text: content.tableHeaders.hearingType },
          { text: content.tableHeaders.venue },
          { text: content.tableHeaders.additionalInformation }
        ],
        rows: data
      }) }}
    {% else %}
      <p class="govuk-body">{{ content.errors.noHearings }}</p>
    {% endif %}

    {# Data Source #}
    <p class="govuk-body govuk-!-margin-top-6">
      <strong>{{ content.dataSource.label }}:</strong> {{ content.dataSource.value }}
    </p>

    {# Download PDF Button (to be implemented) #}
    {{ govukButton({
      text: content.downloadPdf,
      classes: "govuk-button--secondary",
      href: "/care-standards-tribunal-weekly-hearing-list/pdf?artefactId=" + artefactId + "&lng=" + currentLanguage
    }) }}

    {# Back Link #}
    <p class="govuk-body">
      <a href="/tribunals" class="govuk-link">{{ content.backToTop }}</a>
    </p>

  </div>
</div>
{% endblock %}
```

### Language Toggle Implementation

#### Option 1: Use Existing i18n Middleware (Recommended)

The codebase already has i18n middleware that handles language switching via query parameter:
- **English**: `/care-standards-tribunal-weekly-hearing-list?artefactId=xxx&lng=en`
- **Welsh**: `/care-standards-tribunal-weekly-hearing-list?artefactId=xxx&lng=cy`

**Implementation:**
1. Add language toggle component to base template layout
2. No controller changes needed
3. Middleware automatically sets `res.locals.locale`

#### Option 2: Dedicated Welsh Route

Create a dedicated Welsh URL route following the pattern from VIBE-241:

**Route**: `/rhestr-gwrandawiadau-wythnosol-y-tribiwnlys-safonau-gofal`

**Implementation:**
```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/rhestr-gwrandawiadau-wythnosol-y-tribiwnlys-safonau-gofal.ts
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  // Force Welsh language and redirect to main handler
  const artefactId = req.query.artefactId;
  res.redirect(307, `/care-standards-tribunal-weekly-hearing-list?artefactId=${artefactId}&lng=cy`);
};
```

**Recommendation**: Use Option 1 (query parameter) for simplicity, as it's already supported by the infrastructure.

### Date and Time Formatting

The renderer already supports Welsh locale formatting through Luxon. Verify it works correctly:

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/rendering/renderer.ts

// Date formatting uses native JavaScript with locale
const formattedDate = new Date(hearing.date).toLocaleDateString(locale, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

// Time formatting uses Luxon with locale support
const formattedTime = DateTime.fromJSDate(lastUpdated)
  .setLocale(locale)
  .toFormat("h:mma");
```

**Verify Welsh dates display correctly:**
- English: "01/12/2025"
- Welsh: "01/12/2025" (same format, but month names in Welsh if using `toFormat`)

### PDF Generation (New Requirement)

The specification requires PDF download in both languages. Current implementation does not have PDF generation.

**Approach:**
1. **Use existing PDF library**: Check if `@hmcts/publication` or other modules provide PDF generation
2. **Create PDF generation module**: Use libraries like `pdfkit` or `puppeteer` to generate PDFs from HTML
3. **Store generated PDFs**: Cache PDFs by artefactId and language

**Implementation Outline:**
```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/pdf.ts
import type { Request, Response } from "express";
import { generatePdfFromHtml } from "@hmcts/publication";
import { renderCareStandardsTribunalData } from "../rendering/renderer.js";

export const GET = async (req: Request, res: Response) => {
  const artefactId = req.query.artefactId as string;
  const language = (req.query.lng as string) || "en";

  // Load data (same as main handler)
  const data = await loadArtefactData(artefactId);
  const renderedData = renderCareStandardsTribunalData(data, language);

  // Generate PDF
  const pdfBuffer = await generatePdfFromHtml(renderedData, {
    format: "A4",
    orientation: "landscape"
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="cst-weekly-hearing-list-${language}.pdf"`);
  res.send(pdfBuffer);
};
```

**Alternative**: If PDF generation is complex, defer to a separate ticket and implement download link that returns "PDF not available" message for now.

### Search Functionality (Out of Scope)

The template includes a search input, but no JavaScript implementation exists. The specification requires search functionality.

**Options:**
1. **Client-side search**: Add JavaScript to filter table rows based on search input
2. **Server-side search**: Add query parameter and filter data before rendering

**Recommendation**: Implement client-side search for better UX (no page reload):

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/assets/js/search.ts
export function initSearch() {
  const searchInput = document.getElementById("search-cases") as HTMLInputElement;
  const tableRows = document.querySelectorAll("table tbody tr");

  searchInput?.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();

    tableRows.forEach(row => {
      const text = row.textContent?.toLowerCase() || "";
      row.classList.toggle("hidden", !text.includes(query));
    });
  });
}
```

**Update `config.ts` to include assets:**
```typescript
export const assets = path.join(__dirname, "assets/");
```

### Accessibility Requirements

The specification emphasizes accessibility compliance. Verify:

1. **Language Toggle**
   - Keyboard accessible (Tab navigation)
   - `aria-label` or `aria-current` to indicate selected language
   - `lang` attribute on HTML element changes with language

2. **Screen Reader Support**
   - Page language announced correctly (`<html lang="en">` or `<html lang="cy">`)
   - Table has proper `<th>` headers with `scope="col"`
   - Accordion uses GOV.UK component (already accessible)

3. **Keyboard Navigation**
   - All interactive elements (search, PDF download, back) accessible via Tab
   - No keyboard traps

4. **Error Messages**
   - Announced to assistive technologies
   - Use `role="alert"` for dynamic errors

**Template Updates:**
```html
{% block pageTitle %}{{ content.pageTitle }}{% endblock %}

{% block htmlLang %}{{ currentLanguage }}{% endblock %}

{{ govukTable({
  head: [
    { text: content.tableHeaders.date, attributes: { scope: "col" } },
    { text: content.tableHeaders.caseName, attributes: { scope: "col" } },
    ...
  ],
  ...
}) }}
```

### Error Handling

Ensure all error states display in the selected language:

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.ts
export const GET = async (req: Request, res: Response) => {
  try {
    // ... existing logic
  } catch (error) {
    const locale = res.locals.locale || "en";
    const content = locale === "cy" ? cy : en;

    return res.status(500).render("error", {
      message: content.errors.cannotDisplay
    });
  }
};
```

### Testing Strategy

#### Unit Tests

Update existing tests to cover Welsh language:

```typescript
// libs/list-types/care-standards-tribunal-weekly-hearing-list/src/pages/index.test.ts
describe("Care Standards Tribunal Page - Welsh", () => {
  it("should render page with Welsh content when locale is cy", async () => {
    const req = mockRequest({ query: { artefactId: "test-123", lng: "cy" } });
    const res = mockResponse({ locals: { locale: "cy" } });

    await GET(req, res);

    expect(res.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: cy
      })
    );
  });

  it("should format dates in Welsh locale", () => {
    const data = [{ date: "01/12/2025", ... }];
    const rendered = renderCareStandardsTribunalData(data, "cy-GB");

    expect(rendered.data[0][0].text).toMatch(/01\/12\/2025/);
  });
});
```

#### E2E Tests

Add Welsh language test cases to existing E2E tests:

```typescript
// e2e-tests/tests/care-standards-tribunal.spec.ts
test("should display Welsh content when language is set to Welsh @nightly", async ({ page }) => {
  await page.goto("/care-standards-tribunal-weekly-hearing-list?artefactId=test-123&lng=cy");

  // Verify Welsh translations
  await expect(page.locator("h1")).toHaveText("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal");
  await expect(page.locator("th").first()).toHaveText("Dyddiad");

  // Test language toggle
  await page.getByRole("link", { name: "English" }).click();
  await expect(page.locator("h1")).toHaveText("Care Standards Tribunal Weekly Hearing List");

  // Test accessibility
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);

  // Test search in Welsh
  await page.getByRole("link", { name: "Cymraeg" }).click();
  await page.getByLabel("chwilio achosion").fill("test");
  // Verify filtered results
});
```

#### Accessibility Tests

```typescript
test("should announce language changes to screen readers", async ({ page }) => {
  await page.goto("/care-standards-tribunal-weekly-hearing-list?artefactId=test-123");

  const htmlLang = await page.locator("html").getAttribute("lang");
  expect(htmlLang).toBe("en");

  await page.goto("/care-standards-tribunal-weekly-hearing-list?artefactId=test-123&lng=cy");

  const htmlLangCy = await page.locator("html").getAttribute("lang");
  expect(htmlLangCy).toBe("cy");
});
```

## Implementation Checklist

### Phase 1: Core Translation
- [ ] Update `/src/pages/cy.ts` with all Welsh translations from specification
- [ ] Verify `/src/pages/en.ts` has all required content
- [ ] Review renderer.ts to ensure Welsh date/time formatting works
- [ ] Test locale switching logic in controller

### Phase 2: Template Updates
- [ ] Update `.njk` template to use all locale variables (no hardcoded English)
- [ ] Add proper `lang` attribute handling
- [ ] Ensure all GOV.UK components use locale content
- [ ] Add language toggle component (or verify existing)

### Phase 3: Search Functionality
- [ ] Create `/src/assets/js/search.ts` with client-side search
- [ ] Update template to include search script
- [ ] Add CSS for hiding filtered rows
- [ ] Test search works in both languages

### Phase 4: PDF Generation (Optional/Deferred)
- [ ] Investigate existing PDF generation libraries in codebase
- [ ] Create `/src/pages/pdf.ts` handler
- [ ] Implement HTML-to-PDF conversion
- [ ] Add PDF download link to template
- [ ] Test PDF generation in both languages

### Phase 5: Error Handling
- [ ] Add error states to both `en.ts` and `cy.ts`
- [ ] Update controller error handlers to use locale content
- [ ] Add error display to template
- [ ] Test all error scenarios in both languages

### Phase 6: Testing
- [ ] Write unit tests for Welsh content rendering
- [ ] Update E2E tests to cover Welsh language
- [ ] Run accessibility tests (Axe) in both languages
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

### Phase 7: Documentation
- [ ] Update README with Welsh translation notes
- [ ] Document translation process for future updates
- [ ] Add comments in code where Welsh-specific logic exists

## Open Questions & Risks

### Questions to Resolve

1. **PDF Generation**:
   - Should PDFs be generated on-demand or pre-generated and cached?
   - What library should be used for PDF generation?
   - **Recommendation**: Use on-demand generation with Puppeteer for simplicity

2. **Search Functionality**:
   - Should search be client-side (JavaScript) or server-side (query parameter)?
   - **Recommendation**: Client-side for better UX

3. **Welsh Date Formats**:
   - Should dates use Welsh month names or numeric format (01/12/2025)?
   - **Recommendation**: Use numeric format as per GOV.UK Welsh style guide

4. **Language Persistence**:
   - Should language choice be stored in a cookie?
   - **Recommendation**: Use existing language cookie from i18n middleware

5. **Welsh Translations Approval**:
   - All Welsh translations need to be approved by HMCTS Welsh Translation Unit
   - **Action Required**: Submit translations for approval before deployment

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Welsh translation approval delayed | High | Use specification translations as baseline, mark as pending approval |
| PDF generation complexity | Medium | Defer to separate ticket if too complex, focus on web display first |
| Search functionality not specified clearly | Low | Implement basic case-insensitive search, can enhance later |
| Date formatting inconsistencies | Medium | Thoroughly test Welsh locale formatting, add unit tests |
| Accessibility violations | High | Run automated tests early, manual testing with assistive tech |

## Success Criteria

1. **Functional Requirements**
   - ✅ All static text displays in Welsh when `?lng=cy` parameter is used
   - ✅ Language toggle switches between English and Welsh without data loss
   - ✅ Dates and times formatted correctly for Welsh locale
   - ✅ Search functionality works in both languages
   - ✅ PDF download available in both languages (if implemented)
   - ✅ Error messages display in selected language
   - ✅ Back navigation preserves language selection

2. **Accessibility Requirements**
   - ✅ WCAG 2.2 AA compliance verified with automated tools
   - ✅ Screen readers correctly announce language changes
   - ✅ Keyboard navigation fully functional
   - ✅ Proper heading hierarchy maintained
   - ✅ All form controls properly labeled
   - ✅ `lang` attribute correctly set on HTML element

3. **Language Requirements**
   - ✅ All specified Welsh translations implemented
   - ✅ Case data remains in original language (not translated)
   - ✅ Welsh month names appear correctly in dates (if applicable)
   - ✅ Time format appropriate for Welsh locale

4. **Testing Requirements**
   - ✅ Unit tests for controller logic with Welsh locale
   - ✅ Template rendering tests for both languages
   - ✅ E2E tests for language toggle and content display
   - ✅ Accessibility tests pass with zero violations
   - ✅ Cross-browser compatibility verified

5. **Data Integrity**
   - ✅ Uploaded case data not affected by language selection
   - ✅ Search results identical in both languages
   - ✅ Hearing information displays correctly in both languages

## References

- **Specification**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-323/specification.md`
- **Attachment**: `/home/runner/work/cath-service/cath-service/docs/tickets/VIBE-323/Welsh Translations for Care Standard and Primary Health Care lists.docx`
- **Existing Module**: `/home/runner/work/cath-service/cath-service/libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- **i18n Middleware**: `/home/runner/work/cath-service/cath-service/libs/web-core/src/middleware/i18n/`
- **GOV.UK Design System**: https://design-system.service.gov.uk/
- **GOV.UK Welsh Language Guide**: https://www.gov.uk/guidance/content-design/writing-for-gov-uk#welsh-language-content
- **WCAG 2.2 Guidelines**: https://www.w3.org/WAI/WCAG22/quickref/
