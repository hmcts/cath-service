import { describe, expect, it } from "vitest";
import { buildImportantInformationText } from "./important-information-text.js";

describe("buildImportantInformationText", () => {
  it("should substitute the {email} placeholder with the supplied email address", () => {
    const template = "Contact the tribunal at {email} for more information.";
    const result = buildImportantInformationText(template, "marketrents@justice.gov.uk");

    expect(result).toBe("Contact the tribunal at marketrents@justice.gov.uk for more information.");
  });

  it("should leave the template unchanged when there is no {email} placeholder", () => {
    const template = "No placeholder here.";
    const result = buildImportantInformationText(template, "marketrents@justice.gov.uk");

    expect(result).toBe("No placeholder here.");
  });

  it("should only replace the first occurrence when the placeholder appears multiple times", () => {
    const template = "{email} and {email} again.";
    const result = buildImportantInformationText(template, "test@justice.gov.uk");

    expect(result).toBe("test@justice.gov.uk and {email} again.");
  });
});
