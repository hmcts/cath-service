import { describe, expect, it } from "vitest";
import * as systemAdmin from "./index.js";

describe("System Admin Module Exports", () => {
  it("should export requireSystemAdmin function", () => {
    expect(systemAdmin).toHaveProperty("requireSystemAdmin");
    expect(typeof systemAdmin.requireSystemAdmin).toBe("function");
  });

  it("should export a function that returns middleware", () => {
    const middleware = systemAdmin.requireSystemAdmin();
    expect(typeof middleware).toBe("function");
    expect(middleware.length).toBe(3); // Express middleware signature (req, res, next)
  });
});
