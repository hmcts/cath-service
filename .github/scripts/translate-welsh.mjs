#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_PATH = join(__dirname, "../../templates/tech-spec-references/welsh-translations-catalogue.json");

let catalogue;
try {
  catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, "utf8"));
} catch (err) {
  console.error(`Failed to load Welsh translation catalogue from ${CATALOGUE_PATH}: ${err.message}`);
  process.exit(1);
}

if (typeof catalogue !== "object" || catalogue === null || Array.isArray(catalogue)) {
  console.error("Welsh translation catalogue must be a JSON object (key-value map).");
  process.exit(1);
}

const MARKER_REGEX = /\[TRANSLATE:\s*"([^"]+)"\]/g;

function translateMarkers(content) {
  return content.replace(MARKER_REGEX, (_match, englishText) => {
    const welsh = catalogue[englishText];
    if (welsh !== undefined && welsh !== "") {
      return welsh;
    }
    return `[WELSH TRANSLATION REQUIRED: "${englishText}"]`;
  });
}

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("error", (err) => {
  console.error(`stdin error: ${err.message}`);
  process.exit(1);
});
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const output = translateMarkers(input);
  process.stdout.write(output);
});
