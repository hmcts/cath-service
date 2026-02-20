import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const API_BASE_URL = "http://localhost:3001";

function createSjpPressListPayload() {
	const postcodes = ["BS8", "BS9", "M1", "M2", "E1", "SW1A"];
	const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
	const offences = [
		{ title: "Use a television set without a licence", wording: "Failed to pay TV license fee" },
		{ title: "Exceed the speed limit on a restricted road", wording: "Driving at 45mph in a 30mph zone" },
		{ title: "Fail to comply with red traffic light", wording: null },
		{ title: "Use a hand-held mobile telephone whilst driving", wording: "Using phone while driving on M1" }
	];
	const names = [
		{ forenames: "John", surname: "Smith", dob: "15/05/1985" },
		{ forenames: "Jane", surname: "Doe", dob: "22/08/1990" },
		{ forenames: "Bob", surname: "Wilson", dob: "10/03/1982" },
		{ forenames: "Alice", surname: "Brown", dob: "05/12/1995" }
	];

	const hearings = [];

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
						title: "Mr",
						individualForenames: name.forenames,
						individualSurname: name.surname,
						dateOfBirth: name.dob,
						address: {
							line: [`${i + 100} Test Street`],
							town: "Bristol",
							county: "Avon",
							postCode: `${postcode} ${i + 1}AA`
						}
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
					offenceTitle: offence.title,
					offenceWording: offence.wording,
					reportingRestriction: false
				}
			]
		});
	}

	return {
		court_id: "9",
		provenance: "MANUAL_UPLOAD",
		content_date: "2025-01-20",
		list_type: "SINGLE_JUSTICE_PROCEDURE_PRESS",
		sensitivity: "CLASSIFIED",
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

test("verified user can view and search SJP press list with full details @nightly", async ({ page, request }) => {
	// 1. Create test data
	const payload = createSjpPressListPayload();
	let artefactId: string;
	let listUrl: string;

	try {
		const response = await request.post(`${API_BASE_URL}/v1/publication`, {
			data: payload,
			headers: {
				Authorization: "Bearer test-token"
			},
			failOnStatusCode: false
		});

		if (response.ok()) {
			const body = await response.json();
			artefactId = body.artefact_id;
			listUrl = `/sjp-press-list?artefactId=${artefactId}`;
		} else {
			console.warn("Failed to create test data via API. Using fallback.");
			artefactId = "test-fallback-id";
			listUrl = `/sjp-press-list?artefactId=${artefactId}`;
		}
	} catch (error) {
		console.warn("Error creating test data:", error);
		artefactId = "test-fallback-id";
		listUrl = `/sjp-press-list?artefactId=${artefactId}`;
	}

	// 2. Test main journey - authenticated user views press list
	await page.goto(listUrl);

	// Check page heading
	await expect(page.getByRole("heading", { name: "Single Justice Procedure cases that are ready for hearing (Full list)", level: 1 })).toBeVisible();

	// Check list summary
	await expect(page.getByText(/List containing/)).toBeVisible();
	await expect(page.getByText(/case\(s\)/)).toBeVisible();

	// Check Show/Hide filters button
	const filterToggle = page.getByRole("button", { name: /filters/ });
	await expect(filterToggle).toBeVisible();

	// Check press list specific table headers (includes DOB and Address)
	await expect(page.getByText("Name")).toBeVisible();
	await expect(page.getByText("Date of birth")).toBeVisible();
	await expect(page.getByText("Postcode")).toBeVisible();
	await expect(page.getByText("Prosecutor")).toBeVisible();

	// Check Download button is present (press list feature)
	await expect(page.getByRole("link", { name: /Download/i })).toBeVisible();

	// Check accordion sections are present (press list shows offences in accordions)
	const accordions = page.locator(".govuk-accordion__section");
	const accordionCount = await accordions.count();
	expect(accordionCount).toBeGreaterThan(0);

	// 3. Test accessibility inline
	const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
	expect(accessibilityScanResults.violations).toEqual([]);

	// 4. Test filtering functionality
	// Show filters
	await page.getByRole("button", { name: "Show filters" }).click();
	await expect(page.locator("#filter-panel")).toBeVisible();

	// Check filter elements are present
	await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();

	// Check postcode and prosecutor filters are dynamically generated
	const postcodeCheckboxes = page.locator('input[name="postcode"]');
	const postcodeCount = await postcodeCheckboxes.count();
	expect(postcodeCount).toBeGreaterThan(0);

	const prosecutorCheckboxes = page.locator('input[name="prosecutor"]');
	const prosecutorCount = await prosecutorCheckboxes.count();
	expect(prosecutorCount).toBeGreaterThan(0);

	// 5. Test search functionality to find a specific case
	const searchInput = page.getByLabel("Search filters");
	await searchInput.fill("Smith");

	// Apply filter
	await page.getByRole("button", { name: "Apply filters" }).click();

	// Wait for page to reload with filter applied
	await page.waitForURL(/search=Smith/);

	// Verify the search result appears
	await page.getByRole("button", { name: "Hide filters" }).click();
	await page.getByRole("button", { name: "Show filters" }).click();
	await expect(page.getByText("Selected filters")).toBeVisible();
	await expect(page.locator(".moj-filter-tag__text").filter({ hasText: "Smith" })).toBeVisible();

	// 6. Test postcode filtering (including London postcodes if present)
	await page.goto(listUrl);
	await page.getByRole("button", { name: "Show filters" }).click();
	await expect(page.locator("#filter-panel")).toBeVisible();

	// Select first postcode
	const firstPostcodeCheckbox = page.locator('input[name="postcode"]').first();
	const postcodeValue = await firstPostcodeCheckbox.getAttribute("value");
	await firstPostcodeCheckbox.check();

	// Apply filter
	await page.getByRole("button", { name: "Apply filters" }).click();
	await page.waitForURL(new RegExp(`postcode=${postcodeValue}`));

	// Verify filter is applied
	await page.getByRole("button", { name: "Hide filters" }).click();
	await page.getByRole("button", { name: "Show filters" }).click();
	await expect(page.getByText(postcodeValue!)).toBeVisible();

	// 7. Test clearing filters
	await page.getByRole("link", { name: "Clear filters" }).click();
	await page.waitForURL(new RegExp(`^[^?]*\\?artefactId=${artefactId}$`));

	const filterTags = page.locator(".moj-filter-tag__text");
	await expect(filterTags).toHaveCount(0);

	// 8. Test Welsh translation
	await page.goto(`${listUrl}&lng=cy`);

	// Check Welsh heading
	await expect(page.getByRole("heading", { name: "Achosion Gweithdrefn Cyfiawnder Sengl sydd yn barod i'w gwrando (Rhestr lawn)", level: 1 })).toBeVisible();

	// Check Welsh button text
	await expect(page.getByRole("button", { name: /hidlwyr/i })).toBeVisible();

	// Check Welsh table headers
	await expect(page.getByText("Enw")).toBeVisible();
	await expect(page.getByText("Dyddiad geni")).toBeVisible();
	await expect(page.getByText("Cod post")).toBeVisible();
	await expect(page.getByText("Erlynydd")).toBeVisible();

	// Test accessibility in Welsh
	const welshAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
	expect(welshAccessibilityScanResults.violations).toEqual([]);

	// 9. Test keyboard navigation
	await page.goto(listUrl);
	await page.keyboard.press("Tab");
	await page.keyboard.press("Enter");

	// Verify filters can be opened with keyboard
	await expect(page.locator("#filter-panel")).toBeVisible();

	// 10. Verify press list shows additional details not in public list
	await page.goto(listUrl);

	// Check for accordion with offence details (press list feature)
	const firstAccordionButton = page.locator(".govuk-accordion__section-button").first();
	await firstAccordionButton.click();

	// Verify offence details are visible when accordion is expanded
	const accordionContent = page.locator(".govuk-accordion__section-content").first();
	await expect(accordionContent).toBeVisible();
});
