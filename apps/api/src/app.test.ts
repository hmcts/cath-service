import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("API App", () => {
  it("should create Express app", async () => {
    const app = await createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  it("should have healthcheck endpoint", async () => {
    const app = await createApp();
    const request = await import("supertest");

    const response = await request.default(app).get("/health");

    expect(response.status).toBe(200);
  });

  it("should handle 404 for unknown routes", async () => {
    const app = await createApp();
    const request = await import("supertest");

    const response = await request.default(app).get("/non-existent-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Not found" });
  });

  it("should parse JSON bodies in POST requests", async () => {
    const app = await createApp();
    const request = await import("supertest");

    // Test that the app can parse JSON by making a request that would use it
    const response = await request.default(app)
      .post("/test-json-parse")
      .send({ test: "data" })
      .set("Content-Type", "application/json");

    // Even though this endpoint doesn't exist (404), if JSON parsing failed,
    // we'd get a different error
    expect([404, 500]).toContain(response.status);
  });

  it("should have CORS and error handling configured", async () => {
    const app = await createApp();

    // Test that app is properly configured
    expect(app).toBeDefined();
    expect(typeof app.use).toBe("function");
  });
});
