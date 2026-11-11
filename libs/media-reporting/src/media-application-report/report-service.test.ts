import { sendMediaApplicationReportEmail } from "@hmcts/notification";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApplicationsByIds, getApplicationsForReport } from "./queries.js";
import { buildMediaApplicationReportCsv } from "./report-csv.js";
import { runMediaApplicationReport } from "./report-service.js";

vi.mock("@hmcts/notification", () => ({
  sendMediaApplicationReportEmail: vi.fn()
}));

vi.mock("./queries.js", () => ({
  getApplicationsForReport: vi.fn(),
  deleteApplicationsByIds: vi.fn()
}));

vi.mock("./report-csv.js", () => ({
  buildMediaApplicationReportCsv: vi.fn()
}));

const NOW = new Date("2026-10-19T00:00:00Z");
const APPLICATIONS = [
  { id: "id-1", name: "Jane", email: "jane@example.com", employer: "BBC", status: "APPROVED", appliedDate: NOW },
  { id: "id-2", name: "John", email: "john@example.com", employer: "ITV", status: "REJECTED", appliedDate: NOW }
];
const PENDING_APPLICATION = { id: "id-3", name: "Sam", email: "sam@example.com", employer: "Sky", status: "PENDING", appliedDate: NOW };

describe("runMediaApplicationReport", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(buildMediaApplicationReportCsv).mockReturnValue("csv-content");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log and return without emailing or deleting when no applications exist", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue([]);

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    expect(logSpy).toHaveBeenCalledWith("[media-reporting] No media applications found. Skipping report.");
    expect(sendMediaApplicationReportEmail).not.toHaveBeenCalled();
    expect(deleteApplicationsByIds).not.toHaveBeenCalled();
  });

  it("should email the report and then delete the reported applications", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockResolvedValue(2);

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    expect(buildMediaApplicationReportCsv).toHaveBeenCalledWith(APPLICATIONS);
    expect(sendMediaApplicationReportEmail).toHaveBeenCalledWith({
      csvBuffer: Buffer.from("csv-content", "utf8"),
      reportDate: NOW,
      applicationCount: 2
    });
    expect(deleteApplicationsByIds).toHaveBeenCalledWith(["id-1", "id-2"]);
    expect(logSpy).toHaveBeenCalledWith("[media-reporting] Report email sent for 2 applications.");
    expect(logSpy).toHaveBeenCalledWith("[media-reporting] Deleted 2 processed media applications.");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should report pending applications but only delete approved and rejected ones", async () => {
    // Arrange
    const applications = [...APPLICATIONS, PENDING_APPLICATION];
    vi.mocked(getApplicationsForReport).mockResolvedValue(applications);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockResolvedValue(2);

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    expect(buildMediaApplicationReportCsv).toHaveBeenCalledWith(applications);
    expect(vi.mocked(sendMediaApplicationReportEmail).mock.calls[0][0].applicationCount).toBe(3);
    expect(deleteApplicationsByIds).toHaveBeenCalledWith(["id-1", "id-2"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should email the report but skip deletion when only pending applications exist", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue([PENDING_APPLICATION]);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    expect(sendMediaApplicationReportEmail).toHaveBeenCalled();
    expect(deleteApplicationsByIds).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("[media-reporting] No processed media applications to delete.");
  });

  it("should delete only after the email has been sent", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockResolvedValue(2);

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    const emailOrder = vi.mocked(sendMediaApplicationReportEmail).mock.invocationCallOrder[0];
    const deleteOrder = vi.mocked(deleteApplicationsByIds).mock.invocationCallOrder[0];
    expect(emailOrder).toBeLessThan(deleteOrder);
  });

  it("should log, rethrow and not delete when the email fails", async () => {
    // Arrange
    const emailError = new Error("GOV.UK Notify error: Bad request");
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockRejectedValue(emailError);

    // Act & Assert
    await expect(runMediaApplicationReport(NOW)).rejects.toBe(emailError);
    expect(errorSpy).toHaveBeenCalledWith("[media-reporting] Failed to send report email: GOV.UK Notify error: Bad request");
    expect(deleteApplicationsByIds).not.toHaveBeenCalled();
  });

  it("should wrap errors when retrieving applications fails", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockRejectedValue(new Error("connection refused"));

    // Act & Assert
    await expect(runMediaApplicationReport(NOW)).rejects.toThrow("Failed to retrieve media applications: connection refused");
    expect(sendMediaApplicationReportEmail).not.toHaveBeenCalled();
  });

  it("should wrap errors when deleting applications fails", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockRejectedValue("timeout");

    // Act & Assert
    await expect(runMediaApplicationReport(NOW)).rejects.toThrow("Failed to delete processed applications: timeout");
  });

  it("should warn when the deleted count differs from the reported count", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockResolvedValue(1);

    // Act
    await runMediaApplicationReport(NOW);

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Deleted 1 of 2 reported applications"));
    expect(logSpy).toHaveBeenCalledWith("[media-reporting] Deleted 1 processed media applications.");
  });

  it("should default the report date to the current time", async () => {
    // Arrange
    vi.mocked(getApplicationsForReport).mockResolvedValue(APPLICATIONS);
    vi.mocked(sendMediaApplicationReportEmail).mockResolvedValue();
    vi.mocked(deleteApplicationsByIds).mockResolvedValue(2);

    // Act
    await runMediaApplicationReport();

    // Assert
    expect(vi.mocked(sendMediaApplicationReportEmail).mock.calls[0][0].reportDate).toBeInstanceOf(Date);
  });
});
