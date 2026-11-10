import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkAccessibility } from "./accessibility.js";

interface CaptureFiles {
  aria?: string;
  pageAria?: string;
  html?: string;
  pageHtml?: string;
  axe?: object;
  meta?: object;
}

const CLEAN_ARIA = '- heading "Find a court" [level=1]\n- paragraph: Search by name';

async function check(files: CaptureFiles): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "accessibility-"));
  const written: [string, string | undefined][] = [
    ["aria.yml", files.aria ?? CLEAN_ARIA],
    ["page.aria.yml", files.pageAria],
    ["raw.html", files.html],
    ["page.html", files.pageHtml],
    ["axe.json", files.axe && JSON.stringify(files.axe)],
    ["meta.json", files.meta && JSON.stringify(files.meta)]
  ];
  for (const [file, content] of written) if (content !== undefined) await writeFile(path.join(dir, file), content);
  return (await checkAccessibility(dir)).map((f) => `${f.change}: ${f.detail}`);
}

describe("checkAccessibility", () => {
  it("should find nothing when the page has an h1, plain links and grouped controls", async () => {
    // Arrange
    const aria = `- heading "How do you want to add an email subscription?" [level=1]
- group "Choose one":
  - radio "By court"
  - radio "By case"
- link "Home":
  - /url: /`;

    // Act
    const findings = await check({ aria, html: '<a href="/">Home</a><label for="a">A</label><input id="a">' });

    // Assert
    expect(findings).toEqual([]);
  });

  it("should report a link whose name does not contain its visible text, across the whole page", async () => {
    // Arrange
    const pageAria = `- banner:
  - link "Change language to Welsh":
    - /url: "?lng=cy"
    - text: Cymraeg
  - link "Give feedback about this page":
    - /url: https://survey
    - text: feedback
- main:
${CLEAN_ARIA.replace(/^/gm, "  ")}`;

    // Act
    const findings = await check({ pageAria });

    // Assert
    expect(findings).toEqual(['label-in-name: link shows "Cymraeg" but is named "Change language to Welsh"']);
  });

  it("should report link text that is an address, and the same text leading to different places", async () => {
    // Arrange
    const aria = `${CLEAN_ARIA}
- link "https://www.gov.uk/guidance/observe":
  - /url: https://www.gov.uk/guidance/observe
- link "View":
  - /url: /media-applications/1
- link "View":
  - /url: /media-applications/2
- link "Back to top":
  - /url: "#"
- link "Back to top":
  - /url: "#"`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual([
      'link-text-is-url: link text is the address "https://www.gov.uk/guidance/observe"',
      'ambiguous-link-text: 2 links say "View" and lead to different places'
    ]);
  });

  it("should report a link to # but not a GOV.UK back link, and in-page links whose target is missing", async () => {
    // Arrange
    const pageHtml = `<a href="#main-content" class="govuk-skip-link">Skip</a>
<a href="#" class="govuk-back-link">Back</a>
<main id="main-content"><a href="#" class="govuk-link back-to-top-link"><span aria-hidden="true">▴ </span>Back to top</a>
<a href="#nowhere">Jump</a></main>`;

    // Act
    const findings = await check({ pageHtml });

    // Assert
    expect(findings).toEqual([
      'link-to-nowhere: "▴ Back to top" links to "#", so focus stays where it was',
      'in-page-link-target: "Jump" links to #nowhere, which is not on the page'
    ]);
  });

  it("should not check in-page targets when only the region's HTML was captured", async () => {
    // Arrange
    const html = '<a href="#main-content">Skip</a>';

    // Act
    const findings = await check({ html });

    // Assert
    expect(findings).toEqual([]);
  });

  it("should report error summary links that point at something other than a form control", async () => {
    // Arrange
    const html = `<div class="govuk-error-summary"><ul class="govuk-list govuk-error-summary__list">
<li><a href="#hearingStartDate">Please enter a valid hearing start date</a></li>
<li><a href="#file">Select a file</a></li></ul></div>
<div class="govuk-date-input" id="hearingStartDate"><input id="hearingStartDate-day"></div><input type="file" id="file">`;

    // Act
    const findings = await check({ html });

    // Assert
    expect(findings).toEqual([
      'error-summary-target: "Please enter a valid hearing start date" links to #hearingStartDate, a <div>, so focus does not move to the field'
    ]);
  });

  it("should report radios and checkboxes outside a fieldset, but not checkboxes in a table", async () => {
    // Arrange
    const aria = `- heading "Are you sure you want to remove this subscription?" [level=1]
- radio "Yes"
- radio "No"
- table "Subscriptions":
  - row:
    - cell:
      - checkbox "Select court A"
  - row:
    - cell:
      - checkbox "Select court B"`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual(['ungrouped-choices: 2 radios ("Yes", "No") are not in a fieldset with a legend']);
  });

  it("should report a legend that repeats a heading outside its fieldset, but not one wrapping it", async () => {
    // Arrange
    const outside = `- heading "What do you want to do?" [level=1]
- group "What do you want to do?":
  - radio "Create"
  - radio "Modify"`;
    const wrapping = `- group "What do you want to do?":
  - heading "What do you want to do?" [level=1]
  - radio "Create"
  - radio "Modify"`;

    // Act
    const [outsideFindings, wrappingFindings] = await Promise.all([check({ aria: outside }), check({ aria: wrapping })]);

    // Assert
    expect(outsideFindings).toEqual(['legend-repeats-heading: the legend "What do you want to do?" repeats a heading outside its fieldset']);
    expect(wrappingFindings).toEqual([]);
  });

  it("should report a page with no h1, and an error message with no error summary", async () => {
    // Arrange
    const aria = `- heading "Are you sure you want to remove this subscription?" [level=2]
- paragraph: "Error: Select yes if you want to remove this subscription"
- group "Remove":
  - radio "Yes"`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual([
      'no-h1: the page has no h1; its first heading is "Are you sure you want to remove this subscription?"',
      'error-without-summary: "Error: Select yes if you want to remove this subscription" is shown with no error summary at the top of the page'
    ]);
  });

  it("should not report an error message when the page has an error summary", async () => {
    // Arrange
    const aria = `- heading "Title" [level=1]
- heading "There is a problem" [level=2]
- paragraph: "Error: Enter a name"`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual([]);
  });

  it("should report empty column headers and tables without a caption", async () => {
    // Arrange
    const aria = `${CLEAN_ARIA}
- table:
  - rowgroup:
    - row "Timestamp Email":
      - columnheader "Timestamp"
      - columnheader "Email"
      - columnheader
- table "Audit log":
  - rowgroup:
    - row:
      - columnheader "When"`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual(["empty-table-header: table 1 has 1 empty column header", "table-without-caption: 1 of 2 tables have no caption"]);
  });

  it("should report bold text that starts a paragraph as a possible heading", async () => {
    // Arrange
    const aria = `${CLEAN_ARIA}
- paragraph:
  - strong: Public
  - text: Publication available to all users.`;

    // Act
    const findings = await check({ aria });

    // Assert
    expect(findings).toEqual(['bold-as-heading: "Public" is bold text starting a section, so may need to be a heading']);
  });

  it("should report a field with several labels, form controls sharing an id, and new tabs opened without warning", async () => {
    // Arrange
    const html = `<label for="locationId">Search by court</label><label class="govuk-visually-hidden" for="locationId">Search</label><input id="locationId">
<input id="subJurisdictionIds" type="checkbox"><input id="subJurisdictionIds" type="checkbox">
<a href="https://survey" target="_blank" aria-label="Give feedback about this page">feedback</a>
<a href="/proof" target="_blank" aria-label="Opens in new window">View</a>
<a href="/guide" target="_blank">Guide (opens in new tab)</a>`;

    // Act
    const findings = await check({ html });

    // Assert
    expect(findings).toEqual([
      "multiple-labels: 2 labels are linked to the field #locationId",
      "duplicate-id: 1 form control id is used more than once (#subJurisdictionIds ×2)",
      'new-tab-unannounced: "feedback" opens in a new tab without saying so'
    ]);
  });

  it("should report sortable column headers that sort with a link, but not with a button", async () => {
    // Arrange
    const html = `<table><tr><th aria-sort="none"><a href="?sort=listType&amp;order=asc">List Type <svg aria-hidden="true"></svg></a></th>
<th aria-sort="ascending"><button type="button">Court</button></th><th>Date</th></tr></table>`;

    // Act
    const findings = await check({ html });

    // Assert
    expect(findings).toEqual(['sort-control-is-link: 1 sortable column is sorted by a link, not a button ("List Type")']);
  });

  it("should report every axe violation and what axe could not decide", async () => {
    // Arrange
    const axe = {
      violations: [{ id: "target-size", impact: "serious", help: "Touch targets must be large enough", targets: ["a", "b"] }],
      incomplete: [{ id: "color-contrast", impact: "serious", help: "Contrast", targets: [".disabled"] }]
    };

    // Act
    const findings = await check({ axe });

    // Assert
    expect(findings).toEqual([
      "axe-target-size: Touch targets must be large enough (2 elements)",
      "axe-needs-review-color-contrast: Contrast (1 element); axe could not decide, so check by hand"
    ]);
  });

  it("should report a page that scrolls sideways at 320px, but not one that fits", async () => {
    // Arrange
    const wide = { reflow: { width: 320, scrollWidth: 760 } };
    const fits = { reflow: { width: 320, scrollWidth: 320 } };

    // Act
    const [wideFindings, fitsFindings] = await Promise.all([check({ meta: wide }), check({ meta: fits })]);

    // Assert
    expect(wideFindings).toEqual(["reflow: at 320px wide the page is 760px wide, so it scrolls sideways"]);
    expect(fitsFindings).toEqual([]);
  });

  it("should count a finding repeated on the page once", async () => {
    // Arrange
    const html = '<a href="#">Top</a><a href="#">Top</a>';

    // Act
    const findings = await check({ html });

    // Assert
    expect(findings).toEqual(['link-to-nowhere: "Top" links to "#", so focus stays where it was (×2)']);
  });
});
