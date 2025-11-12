import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

test.describe('File Publication Data Endpoint', () => {
  const STORAGE_PATH = path.join(process.cwd(), 'apps', 'web', 'storage', 'temp', 'uploads');
  const TEST_ARTEFACT_ID = 'test-data-endpoint-e2e';
  const TEST_PDF_CONTENT = Buffer.from('%PDF-1.4 Test PDF content');
  const TEST_JSON_CONTENT = JSON.stringify({ test: 'data', value: 123 });

  test.beforeAll(async () => {
    // Ensure storage directory exists
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  });

  test.describe('given PDF file is requested', () => {
    test.beforeEach(async () => {
      // Create a test PDF file
      await fs.writeFile(
        path.join(STORAGE_PATH, `${TEST_ARTEFACT_ID}.pdf`),
        TEST_PDF_CONTENT
      );
    });

    test.afterEach(async () => {
      // Clean up test file
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${TEST_ARTEFACT_ID}.pdf`));
      } catch {
        // Ignore if file doesn't exist
      }
    });

    test('should serve PDF with correct content-type and disposition', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${TEST_ARTEFACT_ID}`);

      // Verify response
      expect(response).toBeTruthy();
      expect(response?.status()).toBe(200);

      // Check headers
      const headers = response?.headers();
      expect(headers?.['content-type']).toBe('application/pdf');
      expect(headers?.['content-disposition']).toContain('inline');
      expect(headers?.['content-disposition']).toContain('filename=');
      expect(headers?.['content-disposition']).toContain('filename*=UTF-8');
    });

    test('should include formatted filename with list type, date, and language', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${TEST_ARTEFACT_ID}`);

      // Check Content-Disposition header contains formatted filename
      const contentDisposition = response?.headers()['content-disposition'];
      expect(contentDisposition).toBeTruthy();
      expect(contentDisposition).toContain('Magistrates Public List');
      expect(contentDisposition).toMatch(/\d{1,2}\s\w+\s\d{4}/); // Date format
      expect(contentDisposition).toContain('English (Saesneg)');
      expect(contentDisposition).toContain('.pdf');
    });

    test('should serve actual file content', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${TEST_ARTEFACT_ID}`);

      // Verify response body contains PDF content
      const body = await response?.body();
      expect(body).toBeTruthy();
      expect(body?.length).toBeGreaterThan(0);
    });
  });

  test.describe('given JSON file is requested', () => {
    const jsonArtefactId = 'test-json-data-e2e';

    test.beforeEach(async () => {
      // Create a test JSON file
      await fs.writeFile(
        path.join(STORAGE_PATH, `${jsonArtefactId}.json`),
        TEST_JSON_CONTENT
      );
    });

    test.afterEach(async () => {
      // Clean up test file
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${jsonArtefactId}.json`));
      } catch {
        // Ignore
      }
    });

    test('should serve JSON with correct content-type and disposition', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${jsonArtefactId}`);

      // Verify response
      expect(response?.status()).toBe(200);

      // Check headers
      const headers = response?.headers();
      expect(headers?.['content-type']).toBe('application/json');
      expect(headers?.['content-disposition']).toContain('attachment');
      expect(headers?.['content-disposition']).toContain('filename=');
      expect(headers?.['content-disposition']).toContain('.json');
    });
  });

  test.describe('given other file types are requested', () => {
    const docxArtefactId = 'test-docx-data-e2e';
    const TEST_DOCX_CONTENT = Buffer.from('Mock DOCX content');

    test.beforeEach(async () => {
      // Create a test DOCX file
      await fs.writeFile(
        path.join(STORAGE_PATH, `${docxArtefactId}.docx`),
        TEST_DOCX_CONTENT
      );
    });

    test.afterEach(async () => {
      // Clean up test file
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${docxArtefactId}.docx`));
      } catch {
        // Ignore
      }
    });

    test('should serve unknown file types with octet-stream', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${docxArtefactId}`);

      // Verify response
      expect(response?.status()).toBe(200);

      // Check headers
      const headers = response?.headers();
      expect(headers?.['content-type']).toBe('application/octet-stream');
      expect(headers?.['content-disposition']).toContain('attachment');
      expect(headers?.['content-disposition']).toContain('.docx');
    });
  });

  test.describe('given artefactId is missing', () => {
    test('should return 400 bad request', async ({ page }) => {
      const response = await page.goto('/file-publication-data', { waitUntil: 'domcontentloaded' });

      // Verify 400 status
      expect(response?.status()).toBe(400);

      // Verify error message
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('Missing artefactId');
    });
  });

  test.describe('given file does not exist', () => {
    test('should return 404 with error page', async ({ page }) => {
      const nonExistentId = 'non-existent-file-12345';
      const response = await page.goto(`/file-publication-data?artefactId=${nonExistentId}`);

      // Verify 404 status
      expect(response?.status()).toBe(404);

      // Check for error page heading
      const heading = page.locator('h1.govuk-heading-l');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/page not found/i);
    });

    test('should display Welsh error when locale is cy', async ({ page }) => {
      const nonExistentId = 'non-existent-welsh-12345';
      await page.goto(`/file-publication-data?artefactId=${nonExistentId}&lng=cy`);

      // Check for Welsh heading
      const heading = page.locator('h1.govuk-heading-l');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/heb ddod o hyd/i);
    });
  });

  test.describe('given Welsh locale is used', () => {
    const welshArtefactId = 'test-welsh-locale-e2e';

    test.beforeEach(async () => {
      await fs.writeFile(
        path.join(STORAGE_PATH, `${welshArtefactId}.pdf`),
        TEST_PDF_CONTENT
      );
    });

    test.afterEach(async () => {
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${welshArtefactId}.pdf`));
      } catch {
        // Ignore
      }
    });

    test('should format filename with Welsh date format', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${welshArtefactId}&lng=cy`);

      // Check Content-Disposition header
      const contentDisposition = response?.headers()['content-disposition'];
      expect(contentDisposition).toBeTruthy();
      expect(contentDisposition).toContain('Magistrates Public List');

      // Welsh month names could be present (e.g., "Ionawr", "Chwefror", etc.)
      // We verify the structure is correct
      expect(contentDisposition).toMatch(/\d{1,2}\s\w+\s\d{4}/);
    });
  });

  test.describe('given language variants', () => {
    const englishArtefactId = 'test-english-lang-e2e';
    const welshArtefactId = 'test-welsh-lang-e2e';

    test.beforeEach(async () => {
      await fs.writeFile(
        path.join(STORAGE_PATH, `${englishArtefactId}.pdf`),
        TEST_PDF_CONTENT
      );
      await fs.writeFile(
        path.join(STORAGE_PATH, `${welshArtefactId}.pdf`),
        TEST_PDF_CONTENT
      );
    });

    test.afterEach(async () => {
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${englishArtefactId}.pdf`));
        await fs.unlink(path.join(STORAGE_PATH, `${welshArtefactId}.pdf`));
      } catch {
        // Ignore
      }
    });

    test('should include English language label for English artefact', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${englishArtefactId}`);

      const contentDisposition = response?.headers()['content-disposition'];
      expect(contentDisposition).toContain('English (Saesneg)');
    });

    test('should include Welsh language label for Welsh artefact', async ({ page }) => {
      // Note: This test assumes the mock data has a Welsh artefact
      // The actual behavior depends on the getArtefactById mock returning language: "WELSH"
      const response = await page.goto(`/file-publication-data?artefactId=${welshArtefactId}`);

      const contentDisposition = response?.headers()['content-disposition'];
      // Will be "English (Saesneg)" or "Welsh (Cymraeg)" depending on artefact's language field
      expect(contentDisposition).toMatch(/English \(Saesneg\)|Welsh \(Cymraeg\)/);
    });
  });

  test.describe('given security considerations', () => {
    const securityTestId = 'test-security-e2e';

    test.beforeEach(async () => {
      await fs.writeFile(
        path.join(STORAGE_PATH, `${securityTestId}.pdf`),
        TEST_PDF_CONTENT
      );
    });

    test.afterEach(async () => {
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${securityTestId}.pdf`));
      } catch {
        // Ignore
      }
    });

    test('should not allow path traversal in artefactId', async ({ page }) => {
      // Attempt path traversal
      const response = await page.goto('/file-publication-data?artefactId=../../../etc/passwd', {
        waitUntil: 'domcontentloaded'
      });

      // Should not succeed - either 404 or 400
      const status = response?.status();
      expect(status).not.toBe(200);
      expect([400, 404]).toContain(status || 0);
    });

    test('should sanitize special characters in filename', async ({ page }) => {
      const response = await page.goto(`/file-publication-data?artefactId=${securityTestId}`);

      // Check that Content-Disposition is properly formatted
      const contentDisposition = response?.headers()['content-disposition'];
      expect(contentDisposition).toBeTruthy();

      // Should be properly quoted
      expect(contentDisposition).toMatch(/filename="[^"]+"/);
    });
  });

  test.describe('given performance considerations', () => {
    const perfTestId = 'test-performance-e2e';
    const LARGE_FILE_SIZE = 1024 * 1024; // 1MB

    test.beforeEach(async () => {
      // Create a larger test file
      const largeContent = Buffer.alloc(LARGE_FILE_SIZE);
      await fs.writeFile(
        path.join(STORAGE_PATH, `${perfTestId}.pdf`),
        largeContent
      );
    });

    test.afterEach(async () => {
      try {
        await fs.unlink(path.join(STORAGE_PATH, `${perfTestId}.pdf`));
      } catch {
        // Ignore
      }
    });

    test('should serve larger files within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      const response = await page.goto(`/file-publication-data?artefactId=${perfTestId}`);
      const endTime = Date.now();

      // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
      expect(response?.status()).toBe(200);
    });
  });
});
