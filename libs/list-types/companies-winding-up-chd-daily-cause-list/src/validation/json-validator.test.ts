import { describe, expect, it } from "vitest";
import { validateCompaniesWindingUpChdDailyCauseList } from "./json-validator.js";

const VALID_DATA = [
  {
    judge: "Judge A",
    time: "9am",
    venue: "Venue A",
    type: "Type A",
    caseNumber: "12345",
    caseName: "Case name A",
    additionalInformation: "This is additional information"
  },
  {
    judge: "Judge B",
    time: "10:30pm",
    venue: "Venue B",
    type: "Type B",
    caseNumber: "12346",
    caseName: "Case name B",
    additionalInformation: "This is another additional information"
  }
];

describe("validateCompaniesWindingUpChdDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return valid when optional additionalInformation is omitted", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when judge is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judge;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when type is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].type;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseNumber is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseNumber;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time format is invalid", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data[0].time = "not-a-time";

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when a text field contains HTML tags", () => {
    // Arrange
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data[0].caseName = "<script>alert('xss')</script>";

    // Act
    const result = validateCompaniesWindingUpChdDailyCauseList(data);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
