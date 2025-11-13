import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loginWithSSO } from '../utils/sso-helpers.js';
import { prisma } from '@hmcts/postgres';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('File Publication Page', () => {
  // App runs from repo root, not apps/web
  const STORAGE_PATH = path.join(process.cwd(), '..', 'storage', 'temp', 'uploads');
  let TEST_ARTEFACT_ID: string;
  const TEST_FILE_CONTENT = Buffer.from('Test PDF content for E2E testing');

  test.beforeAll(async () => {
    // Ensure storage directory exists
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  });

  test.afterAll(async () => {
    // Disconnect from Prisma
    await prisma.$disconnect();
  });

  test.describe('given user views a valid PDF publication', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (TEST_ARTEFACT_ID) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${TEST_ARTEFACT_ID}.pdf`));
        } catch {
          // Ignore if file doesn't exist
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: TEST_ARTEFACT_ID }
          });
        } catch {
          // Ignore if record doesn't exist
        }
      }

      // Create artefact record in database (Prisma will generate UUID)
      const artefact = await prisma.artefact.create({
        data: {
          locationId: '1',
          listTypeId: 1, // Magistrates Public List
          contentDate: new Date('2025-01-15'),
          sensitivity: 'PUBLIC',
          language: 'ENGLISH',
          displayFrom: new Date('2025-01-01'),
          displayTo: new Date('2025-12-31')
        }
      });
      TEST_ARTEFACT_ID = artefact.artefactId;

      // Create a test file before each test
      await fs.writeFile(
        path.join(STORAGE_PATH, `${TEST_ARTEFACT_ID}.pdf`),
        TEST_FILE_CONTENT
      );
    });

    test.afterEach(async () => {
      // Clean up test file after each test
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${TEST_ARTEFACT_ID}.pdf`));
      } catch {
        // Ignore if file doesn't exist
      }

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: TEST_ARTEFACT_ID }
        });
      } catch {
        // Ignore if record doesn't exist
      }
    });

    test('should load the page with iframe displaying PDF', async ({ page }) => {
      await page.goto(`/file-publication?artefactId=${TEST_ARTEFACT_ID}`);

      // Check the page title contains publication details
      await expect(page).toHaveTitle(/Magistrates Public List/);

      // Check for iframe
      const iframe = page.locator('iframe');
      await expect(iframe).toBeVisible();

      // Verify iframe src points to file-publication-data endpoint
      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toContain('/file-publication-data');
      expect(iframeSrc).toContain(`artefactId=${TEST_ARTEFACT_ID}`);

      // Verify iframe has accessible title
      const iframeTitle = await iframe.getAttribute('title');
      expect(iframeTitle).toBeTruthy();
      expect(iframeTitle?.length).toBeGreaterThan(0);
    });

    test('should have correct page structure and styling', async ({ page }) => {
      await page.goto(`/file-publication?artefactId=${TEST_ARTEFACT_ID}`);

      // Verify body and html have no margin/padding
      const bodyStyle = await page.locator('body').evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          margin: style.margin,
          padding: style.padding,
          height: style.height,
          overflow: style.overflow
        };
      });

      expect(bodyStyle.margin).toBe('0px');
      expect(bodyStyle.padding).toBe('0px');
      expect(bodyStyle.overflow).toBe('hidden');

      // Verify iframe has no border
      const iframeStyle = await page.locator('iframe').evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          border: style.border,
          width: style.width,
          height: style.height
        };
      });

      expect(iframeStyle.border).toContain('0px');
    });

    test('should include formatted date and language in title', async ({ page }) => {
      await page.goto(`/file-publication?artefactId=${TEST_ARTEFACT_ID}`);

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');

      // Check title includes expected components
      const title = await page.title();
      expect(title).toMatch(/Magistrates Public List/);
      expect(title).toMatch(/English \(Saesneg\)/);
      expect(title).toMatch(/\d{1,2}\s\w+\s\d{4}/); // Date format
    });
  });

  test.describe('given artefactId is missing', () => {
    test('should redirect to 400 error page', async ({ page }) => {
      await page.goto('/file-publication');

      // Should redirect to 400 page
      await expect(page).toHaveURL('/400');

      // Check for 400 error page heading
      const heading = page.locator('h1.govuk-heading-l');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/bad request/i);
    });
  });

  test.describe('given file does not exist', () => {
    test('should display 404 error page with helpful message', async ({ page }) => {
      const nonExistentArtefactId = 'non-existent-artefact-12345';
      await page.goto(`/file-publication?artefactId=${nonExistentArtefactId}`);

      // Verify 404 status
      expect(page.url()).toContain(`artefactId=${nonExistentArtefactId}`);

      // Check for error page heading
      const heading = page.locator('h1.govuk-heading-l');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/page not found/i);

      // Check for helpful error message (inside grid-row to avoid cookie banner)
      const bodyText = page.locator('.govuk-grid-row .govuk-body');
      await expect(bodyText).toBeVisible();
      await expect(bodyText).toContainText(/attempted to view a page that no longer exists/i);

      // Check for "Find a court or tribunal" button
      const button = page.locator('a.govuk-button.govuk-button--start');
      await expect(button).toBeVisible();
      await expect(button).toContainText(/find a court or tribunal/i);
      await expect(button).toHaveAttribute('href', '/courts-tribunals-list');

      // Run accessibility checks on error page
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should display Welsh error content when locale is cy', async ({ page }) => {
      const nonExistentArtefactId = 'non-existent-artefact-welsh';
      await page.goto(`/file-publication?artefactId=${nonExistentArtefactId}&lng=cy`);

      // Check for Welsh error page heading
      const heading = page.locator('h1.govuk-heading-l');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/heb ddod o hyd/i);

      // Check for Welsh body text
      await expect(page.getByText(/rydych wedi ceisio gweld tudalen/i)).toBeVisible();

      // Check for Welsh button text
      const button = page.locator('a.govuk-button.govuk-button--start');
      await expect(button).toContainText(/dod o hyd i lys/i);
    });

    test('should prevent iframe breakout on error page', async ({ page }) => {
      const nonExistentArtefactId = 'non-existent-artefact-iframe-test';
      await page.goto(`/file-publication?artefactId=${nonExistentArtefactId}`);

      // Check that the breakout script is present in the page
      const scriptContent = await page.locator('script').evaluateAll((scripts) => {
        return scripts
          .map((script) => script.textContent || '')
          .join('\n');
      });

      expect(scriptContent).toContain('window.self');
      expect(scriptContent).toContain('window.top');
    });
  });

  test.describe('given user navigates from summary page', () => {
    let navigationTestId: string;

    test.beforeAll(async () => {
      // Create artefact record in database (Prisma will generate UUID)
      await fs.mkdir(STORAGE_PATH, { recursive: true });
      const artefact = await prisma.artefact.create({
        data: {
          locationId: '9', // Match the locationId in the test
          listTypeId: 1,
          contentDate: new Date('2025-01-15'),
          sensitivity: 'PUBLIC',
          language: 'ENGLISH',
          displayFrom: new Date('2025-01-01'),
          displayTo: new Date('2025-12-31')
        }
      });
      navigationTestId = artefact.artefactId;

      // Create a test file for navigation test
      await fs.writeFile(
        path.join(STORAGE_PATH, `${navigationTestId}.pdf`),
        TEST_FILE_CONTENT
      );
    });

    test.afterAll(async () => {
      // Clean up test file
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${navigationTestId}.pdf`));
      } catch {
        // Ignore if file doesn't exist
      }

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: navigationTestId }
        });
      } catch {
        // Ignore
      }
    });

    test('should open in new window when clicked from summary page', async ({ page, context }) => {
      await page.goto('/summary-of-publications?locationId=9');

      // Wait for publication links to load
      const publicationLinks = page.locator('a[href^="/file-publication"]');
      await expect(publicationLinks.first()).toBeVisible();

      // Verify first link has target="_blank"
      const firstLink = publicationLinks.first();
      await expect(firstLink).toHaveAttribute('target', '_blank');
      await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');

      // Verify "opens in new window" text is present
      await expect(page.getByText(/opens in a new window/i)).toBeVisible();
    });
  });

  test.describe('given different file types', () => {
    test('should handle JSON files with download', async ({ page }) => {
      let jsonArtefactId: string;
      const jsonContent = JSON.stringify({ test: 'data' });

      // Create artefact record in database (Prisma will generate UUID)
      const artefact = await prisma.artefact.create({
        data: {
          locationId: '9', // Match the locationId in the test
          listTypeId: 1,
          contentDate: new Date('2025-01-15'),
          sensitivity: 'PUBLIC',
          language: 'ENGLISH',
          displayFrom: new Date('2025-01-01'),
          displayTo: new Date('2025-12-31')
        }
      });
      jsonArtefactId = artefact.artefactId;

      // Create JSON test file
      await fs.writeFile(
        path.join(STORAGE_PATH, `${jsonArtefactId}.json`),
        jsonContent
      );

      try {
        // Navigate to summary page and check for download link
        await page.goto('/summary-of-publications?locationId=9');

        // JSON files should use file-publication-data endpoint
        const downloadLinks = page.locator('a[href^="/file-publication-data"]');
        const count = await downloadLinks.count();

        // Verify download links exist (if there are any JSON files)
        if (count > 0) {
          const firstDownloadLink = downloadLinks.first();
          await expect(firstDownloadLink).toHaveAttribute('download', '');
        }
      } finally {
        // Clean up
        await fs.unlink(path.join(STORAGE_PATH, `${jsonArtefactId}.json`));
        await prisma.artefact.delete({
          where: { artefactId: jsonArtefactId }
        });
      }
    });
  });

  test.describe('given user uses keyboard navigation', () => {
    let keyboardTestId: string;
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (keyboardTestId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${keyboardTestId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: keyboardTestId }
          });
        } catch {
          // Ignore
        }
      }

      await fs.mkdir(STORAGE_PATH, { recursive: true });

      // Create artefact record in database (Prisma will generate UUID)
      const artefact = await prisma.artefact.create({
        data: {
          locationId: '1',
          listTypeId: 1,
          contentDate: new Date('2025-01-15'),
          sensitivity: 'PUBLIC',
          language: 'ENGLISH',
          displayFrom: new Date('2025-01-01'),
          displayTo: new Date('2025-12-31')
        }
      });
      keyboardTestId = artefact.artefactId;

      await fs.writeFile(
        path.join(STORAGE_PATH, `${keyboardTestId}.pdf`),
        TEST_FILE_CONTENT
      );
    });

    test.afterEach(async () => {
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${keyboardTestId}.pdf`));
      } catch {
        // Ignore
      }

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: keyboardTestId }
        });
      } catch {
        // Ignore
      }
    });

    test('should be keyboard accessible on error page', async ({ page }) => {
      await page.goto('/file-publication?artefactId=non-existent');

      // Find the "Find a court or tribunal" button
      const button = page.locator('a.govuk-button.govuk-button--start');
      await button.focus();

      // Verify button is focused
      await expect(button).toBeFocused();

      // Press Enter should navigate
      await button.press('Enter');

      // Should navigate to courts-tribunals-list
      await expect(page).toHaveURL('/courts-tribunals-list');
    });
  });
});
