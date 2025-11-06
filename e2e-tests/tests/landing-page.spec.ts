import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Landing Page", () => {
  test.describe("Content Display", () => {
    test("should load the landing page at root route", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Court and tribunal hearings/i);
    });

    test("should display the main heading", async ({ page }) => {
      await page.goto("/");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Court and tribunal hearings");
      await expect(heading).toHaveClass(/govuk-heading-l/);
    });

    test("should display all 4 bullet points in hearings list", async ({ page }) => {
      await page.goto("/");
      const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
      await expect(bulletList).toHaveCount(4);

      // Verify content of each bullet point
      await expect(bulletList.nth(0)).toContainText("civil and family courts");
      await expect(bulletList.nth(1)).toContainText("First Tier and Upper Tribunals");
      await expect(bulletList.nth(2)).toContainText("Royal Courts of Justice");
      await expect(bulletList.nth(3)).toContainText("Single Justice Procedure");
    });

    test("should display additional information text", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("More courts and tribunals will become available over time.")).toBeVisible();
    });

    test("should display sign in link", async ({ page }) => {
      await page.goto("/");
      const paragraph = page.getByText("Legal and media professionals can");
      await expect(paragraph).toBeVisible();
      const signInLink = paragraph.locator('..').locator('a[href="/sign-in"]');
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveText("sign in");
    });

    test("should display Welsh language toggle in inset text", async ({ page }) => {
      await page.goto("/");
      const insetText = page.locator(".govuk-inset-text");
      await expect(insetText).toBeVisible();
      await expect(insetText).toContainText("This service is also available in");
      const welshLink = insetText.locator('a[href="?lng=cy"]');
      await expect(welshLink).toBeVisible();
      await expect(welshLink).toHaveText("Welsh (Cymraeg)");
    });

    test("should display Continue button", async ({ page }) => {
      await page.goto("/");
      const continueButton = page.locator('a.govuk-button:has-text("Continue")');
      await expect(continueButton).toBeVisible();
      await expect(continueButton).toHaveAttribute("href", "/view-option");
    });

    test("should navigate to view-option page when Continue is clicked", async ({ page }) => {
      await page.goto("/");
      await page.click('.govuk-button[href="/view-option"]');
      await expect(page).toHaveURL(/\/view-option/);
    });

    test("should display FaCT section", async ({ page }) => {
      await page.goto("/");
      const factSection = page.locator("text=Find a court or tribunal").first();
      await expect(factSection).toBeVisible();

      const factLink = page.locator('a[href="https://www.gov.uk/find-court-tribunal"]');
      await expect(factLink).toBeVisible();
      await expect(factLink).toHaveAttribute("rel", "external");
      await expect(factLink).toHaveText("Find contact details and other information about courts and tribunals");

      const factText = page.locator("text=in England and Wales, and some non-devolved tribunals in Scotland");
      await expect(factText).toBeVisible();
    });

    test("should display Before you start section", async ({ page }) => {
      await page.goto("/");
      const beforeYouStartTitle = page.locator("text=Before you start");
      await expect(beforeYouStartTitle).toBeVisible();

      const scotlandNITitle = page.locator("text=If you're in Scotland or Northern Ireland");
      await expect(scotlandNITitle).toBeVisible();

      const contactText = page.locator("text=Contact the:");
      await expect(contactText).toBeVisible();
    });

    test("should display Scottish Courts link", async ({ page }) => {
      await page.goto("/");
      const scottishCourtsLink = page.locator('a[href="https://www.scotcourts.gov.uk"]');
      await expect(scottishCourtsLink).toBeVisible();
      await expect(scottishCourtsLink).toHaveText("Scottish Courts website");
      await expect(scottishCourtsLink).toHaveAttribute("rel", "external");

      const scottishCourtsText = page.locator("text=for courts and some tribunals in Scotland");
      await expect(scottishCourtsText).toBeVisible();
    });

    test("should display Northern Ireland Courts link", async ({ page }) => {
      await page.goto("/");
      const niCourtsLink = page.locator('a[href="https://www.justice-ni.gov.uk/topics/courts-and-tribunals"]');
      await expect(niCourtsLink).toBeVisible();
      await expect(niCourtsLink).toHaveText("Northern Ireland Courts and Tribunals Service");
      await expect(niCourtsLink).toHaveAttribute("rel", "external");

      const niCourtsText = page.locator("text=for courts and tribunals in Northern Ireland");
      await expect(niCourtsText).toBeVisible();
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should switch to Welsh and display translated content", async ({ page }) => {
      await page.goto("/");

      // Click Welsh language toggle
      await page.click('a[href*="lng=cy"]');
      await page.waitForURL("**/?lng=cy");

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Verify Welsh heading
      const heading = page.locator("h1");
      await expect(heading).toHaveText("Gwrandawiadau llys a thribiwnlys");

      // Verify Welsh bullet points
      const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
      await expect(bulletList.nth(0)).toContainText("Lysoedd Sifil a Theulu");
      await expect(bulletList.nth(1)).toContainText("Tribiwnlys Haen Gyntaf");
      await expect(bulletList.nth(2)).toContainText("Llys Barn Brenhinol");
      await expect(bulletList.nth(3)).toContainText("Gweithdrefn Un Ynad");

      // Verify Welsh additional info
      await expect(page.getByText("Bydd mwy o lysoedd a thribiwnlysoedd ar gael gydag amser.")).toBeVisible();

      // Verify Welsh sign-in link
      const signInParagraph = page.getByText("Gall gweithwyr proffesiynol ym maes y gyfraith a'r cyfryngau");
      await expect(signInParagraph).toBeVisible();
      const signInLink = signInParagraph.locator('..').locator('a[href="/sign-in"]');
      await expect(signInLink).toHaveText("mewngofnodi");

      // Verify English language toggle in inset text
      const insetText = page.locator(".govuk-inset-text");
      await expect(insetText).toContainText("Mae'r gwasanaeth hwn hefyd ar gael yn");
      const englishLink = insetText.locator('a[href="?lng=en"]');
      await expect(englishLink).toHaveText("Saesneg (English)");

      // Verify Welsh continue button
      await expect(page.locator('a.govuk-button:has-text("Parhau")')).toBeVisible();
    });

    test("should display Welsh FaCT section", async ({ page }) => {
      await page.goto("/?lng=cy");
      const factSection = page.locator("text=Dod o hyd i lys neu dribiwnlys").first();
      await expect(factSection).toBeVisible();

      const factLink = page.locator('a[href="https://www.gov.uk/find-court-tribunal"]');
      await expect(factLink).toBeVisible();
      await expect(factLink).toHaveText("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");

      const factText = page.locator("text=yng Nghymru a Lloegr, a rhai tribiwnlysoedd heb eu datganoli yn yr Alban");
      await expect(factText).toBeVisible();
    });

    test("should display Welsh Before you start section", async ({ page }) => {
      await page.goto("/?lng=cy");
      const beforeYouStartTitle = page.locator("text=Cyn i chi ddechrau");
      await expect(beforeYouStartTitle).toBeVisible();

      const scotlandNITitle = page.locator("text=Os ydych yn byw yn Yr Alban neu Gogledd Iwerddon");
      await expect(scotlandNITitle).toBeVisible();

      const contactText = page.locator("text=Cysylltwch â:");
      await expect(contactText).toBeVisible();
    });

    test("should display Welsh Scottish Courts link", async ({ page }) => {
      await page.goto("/?lng=cy");
      const scottishCourtsLink = page.locator('a[href="https://www.scotcourts.gov.uk"]');
      await expect(scottishCourtsLink).toBeVisible();
      await expect(scottishCourtsLink).toHaveText("Gwefan Llysoedd yr Alban");

      const scottishCourtsText = page.locator("text=ar gyfer rhai Llysoedd a Thribiwnlysoedd yn Yr Alban");
      await expect(scottishCourtsText).toBeVisible();
    });

    test("should display Welsh Northern Ireland Courts link", async ({ page }) => {
      await page.goto("/?lng=cy");
      const niCourtsLink = page.locator('a[href="https://www.justice-ni.gov.uk/topics/courts-and-tribunals"]');
      await expect(niCourtsLink).toBeVisible();
      await expect(niCourtsLink).toHaveText("Gwasanaeth Llysoedd a Thribiwnlysoedd Gogledd Iwerddon");

      const niCourtsText = page.locator("text=ar gyfer llysoedd a thribiwnlysoedd yng Ngogledd Iwerddon");
      await expect(niCourtsText).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/");
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have logical heading hierarchy", async ({ page }) => {
      await page.goto("/");
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("Court and tribunal hearings");
    });

    test("should have accessible button", async ({ page }) => {
      await page.goto("/");
      const button = page.locator('a.govuk-button:has-text("Continue")');
      await expect(button).toHaveAttribute("role", "button");
      await expect(button).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should allow keyboard navigation to continue button", async ({ page }) => {
      await page.goto("/");

      // Tab through interactive elements until we reach the continue button
      // Number of tabs may vary depending on header links and new content links
      let focused = false;
      for (let i = 0; i < 15 && !focused; i++) {
        await page.keyboard.press("Tab");
        const continueButton = page.locator('a.govuk-button:has-text("Continue")');
        try {
          await expect(continueButton).toBeFocused({ timeout: 100 });
          focused = true;
        } catch {
          // Continue tabbing
        }
      }

      // Verify continue button is focused
      const continueButton = page.locator('a.govuk-button:has-text("Continue")');
      await expect(continueButton).toBeFocused();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport (375x667)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
      await expect(bulletList).toHaveCount(4);

      const continueButton = page.locator('a.govuk-button:has-text("Continue")');
      await expect(continueButton).toBeVisible();
    });

    test("should display correctly on tablet viewport (768x1024)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
      await expect(bulletList).toHaveCount(4);

      const continueButton = page.locator('a.govuk-button:has-text("Continue")');
      await expect(continueButton).toBeVisible();
    });

    test("should display correctly on desktop viewport (1920x1080)", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const bulletList = page.locator("ul.govuk-list--bullet").first().locator("li");
      await expect(bulletList).toHaveCount(4);

      const continueButton = page.locator('a.govuk-button:has-text("Continue")');
      await expect(continueButton).toBeVisible();
    });
  });
});
