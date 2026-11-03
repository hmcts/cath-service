import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEnvironment: vi.fn(),
  filesStorage: vi.fn(),
  openBlobContainer: vi.fn(),
  loadUsers: vi.fn(),
  seedRecords: vi.fn(),
  prismaRecordStore: vi.fn(),
  testSupportRecordStore: vi.fn(),
  signInWithSessions: vi.fn(),
  signInWithAccounts: vi.fn(),
  disconnect: vi.fn()
}));

vi.mock("../environments.js", () => ({ loadEnvironment: mocks.loadEnvironment, filesStorage: mocks.filesStorage }));
vi.mock("../core/index.js", () => ({ openBlobContainer: mocks.openBlobContainer }));
vi.mock("../fixtures/manifest.js", () => ({ loadUsers: mocks.loadUsers }));
vi.mock("./records.js", () => ({
  seedRecords: mocks.seedRecords,
  prismaRecordStore: mocks.prismaRecordStore,
  testSupportRecordStore: mocks.testSupportRecordStore
}));
vi.mock("./session-sign-in.js", () => ({ signInWithSessions: mocks.signInWithSessions }));
vi.mock("./account-sign-in.js", () => ({ signInWithAccounts: mocks.signInWithAccounts }));
vi.mock("@hmcts/postgres-prisma", () => ({ prisma: { $disconnect: mocks.disconnect } }));

const USERS = [{ id: "system-admin" }, { id: "verified-media" }];
const SIGN_INS = {
  users: { "system-admin": { userId: "u1", role: "SYSTEM_ADMIN", cookies: {} } },
  cathUsers: { "system-admin": { userId: "u1", email: "a@example.com", role: "SYSTEM_ADMIN", provenance: "SSO" } },
  unavailable: { "verified-media": "no VERIFIED test account configured" }
};

describe("cath sign-in script", () => {
  const argv = process.argv;
  let dir: string;
  let output: string;
  const fetchMock = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    dir = await mkdtemp(path.join(tmpdir(), "cath-sign-in-"));
    output = path.join(dir, "nested", "sign-in.json");
    vi.stubEnv("PARITY_SIGN_IN_OUTPUT", output);
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: 7, name: "CIVIL_DAILY_CAUSE_LIST" }])));
    mocks.loadUsers.mockResolvedValue(USERS);
    mocks.seedRecords.mockResolvedValue({ "manage-user-audit": { id: "a1" } });
  });

  afterEach(async () => {
    process.argv = argv;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("should write sessions and records to the database and Redis for a local CaTH", async () => {
    // Arrange
    process.argv = ["node", "sign-in.ts"];
    mocks.loadEnvironment.mockResolvedValue({ name: "local", cath: { signIn: "session", apiUrl: "http://api" } });
    mocks.signInWithSessions.mockResolvedValue(SIGN_INS);
    const store = { kind: "prisma" };
    mocks.prismaRecordStore.mockResolvedValue(store);

    // Act
    await import("./sign-in.js");

    // Assert
    expect(mocks.loadEnvironment).toHaveBeenCalledWith(undefined);
    expect(mocks.signInWithSessions).toHaveBeenCalledWith(USERS);
    expect(mocks.seedRecords).toHaveBeenCalledWith(store, SIGN_INS.cathUsers);
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("http://api/test-support/list-types");
    const written = JSON.parse(await readFile(output, "utf-8"));
    expect(written).toEqual({
      signedInAt: expect.any(String),
      environment: "local",
      users: SIGN_INS.users,
      unavailable: SIGN_INS.unavailable,
      records: { "manage-user-audit": { id: "a1" } },
      listTypes: { CIVIL_DAILY_CAUSE_LIST: "7" }
    });
    expect(console.log).toHaveBeenCalledWith("not signed in: verified-media: no VERIFIED test account configured");
    expect(console.log).toHaveBeenCalledWith(`signed in 1 users and ensured 1 records → ${output}`);
  });

  it("should sign in as test accounts and use test-support for a deployed CaTH", async () => {
    // Arrange
    process.argv = ["node", "sign-in.ts", "--env", "test"];
    const environment = { name: "test", cath: { signIn: "accounts", apiUrl: "https://api" } };
    mocks.loadEnvironment.mockResolvedValue(environment);
    mocks.signInWithAccounts.mockResolvedValue(SIGN_INS);
    mocks.filesStorage.mockReturnValue({ container: "files" });
    mocks.openBlobContainer.mockReturnValue({ upload: vi.fn() });
    const store = { kind: "test-support" };
    mocks.testSupportRecordStore.mockReturnValue(store);

    // Act
    await import("./sign-in.js");

    // Assert
    expect(mocks.loadEnvironment).toHaveBeenCalledWith("test");
    expect(mocks.signInWithAccounts).toHaveBeenCalledWith(environment, USERS);
    expect(mocks.filesStorage).toHaveBeenCalledWith("cath", environment.cath, "files");
    expect(mocks.testSupportRecordStore).toHaveBeenCalledWith("https://api", expect.objectContaining({ upload: expect.any(Function) }));
    expect(mocks.seedRecords).toHaveBeenCalledWith(store, SIGN_INS.cathUsers);
    expect(mocks.disconnect).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(output, "utf-8")).environment).toBe("test");
  });
});
