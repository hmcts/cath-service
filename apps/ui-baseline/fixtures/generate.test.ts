import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The script replaces payloads/ and publications.json beside it; those paths are sent to a
// temporary directory, and anything else it would write or remove in this package fails the test
const { sandbox } = vi.hoisted(() => ({ sandbox: { from: "", to: "" } }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const redirect = (file: string) => {
    for (const name of ["payloads", "publications.json"]) {
      const from = path.join(sandbox.from, name);
      if (file === from || file.startsWith(`${from}/`)) return sandbox.to + file.slice(sandbox.from.length);
    }
    if (file.startsWith(sandbox.from)) throw new Error(`the test does not allow writing ${file}`);
    return file;
  };
  const via = <F>(fn: F) => ((file: string, ...rest: unknown[]) => (fn as (...args: unknown[]) => unknown)(redirect(file), ...rest)) as F;
  return {
    ...actual,
    rm: via(actual.rm),
    mkdir: via(actual.mkdir),
    writeFile: via(actual.writeFile),
    copyFile: ((source: string, target: string) => actual.copyFile(source, redirect(target))) as typeof actual.copyFile
  };
});
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("@hmcts/list-types-common", () => ({
  listTypeData: [
    { name: "CIVIL_DAILY_CAUSE_LIST", urlPath: "civil-daily-cause-list", subJurisdictionIds: [1] },
    { name: "ODD_LIST", subJurisdictionIds: [] },
    { name: "SSCS_A", urlPath: "sscs-a", subJurisdictionIds: [9] },
    { name: "CROWN_ADVANCED_PDDA_LIST", urlPath: "crown-advanced-pdda-list", subJurisdictionIds: [1] }
  ]
}));
vi.mock("@hmcts/location/location-data", () => ({
  locationData: {
    subJurisdictions: [
      { subJurisdictionId: 1, name: "Civil Court" },
      { subJurisdictionId: 2, name: "Tribunal" }
    ],
    locations: [
      { locationId: 10, subJurisdictions: [1] },
      { locationId: 20, subJurisdictions: [2] }
    ]
  }
}));

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_DIR = "src/integrationTest/resources/data/non-strategic";
const EXCEL_PAIRINGS_DIR = "src/integrationTest/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/summary/configurations";

const LIST_LOOKUP = {
  CIVIL_DAILY_CAUSE_LIST: { url: "civil-daily-cause-list", jurisdictionTypes: ["Civil Court"] },
  FAMILY_DAILY_CAUSE_LIST: { url: "family-daily-cause-list", defaultSensitivity: "private", isHidden: true },
  ODD_LIST: { url: "odd-list", jurisdictionTypes: ["Tribunal"] },
  CROWN_ADVANCE_PDDA_LIST: { url: "crown-advance-pdda-list" },
  FLAT_ONLY: { url: "" },
  DEPRECATED_LIST: { url: "deprecated-list" },
  SSCS_A: { url: "sscs-a", isNonStrategic: true },
  SSCS_B: { url: "sscs-b", isNonStrategic: true },
  OLD_LIST: { url: "old-list", isNonStrategic: true },
  NO_EXCEL_LIST: { url: "no-excel-list", isNonStrategic: true },
  NO_MOCK_LIST: { url: "no-mock-list" }
};
const LIST_TYPE_JAVA = `
package uk.gov.hmcts.reform.pip.model.publication;

public enum ListType {
    CIVIL_DAILY_CAUSE_LIST("Civil, (daily) list", Language.ENGLISH, 3, 4, 5, 6, 7, of(8, 9), false),
    // A retired list type
    DEPRECATED_LIST("Deprecated", 2, 3, true),
    /* Another retired one, with too few arguments to count */
    OLD_LIST("Old", true);

    private final String friendlyName;
}
`;

describe("generate script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;
  let out: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    out = await mkdtemp(path.join(tmpdir(), "fixtures-out-"));
    sandbox.from = FIXTURES_DIR;
    sandbox.to = out;
    vi.mocked(execFileSync).mockImplementation(((command: string, args: string[]) => {
      if (command === "git") return `${path.basename(args[1]).split("-")[0]}12345\n`;
      if (command === "gh") return LIST_TYPE_JAVA;
      throw new Error(`unexpected command ${command}`);
    }) as never);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argv;
    sandbox.from = "";
    log.mockRestore();
  });

  const run = async (frontend: string, dataManagement: string) => {
    process.argv = ["node", "generate.ts", frontend, dataManagement];
    await import("./generate.js");
    return JSON.parse(await readFile(path.join(out, "publications.json"), "utf-8"));
  };

  it("should need both pip checkouts", async () => {
    // Arrange
    process.argv = ["node", "generate.ts", "/only-one"];

    // Act and assert
    await expect(import("./generate.js")).rejects.toThrow("usage: generate.ts <pip-frontend checkout> <pip-data-management checkout>");
  });

  it("should make one publication per list type from pip's mocks and Excel fixtures, listing what it cannot match", async () => {
    // Arrange
    const { frontend, dataManagement } = await pipCheckouts();
    await mkdir(path.join(out, "payloads"));
    await writeFile(path.join(out, "payloads/stale.json"), "{}");

    // Act
    const manifest = await run(frontend, dataManagement);

    // Assert
    const byId = Object.fromEntries(manifest.publications.map((publication: { id: string }) => [publication.id, publication]));
    expect(manifest.generatedFrom).toEqual({ "pip-frontend": "pip12345", "pip-data-management": "pip12345" });
    expect(manifest.displayWindowDays).toEqual({ before: 1, after: 30 });
    expect(Object.keys(byId)).toEqual([
      "civil-daily-cause-list",
      "family-daily-cause-list",
      "odd-list",
      "crown-advance-pdda-list",
      "flat-only",
      "sscs-a",
      "sscs-b"
    ]);
    expect(byId["civil-daily-cause-list"]).toEqual({
      id: "civil-daily-cause-list",
      listType: "CIVIL_DAILY_CAUSE_LIST",
      cathListType: "CIVIL_DAILY_CAUSE_LIST",
      paths: { pip: "/civil-daily-cause-list", cath: "/civil-daily-cause-list" },
      payload: "payloads/civil-daily-cause-list.json",
      format: "json",
      origin: "hmcts/pip-frontend@pip12345:src/test/unit/mocks/lists/civilDailyCauseList.json",
      locationId: 10,
      contentDate: "2024-03-05",
      type: "LIST",
      language: "ENGLISH",
      sensitivity: "PUBLIC",
      provenance: "MANUAL_UPLOAD",
      notes: []
    });
    expect(byId["family-daily-cause-list"]).toMatchObject({
      cathListType: null,
      paths: { pip: "/family-daily-cause-list", cath: null },
      origin: "hmcts/pip-data-management@pip12345:src/test/resources/mocks/familyDailyCauseList.json",
      locationId: 1,
      contentDate: "2022-02-14",
      sensitivity: "PRIVATE",
      viewAs: "verified-media",
      notes: [
        "CaTH has no equivalent list type",
        "hidden in pip",
        "no CaTH location hosts this list type; using location 1",
        "PRIVATE by default: captured signed in as verified-media"
      ]
    });
    expect(byId["odd-list"]).toMatchObject({
      locationId: 20,
      paths: { pip: "/odd-list", cath: null },
      notes: ["payload matched via pip a11y test oddListTest.ts"]
    });
    expect(byId["crown-advance-pdda-list"]).toMatchObject({
      cathListType: "CROWN_ADVANCED_PDDA_LIST",
      paths: { cath: "/crown-advanced-pdda-list" },
      notes: ["renamed in CaTH to CROWN_ADVANCED_PDDA_LIST", "payload matched via pip a11y test crownTest.ts"]
    });
    expect(byId["flat-only"]).toMatchObject({
      format: "flat-file",
      paths: { pip: "/file-publication", cath: null },
      payload: "payloads/flat-only.pdf",
      origin: "hmcts/pip-frontend@pip12345:src/test/end-to-end/shared/mocks/testFlatFile.pdf"
    });
    expect(byId["flat-only"].notes).toContain(
      "flat file only: pip has no page for this list type, so the baseline is its summary-of-publications link and the file pip serves"
    );
    expect(byId["sscs-a"]).toMatchObject({
      format: "excel",
      payload: "payloads/sscs-a.xlsx",
      origin: `hmcts/pip-data-management@pip12345:${EXCEL_DIR}/sscs/sscs.xlsx`,
      locationId: 1,
      notes: ["non-strategic: uploaded as Excel and converted by each app", "no CaTH location hosts this list type; using location 1"]
    });
    expect(byId["sscs-b"]).toMatchObject({ format: "excel", origin: `hmcts/pip-data-management@pip12345:${EXCEL_DIR}/cst.xlsx` });
    expect(byId["sscs-b"].notes).toContain("Excel fixture shared with SSCS_C: pip validates both against schemas/shared.json");
    expect(manifest.unmatched).toEqual([
      { listType: "DEPRECATED_LIST", reason: expect.stringContaining("deprecated in pip (pip-data-models ListType.isDeprecated)") },
      { listType: "OLD_LIST", reason: "deprecated in pip: pip rejects new uploads of it, and its Excel fixture is no longer used by pip's tests" },
      { listType: "NO_EXCEL_LIST", reason: "non-strategic list with no Excel fixture in pip-data-management's integration tests" },
      { listType: "NO_MOCK_LIST", reason: "no pip mock payload found for this list type" }
    ]);
    expect(await readFile(path.join(out, "payloads/civil-daily-cause-list.json"), "utf-8")).toContain("2024-03-05");
    expect(await readFile(path.join(out, "payloads/sscs-b.xlsx"), "utf-8")).toBe("cst excel");
    expect(existsSync(path.join(out, "payloads/stale.json"))).toBe(false);
    expect(execFileSync).toHaveBeenCalledWith(
      "gh",
      expect.arrayContaining(["repos/hmcts/pip-data-models/contents/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java?ref=2.3.4"]),
      { encoding: "utf-8" }
    );
    expect(log).toHaveBeenCalledWith("7 publications, 4 unmatched list types");
  });

  it("should stop when pip-data-management does not name its pip-data-models version", async () => {
    // Arrange
    const { frontend, dataManagement } = await pipCheckouts();
    await writeFile(path.join(dataManagement, "build.gradle"), "dependencies {}");

    // Act and assert
    process.argv = ["node", "generate.ts", frontend, dataManagement];
    await expect(import("./generate.js")).rejects.toThrow("could not find the pip-data-models version in pip-data-management/build.gradle");
  });
});

async function pipCheckouts(): Promise<{ frontend: string; dataManagement: string }> {
  const root = await mkdtemp(path.join(tmpdir(), "pip-"));
  const frontend = path.join(root, "pip-frontend");
  const dataManagement = path.join(root, "pip-data-management");
  const write = async (file: string, content: unknown) => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof content === "string" ? content : JSON.stringify(content));
  };
  await write(path.join(frontend, "src/main/resources/listLookup.json"), LIST_LOOKUP);
  await write(
    path.join(frontend, "src/main/routes/routes.ts"),
    "app.get('/civil-daily-cause-list', a);\napp.get('/odd-list', b);\napp.get('/no-mock-list', c);\napp.get('/crown-advance-pdda-list', d);"
  );
  await write(path.join(frontend, "src/test/unit/mocks/lists/civilDailyCauseList.json"), { document: { publicationDate: "2024-03-05T09:00:00Z" } });
  await write(path.join(frontend, "src/test/unit/mocks/lists/civilDailyCauseListMissing.json"), {});
  await write(path.join(frontend, "src/test/unit/mocks/lists/notes.txt"), "not a mock");
  await write(path.join(frontend, "src/test/unit/mocks/oddMock.json"), { document: { publicationDate: "not a date" } });
  await write(path.join(frontend, "src/test/unit/mocks/crownMock.json"), {});
  await write(
    path.join(frontend, "src/test/a11y/tests/style-guide/oddListTest.ts"),
    "const url = '/odd-list?artefactId=1';\nconst listType = 'ODD_LIST';\ntestArtefactJsonData('oddMock.json');"
  );
  await write(
    path.join(frontend, "src/test/a11y/tests/style-guide/crownTest.ts"),
    "const url = '/crown-advance-pdda-list';\ntestArtefactJsonData('/crownMock.json');"
  );
  await write(path.join(frontend, "src/test/a11y/tests/style-guide/noUrlTest.ts"), "testArtefactJsonData('unused.json');");
  await write(path.join(frontend, "src/test/end-to-end/shared/mocks/testFlatFile.pdf"), "%PDF flat file");

  await write(path.join(dataManagement, "build.gradle"), "implementation 'com.github.hmcts:pip-data-models:2.3.4'");
  await write(path.join(dataManagement, "src/test/resources/mocks/familyDailyCauseList.json"), {});
  await write(
    path.join(dataManagement, "src/main/resources/application.yaml"),
    'validation-schemas:\n    SSCS_A: "schemas/sscs.json"\n    SSCS_B: "schemas/shared.json"\n    SSCS_C: "schemas/shared.json"\n'
  );
  await write(
    path.join(dataManagement, EXCEL_PAIRINGS_DIR, "NonStrategicListTest.java"),
    [
      'private static final String SSCS_FILE = "non-strategic/" + "sscs/sscs.xlsx";',
      "Arguments.of(ListType.SSCS_A, SSCS_FILE),",
      'Arguments.of(ListType.SSCS_C, "non-strategic/cst.xlsx"),',
      "Arguments.of(ListType.NO_EXCEL_LIST, UNKNOWN_CONSTANT),"
    ].join("\n")
  );
  await write(path.join(dataManagement, EXCEL_PAIRINGS_DIR, "OtherTest.java"), 'Arguments.of(ListType.NO_EXCEL_LIST, "non-strategic/ignored.xlsx"),');
  await write(path.join(dataManagement, EXCEL_DIR, "sscs/sscs.xlsx"), "sscs excel");
  await write(path.join(dataManagement, EXCEL_DIR, "cst.xlsx"), "cst excel");
  await mkdir(path.join(dataManagement, EXCEL_DIR, "old-list"), { recursive: true });
  return { frontend, dataManagement };
}
