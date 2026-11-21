import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import type { ReportApplication } from "./queries.js";
import { buildMediaApplicationReportCsv } from "./report-csv.js";

function buildApplication(overrides: Partial<ReportApplication> = {}): ReportApplication {
  return {
    id: "id-1",
    name: "Jane Smith",
    email: "jane@example.com",
    employer: "BBC",
    status: "APPROVED",
    appliedDate: new Date("2026-01-15T09:05:07Z"),
    ...overrides
  };
}

function parseRows(csv: string): string[][] {
  return Papa.parse<string[]>(csv).data;
}

describe("buildMediaApplicationReportCsv", () => {
  it("should write the header row in the expected order", () => {
    // Act
    const csv = buildMediaApplicationReportCsv([buildApplication()]);

    // Assert
    expect(parseRows(csv)[0]).toEqual(["Full name", "Email", "Employer", "Request date", "Status"]);
  });

  it("should map each application to a row with a GMT formatted request date", () => {
    // Arrange
    const applications = [
      buildApplication(),
      buildApplication({ id: "id-2", name: "John Doe", email: "john@example.com", employer: "ITV", status: "REJECTED" })
    ];

    // Act
    const rows = parseRows(buildMediaApplicationReportCsv(applications));

    // Assert
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual(["Jane Smith", "jane@example.com", "BBC", "15-01-2026 09:05:07", "APPROVED"]);
    expect(rows[2]).toEqual(["John Doe", "john@example.com", "ITV", "15-01-2026 09:05:07", "REJECTED"]);
  });

  it("should format the request date in Europe/London time during BST", () => {
    // Arrange
    const application = buildApplication({ appliedDate: new Date("2026-07-01T23:30:00Z") });

    // Act
    const rows = parseRows(buildMediaApplicationReportCsv([application]));

    // Assert
    expect(rows[1][3]).toBe("02-07-2026 00:30:00");
  });

  it("should quote values containing commas, quotes and newlines", () => {
    // Arrange
    const application = buildApplication({ name: 'Smith, "Jane"', employer: "Line one\nLine two" });

    // Act
    const csv = buildMediaApplicationReportCsv([application]);

    // Assert
    expect(csv).toContain('"Smith, ""Jane"""');
    expect(parseRows(csv)[1].slice(0, 3)).toEqual(['Smith, "Jane"', "jane@example.com", "Line one\nLine two"]);
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\t=1", '=HYPERLINK("http://example.com")\nfoo'])("should escape formula value %s", (value) => {
    // Arrange
    const application = buildApplication({ employer: value });

    // Act
    const rows = parseRows(buildMediaApplicationReportCsv([application]));

    // Assert
    expect(rows[1][2]).toBe(`'${value}`);
  });

  it("should return only the header row when there are no applications", () => {
    // Act
    const csv = buildMediaApplicationReportCsv([]);

    // Assert
    expect(csv.trim()).toBe("Full name,Email,Employer,Request date,Status");
  });
});
