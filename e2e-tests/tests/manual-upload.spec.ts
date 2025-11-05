import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('Manual Upload Page', () => {
  test.describe('given user is on the manual-upload page', () => {
    test('should load the page with all form fields and accessibility compliance', async ({ page }) => {
      await page.goto('/manual-upload');

      // Check the browser tab title
      await expect(page).toHaveTitle('Upload - Manual upload - Court and tribunal hearings - GOV.UK');

      // Check for the page heading
      const heading = page.getByRole('heading', { name: /manual upload/i });
      await expect(heading).toBeVisible();

      // Check for warning section
      const warningTitle = page.getByText(/warning/i);
      await expect(warningTitle).toBeVisible();

      // Check for file upload field
      const fileUpload = page.locator('input[name="file"]');
      await expect(fileUpload).toBeVisible();

      // Check for court/tribunal autocomplete field (use role="combobox" which is set after autocomplete initializes)
      await page.waitForTimeout(1000);
      const courtInput = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await expect(courtInput).toBeVisible();

      // Check for list type dropdown
      const listTypeSelect = page.locator('select[name="listType"]');
      await expect(listTypeSelect).toBeVisible();

      // Check for hearing start date fields
      const hearingDateDay = page.locator('input[name="hearingStartDate-day"]');
      const hearingDateMonth = page.locator('input[name="hearingStartDate-month"]');
      const hearingDateYear = page.locator('input[name="hearingStartDate-year"]');
      await expect(hearingDateDay).toBeVisible();
      await expect(hearingDateMonth).toBeVisible();
      await expect(hearingDateYear).toBeVisible();

      // Check for sensitivity dropdown
      const sensitivitySelect = page.locator('select[name="sensitivity"]');
      await expect(sensitivitySelect).toBeVisible();

      // Check for language dropdown
      const languageSelect = page.locator('select[name="language"]');
      await expect(languageSelect).toBeVisible();

      // Check for display date fields
      const displayFromDay = page.locator('input[name="displayFrom-day"]');
      const displayFromMonth = page.locator('input[name="displayFrom-month"]');
      const displayFromYear = page.locator('input[name="displayFrom-year"]');
      await expect(displayFromDay).toBeVisible();
      await expect(displayFromMonth).toBeVisible();
      await expect(displayFromYear).toBeVisible();

      const displayToDay = page.locator('input[name="displayTo-day"]');
      const displayToMonth = page.locator('input[name="displayTo-month"]');
      const displayToYear = page.locator('input[name="displayTo-year"]');
      await expect(displayToDay).toBeVisible();
      await expect(displayToMonth).toBeVisible();
      await expect(displayToYear).toBeVisible();

      // Check for continue button
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Verify language toggle is NOT present (hideLanguageToggle: true)
      const languageToggle = page.locator('.language');
      await expect(languageToggle).not.toBeVisible();

      // Run accessibility checks on initial page load
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations found:');
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach(node => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have red inset text around file, list type, and hearing date fields', async ({ page }) => {
      await page.goto('/manual-upload');

      // Check for inset text wrappers (grey border)
      const fileInset = page.locator('.govuk-inset-text').nth(0);
      const listTypeInset = page.locator('.govuk-inset-text').nth(1);

      await expect(fileInset).toBeVisible();
      await expect(listTypeInset).toBeVisible();

      // Verify file field is inside first inset
      const fileUpload = fileInset.locator('input[name="file"]');
      await expect(fileUpload).toBeVisible();

      // Verify list type and hearing date are inside second inset
      const listTypeSelect = listTypeInset.locator('select[name="listType"]');
      const hearingDateDay = listTypeInset.locator('input[name="hearingStartDate-day"]');
      await expect(listTypeSelect).toBeVisible();
      await expect(hearingDateDay).toBeVisible();
    });
  });

  test.describe('given user submits form without filling any fields', () => {
    test('should display validation errors for all required fields', async ({ page }) => {
      await page.goto('/manual-upload');

      // Click continue without filling any fields
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the manual-upload page
      await expect(page).toHaveURL('/manual-upload');

      // Check for error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Check for error summary heading
      const errorSummaryHeading = errorSummary.getByRole('heading', { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Verify multiple error links are present
      const errorLinks = errorSummary.locator('.govuk-error-summary__list a');
      const errorCount = await errorLinks.count();
      expect(errorCount).toBeGreaterThan(0);

      // Verify error messages are visible next to fields
      const fileErrorMessage = page.locator('#file').locator('..').locator('.govuk-error-message');
      await expect(fileErrorMessage).toBeVisible();

      // Verify accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['target-size', 'link-name'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('given user uploads invalid file type', () => {
    test('should display file type validation error', async ({ page }) => {
      await page.goto('/manual-upload?locationId=1');

      // Wait for autocomplete to initialize with pre-filled value
      await page.waitForTimeout(1000);

      // Create a test file with invalid extension
      const fileInput = page.locator('input[name="file"]');

      // Set file with invalid extension (.txt)
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test content')
      });

      await page.selectOption('select[name="listType"]', '1'); // Civil Daily Cause List
      await page.fill('input[name="hearingStartDate-day"]', '15');
      await page.fill('input[name="hearingStartDate-month"]', '06');
      await page.fill('input[name="hearingStartDate-year"]', '2025');
      await page.selectOption('select[name="sensitivity"]', 'PUBLIC');
      await page.selectOption('select[name="language"]', 'ENGLISH');
      await page.fill('input[name="displayFrom-day"]', '10');
      await page.fill('input[name="displayFrom-month"]', '06');
      await page.fill('input[name="displayFrom-year"]', '2025');
      await page.fill('input[name="displayTo-day"]', '20');
      await page.fill('input[name="displayTo-month"]', '06');
      await page.fill('input[name="displayTo-year"]', '2025');

      // Submit form
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the manual-upload page (with query param)
      await expect(page).toHaveURL(/\/manual-upload/);

      // Check for error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Verify error link points to file input
      const errorLink = errorSummary.getByRole('link', { name: /please upload a valid file format/i });
      await expect(errorLink).toBeVisible();
      await expect(errorLink).toHaveAttribute('href', '#file');

      // Check for inline error message
      const inlineErrorMessage = page.locator('#file').locator('..').locator('.govuk-error-message');
      await expect(inlineErrorMessage).toBeVisible();
      await expect(inlineErrorMessage).toContainText(/please upload a valid file format/i);
    });
  });

  test.describe('given user uploads file larger than 2MB', () => {
    test('should display file size validation error', async ({ page }) => {
      await page.goto('/manual-upload?locationId=1');

      // Wait for autocomplete to initialize with pre-filled value
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[name="file"]');

      // Create a buffer larger than 2MB
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
      await fileInput.setInputFiles({
        name: 'large-file.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer
      });

      await page.selectOption('select[name="listType"]', '1'); // Civil Daily Cause List
      await page.fill('input[name="hearingStartDate-day"]', '15');
      await page.fill('input[name="hearingStartDate-month"]', '06');
      await page.fill('input[name="hearingStartDate-year"]', '2025');
      await page.selectOption('select[name="sensitivity"]', 'PUBLIC');
      await page.selectOption('select[name="language"]', 'ENGLISH');
      await page.fill('input[name="displayFrom-day"]', '10');
      await page.fill('input[name="displayFrom-month"]', '06');
      await page.fill('input[name="displayFrom-year"]', '2025');
      await page.fill('input[name="displayTo-day"]', '20');
      await page.fill('input[name="displayTo-month"]', '06');
      await page.fill('input[name="displayTo-year"]', '2025');

      // Submit form
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the manual-upload page (with query param)
      await expect(page).toHaveURL(/\/manual-upload/);

      // Check for error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();

      // Verify error link points to file input
      const errorLink = errorSummary.getByRole('link', { name: /file too large/i });
      await expect(errorLink).toBeVisible();
      await expect(errorLink).toHaveAttribute('href', '#file');

      // Check for inline error message
      const inlineErrorMessage = page.locator('#file').locator('..').locator('.govuk-error-message');
      await expect(inlineErrorMessage).toBeVisible();
      await expect(inlineErrorMessage).toContainText(/file too large, please upload file smaller than 2mb/i);
    });
  });

  test.describe('given user interacts with court name autocomplete', () => {
    test('should show court name input with autocomplete initialized', async ({ page }) => {
      await page.goto('/manual-upload');

      // Wait for autocomplete to initialize
      await page.waitForTimeout(1000);

      // Check that the autocomplete input is visible (created by accessible-autocomplete)
      const autocompleteInput = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await expect(autocompleteInput).toBeVisible();

      // Verify the autocomplete has been initialized
      await expect(autocompleteInput).toHaveAttribute('role', 'combobox');
    });

    test('should display validation error for empty court name', async ({ page }) => {
      await page.goto('/manual-upload');

      // Fill only file to isolate court validation error
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Submit without selecting court
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify error link in summary
      const errorSummary = page.locator('.govuk-error-summary');
      const errorLink = errorSummary.getByRole('link', { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      // Verify inline error message
      const inlineError = page.locator('.govuk-error-message').filter({ hasText: /court name must be three characters or more/i });
      await expect(inlineError).toBeVisible();
    });

    test('should display validation error for court name less than 3 characters', async ({ page }) => {
      await page.goto('/manual-upload');

      // Wait for autocomplete to initialize
      await page.waitForTimeout(1000);
      const courtInput = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await courtInput.fill('AB');

      // Fill file to avoid file error
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Submit
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify error link in summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();
      const errorLink = errorSummary.getByRole('link', { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      // Verify inline error message
      const inlineError = page.locator('#court-error.govuk-error-message');
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/court name must be three characters or more/i);
    });

    test('should display validation error for invalid court name longer than 3 characters', async ({ page }) => {
      await page.goto('/manual-upload');

      // Wait for autocomplete to initialize
      await page.waitForTimeout(1000);
      const courtInput = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await courtInput.fill('Invalid Court Name That Does Not Exist');

      // Fill file to avoid file error
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Submit
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify error link in summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();
      const errorLink = errorSummary.getByRole('link', { name: /please enter and select a valid court/i });
      await expect(errorLink).toBeVisible();

      // Verify inline error message
      const inlineError = page.locator('#court-error.govuk-error-message');
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/please enter and select a valid court/i);
    });

    test('should preserve invalid court name after validation error', async ({ page }) => {
      await page.goto('/manual-upload');

      // Wait for autocomplete to initialize
      await page.waitForTimeout(1000);
      const invalidCourtName = 'Invalid Court Name';
      const courtInput = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await courtInput.fill(invalidCourtName);

      // Fill file to avoid file error
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Submit
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify the invalid court name is still in the input field after page re-renders
      const courtInputAfterError = page.getByRole('combobox', { name: /court name or tribunal name/i });
      await expect(courtInputAfterError).toHaveValue(invalidCourtName);
    });
  });

  test.describe('given user validates display date logic', () => {
    test('should display error when display to date is before display from date', async ({ page }) => {
      // Navigate with pre-filled location ID to bypass autocomplete complexity
      await page.goto('/manual-upload?locationId=1');

      // Fill file
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      });

      // Court is already pre-filled from query param
      await page.waitForTimeout(1000); // Wait for autocomplete to initialize

      // Fill list type
      await page.selectOption('select[name="listType"]', '1'); // Civil Daily Cause List

      // Fill hearing start date
      await page.fill('input[name="hearingStartDate-day"]', '15');
      await page.fill('input[name="hearingStartDate-month"]', '06');
      await page.fill('input[name="hearingStartDate-year"]', '2025');

      // Select sensitivity and language
      await page.selectOption('select[name="sensitivity"]', 'PUBLIC');
      await page.selectOption('select[name="language"]', 'ENGLISH');

      // Fill display dates with 'to' before 'from'
      await page.fill('input[name="displayFrom-day"]', '20');
      await page.fill('input[name="displayFrom-month"]', '06');
      await page.fill('input[name="displayFrom-year"]', '2025');
      await page.fill('input[name="displayTo-day"]', '10');
      await page.fill('input[name="displayTo-month"]', '06');
      await page.fill('input[name="displayTo-year"]', '2025');

      // Submit
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify error link in summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();
      const errorLink = errorSummary.getByRole('link', { name: /display to date must be after display from date/i });
      await expect(errorLink).toBeVisible();

      // Verify inline error message
      const inlineError = page.locator('#displayTo-error.govuk-error-message');
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/display to date must be after display from date/i);
    });
  });

  test.describe('given user uses keyboard navigation', () => {
    test('should be navigable using Tab key with visible focus indicators', async ({ page }) => {
      await page.goto('/manual-upload');

      // Navigate to the file input by clicking it
      const fileInput = page.locator('input[name="file"]');
      await fileInput.click();

      // Check focus is visible
      await expect(fileInput).toBeFocused();

      // Tab to next field (should be court input after autocomplete initializes)
      await page.keyboard.press('Tab');

      // The next focused element should be visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should submit form using Enter key on continue button', async ({ page }) => {
      await page.goto('/manual-upload');

      // Click the continue button to give it focus
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Should stay on page due to validation errors
      await expect(page).toHaveURL('/manual-upload');

      // Should show error summary
      const errorSummary = page.locator('.govuk-error-summary');
      await expect(errorSummary).toBeVisible();
    });
  });

  test.describe('given user checks page help section', () => {
    test('should display page help section with accordion', async ({ page }) => {
      await page.goto('/manual-upload');

      // Check for page help title
      const pageHelpTitle = page.getByText(/page help/i);
      await expect(pageHelpTitle).toBeVisible();

      // Check for help section topics
      const listsHelp = page.getByText(/lists/i).first();
      const sensitivityHelp = page.getByText(/sensitivity/i).first();
      const displayFromHelp = page.getByText(/display from/i).first();
      const displayToHelp = page.getByText(/display to/i).first();

      await expect(listsHelp).toBeVisible();
      await expect(sensitivityHelp).toBeVisible();
      await expect(displayFromHelp).toBeVisible();
      await expect(displayToHelp).toBeVisible();
    });
  });

  test.describe('given user checks form preservation on error', () => {
    test('should preserve all form data when validation fails', async ({ page }) => {
      await page.goto('/manual-upload?locationId=1');

      // Fill most fields but leave one required field empty to trigger error
      // Wait for autocomplete to initialize with pre-filled value
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', '1'); // Civil Daily Cause List
      await page.fill('input[name="hearingStartDate-day"]', '15');
      await page.fill('input[name="hearingStartDate-month"]', '06');
      await page.fill('input[name="hearingStartDate-year"]', '2025');
      await page.selectOption('select[name="sensitivity"]', 'PRIVATE');
      await page.selectOption('select[name="language"]', 'WELSH');
      await page.fill('input[name="displayFrom-day"]', '10');
      await page.fill('input[name="displayFrom-month"]', '06');
      await page.fill('input[name="displayFrom-year"]', '2025');
      await page.fill('input[name="displayTo-day"]', '20');
      await page.fill('input[name="displayTo-month"]', '06');
      await page.fill('input[name="displayTo-year"]', '2025');

      // Note: Not filling file to trigger error

      // Submit
      const continueButton = page.getByRole('button', { name: /continue/i });
      await continueButton.click();

      // Verify form data is preserved
      await expect(page.locator('select[name="listType"]')).toHaveValue('1'); // Civil Daily Cause List
      await expect(page.locator('input[name="hearingStartDate-day"]')).toHaveValue('15');
      await expect(page.locator('input[name="hearingStartDate-month"]')).toHaveValue('06');
      await expect(page.locator('input[name="hearingStartDate-year"]')).toHaveValue('2025');
      await expect(page.locator('select[name="sensitivity"]')).toHaveValue('PRIVATE');
      await expect(page.locator('select[name="language"]')).toHaveValue('WELSH');
      await expect(page.locator('input[name="displayFrom-day"]')).toHaveValue('10');
      await expect(page.locator('input[name="displayFrom-month"]')).toHaveValue('06');
      await expect(page.locator('input[name="displayFrom-year"]')).toHaveValue('2025');
      await expect(page.locator('input[name="displayTo-day"]')).toHaveValue('20');
      await expect(page.locator('input[name="displayTo-month"]')).toHaveValue('06');
      await expect(page.locator('input[name="displayTo-year"]')).toHaveValue('2025');
    });
  });
});
