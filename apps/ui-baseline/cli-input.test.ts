import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confinedPath, httpUrl, JOURNEY, LIST_TYPE, LOCALE, matching, REPO, ROUTE, TICKET } from "./cli-input.js";

const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");

describe("matching", () => {
  it.each([
    [TICKET, "312"],
    [LIST_TYPE, "CIVIL_DAILY_CAUSE_LIST"],
    [ROUTE, "/"],
    [ROUTE, "/summary-of-publications"],
    [ROUTE, "/media-applications/[id]/approve"],
    [ROUTE, "/robots.txt"],
    [JOURNEY, "manual-upload-and-remove-list"],
    [LOCALE, "cy"],
    [REPO, "hmcts/cath-service"]
  ])("should accept %s for %s", (pattern, value) => {
    expect(matching(value, pattern, "--option")).toBe(value);
  });

  it.each([
    [TICKET, "../../etc", "--ticket"],
    [TICKET, "12 34", "--ticket"],
    [LIST_TYPE, "civil; rm -rf", "--list-type"],
    [ROUTE, "/a/../../b", "--route"],
    [ROUTE, "summary", "--route"],
    [JOURNEY, "../index", "--journey"],
    [LOCALE, "fr", "--locale"],
    [REPO, "hmcts/cath-service --paginate", "--repo"]
  ])("should refuse a value that is not the expected shape (%s, %s)", (pattern, value, option) => {
    expect(() => matching(value, pattern, option)).toThrow(`${option} "${value}" is not valid`);
  });
});

describe("confinedPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should accept a folder inside the tool's output folder or the temp folder, resolved", () => {
    expect(confinedPath(path.join(OUTPUT_DIR, "checks/ticket-312"), "--out")).toBe(path.join(OUTPUT_DIR, "checks/ticket-312"));
    expect(confinedPath(path.join(tmpdir(), "check-1", "..", "check-2"), "--out")).toBe(path.join(tmpdir(), "check-2"));
  });

  it("should accept a folder inside the hosted app's data folder", () => {
    // Arrange
    vi.stubEnv("UI_BASELINE_DATA_DIR", "/data/ui-baseline");

    // Act & Assert
    expect(confinedPath("/data/ui-baseline/runs/1/check", "--out")).toBe("/data/ui-baseline/runs/1/check");
  });

  it.each([
    ["the output folder itself", OUTPUT_DIR],
    ["the temp folder itself", tmpdir()],
    ["a folder outside them", "/home"],
    ["a path that climbs out of them", path.join(OUTPUT_DIR, "checks/../../..")]
  ])("should refuse %s", (_what, value) => {
    expect(() => confinedPath(value, "--out")).toThrow("--out must be inside");
  });
});

describe("httpUrl", () => {
  it("should accept an http or https address as given", () => {
    expect(httpUrl("https://cath.perftest.platform.hmcts.net/", "--target")).toBe("https://cath.perftest.platform.hmcts.net/");
    expect(httpUrl("http://localhost:8080", "--target")).toBe("http://localhost:8080");
  });

  it("should refuse another kind of address", () => {
    expect(() => httpUrl("file:///etc/passwd", "--target")).toThrow("--target must be an http or https address");
  });

  it("should refuse something that is not an address", () => {
    expect(() => httpUrl("localhost", "--target")).toThrow();
  });
});
