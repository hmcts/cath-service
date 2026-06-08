import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

/**
 * Creates an S3 client for verifying uploads.
 * Uses the same credentials as the application.
 */
function createS3Client(): S3Client {
  const region = process.env.AWS_S3_XHIBIT_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required AWS S3 configuration for functional tests");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

/**
 * Verifies a file exists in S3 by checking its metadata.
 */
async function verifyFileExistsInS3(bucketName: string, s3Key: string): Promise<boolean> {
  const s3Client = createS3Client();

  try {
    const response = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key
      })
    );
    return response.$metadata.httpStatusCode === 200;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * Cleans up a test file from S3 after the test completes.
 */
async function deleteFileFromS3(bucketName: string, s3Key: string): Promise<void> {
  const s3Client = createS3Client();

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key
      })
    );
  } catch (error) {
    console.warn(`Failed to delete test file ${s3Key} from S3:`, error);
  }
}

/**
 * Checks if AWS S3 credentials are available for functional tests.
 */
function hasS3Credentials(): boolean {
  return !!(process.env.AWS_S3_XHIBIT_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_XHIBIT_BUCKET_NAME);
}

test.describe("PDDA HTML S3 Upload - Functional Tests @nightly", () => {
  test.skip(!hasS3Credentials(), "Skipping S3 functional tests - AWS credentials not configured");

  const bucketName = process.env.AWS_S3_XHIBIT_BUCKET_NAME || "";
  const uploadedKeys: string[] = [];

  test.afterAll(async () => {
    // Clean up all uploaded test files
    for (const s3Key of uploadedKeys) {
      await deleteFileFromS3(bucketName, s3Key);
    }
  });

  test("should upload HTML file to S3 and verify it exists @nightly", async ({ request }) => {
    // Arrange
    const authToken = await getApiAuthToken();
    const testHtmlContent = `<!DOCTYPE html>
<html>
<head><title>E2E Test Document</title></head>
<body>
<h1>Test HTML Document</h1>
<p>This is a functional test file created at ${new Date().toISOString()}</p>
</body>
</html>`;

    const testFilename = `e2e-test-${Date.now()}.html`;
    const correlationId = `e2e-test-correlation-${Date.now()}`;

    // Create multipart form data
    const formData = new FormData();
    formData.append("type", "LCSU");
    formData.append("file", new Blob([testHtmlContent], { type: "text/html" }), testFilename);

    // Act - Upload the file via API
    const response = await request.post(ENDPOINT, {
      multipart: {
        type: "LCSU",
        file: {
          name: testFilename,
          mimeType: "text/html",
          buffer: Buffer.from(testHtmlContent)
        }
      },
      headers: {
        Authorization: `Bearer ${authToken}`,
        "x-correlation-id": correlationId
      }
    });

    // Assert - API response
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Upload accepted and stored");
    expect(body.s3_key).toBeTruthy();
    expect(body.correlation_id).toBe(correlationId);

    // Track for cleanup
    uploadedKeys.push(body.s3_key);

    // Assert - Verify file exists in S3
    const fileExists = await verifyFileExistsInS3(bucketName, body.s3_key);
    expect(fileExists).toBe(true);
  });

  test("should upload HTM file to S3 and verify it exists @nightly", async ({ request }) => {
    // Arrange
    const authToken = await getApiAuthToken();
    const testHtmContent = `<!DOCTYPE html>
<html>
<head><title>E2E Test HTM Document</title></head>
<body>
<h1>Test HTM Document</h1>
<p>Testing .htm extension at ${new Date().toISOString()}</p>
</body>
</html>`;

    const testFilename = `e2e-test-${Date.now()}.htm`;

    // Act
    const response = await request.post(ENDPOINT, {
      multipart: {
        type: "LCSU",
        file: {
          name: testFilename,
          mimeType: "text/html",
          buffer: Buffer.from(testHtmContent)
        }
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    // Assert - API response
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.s3_key).toMatch(/\.htm$/);

    // Track for cleanup
    uploadedKeys.push(body.s3_key);

    // Assert - Verify file exists in S3
    const fileExists = await verifyFileExistsInS3(bucketName, body.s3_key);
    expect(fileExists).toBe(true);
  });

  test("should reject non-HTML file upload @nightly", async ({ request }) => {
    // Arrange
    const authToken = await getApiAuthToken();
    const testPdfContent = "%PDF-1.4 fake pdf content";
    const testFilename = `e2e-test-${Date.now()}.pdf`;

    // Act
    const response = await request.post(ENDPOINT, {
      multipart: {
        type: "LCSU",
        file: {
          name: testFilename,
          mimeType: "application/pdf",
          buffer: Buffer.from(testPdfContent)
        }
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("HTM or HTML");
  });

  test("should reject upload with invalid type @nightly", async ({ request }) => {
    // Arrange
    const authToken = await getApiAuthToken();
    const testHtmlContent = "<html><body>Test</body></html>";
    const testFilename = `e2e-test-${Date.now()}.html`;

    // Act
    const response = await request.post(ENDPOINT, {
      multipart: {
        type: "JSON", // Invalid type for HTML upload
        file: {
          name: testFilename,
          mimeType: "text/html",
          buffer: Buffer.from(testHtmlContent)
        }
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("LCSU");
  });

  test("should reject upload without authentication @nightly", async ({ request }) => {
    // Arrange
    const testHtmlContent = "<html><body>Test</body></html>";
    const testFilename = `e2e-test-${Date.now()}.html`;

    // Act - No Authorization header
    const response = await request.post(ENDPOINT, {
      multipart: {
        type: "LCSU",
        file: {
          name: testFilename,
          mimeType: "text/html",
          buffer: Buffer.from(testHtmlContent)
        }
      }
    });

    // Assert
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
