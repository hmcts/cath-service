import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

// Assets copied out of govuk-frontend must land at these flat paths because the
// compiled CSS references them as /assets/<path>. A dependency bump that changes
// how vite-plugin-static-copy resolves destinations relocates them silently: the
// build still succeeds, the smoke test still gets HTTP 200, and E2E still passes,
// but the GDS Transport font and the footer crown crest 404 in the browser.
const REQUIRED_ASSETS = ["images/govuk-crest.svg", "manifest.json"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssets = path.join(__dirname, "dist", "assets");

function findMissingRequiredAssets(): string[] {
  return REQUIRED_ASSETS.filter((asset) => !existsSync(path.join(distAssets, asset)));
}

// Font filenames carry a content hash that changes between govuk-frontend
// versions, so assert the directory is populated rather than naming files.
function findFontProblems(): string[] {
  const fontsDir = path.join(distAssets, "fonts");

  if (!existsSync(fontsDir)) {
    return ["fonts/ directory is missing"];
  }

  const fonts = readdirSync(fontsDir).filter((f) => f.endsWith(".woff") || f.endsWith(".woff2"));

  return fonts.length === 0 ? ["fonts/ contains no .woff or .woff2 files"] : [];
}

// The authoritative check: every /assets/... URL the compiled CSS emits must
// resolve to a real file on disk.
function findUnresolvedCssReferences(): string[] {
  const cssFiles = glob.sync(path.join(distAssets, "css", "*.css"));
  const problems: string[] = [];

  for (const cssFile of cssFiles) {
    const css = readFileSync(cssFile, "utf8");
    const referenced = new Set(Array.from(css.matchAll(/url\(\/assets\/([^)"']+)\)/g), (m) => m[1]));

    for (const reference of referenced) {
      if (!existsSync(path.join(distAssets, reference))) {
        problems.push(`${path.basename(cssFile)} references /assets/${reference} which does not exist`);
      }
    }
  }

  return problems;
}

if (!existsSync(distAssets)) {
  console.error(`verify-assets: ${distAssets} does not exist — run the build first.`);
  process.exit(1);
}

const problems = [...findMissingRequiredAssets().map((a) => `missing required asset: ${a}`), ...findFontProblems(), ...findUnresolvedCssReferences()];

if (problems.length > 0) {
  console.error("verify-assets: build output is missing GOV.UK Frontend assets.\n");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error("\nCheck the viteStaticCopy targets in vite.build.ts — a plugin upgrade may have changed how dest paths are resolved.");
  process.exit(1);
}

console.log("verify-assets: all GOV.UK Frontend assets present and all CSS asset references resolve.");
