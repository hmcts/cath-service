import { describe, expect, it } from "vitest";
import { buildImportantInformationText } from "./important-information-text.js";

describe("buildImportantInformationText", () => {
  it("should substitute the {email} placeholder with the supplied email address", () => {
    // Arrange
    const template = "Contact the tribunal at {email} for more information.";

    // Act
    const result = buildImportantInformationText(template, "marketrents@justice.gov.uk");

    // Assert
    expect(result).toBe("Contact the tribunal at marketrents@justice.gov.uk for more information.");
  });

  it("should leave the template unchanged when there is no {email} placeholder", () => {
    // Arrange
    const template = "No placeholder here.";

    // Act
    const result = buildImportantInformationText(template, "marketrents@justice.gov.uk");

    // Assert
    expect(result).toBe("No placeholder here.");
  });

  it("should only replace the first occurrence when the placeholder appears multiple times", () => {
    // Arrange
    const template = "{email} and {email} again.";

    // Act
    const result = buildImportantInformationText(template, "test@justice.gov.uk");

    // Assert
    expect(result).toBe("test@justice.gov.uk and {email} again.");
  });
});
