import { describe, expect, it } from "vitest";
import { GET } from "./login.js";

describe("Auth login page handler", () => {
  it("should export GET middleware", () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe("function");
  });
});
