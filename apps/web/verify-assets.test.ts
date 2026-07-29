import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAssetProblems, reportAssetProblems } from "./verify-assets.js";

let distAssets: string;

// Builds the flat layout a correct build produces: govuk-crest.svg and
// manifest.json at their expected paths, hashed font files, and a stylesheet
// whose url(/assets/...) references all resolve.
function buildValidAssets() {
  mkdirSync(path.join(distAssets, "images"), { recursive: true });
  mkdirSync(path.join(distAssets, "fonts"), { recursive: true });
  mkdirSync(path.join(distAssets, "css"), { recursive: true });

  writeFileSync(path.join(distAssets, "images", "govuk-crest.svg"), "<svg/>");
  writeFileSync(path.join(distAssets, "manifest.json"), "{}");
  writeFileSync(path.join(distAssets, "fonts", "light-94a07e06a1-v2.woff2"), "font");
  writeFileSync(path.join(distAssets, "fonts", "bold-b542beb274-v2.woff"), "font");
  writeCss("@font-face{src:url(/assets/fonts/light-94a07e06a1-v2.woff2)}.crest{background:url(/assets/images/govuk-crest.svg)}");
}

function writeCss(contents: string, fileName = "web_css-BXsRfWBc.css") {
  mkdirSync(path.join(distAssets, "css"), { recursive: true });
  writeFileSync(path.join(distAssets, "css", fileName), contents);
}

beforeEach(() => {
  distAssets = path.join(mkdtempSync(path.join(tmpdir(), "verify-assets-")), "assets");
  mkdirSync(distAssets, { recursive: true });
});

afterEach(() => {
  rmSync(path.dirname(distAssets), { recursive: true, force: true });
});

describe("findAssetProblems", () => {
  it("should return no problems when all assets are present and CSS references resolve", () => {
    // Arrange
    buildValidAssets();

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toEqual([]);
  });

  it("should report a problem when the assets directory does not exist", () => {
    // Arrange
    const missing = path.join(distAssets, "nope");

    // Act
    const problems = findAssetProblems(missing);

    // Assert
    expect(problems).toEqual([`${missing} does not exist — run the build first`]);
  });

  it("should report the crown crest when it is missing", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "images", "govuk-crest.svg"));

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("missing required asset: images/govuk-crest.svg");
  });

  it("should report the manifest when it is missing", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "manifest.json"));

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("missing required asset: manifest.json");
  });

  it("should report a missing fonts directory", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "fonts"), { recursive: true });

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("fonts/ directory is missing");
  });

  it("should report an empty fonts directory when no woff files are present", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "fonts"), { recursive: true });
    mkdirSync(path.join(distAssets, "fonts"));
    writeFileSync(path.join(distAssets, "fonts", "README.md"), "not a font");

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("fonts/ contains no .woff or .woff2 files");
  });

  it("should accept a fonts directory containing only woff2 files", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "fonts", "bold-b542beb274-v2.woff"));

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toEqual([]);
  });

  it("should report a CSS reference that does not resolve on disk", () => {
    // Arrange
    buildValidAssets();
    writeCss(".crest{background:url(/assets/images/does-not-exist.svg)}");

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("web_css-BXsRfWBc.css references /assets/images/does-not-exist.svg which does not exist");
  });

  // Reproduces the vite-plugin-static-copy v4 regression: assets land nested under
  // their source path instead of flat, so every CSS reference 404s.
  it("should report every unresolved reference when assets are nested instead of flat", () => {
    // Arrange
    buildValidAssets();
    const nested = path.join(distAssets, "images", "node_modules", "govuk-frontend");
    mkdirSync(nested, { recursive: true });
    writeFileSync(path.join(nested, "govuk-crest.svg"), "<svg/>");
    rmSync(path.join(distAssets, "images", "govuk-crest.svg"));
    rmSync(path.join(distAssets, "fonts", "light-94a07e06a1-v2.woff2"));

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("missing required asset: images/govuk-crest.svg");
    expect(problems).toContain("web_css-BXsRfWBc.css references /assets/fonts/light-94a07e06a1-v2.woff2 which does not exist");
    expect(problems).toContain("web_css-BXsRfWBc.css references /assets/images/govuk-crest.svg which does not exist");
  });

  it("should report unresolved references across multiple stylesheets", () => {
    // Arrange
    buildValidAssets();
    writeCss(".a{background:url(/assets/images/missing-a.svg)}", "admin-pages_css-D5Ow7IJj.css");

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toContain("admin-pages_css-D5Ow7IJj.css references /assets/images/missing-a.svg which does not exist");
  });

  it("should report a duplicated reference only once per stylesheet", () => {
    // Arrange
    buildValidAssets();
    writeCss(".a{background:url(/assets/images/missing.svg)}.b{background:url(/assets/images/missing.svg)}");

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems.filter((p) => p.includes("missing.svg"))).toHaveLength(1);
  });

  it("should ignore absolute and relative urls that do not point at /assets", () => {
    // Arrange
    buildValidAssets();
    writeCss(".a{background:url(https://example.com/img.svg)}.b{background:url(../elsewhere/img.svg)}.c{background:url(data:image/svg+xml;base64,AAAA)}");

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toEqual([]);
  });

  it("should return no CSS problems when there are no stylesheets", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "css"), { recursive: true });

    // Act
    const problems = findAssetProblems(distAssets);

    // Assert
    expect(problems).toEqual([]);
  });
});

describe("reportAssetProblems", () => {
  it("should return exit code 0 and log success when the build output is valid", () => {
    // Arrange
    buildValidAssets();
    const out = { log: vi.fn(), error: vi.fn() };

    // Act
    const exitCode = reportAssetProblems(distAssets, out as unknown as Console);

    // Assert
    expect(exitCode).toBe(0);
    expect(out.log).toHaveBeenCalledWith(expect.stringContaining("all GOV.UK Frontend assets present"));
    expect(out.error).not.toHaveBeenCalled();
  });

  it("should return exit code 1 and list each problem when assets are missing", () => {
    // Arrange
    buildValidAssets();
    rmSync(path.join(distAssets, "images", "govuk-crest.svg"));
    const out = { log: vi.fn(), error: vi.fn() };

    // Act
    const exitCode = reportAssetProblems(distAssets, out as unknown as Console);

    // Assert
    expect(exitCode).toBe(1);
    expect(out.log).not.toHaveBeenCalled();
    expect(out.error).toHaveBeenCalledWith(expect.stringContaining("  - missing required asset: images/govuk-crest.svg"));
    expect(out.error).toHaveBeenCalledWith(expect.stringContaining("Check the viteStaticCopy targets in vite.build.ts"));
  });
});
