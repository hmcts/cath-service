import { describe, expect, it } from "vitest";
import { en } from "./en.js";

describe("Web English Locale", () => {
  it("should export en object", () => {
    expect(en).toBeDefined();
    expect(typeof en).toBe("object");
  });

  it("should have serviceName property", () => {
    expect(en.serviceName).toBeDefined();
    expect(typeof en.serviceName).toBe("string");
    expect(en.serviceName).toBe("Court and tribunal hearings");
  });

  it("should have back property", () => {
    expect(en.back).toBeDefined();
    expect(typeof en.back).toBe("string");
    expect(en.back).toBe("Back");
  });

  it("should have all required properties", () => {
    expect(en).toHaveProperty("serviceName");
    expect(en).toHaveProperty("back");
  });
});
