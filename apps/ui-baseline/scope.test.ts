import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationFixture } from "./fixtures/manifest.js";
import {
  inRecordingScope,
  isConfident,
  loadRecordingScope,
  mentionsIn,
  mentionsPublication,
  mentionsRoute,
  pageId,
  type RecordingScope,
  type RouteEntry,
  ticketText
} from "./scope.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("./system-command.js", () => ({ systemCommand: (name: string) => name }));
vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

const publication = (overrides: Partial<PublicationFixture> = {}) =>
  ({ id: "civil-daily", listType: "CIVIL_DAILY_CAUSE_LIST", cathListType: null, ...overrides }) as PublicationFixture;

const route = (overrides: Partial<RouteEntry> = {}): RouteEntry => ({
  pip: "/summary-of-publications",
  cath: "/summary-of-publications",
  match: "renamed",
  reviewed: false,
  pipRole: null,
  ...overrides
});

const recording: RecordingScope = {
  name: "ticket-42",
  publications: ["civil-daily"],
  pages: ["page--search"],
  journeys: [],
  routes: ["/search"]
};

describe("scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ticketText", () => {
    it("should read the local ticket file when the plan commands fetched it", async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue("# Local ticket" as never);

      // Act
      const text = await ticketText("42", "hmcts/cath-service");

      // Assert
      expect(text).toBe("# Local ticket");
      expect(vi.mocked(existsSync).mock.calls[0][0]).toMatch(/docs[/\\]tickets[/\\]42[/\\]ticket\.md$/);
      expect(execFileSync).not.toHaveBeenCalled();
    });

    it("should fetch the GitHub issue when there is no local ticket file", async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(execFileSync).mockReturnValue(JSON.stringify({ title: "Add a list", body: "The body" }));

      // Act
      const text = await ticketText("42", "hmcts/cath-service");

      // Assert
      expect(text).toBe("# Add a list\n\nThe body");
      expect(execFileSync).toHaveBeenCalledWith("gh", ["issue", "view", "42", "--repo", "hmcts/cath-service", "--json", "title,body"], { encoding: "utf-8" });
    });
  });

  describe("mentionsIn", () => {
    it("should find capitalised list type names and routes in the text when given one", () => {
      // Arrange
      const text = "Fix CIVIL_DAILY_CAUSE_LIST on `/summary-of-publications` and (/search) but not SHORT or /x or url/path";

      // Act
      const mentions = mentionsIn(text, [], []);

      // Assert
      expect([...mentions.listTypes]).toEqual(["CIVIL_DAILY_CAUSE_LIST"]);
      expect([...mentions.routes]).toEqual(["/summary-of-publications", "/search"]);
    });

    it("should include the explicit choices when there is no text", () => {
      // Act
      const mentions = mentionsIn(null, ["SJP_PRESS_LIST"], ["/view-option"]);

      // Assert
      expect([...mentions.listTypes]).toEqual(["SJP_PRESS_LIST"]);
      expect([...mentions.routes]).toEqual(["/view-option"]);
    });
  });

  describe("mentionsPublication", () => {
    it("should match on pip's list type name when mentioned", () => {
      // Arrange
      const mentions = mentionsIn(null, ["CIVIL_DAILY_CAUSE_LIST"], []);

      // Act & Assert
      expect(mentionsPublication(mentions, publication())).toBe(true);
    });

    it("should match on CaTH's list type name when it differs from pip's", () => {
      // Arrange
      const mentions = mentionsIn(null, ["CATH_CIVIL_LIST"], []);

      // Act & Assert
      expect(mentionsPublication(mentions, publication({ cathListType: "CATH_CIVIL_LIST" }))).toBe(true);
      expect(mentionsPublication(mentions, publication())).toBe(false);
    });
  });

  describe("mentionsRoute", () => {
    it("should match on the pip route or the CaTH route when either is mentioned", () => {
      // Arrange
      const pipMention = mentionsIn(null, [], ["/pip-page"]);
      const cathMention = mentionsIn(null, [], ["/cath-page"]);
      const entry = route({ pip: "/pip-page", cath: "/cath-page" });

      // Act & Assert
      expect(mentionsRoute(pipMention, entry)).toBe(true);
      expect(mentionsRoute(cathMention, entry)).toBe(true);
    });

    it("should not match when the route has no CaTH page and pip's is not mentioned", () => {
      // Arrange
      const mentions = mentionsIn(null, [], ["/other"]);

      // Act & Assert
      expect(mentionsRoute(mentions, route({ pip: "/pip-page", cath: null }))).toBe(false);
    });
  });

  describe("pageId", () => {
    it("should turn each slash of the pip path into a double dash", () => {
      // Act & Assert
      expect(pageId("/admin/manage-users")).toBe("page--admin--manage-users");
    });
  });

  describe("isConfident", () => {
    it("should be confident when reviewed, same-path or high confidence", () => {
      // Act & Assert
      expect(isConfident(route({ reviewed: true }))).toBe(true);
      expect(isConfident(route({ match: "same-path" }))).toBe(true);
      expect(isConfident(route({ confidence: "high" }))).toBe(true);
    });

    it("should not be confident when a lower-confidence suggestion is unreviewed", () => {
      // Act & Assert
      expect(isConfident(route({ confidence: "low" }))).toBe(false);
    });
  });

  describe("loadRecordingScope", () => {
    it("should return null when no scope file is given", async () => {
      // Act
      const result = await loadRecordingScope(undefined);

      // Assert
      expect(result).toBeNull();
      expect(readFile).not.toHaveBeenCalled();
    });

    it("should read the scope file when given one", async () => {
      // Arrange
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(recording) as never);

      // Act
      const result = await loadRecordingScope("/tmp/scope.json");

      // Assert
      expect(result).toEqual(recording);
      expect(readFile).toHaveBeenCalledWith("/tmp/scope.json", "utf-8");
    });

    it("should read the file named by UI_BASELINE_SCOPE when no file is passed", async () => {
      // Arrange
      vi.stubEnv("UI_BASELINE_SCOPE", "/tmp/env-scope.json");
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(recording) as never);

      // Act
      const result = await loadRecordingScope();

      // Assert
      expect(result).toEqual(recording);
      expect(readFile).toHaveBeenCalledWith("/tmp/env-scope.json", "utf-8");
      vi.unstubAllEnvs();
    });
  });

  describe("inRecordingScope", () => {
    it("should include everything when there is no recording scope", () => {
      // Act & Assert
      expect(inRecordingScope(null, "pages", "page--anything")).toBe(true);
    });

    it("should include lists and pages the scope names, with their variants", () => {
      // Act & Assert
      expect(inRecordingScope(recording, "lists", "civil-daily")).toBe(true);
      expect(inRecordingScope(recording, "pages", "page--search@media-user")).toBe(true);
    });

    it("should exclude captures the scope does not name when checking their area", () => {
      // Act & Assert
      expect(inRecordingScope(recording, "lists", "page--search")).toBe(false);
      expect(inRecordingScope(recording, "pages", "page--other")).toBe(false);
    });
  });
});
