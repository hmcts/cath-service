import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadHtmlToS3 } from "./s3-upload-service.js";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn()
  })),
  PutObjectCommand: vi.fn()
}));

vi.mock("./s3-client.js", () => ({
  createS3Client: vi.fn(() => ({
    send: vi.fn()
  }))
}));

describe("uploadHtmlToS3", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockS3Send: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      AWS_S3_XHIBIT_BUCKET_NAME: "test-bucket",
      AWS_S3_XHIBIT_PREFIX: "test-prefix/",
      AWS_S3_XHIBIT_REGION: "eu-west-2",
      AWS_ACCESS_KEY_ID: "test-key",
      AWS_SECRET_ACCESS_KEY: "test-secret"
    };

    mockS3Send = vi.fn().mockResolvedValue({});
    const { createS3Client } = await import("./s3-client.js");
    vi.mocked(createS3Client).mockReturnValue({
      send: mockS3Send
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should upload file to S3 successfully", async () => {
    const fileBuffer = Buffer.from("<html><body>Test</body></html>");
    const originalFilename = "test.html";
    const correlationId = "test-correlation-id";

    const result = await uploadHtmlToS3(fileBuffer, originalFilename, correlationId);

    expect(result.success).toBe(true);
    expect(result.bucketName).toBe("test-bucket");
    expect(result.s3Key).toMatch(/^test-prefix\/\d{4}\/\d{2}\/\d{2}\/.+\.html$/);
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it("should generate S3 key with date-based path and UUID", async () => {
    const fileBuffer = Buffer.from("<html></html>");
    const originalFilename = "test.htm";

    const result = await uploadHtmlToS3(fileBuffer, originalFilename);

    const keyPattern = /^test-prefix\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.htm$/;
    expect(result.s3Key).toMatch(keyPattern);
  });

  it("should use default prefix when AWS_S3_XHIBIT_PREFIX is not set", async () => {
    delete process.env.AWS_S3_XHIBIT_PREFIX;

    const fileBuffer = Buffer.from("<html></html>");
    const result = await uploadHtmlToS3(fileBuffer, "test.html");

    expect(result.s3Key).toMatch(/^pdda-html\//);
  });

  it("should throw error when bucket name is not configured", async () => {
    delete process.env.AWS_S3_XHIBIT_BUCKET_NAME;

    const fileBuffer = Buffer.from("<html></html>");

    await expect(uploadHtmlToS3(fileBuffer, "test.html")).rejects.toThrow("AWS S3 bucket name not configured");
  });

  it("should throw descriptive error when S3 upload fails", async () => {
    mockS3Send.mockRejectedValueOnce(new Error("Network error"));

    const fileBuffer = Buffer.from("<html></html>");

    await expect(uploadHtmlToS3(fileBuffer, "test.html")).rejects.toThrow("The file could not be uploaded to storage. Try again.");
  });

  it("should handle HTML file extension correctly", async () => {
    const fileBuffer = Buffer.from("<html></html>");
    const result = await uploadHtmlToS3(fileBuffer, "document.HTML");

    expect(result.s3Key).toMatch(/\.html$/);
  });

  it("should handle HTM file extension correctly", async () => {
    const fileBuffer = Buffer.from("<html></html>");
    const result = await uploadHtmlToS3(fileBuffer, "document.HTM");

    expect(result.s3Key).toMatch(/\.htm$/);
  });
});
