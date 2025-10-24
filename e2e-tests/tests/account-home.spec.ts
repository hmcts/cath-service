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
      const sectionBoxes = page.locator(".verified-tile");
      await expect(sectionBoxes).toHaveCount(3);
    });

    test("should display account sections container with flex layout", async ({ page }) => {
      await page.goto("/account-home");
      const container = page.locator(".verified-tiles-container");
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
      const section = page.locator(".verified-tile").first();
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
      await expect(heading).toHaveClass(/verified-tile-heading/);
      await expect(heading).toHaveText("Court and tribunal hearings");
    });

    test("should have court hearings box as clickable link", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").first();
      await expect(box).toHaveAttribute("href", "/search");
    });

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();
      const description = section.locator("p.verified-tile-description");
      await expect(description).toBeVisible();
      await expect(description).toHaveText("View time, location, type of hearings and more.");
    });

    test("should navigate to search page when court hearings box is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").first();
      await box.click();
      await expect(page).toHaveURL("/search");
    });

    test("should have blue heading without underline", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();
      const heading = section.locator("h2");

      const color = await heading.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      const textDecoration = await heading.evaluate((el) =>
        window.getComputedStyle(el).textDecoration
      );

      expect(color).toBe("rgb(29, 112, 184)");
      expect(textDecoration).toContain("none");
    });
  });

  test.describe("Single Justice Procedure Cases Section", () => {
    test("should display SJP cases section heading", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").nth(1);
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
      await expect(heading).toHaveText("Single Justice Procedure cases");
    });

    test("should have SJP cases box as clickable link", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").nth(1);
      await expect(box).toHaveAttribute("href", "/summary-of-publications?locationId=9");
    });

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").nth(1);
      const description = section.locator("p.verified-tile-description");
      await expect(description).toBeVisible();
      await expect(description).toHaveText("Cases ready to be decided by a magistrate without a hearing. Includes TV licensing, minor traffic offences such as speeding and more.");
    });

    test("should navigate to SJP summary page when box is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").nth(1);
      await box.click();
      await expect(page).toHaveURL("/summary-of-publications?locationId=9");
    });
  });

  test.describe("Email Subscriptions Section", () => {
    test("should display email subscriptions section heading", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").nth(2);
      const heading = section.locator("h2");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveClass(/govuk-heading-s/);
      await expect(heading).toHaveText("Email subscriptions");
    });

    test("should have email subscriptions box as clickable link", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").nth(2);
      await expect(box).toHaveAttribute("href", "/");
    });

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").nth(2);
      const description = section.locator("p.verified-tile-description");
      await expect(description).toBeVisible();
      await expect(description).toHaveText("Get emails about hearings from different courts and tribunals and manage your subscriptions.");
    });

    test("should navigate to home page when email subscriptions box is clicked", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").nth(2);
      await box.click();
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Section Box Styling", () => {
    test("should have correct background color on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();

      const bgColor = await section.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // #f3f2f1 converts to rgb(243, 242, 241)
      expect(bgColor).toBe("rgb(243, 242, 241)");
    });

    test("should have border on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();

      const border = await section.evaluate((el) =>
        window.getComputedStyle(el).border
      );

      expect(border).toContain("1px");
      expect(border).toContain("solid");
    });

    test("should have equal flex sizing on all boxes", async ({ page }) => {
      await page.goto("/account-home");
      const sections = page.locator(".verified-tile");

      const count = await sections.count();
      expect(count).toBe(3);

      for (let i = 0; i < count; i++) {
        const flex = await sections.nth(i).evaluate((el) =>
          window.getComputedStyle(el).flex
        );
        expect(flex).toContain("1");
      }
    });

    test("should have pointer cursor on section boxes", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();

      const cursor = await section.evaluate((el) =>
        window.getComputedStyle(el).cursor
      );

      expect(cursor).toBe("pointer");
    });

    test("should have box shadow on hover", async ({ page }) => {
      await page.goto("/account-home");
      const section = page.locator(".verified-tile").first();

      await section.hover();
      await page.waitForTimeout(100);

      const boxShadow = await section.evaluate((el) =>
        window.getComputedStyle(el).boxShadow
      );

      expect(boxShadow).not.toBe("none");
    });

    test("should have all boxes with same height", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/account-home");
      const sections = page.locator(".verified-tile");

      const heights = [];
      for (let i = 0; i < 3; i++) {
        const boundingBox = await sections.nth(i).boundingBox();
        heights.push(boundingBox?.height || 0);
      }

      // All boxes should have the same height (within 1px tolerance)
      const maxHeight = Math.max(...heights);
      const minHeight = Math.min(...heights);
      expect(maxHeight - minHeight).toBeLessThanOrEqual(1);
    });
  });

  test.describe("Heading and Description Styling", () => {
    test("should style section headings as bold", async ({ page }) => {
      await page.goto("/account-home");
      const heading = page.locator(".verified-tile-heading").first();

      const fontWeight = await heading.evaluate((el) =>
        window.getComputedStyle(el).fontWeight
      );

      // Bold is typically 700
      expect(Number.parseInt(fontWeight)).toBeGreaterThanOrEqual(700);
    });

    test("should have blue color on section headings", async ({ page }) => {
      await page.goto("/account-home");
      const heading = page.locator(".verified-tile-heading").first();

      const color = await heading.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // GOV.UK link blue: rgb(29, 112, 184)
      expect(color).toBe("rgb(29, 112, 184)");
    });

    test("should not have underline on section headings", async ({ page }) => {
      await page.goto("/account-home");
      const heading = page.locator(".verified-tile-heading").first();

      const textDecoration = await heading.evaluate((el) =>
        window.getComputedStyle(el).textDecoration
      );

      expect(textDecoration).toContain("none");
    });

    test("should display description text in black", async ({ page }) => {
      await page.goto("/account-home");
      const description = page.locator(".verified-tile-description").first();

      const color = await description.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // Black color: rgb(11, 12, 12)
      expect(color).toBe("rgb(11, 12, 12)");
    });

    test("should have no text decoration on boxes", async ({ page }) => {
      await page.goto("/account-home");
      const box = page.locator(".verified-tile").first();

      const textDecoration = await box.evaluate((el) =>
        window.getComputedStyle(el).textDecoration
      );

      expect(textDecoration).toContain("none");
    });
  });

  test.describe("Responsive Layout", () => {
    test("should display sections in row on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/account-home");

      const container = page.locator(".verified-tiles-container");
      const flexDirection = await container.evaluate((el) =>
        window.getComputedStyle(el).flexDirection
      );

      expect(flexDirection).toBe("row");
    });

    test("should have gap between sections", async ({ page }) => {
      await page.goto("/account-home");

      const container = page.locator(".verified-tiles-container");
      const gap = await container.evaluate((el) =>
        window.getComputedStyle(el).gap
      );

      // 1.5em gap
      expect(parseFloat(gap)).toBeGreaterThan(20);
    });

    test("should display all three boxes side by side on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/account-home");

      const sections = page.locator(".verified-tile");
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

      const courtHearingsHeading = page.locator(".verified-tile-heading").first();
      await expect(courtHearingsHeading).toHaveText("Gwrandawiadau llys a thribiwnlys");

      const sjpHeading = page.locator(".verified-tile-heading").nth(1);
      await expect(sjpHeading).toHaveText("Achosion Gweithdrefn Ynad Unigol");

      const emailHeading = page.locator(".verified-tile-heading").nth(2);
      await expect(emailHeading).toHaveText("Tanysgrifiadau e-bost");
    });

    test("should display Welsh descriptions", async ({ page }) => {
      await page.goto("/account-home?lng=cy");

      const courtHearingsDesc = page.locator(".verified-tile-description").first();
      await expect(courtHearingsDesc).toHaveText("Gweld amser, lleoliad, math o wrandawiadau a mwy.");

      const sjpDesc = page.locator(".verified-tile-description").nth(1);
      await expect(sjpDesc).toHaveText("Achosion sy'n barod i gael eu penderfynu gan ynad heb wrandawiad. Yn cynnwys trwyddedu teledu, mân dramgwyddau traffig fel goryrru a mwy.");

      const emailDesc = page.locator(".verified-tile-description").nth(2);
      await expect(emailDesc).toHaveText("Cael e-byst am wrandawiadau o wahanol lysoedd a thribiwnlysoedd a rheoli eich tanysgrifiadau.");
    });

    test("should maintain same layout in Welsh", async ({ page }) => {
      await page.goto("/account-home?lng=cy");

      const sectionBoxes = page.locator(".verified-tile");
      await expect(sectionBoxes).toHaveCount(3);
    });

    test("should have same hrefs in Welsh", async ({ page }) => {
      await page.goto("/account-home?lng=cy");

      const boxes = page.locator(".verified-tile");
      await expect(boxes.nth(0)).toHaveAttribute("href", "/search");
      await expect(boxes.nth(1)).toHaveAttribute("href", "/summary-of-publications?locationId=9");
      await expect(boxes.nth(2)).toHaveAttribute("href", "/");
    });
  });

  test.describe("Accessibility", () => {
    test("should not have any automatically detectable accessibility issues", async ({ page }) => {
      await page.goto("/account-home");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"]) // Region/landmark issues are template-level, not page-specific
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/account-home");

      // Check h1 exists
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);

      // Check h2s exist for sections (3 in main content + navigation h2s)
      const contentH2s = page.locator(".verified-tile h2");
      await expect(contentH2s).toHaveCount(3);
    });

    test("should have descriptive content in clickable boxes", async ({ page }) => {
      await page.goto("/account-home");

      const boxes = page.locator(".verified-tile");
      const count = await boxes.count();

      for (let i = 0; i < count; i++) {
        const box = boxes.nth(i);
        const text = await box.textContent();

        // Each box should have meaningful content
        expect(text?.length || 0).toBeGreaterThan(20);
        expect(text?.toLowerCase()).not.toContain("click here");
      }
    });

    test("should have proper color contrast on headings", async ({ page }) => {
      await page.goto("/account-home");

      const heading = page.locator(".verified-tile-heading").first();
      const color = await heading.evaluate((el) =>
        window.getComputedStyle(el).color
      );

      // GOV.UK link blue should be rgb(29, 112, 184)
      expect(color).toBe("rgb(29, 112, 184)");
    });

    test("should have semantic HTML structure with links", async ({ page }) => {
      await page.goto("/account-home");

      const sections = page.locator(".verified-tile");

      for (let i = 0; i < 3; i++) {
        const section = sections.nth(i);

        // Each section should be an anchor tag
        const tagName = await section.evaluate((el) => el.tagName.toLowerCase());
        expect(tagName).toBe("a");

        // Each section should contain a heading
        const h2 = section.locator("h2");
        await expect(h2).toBeVisible();

        // Each section should contain a description
        const description = section.locator("p.verified-tile-description");
        await expect(description).toBeVisible();
      }
    });

    test("should be keyboard accessible", async ({ page }) => {
      await page.goto("/account-home");

      const firstBox = page.locator(".verified-tile").first();

      // Tab until we reach the first box
      let attempts = 0;
      const maxAttempts = 20;
      while (attempts < maxAttempts) {
        await page.keyboard.press("Tab");
        const isFocused = await firstBox.evaluate((el) => document.activeElement === el);
        if (isFocused) {
          break;
        }
        attempts++;
      }

      // Verify focus is on the first box
      await expect(firstBox).toBeFocused();
    });

    test("should have focus indicator on boxes", async ({ page }) => {
      await page.goto("/account-home");

      const box = page.locator(".verified-tile").first();
      await box.focus();

      const outline = await box.evaluate((el) =>
        window.getComputedStyle(el).outline
      );

      // Should have a visible focus outline
      expect(outline).not.toBe("none");
    });
  });
});
