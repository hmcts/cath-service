import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createS3Client } from "./s3-client.js";

describe("createS3Client", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      AWS_S3_XHIBIT_REGION: "eu-west-2",
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_SECRET_ACCESS_KEY: "test-secret-key"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create S3 client with valid configuration", () => {
    const client = createS3Client();

    expect(client).toBeDefined();
    expect(client.config.region).toBeDefined();
  });

  it("should throw error when AWS_S3_XHIBIT_REGION is missing", () => {
    delete process.env.AWS_S3_XHIBIT_REGION;

    expect(() => createS3Client()).toThrow("Missing required AWS S3 configuration");
  });

  it("should throw error when AWS_ACCESS_KEY_ID is missing", () => {
    delete process.env.AWS_ACCESS_KEY_ID;

    expect(() => createS3Client()).toThrow("Missing required AWS S3 configuration");
  });

  it("should throw error when AWS_SECRET_ACCESS_KEY is missing", () => {
    delete process.env.AWS_SECRET_ACCESS_KEY;

    expect(() => createS3Client()).toThrow("Missing required AWS S3 configuration");
  });

  it("should throw error when all AWS configuration is missing", () => {
    delete process.env.AWS_S3_XHIBIT_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    expect(() => createS3Client()).toThrow("Missing required AWS S3 configuration");
  });
});
