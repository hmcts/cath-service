import { deleteBlob, getBlobProperties, setBlobMetadata, uploadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { extractAndStoreArtefactSearch } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MigratedArtefact } from "./artefact-transform.js";
import { type LegacyArtefact, readLegacyPublicationData } from "./legacy-publication-source.js";
import { runPublicationSync } from "./run-publication-sync.js";

const { tx, storage } = vi.hoisted(() => ({
  tx: {
    locationMetadata: { count: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    listSearchConfig: { count: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    artefact: { deleteMany: vi.fn(), createMany: vi.fn(), update: vi.fn() }
  },
  storage: { download: vi.fn(), exists: vi.fn() }
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    listType: { findMany: vi.fn() },
    location: { findMany: vi.fn() },
    artefact: { findMany: vi.fn() }
  }
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" },
  uploadBlob: vi.fn(),
  downloadBlob: vi.fn(async () => Buffer.from('{"courtLists":[]}')),
  deleteBlob: vi.fn(),
  getBlobProperties: vi.fn(),
  setBlobMetadata: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  getContentTypeFromExtension: (extension: string) => (extension === ".pdf" ? "application/pdf" : "application/octet-stream"),
  deleteArtefactSearchByArtefactId: vi.fn(),
  extractAndStoreArtefactSearch: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({ validateListTypeJson: vi.fn(async () => ({ isValid: true, errors: [] })) }));
vi.mock("@hmcts/location", () => ({
  locationData: { locations: [], regions: [], jurisdictions: [], subJurisdictions: [] },
  validateLocationMetadataInput: () => ({ valid: true })
}));
vi.mock("./legacy-publication-source.js", () => ({ readLegacyPublicationData: vi.fn() }));
vi.mock("./legacy-storage-source.js", () => ({ createLegacyStorageReader: () => storage }));

const OPTIONS = { legacyPublicationDatabaseUrl: "postgres://legacy", maxDropRatio: 0.05 };

// Legacy has the generated PDF for the JSON artefact but no Excel.
const LEGACY_BLOBS: Record<string, Buffer> = {
  "artefact/legacy-json-blob": Buffer.from('{"courtLists":[]}'),
  "artefact/legacy-pdf-blob": Buffer.from("%PDF-1.7"),
  "publications/json-artefact.pdf": Buffer.from("%PDF-legacy-render")
};

function callOrder(mock: ReturnType<typeof vi.fn>): number {
  return mock.mock.invocationCallOrder[0];
}
const RECEIVED = new Date("2026-10-08T17:00:00Z");

function buildLegacyArtefact(overrides: Partial<LegacyArtefact> = {}): LegacyArtefact {
  return {
    artefact_id: "json-artefact",
    provenance: "SNL",
    source_artefact_id: null,
    type: "LIST",
    sensitivity: "PUBLIC",
    language: "WELSH",
    list_type: "CIVIL_DAILY_CAUSE_LIST",
    location_id: "9",
    is_flat_file: false,
    payload: "https://legacy/artefact/legacy-json-blob",
    superseded_count: 0,
    display_from: null,
    display_to: null,
    content_date: new Date("2026-10-09T00:00:00Z"),
    last_received_date: RECEIVED,
    ...overrides
  };
}

function existingRow(artefactId: string, overrides: Partial<MigratedArtefact> = {}): MigratedArtefact {
  return {
    artefactId,
    type: "LIST",
    locationId: "9",
    listTypeId: 901,
    contentDate: new Date("2026-10-09T00:00:00Z"),
    sensitivity: "PUBLIC",
    language: "WELSH",
    displayFrom: null,
    displayTo: null,
    lastReceivedDate: RECEIVED,
    isFlatFile: false,
    provenance: "SNL",
    supersededCount: 0,
    sourceArtefactId: null,
    ...overrides
  };
}

describe("runPublicationSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readLegacyPublicationData).mockResolvedValue({
      locations: [],
      locationReferences: [],
      locationMetadata: [],
      listSearchConfigs: [{ id: "config-1", list_type: "CIVIL_DAILY_CAUSE_LIST", case_number_field_name: "caseNumber", case_name_field_name: "caseName" }],
      artefacts: [
        buildLegacyArtefact(),
        buildLegacyArtefact({
          artefact_id: "flat-artefact",
          is_flat_file: true,
          source_artefact_id: "SNL-7",
          payload: "https://legacy/artefact/legacy-pdf-blob"
        })
      ]
    });
    vi.mocked(prisma.listType.findMany).mockResolvedValue([{ id: 901, name: "CIVIL_DAILY_CAUSE_LIST", friendlyName: null }] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 9 }] as never);
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([] as never);
    vi.mocked(getBlobProperties).mockResolvedValue(null);
    tx.locationMetadata.count.mockResolvedValue(0);
    tx.listSearchConfig.count.mockResolvedValue(0);
    storage.download.mockImplementation(async (container: string, blob: string) => LEGACY_BLOBS[`${container}/${blob}`] ?? null);
  });

  it("should copy payloads under the artefact id, write rows, then build derived data and stamp the marker", async () => {
    // Act
    const report = await runPublicationSync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith("json-artefact", Buffer.from('{"courtLists":[]}'), "application/json", "artefact");
    expect(uploadBlob).toHaveBeenCalledWith("flat-artefact", Buffer.from("%PDF-1.7"), "application/pdf", "artefact");
    expect(tx.artefact.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ artefactId: "json-artefact" }), expect.objectContaining({ artefactId: "flat-artefact", sourceArtefactId: "SNL-7.pdf" })]
    });
    expect(tx.listSearchConfig.createMany).toHaveBeenCalledWith({
      data: [{ id: "config-1", listTypeId: 901, caseNumberFieldName: "caseNumber", caseNameFieldName: "caseName" }]
    });
    expect(callOrder(tx.listSearchConfig.createMany)).toBeLessThan(callOrder(vi.mocked(extractAndStoreArtefactSearch)));
    expect(extractAndStoreArtefactSearch).toHaveBeenCalledWith("json-artefact", 901, { courtLists: [] });
    expect(setBlobMetadata).toHaveBeenCalledWith("json-artefact", { legacylastreceived: RECEIVED.toISOString() }, "artefact");
    expect(setBlobMetadata).toHaveBeenCalledWith("flat-artefact", { legacylastreceived: RECEIVED.toISOString() }, "artefact");
    expect(report.steps.find(({ name }) => name === "artefact_derived_data")).toEqual({ name: "artefact_derived_data", processed: 2, rejections: [] });
  });

  it("should leave an artefact alone when its payload already carries the current marker", async () => {
    // Arrange
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([
      existingRow("json-artefact"),
      existingRow("flat-artefact", { isFlatFile: true, sourceArtefactId: "SNL-7.pdf" })
    ] as never);
    vi.mocked(getBlobProperties).mockResolvedValue({ size: 1, metadata: { legacylastreceived: RECEIVED.toISOString() } });

    // Act
    await runPublicationSync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(storage.download).not.toHaveBeenCalled();
    expect(uploadBlob).not.toHaveBeenCalled();
    expect(tx.artefact.createMany).toHaveBeenCalledWith({ data: [] });
    expect(tx.artefact.update).not.toHaveBeenCalled();
    expect(extractAndStoreArtefactSearch).not.toHaveBeenCalled();
  });

  it("should delete artefacts legacy no longer displays, with their files", async () => {
    // Arrange
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([existingRow("expired")] as never);

    // Act
    await runPublicationSync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(tx.artefact.deleteMany).toHaveBeenCalledWith({ where: { artefactId: { in: ["expired"] } } });
    expect(deleteBlob).toHaveBeenCalledWith("expired", "artefact");
    expect(deleteBlob).toHaveBeenCalledWith("expired.pdf", "publications");
    expect(deleteBlob).toHaveBeenCalledWith("expired.xlsx", "publications");
  });

  it("should copy legacy's generated files rather than regenerate them, removing ones legacy no longer has", async () => {
    // Act
    await runPublicationSync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith("json-artefact.pdf", Buffer.from("%PDF-legacy-render"), "application/pdf", "publications");
    expect(deleteBlob).toHaveBeenCalledWith("json-artefact.xlsx", "publications");
    expect(storage.download).not.toHaveBeenCalledWith("publications", "flat-artefact.pdf");
  });

  it("should not stamp the marker when derived data fails, so the next run retries it", async () => {
    // Arrange
    vi.mocked(extractAndStoreArtefactSearch).mockRejectedValueOnce(new Error("database unavailable"));

    // Act
    const report = await runPublicationSync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(setBlobMetadata).not.toHaveBeenCalledWith("json-artefact", expect.anything(), "artefact");
    expect(report.steps.find(({ name }) => name === "artefact_derived_data")?.rejections).toEqual([
      { entityId: "json-artefact", reason: "derived data failed: database unavailable" }
    ]);
  });

  it("should write nothing in a dry run but still read and check every payload", async () => {
    // Act
    const report = await runPublicationSync({ ...OPTIONS, isDryRun: true });

    // Assert
    expect(storage.download).toHaveBeenCalledTimes(2);
    expect(uploadBlob).not.toHaveBeenCalled();
    expect(tx.artefact.createMany).not.toHaveBeenCalled();
    expect(tx.locationMetadata.deleteMany).not.toHaveBeenCalled();
    expect(extractAndStoreArtefactSearch).not.toHaveBeenCalled();
    expect(report.steps.find(({ name }) => name === "artefact_derived_data")?.skipped).toBe("dry run; 2 artefacts would be rebuilt");
  });

  it("should reject flat files whose type cannot be identified and payloads that are not JSON", async () => {
    // Arrange
    storage.download.mockImplementation(async (_container: string, blob: string) =>
      blob === "legacy-pdf-blob" ? Buffer.from("plain words") : Buffer.from("not json")
    );

    // Act
    const report = await runPublicationSync({ ...OPTIONS, isDryRun: true });

    // Assert
    expect(report.domains.find(({ entityType }) => entityType === "artefact")?.rejections).toEqual([
      { entityId: "json-artefact", reason: "payload is not valid JSON" },
      { entityId: "flat-artefact", reason: "could not determine flat file type" }
    ]);
  });

  it("should refuse to write when the legacy read would empty the artefact table", async () => {
    // Arrange
    vi.mocked(prisma.artefact.findMany).mockResolvedValue([existingRow("a"), existingRow("b")] as never);
    vi.mocked(readLegacyPublicationData).mockResolvedValue({
      locations: [],
      locationReferences: [],
      locationMetadata: [],
      listSearchConfigs: [],
      artefacts: []
    });

    // Act & Assert
    await expect(runPublicationSync({ ...OPTIONS, isDryRun: false })).rejects.toThrow("artefact: refusing to replace 2 rows with 0");
    expect(tx.artefact.deleteMany).not.toHaveBeenCalled();
    expect(deleteBlob).not.toHaveBeenCalled();
  });
});
