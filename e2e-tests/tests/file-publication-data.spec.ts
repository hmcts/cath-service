import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '@hmcts/postgres';

test.describe('File Publication Data Endpoint', () => {
  // App runs from repo root, not apps/web
  const STORAGE_PATH = path.join(process.cwd(), '..', 'storage', 'temp', 'uploads');
  let TEST_ARTEFACT_ID: string; // Will be set by Prisma UUID generation
  const TEST_PDF_CONTENT = Buffer.from('%PDF-1.4 Test PDF content');
  const TEST_JSON_CONTENT = JSON.stringify({ test: 'data', value: 123 });

  test.beforeAll(async () => {
    // Ensure storage directory exists
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  });

  test.afterAll(async () => {
    // Disconnect from Prisma
    await prisma.$disconnect();
  });

  test.describe('given PDF file is requested', () => {
    // Run tests serially to avoid database conflicts with shared TEST_ARTEFACT_ID
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

      // Create a test PDF file with the generated UUID
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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: TEST_ARTEFACT_ID }
        });
      } catch {
        // Ignore if record doesn't exist
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
    let jsonArtefactId: string;
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (jsonArtefactId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${jsonArtefactId}.json`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: jsonArtefactId }
          });
        } catch {
          // Ignore
        }
      }

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
      jsonArtefactId = artefact.artefactId;

      // Create a test JSON file with the generated UUID
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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: jsonArtefactId }
        });
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
    let docxArtefactId: string;
    const TEST_DOCX_CONTENT = Buffer.from('Mock DOCX content');
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (docxArtefactId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${docxArtefactId}.docx`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: docxArtefactId }
          });
        } catch {
          // Ignore
        }
      }

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
      docxArtefactId = artefact.artefactId;

      // Create a test DOCX file with the generated UUID
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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: docxArtefactId }
        });
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
    let welshArtefactId: string;
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (welshArtefactId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${welshArtefactId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: welshArtefactId }
          });
        } catch {
          // Ignore
        }
      }

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
      welshArtefactId = artefact.artefactId;

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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: welshArtefactId }
        });
      } catch {
        // Ignore
      }
    });

    test('should format filename with Welsh date format', async ({ page }) => {
      // Use request API instead of page.goto to avoid download dialog
      const response = await page.request.get(`/file-publication-data?artefactId=${welshArtefactId}&lng=cy`);

      // Check Content-Disposition header
      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toBeTruthy();
      expect(contentDisposition).toContain('Civil Daily Cause List');

      // Welsh month names could be present (e.g., "Ionawr", "Chwefror", etc.)
      // We verify the structure is correct
      expect(contentDisposition).toMatch(/\d{1,2}\s\w+\s\d{4}/);
    });
  });

  test.describe('given language variants', () => {
    let englishArtefactId: string;
    let welshArtefactId: string;
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (englishArtefactId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${englishArtefactId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: englishArtefactId }
          });
        } catch {
          // Ignore
        }
      }
      if (welshArtefactId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${welshArtefactId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: welshArtefactId }
          });
        } catch {
          // Ignore
        }
      }

      // Create artefact records in database (Prisma will generate UUIDs)
      const englishArtefact = await prisma.artefact.create({
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
      englishArtefactId = englishArtefact.artefactId;

      const welshArtefact = await prisma.artefact.create({
        data: {
          locationId: '1',
          listTypeId: 1,
          contentDate: new Date('2025-01-15'),
          sensitivity: 'PUBLIC',
          language: 'WELSH',
          displayFrom: new Date('2025-01-01'),
          displayTo: new Date('2025-12-31')
        }
      });
      welshArtefactId = welshArtefact.artefactId;

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

      // Clean up database records
      try {
        await prisma.artefact.delete({
          where: { artefactId: englishArtefactId }
        });
        await prisma.artefact.delete({
          where: { artefactId: welshArtefactId }
        });
      } catch {
        // Ignore
      }
    });

    test('should include English language label for English artefact', async ({ page }) => {
      // Use request API instead of page.goto to avoid download dialog
      const response = await page.request.get(`/file-publication-data?artefactId=${englishArtefactId}`);

      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('English (Saesneg)');
    });

    test('should include Welsh language label for Welsh artefact', async ({ page }) => {
      // Use request API instead of page.goto to avoid download dialog
      const response = await page.request.get(`/file-publication-data?artefactId=${welshArtefactId}`);

      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('Welsh (Cymraeg)');
    });
  });

  test.describe('given security considerations', () => {
    let securityTestId: string;
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (securityTestId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${securityTestId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: securityTestId }
          });
        } catch {
          // Ignore
        }
      }

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
      securityTestId = artefact.artefactId;

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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: securityTestId }
        });
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
      // Use request API instead of page.goto to avoid download dialog
      const response = await page.request.get(`/file-publication-data?artefactId=${securityTestId}`);

      // Check that Content-Disposition is properly formatted
      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toBeTruthy();

      // Should be properly quoted
      expect(contentDisposition).toMatch(/filename="[^"]+"/);

      expect(response.status()).toBe(200);
    });
  });

  test.describe('given performance considerations', () => {
    let perfTestId: string;
    const LARGE_FILE_SIZE = 1024 * 1024; // 1MB
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      // Clean up any existing test data first
      if (perfTestId) {
        try {
          await fs.unlink(path.join(STORAGE_PATH, `${perfTestId}.pdf`));
        } catch {
          // Ignore
        }
        try {
          await prisma.artefact.delete({
            where: { artefactId: perfTestId }
          });
        } catch {
          // Ignore
        }
      }

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
      perfTestId = artefact.artefactId;

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

      // Clean up database record
      try {
        await prisma.artefact.delete({
          where: { artefactId: perfTestId }
        });
      } catch {
        // Ignore
      }
    });

    test('should serve larger files within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      // Use request API instead of page.goto to avoid download dialog
      const response = await page.request.get(`/file-publication-data?artefactId=${perfTestId}`);
      const endTime = Date.now();

      // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
      expect(response.status()).toBe(200);

      // Verify it's a PDF
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/pdf');
    });
  });
});
