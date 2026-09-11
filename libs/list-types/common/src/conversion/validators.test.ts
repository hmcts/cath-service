import { describe, expect, it } from "vitest";
import { validateEmailFormat, validateTimeFormat, validateTimeFormatSimple } from "./validators.js";

describe("validateEmailFormat", () => {
  it("should accept a valid email address", () => {
    expect(() => validateEmailFormat("clerk@justice.gov.uk", 1)).not.toThrow();
  });

  it("should reject an address without a domain dot", () => {
    expect(() => validateEmailFormat("clerk@justice", 1)).toThrow(/Invalid email format/);
  });

  it("should reject an address without an @", () => {
    expect(() => validateEmailFormat("clerk.justice.gov.uk", 2)).toThrow(/Invalid email format/);
  });

  it("should reject an address containing spaces", () => {
    expect(() => validateEmailFormat("clerk @justice.gov.uk", 3)).toThrow(/Invalid email format/);
  });

  it("should include the row number in the error", () => {
    expect(() => validateEmailFormat("not-an-email", 7)).toThrow(/row 7/);
  });
});

describe("validateTimeFormat", () => {
  it("should accept a valid 12-hour time", () => {
    expect(() => validateTimeFormat("10:30am", 1)).not.toThrow();
  });

  it("should reject an hour outside 1-12", () => {
    expect(() => validateTimeFormat("14:30pm", 1)).toThrow(/Invalid time format/);
  });
});

describe("validateTimeFormatSimple", () => {
  it("should accept a valid time with a dot separator", () => {
    expect(() => validateTimeFormatSimple("10.30am", 1)).not.toThrow();
  });

  it("should reject 24-hour time", () => {
    expect(() => validateTimeFormatSimple("14:30", 1)).toThrow(/Invalid time format/);
  });
});
