import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

describe("et-fortnightly-list locales", () => {
  it("should have the same keys in en and cy", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });

  it("should define cautionNote and cautionReporting in both locales", () => {
    expect(en.cautionNote).toBeTruthy();
    expect(en.cautionReporting).toBeTruthy();
    expect(cy.cautionNote).toBeTruthy();
    expect(cy.cautionReporting).toBeTruthy();
  });
});
