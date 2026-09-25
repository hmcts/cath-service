import { describe, expect, it } from "vitest";
import { validateLocationMetadataInput } from "./location-metadata-validation.js";

describe("validateLocationMetadataInput", () => {
  it("should return valid when cautionMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Test caution message"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when welshCautionMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      welshCautionMessage: "Neges rhybudd prawf"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when noListMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      noListMessage: "No hearings scheduled"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when welshNoListMessage is provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      welshNoListMessage: "Dim gwrandawiadau wedi'u trefnu"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid when multiple messages are provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Test caution",
      welshCautionMessage: "Rhybudd prawf",
      noListMessage: "No hearings",
      welshNoListMessage: "Dim gwrandawiadau"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return invalid when all messages are empty strings", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "",
      welshCautionMessage: "",
      noListMessage: "",
      welshNoListMessage: ""
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when all messages are whitespace only", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "   ",
      welshCautionMessage: "  ",
      noListMessage: "\t",
      welshNoListMessage: "\n"
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when no messages are provided", () => {
    const result = validateLocationMetadataInput({
      locationId: 1
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return invalid when all messages are undefined", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: undefined,
      welshCautionMessage: undefined,
      noListMessage: undefined,
      welshNoListMessage: undefined
    });

    expect(result).toEqual({
      valid: false,
      error: "At least one message required"
    });
  });

  it("should return valid when only one message has content among empty ones", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "",
      welshCautionMessage: "",
      noListMessage: "Valid message",
      welshNoListMessage: ""
    });

    expect(result).toEqual({ valid: true });
  });

  it.each([
    ["cautionMessage", "English caution message"],
    ["welshCautionMessage", "Welsh caution message"],
    ["noListMessage", "English no list message"],
    ["welshNoListMessage", "Welsh no list message"]
  ])("should return invalid when %s contains a tag outside the allowlist", (field, label) => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      [field]: '<img src="x" onerror="alert(1)">'
    });

    expect(result).toEqual({
      valid: false,
      error: `${label} contains HTML tags which cannot be used: img`
    });
  });

  it("should name every disallowed tag in the message", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "<div>Please note <script>alert(1)</script> the court is closed</div>"
    });

    expect(result).toEqual({
      valid: false,
      error: "English caution message contains HTML tags which cannot be used: div, script"
    });
  });

  it("should return invalid when a field other than the first contains a disallowed tag", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Plain text caution",
      welshNoListMessage: "<marquee>Dim rhestr</marquee>"
    });

    expect(result).toEqual({
      valid: false,
      error: "Welsh no list message contains HTML tags which cannot be used: marquee"
    });
  });

  // The formatting legacy CaTH courts already use. Rejecting it would strip the bold text
  // and paragraph breaks that migrated location_metadata rows depend on.
  it.each([
    ["bold", "<strong>Court closed</strong>"],
    ["legacy bold", "<b>Court closed</b>"],
    ["paragraphs", "<p>Closed today</p><p>Reopens Monday</p>"],
    ["line breaks", "Closed today<br />Reopens Monday"],
    ["lists", "<ul><li>Monday</li><li>Tuesday</li></ul>"],
    ["links", '<a href="https://www.gov.uk">Find a court</a>']
  ])("should return valid for %s", (_label, markup) => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: markup
    });

    expect(result).toEqual({ valid: true });
  });

  it("should return valid for plain text containing punctuation", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Hearings start at 10am. Contact the court on 0300 123 4567 (option 2)."
    });

    expect(result).toEqual({ valid: true });
  });

  // A bare "<" followed by a space is not how a browser opens a tag, so admins are not
  // blocked from writing comparisons in prose.
  it("should return valid when a message uses angle brackets as comparison operators", () => {
    const result = validateLocationMetadataInput({
      locationId: 1,
      cautionMessage: "Hearings start at < 10am and finish > 4pm"
    });

    expect(result).toEqual({ valid: true });
  });

  it("should work with UpdateLocationMetadataInput (no locationId)", () => {
    const result = validateLocationMetadataInput({
      cautionMessage: "Updated caution"
    });

    expect(result).toEqual({ valid: true });
  });
});
