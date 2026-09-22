import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/publication`;

// LCSU validates the full x-* header set exactly like a publication, but persists nothing.
const REQUIRED_HEADERS = {
  "x-provenance": "PDDA",
  "x-court-id": "1",
  "x-content-date": "2024-01-15",
  "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  "x-language": "ENGLISH",
  "x-type": "LCSU"
};

// The response no longer carries the S3 key (the spec returns an Artefact), so the key is
// derived here the same way the upload service builds it.
const S3_PREFIX = process.env.AWS_S3_XHIBIT_PREFIX || "pdda-html/";

function createS3Client(): S3Client {
  const region = process.env.AWS_S3_XHIBIT_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required AWS S3 configuration for functional tests");
  }

  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

async function verifyFileExistsInS3(bucketName: string, s3Key: string): Promise<boolean> {
  const s3Client = createS3Client();

  try {
    const response = await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: s3Key }));
    return response.$metadata.httpStatusCode === 200;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

async function deleteFileFromS3(bucketName: string, s3Key: string): Promise<void> {
  const s3Client = createS3Client();

  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: s3Key }));
  } catch (error) {
    console.warn(`Failed to delete test file ${s3Key} from S3:`, error);
  }
}

function hasS3Credentials(): boolean {
  return !!(process.env.AWS_S3_XHIBIT_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_XHIBIT_BUCKET_NAME);
}

function htmlPart(name: string) {
  return {
    name,
    mimeType: "text/html",
    buffer: Buffer.from(`<!DOCTYPE html><html><head><title>E2E</title></head><body><h1>${name}</h1></body></html>`)
  };
}

test.describe("POST /publication with x-type LCSU - S3 upload @nightly", () => {
  test.skip(!hasS3Credentials(), "Skipping S3 functional tests - AWS credentials not configured");

  const bucketName = process.env.AWS_S3_XHIBIT_BUCKET_NAME || "";
  const uploadedKeys: string[] = [];

  test.afterAll(async () => {
    for (const s3Key of uploadedKeys) {
      await deleteFileFromS3(bucketName, s3Key);
    }
  });

  test("uploads HTML and HTM files to S3 and returns an unpersisted Artefact @nightly", async ({ request }) => {
    const authToken = await getApiAuthToken();
    const auth = { Authorization: `Bearer ${authToken}` };

    // STEP 1: An .html upload reaches S3 and returns 201 with a blank artefactId
    const htmlFilename = `e2e-test-${Date.now()}.html`;
    const correlationId = `e2e-test-correlation-${Date.now()}`;

    let response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(htmlFilename) },
      headers: { ...REQUIRED_HEADERS, ...auth, "x-correlation-id": correlationId }
    });

    expect(response.status()).toBe(201);
    let body = await response.json();
    // Nothing is persisted for LCSU, so the artefact id is blank and there is no payload or
    // search. isFlatFile is still true — the incumbent sets it even though the file goes to S3.
    expect(body.artefactId).toBe("");
    expect(body.type).toBe("LCSU");
    expect(body.courtId).toBe("1");
    expect(body.provenance).toBe("PDDA");
    expect(body.listType).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(body.sensitivity).toBe("PUBLIC");
    expect(body.isFlatFile).toBe(true);
    expect(body).not.toHaveProperty("payload");
    expect(body).not.toHaveProperty("search");
    expect(body).not.toHaveProperty("s3_key");

    const htmlKey = `${S3_PREFIX}${htmlFilename}`;
    uploadedKeys.push(htmlKey);
    expect(await verifyFileExistsInS3(bucketName, htmlKey)).toBe(true);

    // STEP 2: An .htm upload is accepted too
    const htmFilename = `e2e-test-${Date.now()}.htm`;

    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(htmFilename) },
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.artefactId).toBe("");

    const htmKey = `${S3_PREFIX}${htmFilename}`;
    uploadedKeys.push(htmKey);
    expect(await verifyFileExistsInS3(bucketName, htmKey)).toBe(true);

    // STEP 3: The incumbent's own functional test omits x-list-type on LCSU uploads, so a
    // request without it must still be accepted and reach S3.
    const noListTypeFilename = `e2e-test-no-list-type-${Date.now()}.html`;
    const { "x-list-type": _omittedListType, ...withoutListType } = REQUIRED_HEADERS;

    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(noListTypeFilename) },
      headers: { ...withoutListType, ...auth }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.artefactId).toBe("");
    expect(body.type).toBe("LCSU");
    expect(body.listType).toBeNull();

    const noListTypeKey = `${S3_PREFIX}${noListTypeFilename}`;
    uploadedKeys.push(noListTypeKey);
    expect(await verifyFileExistsInS3(bucketName, noListTypeKey)).toBe(true);
  });

  test("rejects LCSU requests before anything reaches S3 @nightly", async ({ request }) => {
    const authToken = await getApiAuthToken();
    const auth = { Authorization: `Bearer ${authToken}` };

    // STEP 1: A non-HTML file is rejected with the incumbent's format message
    const pdfFilename = `e2e-test-${Date.now()}.pdf`;

    let response = await request.post(ENDPOINT, {
      multipart: { file: { name: pdfFilename, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fake pdf content") } },
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect(response.status()).toBe(400);
    let body = await response.json();
    expect(body.message).toBe("File format is not supported for LCSU.");
    expect(body.timestamp).toBeTruthy();
    expect(await verifyFileExistsInS3(bucketName, `${S3_PREFIX}${pdfFilename}`)).toBe(false);

    // STEP 2: LCSU validates its headers like any other publication — a missing header is
    // rejected before the file is even inspected
    const missingHeaderFilename = `e2e-test-missing-header-${Date.now()}.html`;
    const { "x-court-id": _omitted, ...withoutCourtId } = REQUIRED_HEADERS;

    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(missingHeaderFilename) },
      headers: { ...withoutCourtId, ...auth }
    });

    expect(response.status()).toBe(400);
    body = await response.json();
    expect(body.message).toContain("x-court-id is required");
    expect(await verifyFileExistsInS3(bucketName, `${S3_PREFIX}${missingHeaderFilename}`)).toBe(false);

    // STEP 3: An unrecognised x-type is rejected rather than treated as LIST or LCSU
    const badTypeFilename = `e2e-test-bad-type-${Date.now()}.html`;

    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(badTypeFilename) },
      headers: { ...REQUIRED_HEADERS, ...auth, "x-type": "JSON" }
    });

    expect(response.status()).toBe(400);
    body = await response.json();
    expect(body.message).toBe("x-type must be one of LIST, LCSU");
    expect(await verifyFileExistsInS3(bucketName, `${S3_PREFIX}${badTypeFilename}`)).toBe(false);

    // STEP 4: x-type LIST with an HTML file is a flat-file publication and never reaches S3
    const listTypeFilename = `e2e-test-list-${Date.now()}.html`;

    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(listTypeFilename) },
      headers: { ...REQUIRED_HEADERS, ...auth, "x-type": "LIST" }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.isFlatFile).toBe(true);
    expect(body.artefactId).toBeTruthy();
    expect(await verifyFileExistsInS3(bucketName, `${S3_PREFIX}${listTypeFilename}`)).toBe(false);

    // STEP 5: An unauthenticated request is rejected
    response = await request.post(ENDPOINT, {
      multipart: { file: htmlPart(`e2e-test-noauth-${Date.now()}.html`) },
      headers: REQUIRED_HEADERS
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);
  });
});
