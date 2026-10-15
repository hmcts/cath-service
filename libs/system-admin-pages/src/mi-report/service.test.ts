import { generateMiReportExcel } from "@hmcts/excel-generation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCourtNameResolver } from "./court-name-resolver.js";
import { buildAllSubscriptionsSheet, buildLocationSubscriptionsSheet, buildPublicationsSheet, buildUserAccountsSheet } from "./queries.js";
import { buildMiReport } from "./service.js";

vi.mock("@hmcts/excel-generation", () => ({ generateMiReportExcel: vi.fn() }));

vi.mock("./court-name-resolver.js", () => ({ buildCourtNameResolver: vi.fn() }));

vi.mock("./queries.js", () => ({
  buildUserAccountsSheet: vi.fn(),
  buildPublicationsSheet: vi.fn(),
  buildLocationSubscriptionsSheet: vi.fn(),
  buildAllSubscriptionsSheet: vi.fn()
}));

describe("buildMiReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildUserAccountsSheet).mockResolvedValue({ name: "User Accounts", headers: [], rows: [] });
    vi.mocked(buildPublicationsSheet).mockResolvedValue({ name: "Publications", headers: [], rows: [] });
    vi.mocked(buildLocationSubscriptionsSheet).mockResolvedValue({ name: "Location Subscriptions", headers: [], rows: [] });
    vi.mocked(buildAllSubscriptionsSheet).mockResolvedValue({ name: "All Subscriptions", headers: [], rows: [] });
    vi.mocked(buildCourtNameResolver).mockResolvedValue(() => "Court");
    vi.mocked(generateMiReportExcel).mockResolvedValue(Buffer.from("xlsx"));
  });

  it("should build a single-sheet report for an individual report type", async () => {
    // Act
    const result = await buildMiReport("user-accounts", "7");

    // Assert
    expect(generateMiReportExcel).toHaveBeenCalledWith([{ name: "User Accounts", headers: [], rows: [] }]);
    expect(buildPublicationsSheet).not.toHaveBeenCalled();
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("should build a four-sheet workbook for all-data", async () => {
    // Act
    await buildMiReport("all-data", "30");

    // Assert
    const sheets = vi.mocked(generateMiReportExcel).mock.calls[0][0];
    expect(sheets.map((s) => s.name)).toEqual(["User Accounts", "Publications", "Location Subscriptions", "All Subscriptions"]);
  });

  it("should build the court-name resolver once and share it across the all-data sheets", async () => {
    // Act
    await buildMiReport("all-data", "30");

    // Assert
    expect(buildCourtNameResolver).toHaveBeenCalledTimes(1);
    const sharedResolver = await vi.mocked(buildCourtNameResolver).mock.results[0].value;
    expect(vi.mocked(buildPublicationsSheet).mock.calls[0][1]).toBe(sharedResolver);
    expect(vi.mocked(buildLocationSubscriptionsSheet).mock.calls[0][1]).toBe(sharedResolver);
    expect(vi.mocked(buildAllSubscriptionsSheet).mock.calls[0][1]).toBe(sharedResolver);
  });

  it("should not build a court-name resolver for a single report type", async () => {
    // Act
    await buildMiReport("user-accounts", "7");

    // Assert
    expect(buildCourtNameResolver).not.toHaveBeenCalled();
  });

  it("should apply a date cutoff for a windowed period", async () => {
    // Act
    await buildMiReport("user-accounts", "14");

    // Assert
    const cutoff = vi.mocked(buildUserAccountsSheet).mock.calls[0][0];
    expect(cutoff).toBeInstanceOf(Date);
  });

  it("should apply no cutoff for the 'all' period", async () => {
    // Act
    await buildMiReport("publications", "all");

    // Assert
    expect(vi.mocked(buildPublicationsSheet).mock.calls[0][0]).toBeUndefined();
  });

  it("should build a filename with a days token for a windowed period", async () => {
    // Act
    const result = await buildMiReport("all-data", "30");

    // Assert
    expect(result.filename).toMatch(/^mi-report-all-data-30days-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("should build a filename with from-beginning for the 'all' period", async () => {
    // Act
    const result = await buildMiReport("all-data", "all");

    // Assert
    expect(result.filename).toMatch(/^mi-report-all-data-from-beginning-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
