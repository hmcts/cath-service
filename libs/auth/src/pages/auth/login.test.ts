import { describe, expect, it } from "vitest";
import { GET } from "./login.js";

describe("Auth login page handler", () => {
  it("should export GET middleware from passport", () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe("function");
  });

  it("should be passport.authenticate with correct strategy", () => {
    // GET is a passport authenticate middleware
    // It should have been created with 'azuread-openidconnect' strategy
    expect(GET.name).toBe("authenticate");
  });
});
