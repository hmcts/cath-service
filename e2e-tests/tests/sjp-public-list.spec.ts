import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const API_BASE_URL = "http://localhost:3001";

// Helper function to create SJP public list test data
function createSjpPublicListPayload() {
  const postcodes = ["BS8", "BS9", "M1", "M2"];
  const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
  const offences = [
    "Use a television set without a licence",
    "Exceed the speed limit on a restricted road",
    "Fail to comply with red traffic light",
    "Use a hand-held mobile telephone whilst driving"
  ];
  const names = ["John Smith", "Jane Doe", "Bob Wilson", "Alice Brown"];

  const hearings = [];

  // Create 15 test cases with varied data
  for (let i = 0; i < 15; i++) {
    const postcode = postcodes[i % postcodes.length];
    const prosecutor = prosecutors[i % prosecutors.length];
    const offence = offences[i % offences.length];
    const name = names[i % names.length];

    hearings.push({
      case: [{ caseUrn: `URN${2025}${String(i + 1).padStart(6, "0")}` }],
      party: [
        {
          partyRole: "ACCUSED",
          individualDetails: {
            individualForenames: name.split(" ")[0].charAt(0), // Just initial for public list
            individualSurname: name.split(" ")[1]
          }
        },
        {
          partyRole: "PROSECUTOR",
          organisationDetails: {
            organisationName: prosecutor
          }
        }
      ],
      offence: [
        {
          offenceTitle: offence,
          reportingRestriction: false
        }
      ]
    });
  }

  return {
    court_id: "9",
    provenance: "MANUAL_UPLOAD",
    content_date: "2025-01-20",
    list_type: "SINGLE_JUSTICE_PROCEDURE_PUBLIC",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: "2025-01-20T00:00:00Z",
    display_to: "2026-01-20T00:00:00Z",
    hearing_list: {
      document: {
        publicationDate: "2025-01-20T09:00:00Z",
        version: "1.0"
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Bristol Magistrates' Court",
            courtHouseAddress: {
              line: ["Nelson Street"],
              town: "Bristol",
              county: "Avon",
              postCode: "BS1 2JA"
            },
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: "2025-01-20T09:00:00Z",
                        sittingEnd: "2025-01-20T17:00:00Z",
                        hearing: hearings
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  };
}

test.describe("SJP Public List @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    // Create test data by uploading SJP list via API
    // Note: This test assumes API authentication is bypassed for E2E tests
    // or that a valid test token is available
    const payload = createSjpPublicListPayload();

    try {
      const response = await request.post(`${API_BASE_URL}/v1/publication`, {
        data: payload,
        headers: {
          Authorization: "Bearer test-token" // This may need to be a real token or bypassed
        },
        failOnStatusCode: false
      });

      if (response.ok()) {
        const body = await response.json();
        artefactId = body.artefact_id;
        listUrl = `/sjp-public-list?artefactId=${artefactId}`;
        console.log(`Created test SJP public list with artefactId: ${artefactId}`);
      } else {
        // If API auth fails, skip tests or use fallback
        console.warn("Failed to create test data via API. Tests may fail.");
        artefactId = "test-fallback-id";
        listUrl = `/sjp-public-list?artefactId=${artefactId}`;
      }
    } catch (error) {
      console.warn("Error creating test data:", error);
      artefactId = "test-fallback-id";
      listUrl = `/sjp-public-list?artefactId=${artefactId}`;
    }
  });

  test("should display public list with all required elements", async ({ page }) => {
    await page.goto(listUrl);

    // Check page heading
    await expect(page.getByRole("heading", { name: "Single Justice Procedure cases that are ready for hearing (Full list)", level: 1 })).toBeVisible();

    // Check list summary is visible
    await expect(page.getByText(/List containing/)).toBeVisible();
    await expect(page.getByText(/case\(s\)/)).toBeVisible();

    // Check Show/Hide filters button is visible
    const filterToggle = page.getByRole("button", { name: /filters/ });
    await expect(filterToggle).toBeVisible();

    // Check table headers
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Postcode")).toBeVisible();
    await expect(page.getByText("Offence")).toBeVisible();
    await expect(page.getByText("Prosecutor")).toBeVisible();

    // Check Back to top link is visible
    await expect(page.getByRole("link", { name: /Back to top/i })).toBeVisible();

    // Do NOT check for Download button (not in public list)
    // Do NOT check for accordions (not in public list)
    // Do NOT check for Date of Birth column (not in public list)

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should show and hide filters when button is clicked", async ({ page }) => {
    await page.goto(listUrl);

    // Initially filters should be hidden
    const filterPanel = page.locator("#filter-panel");
    await expect(filterPanel).toBeHidden();

    // Click Show filters button
    await page.getByRole("button", { name: "Show filters" }).click();

    // Filters should now be visible
    await expect(filterPanel).toBeVisible();

    // Check filter elements are present
    await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();

    // Check search input
    await expect(page.getByLabel("Search filters")).toBeVisible();

    // Check postcode and prosecutor sections are visible
    await expect(page.getByText("Postcode", { exact: true })).toBeVisible();
    await expect(page.getByText("Prosecutor", { exact: true })).toBeVisible();

    // Click Hide filters button
    await page.getByRole("button", { name: "Hide filters" }).click();

    // Filters should be hidden again
    await expect(filterPanel).toBeHidden();
  });

  test("should display dynamically generated postcode and prosecutor filters", async ({ page }) => {
    await page.goto(listUrl);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();

    // Wait for filters to be visible
    await expect(page.locator("#filter-panel")).toBeVisible();

    // Check that postcode checkboxes are present
    const postcodeCheckboxes = page.locator('input[name="postcode"]');
    const postcodeCount = await postcodeCheckboxes.count();
    expect(postcodeCount).toBeGreaterThan(0);

    // Check that prosecutor checkboxes are present
    const prosecutorCheckboxes = page.locator('input[name="prosecutor"]');
    const prosecutorCount = await prosecutorCheckboxes.count();
    expect(prosecutorCount).toBeGreaterThan(0);
  });

  test("should filter cases by postcode", async ({ page }) => {
    await page.goto(listUrl);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.locator("#filter-panel")).toBeVisible();

    // Select first postcode checkbox
    const firstPostcodeCheckbox = page.locator('input[name="postcode"]').first();
    const postcodeValue = await firstPostcodeCheckbox.getAttribute("value");
    await firstPostcodeCheckbox.check();

    // Apply filters
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Wait for page to reload with filter applied
    await page.waitForURL(new RegExp(`postcode=${postcodeValue}`));

    // Check that Selected filters section shows the applied filter
    await page.getByRole("button", { name: "Hide filters" }).click();
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.getByText("Selected filters")).toBeVisible();
    await expect(page.getByText(postcodeValue!)).toBeVisible();

    // Check that cases are displayed (filtered)
    await expect(page.getByText("Name")).toBeVisible();
  });

  test("should filter cases by prosecutor", async ({ page }) => {
    await page.goto(listUrl);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.locator("#filter-panel")).toBeVisible();

    // Select first prosecutor checkbox
    const firstProsecutorCheckbox = page.locator('input[name="prosecutor"]').first();
    const prosecutorValue = await firstProsecutorCheckbox.getAttribute("value");
    await firstProsecutorCheckbox.check();

    // Apply filters
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Wait for page to reload with filter applied
    await page.waitForURL(new RegExp(`prosecutor=${encodeURIComponent(prosecutorValue!)}`));

    // Check that Selected filters section shows the applied filter
    await page.getByRole("button", { name: "Hide filters" }).click();
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.getByText("Selected filters")).toBeVisible();
    await expect(page.getByText(prosecutorValue!)).toBeVisible();
  });

  test("should search cases by name or offence", async ({ page }) => {
    await page.goto(listUrl);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.locator("#filter-panel")).toBeVisible();

    // Enter search query
    const searchInput = page.getByLabel("Search filters");
    await searchInput.fill("Smith");

    // Apply filters
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Wait for page to reload with filter applied
    await page.waitForURL(/search=Smith/);

    // Check that Selected filters section shows the search query
    await page.getByRole("button", { name: "Hide filters" }).click();
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.getByText("Selected filters")).toBeVisible();
    await expect(page.locator(".moj-filter-tag__text").filter({ hasText: "Smith" })).toBeVisible();
  });

  test("should clear all filters when Clear filters link is clicked", async ({ page }) => {
    await page.goto(`${listUrl}&search=Smith`);

    // Show filters
    await page.getByRole("button", { name: "Hide filters" }).click();
    await page.getByRole("button", { name: "Show filters" }).click();

    // Check filter is applied
    await expect(page.locator(".moj-filter-tag__text").filter({ hasText: "Smith" })).toBeVisible();

    // Click Clear filters
    await page.getByRole("link", { name: "Clear filters" }).click();

    // Wait for page to reload without filters
    await page.waitForURL(new RegExp(`^[^?]*\\?artefactId=${artefactId}$`));

    // Check that filter is cleared
    const filterTags = page.locator(".moj-filter-tag__text");
    await expect(filterTags).toHaveCount(0);
  });

  test("should support Welsh language", async ({ page }) => {
    await page.goto(`${listUrl}&lng=cy`);

    // Check Welsh heading
    await expect(page.getByRole("heading", { name: "Achosion Gweithdrefn Cyfiawnder Sengl sydd yn barod i'w gwrando (Rhestr lawn)", level: 1 })).toBeVisible();

    // Check Welsh button text
    await expect(page.getByRole("button", { name: /hidlwyr/i })).toBeVisible();

    // Check Welsh table headers
    await expect(page.getByText("Enw")).toBeVisible();
    await expect(page.getByText("Cod post")).toBeVisible();
    await expect(page.getByText("Trosedd")).toBeVisible();
    await expect(page.getByText("Erlynydd")).toBeVisible();

    // Test accessibility in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should show Selected filters section even with no active filters", async ({ page }) => {
    await page.goto(listUrl);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(page.locator("#filter-panel")).toBeVisible();

    // Check that Selected filters heading is visible
    await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();

    // Check that Clear filters link is visible (even with no active filters)
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
  });

  test("should maintain filter visibility and content area width when filters are shown", async ({ page }) => {
    await page.goto(listUrl);

    // Get content area
    const contentArea = page.locator("#content-area");

    // Initially content area should be full width
    await expect(contentArea).not.toHaveClass(/with-filters/);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();

    // Content area should now have reduced width
    await expect(contentArea).toHaveClass(/with-filters/);

    // Filters should be visible
    await expect(page.locator("#filter-panel")).toBeVisible();
  });
});
