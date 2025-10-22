import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Account Home Page", () => {
  test.describe("Page Load and Content", () => {
    test("should load the account home page", async ({ page }) => {
      await page.goto("/account-home");
      await expect(page).toHaveTitle(/Dashboard - Your account/i);
    });

    test("should display the main heading", async ({ page }) => {
      await page.goto("/account-home");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Your account");
      await expect(heading).toHaveClass(/govuk-heading-l/);
    });

    test("should display three account section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const sectionBoxes = page.locator(".account-section-box");
      await expect(sectionBoxes).toHaveCount(3);
    });

    test("should display account sections container with flex layout", async ({ page }) => {
      await page.goto("/account-home");
      const container = page.locator(".account-sections-container");
      await expect(container).toBeVisible();

      const display = await container.evaluate((el) =>
        window.getComputedStyle(el).display
      );
      expect(display).toBe("flex");
    });
  });

  test.describe("Court and Tribunal Hearings Section", () => {
    test("should display court hearings section heading", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
      await expect(heading).toHaveClass(/account-section-heading/);
    });

    test("should have court hearings link with correct text", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();
      const link = section.locator("a.account-section-link");
      await expect(link).toBeVisible();
      await expect(link).toHaveText("Court and tribunal hearings");
      await expect(link).toHaveAttribute("href", "/search");
    });

    test("should not display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();
      const paragraph = section.locator("p.govuk-body");
      await expect(paragraph).not.toBeVisible();
    });

    test("should navigate to search page when court hearings link is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();
      const link = section.locator("a.account-section-link");
      await link.click();
      await expect(page).toHaveURL("/search");
    });
  });

  test.describe("Single Justice Procedure Cases Section", () => {
    test("should display SJP cases section heading", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(1);
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
    });

    test("should have SJP cases link with correct text", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(1);
      const link = section.locator("a.account-section-link");
      await expect(link).toBeVisible();
      await expect(link).toHaveText("Single Justice Procedure cases");
      await expect(link).toHaveAttribute("href", "/summary-of-publications?locationId=9");
    });

    test("should not display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(1);
      const paragraph = section.locator("p.govuk-body");
      await expect(paragraph).not.toBeVisible();
    });

    test("should navigate to SJP summary page when link is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(1);
      const link = section.locator("a.account-section-link");
      await link.click();
      await expect(page).toHaveURL("/summary-of-publications?locationId=9");
    });
  });

  test.describe("Email Subscriptions Section", () => {
    test("should display email subscriptions section heading", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(2);
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
    });

    test("should have email subscriptions link with correct text", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(2);
      const link = section.locator("a.account-section-link");
      await expect(link).toBeVisible();
      await expect(link).toHaveText("Email subscriptions");
      await expect(link).toHaveAttribute("href", "/");
    });

    test("should not display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(2);
      const paragraph = section.locator("p.govuk-body");
      await expect(paragraph).not.toBeVisible();
    });

    test("should navigate to home page when email subscriptions link is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").nth(2);
      const link = section.locator("a.account-section-link");
      await link.click();
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Section Box Styling", () => {
    test("should have correct background color on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();

      const bgColor = await section.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // #f3f2f1 converts to rgb(243, 242, 241)
      expect(bgColor).toBe("rgb(243, 242, 241)");
    });

    test("should have border on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();

      const border = await section.evaluate((el) =>
        window.getComputedStyle(el).border
      );

      expect(border).toContain("1px");
      expect(border).toContain("solid");
    });

    test("should have minimum height on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".account-section-box").first();

      const minHeight = await section.evaluate((el) =>
        window.getComputedStyle(el).minHeight
      );

      expect(parseFloat(minHeight)).toBeGreaterThanOrEqual(150);
    });

    test("should have equal flex sizing on all boxes", async ({ page }) => {
      await page.goto("/account-home");
      const sections = page.locator(".account-section-box");

      const count = await sections.count();
      expect(count).toBe(3);

      for (let i = 0; i < count; i++) {
        const flex = await sections.nth(i).evaluate((el) =>
          window.getComputedStyle(el).flex
        );
        expect(flex).toContain("1");
      }
    });
  });

  test.describe("Link Styling", () => {
    test("should style section links as bold", async ({ page }) => {
      await page.goto("/account-home");
      const link = page.locator(".account-section-link").first();

      const fontWeight = await link.evaluate((el) =>
        window.getComputedStyle(el).fontWeight
      );

      // Bold is typically 700
      expect(Number.parseInt(fontWeight)).toBeGreaterThanOrEqual(700);
    });

    test("should have underline decoration on section links", async ({ page }) => {
      await page.goto("/account-home");
      const link = page.locator(".account-section-link").first();

      const textDecoration = await link.evaluate((el) =>
        window.getComputedStyle(el).textDecoration
      );

      expect(textDecoration).toContain("underline");
    });

    test("should have GOV.UK link styling", async ({ page }) => {
      await page.goto("/account-home");
      const link = page.locator(".account-section-link").first();

      await expect(link).toHaveClass(/govuk-link/);
    });

    test("should increase underline thickness on hover", async ({ page }) => {
      await page.goto("/account-home");
      const link = page.locator(".account-section-link").first();

      // Hover over the link
      await link.hover();

      // Small delay for CSS transition
      await page.waitForTimeout(100);

      const textDecorationThickness = await link.evaluate((el) =>
        window.getComputedStyle(el).textDecorationThickness
      );

      expect(textDecorationThickness).toBe("2px");
    });
  });

  test.describe("Responsive Layout", () => {
    test("should display sections in row on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/account-home");

      const container = page.locator(".account-sections-container");
      const flexDirection = await container.evaluate((el) =>
        window.getComputedStyle(el).flexDirection
      );

      expect(flexDirection).toBe("row");
    });

    test("should have gap between sections", async ({ page }) => {
      await page.goto("/account-home");

      const container = page.locator(".account-sections-container");
      const gap = await container.evaluate((el) =>
        window.getComputedStyle(el).gap
      );

      // 1.5em gap
      expect(parseFloat(gap)).toBeGreaterThan(20);
    });

    test("should display all three boxes side by side on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/account-home");

      const sections = page.locator(".account-section-box");
      const boundingBoxes = [];

      for (let i = 0; i < 3; i++) {
        boundingBoxes.push(await sections.nth(i).boundingBox());
      }

      // All boxes should have roughly the same y-coordinate (same row)
      const yPositions = boundingBoxes.map(box => box?.y || 0);
      const maxYDiff = Math.max(...yPositions) - Math.min(...yPositions);
      expect(maxYDiff).toBeLessThan(10); // Allow small rendering differences
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should display Welsh content when Welsh locale is selected", async ({ page }) => {
      await page.goto("/account-home?lng=cy");

      const heading = page.locator("h1");
      await expect(heading).toHaveText("Eich cyfrif");

      const courtHearingsLink = page.locator(".account-section-link").first();
      await expect(courtHearingsLink).toHaveText("Gwrandawiadau llys a thribiwnlys");

      const sjpLink = page.locator(".account-section-link").nth(1);
      await expect(sjpLink).toHaveText("Achosion Gweithdrefn Ynad Unigol");

      const emailLink = page.locator(".account-section-link").nth(2);
      await expect(emailLink).toHaveText("Tanysgrifiadau e-bost");
    });

    test("should maintain same layout in Welsh", async ({ page }) => {
      await page.goto("/account-home?lng=cy");

      const sectionBoxes = page.locator(".account-section-box");
      await expect(sectionBoxes).toHaveCount(3);
    });
  });

  test.describe("Accessibility", () => {
    test("should not have any automatically detectable accessibility issues", async ({ page }) => {
      await page.goto("/account-home");

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/account-home");

      // Check h1 exists
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);

      // Check h2s exist for sections
      const h2s = page.locator("h2");
      await expect(h2s).toHaveCount(3);
    });

    test("should have descriptive link text", async ({ page }) => {
      await page.goto("/account-home");

      const links = page.locator(".account-section-link");
      const linkTexts = await links.allTextContents();

      // All links should have meaningful text (not "click here" etc)
      linkTexts.forEach((text) => {
        expect(text.length).toBeGreaterThan(5);
        expect(text.toLowerCase()).not.toContain("click here");
        expect(text.toLowerCase()).not.toContain("more");
      });
    });

    test("should have proper color contrast on links", async ({ page }) => {
      await page.goto("/account-home");

      const link = page.locator(".account-section-link").first();
      const color = await link.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // GOV.UK link blue should be rgb(29, 112, 184)
      expect(color).toBe("rgb(29, 112, 184)");
    });

    test("should have semantic HTML structure", async ({ page }) => {
      await page.goto("/account-home");

      // Check that headings are inside header tags within sections
      const sections = page.locator(".account-section-box");

      for (let i = 0; i < 3; i++) {
        const section = sections.nth(i);
        const h2 = section.locator("h2");
        await expect(h2).toBeVisible();
      }
    });
  });
});
