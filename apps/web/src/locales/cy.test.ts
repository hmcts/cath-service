import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";

describe("Web Welsh Locale", () => {
  it("should export cy object", () => {
    expect(cy).toBeDefined();
    expect(typeof cy).toBe("object");
  });

  it("should have serviceName property with Welsh translation", () => {
    expect(cy.serviceName).toBeDefined();
    expect(typeof cy.serviceName).toBe("string");
    expect(cy.serviceName).toBe("Gwrandawiadau llys a thribiwnlys");
  });

  it("should have back property with Welsh translation", () => {
    expect(cy.back).toBeDefined();
    expect(typeof cy.back).toBe("string");
    expect(cy.back).toBe("Yn ôl");
  });

  it("should have all required properties", () => {
    expect(cy).toHaveProperty("serviceName");
    expect(cy).toHaveProperty("back");
  });

  it("should have same structure as English locale", () => {
    const requiredKeys = ["serviceName", "back"];
    for (const key of requiredKeys) {
      expect(cy).toHaveProperty(key);
    }
  });
});
