import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("user can view landing page and navigate to view options", async ({ page }) => {
    // Navigate to landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/Court and tribunal hearings/i);

    // Verify main heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Court and tribunal hearings");

    // Verify key content - bullet points describing available courts
    const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
    await expect(bulletList).toHaveCount(4);
    await expect(bulletList.nth(0)).toContainText("civil and family courts");
    await expect(bulletList.nth(1)).toContainText("First Tier and Upper Tribunals");
    await expect(bulletList.nth(2)).toContainText("Royal Courts of Justice");
    await expect(bulletList.nth(3)).toContainText("Single Justice Procedure");

    // Verify sign-in link for professionals (in the body text, not the nav)
    const signInLink = page.getByRole("link", { name: "sign in", exact: true });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/sign-in");

    // Verify FaCT section with external link
    const factLink = page.getByRole("link", { name: /Find contact details and other information/i });
    await expect(factLink).toBeVisible();
    await expect(factLink).toHaveAttribute("href", "https://www.gov.uk/find-court-tribunal");

    // Verify Scotland and Northern Ireland links
    const scottishLink = page.getByRole("link", { name: "Scottish Courts website" });
    await expect(scottishLink).toHaveAttribute("href", "https://www.scotcourts.gov.uk");

    const niLink = page.getByRole("link", { name: "Northern Ireland Courts and Tribunals Service" });
    await expect(niLink).toHaveAttribute("href", "https://www.justice-ni.gov.uk/topics/courts-and-tribunals");

    // Accessibility check
    const accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Keyboard navigation - tab to Continue button and activate
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeVisible();
    await continueButton.focus();
    await expect(continueButton).toBeFocused();

    // Navigate to next page
    await continueButton.click();
    await expect(page).toHaveURL(/\/view-option/);
  });

  test("user can view landing page in Welsh @nightly", async ({ page }) => {
    // Navigate to landing page
    await page.goto("/");

    // Switch to Welsh
    const welshLink = page.getByRole("link", { name: "Welsh (Cymraeg)" });
    await expect(welshLink).toBeVisible();
    await welshLink.click();
    await expect(page).toHaveURL(/lng=cy/);

    // Verify Welsh heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Gwrandawiadau llys a thribiwnlys");

    // Verify Welsh bullet points
    const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
    await expect(bulletList.nth(0)).toContainText("Lysoedd Sifil a Theulu");
    await expect(bulletList.nth(1)).toContainText("Tribiwnlys Haen Gyntaf");
    await expect(bulletList.nth(2)).toContainText("Llys Barn Brenhinol");
    await expect(bulletList.nth(3)).toContainText("Gweithdrefn Un Ynad");

    // Verify Welsh sign-in link (in the body text, not the nav)
    const signInLink = page.getByRole("link", { name: "mewngofnodi", exact: true });
    await expect(signInLink).toBeVisible();

    // Verify English toggle is available
    const englishLink = page.getByRole("link", { name: "Saesneg (English)" });
    await expect(englishLink).toBeVisible();

    // Verify Welsh FaCT link
    const factLink = page.getByRole("link", { name: /Dod o hyd i fanylion cyswllt/i });
    await expect(factLink).toBeVisible();

    // Verify Welsh Scotland and Northern Ireland links
    const scottishLink = page.getByRole("link", { name: "Gwefan Llysoedd yr Alban" });
    await expect(scottishLink).toBeVisible();

    const niLink = page.getByRole("link", { name: "Gwasanaeth Llysoedd a Thribiwnlysoedd Gogledd Iwerddon" });
    await expect(niLink).toBeVisible();

    // Accessibility check in Welsh
    const accessibilityResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityResults.violations).toEqual([]);

    // Navigate using Welsh continue button
    const continueButton = page.getByRole("button", { name: "Parhau" });
    await continueButton.click();
    await expect(page).toHaveURL(/\/view-option/);
  });
});
