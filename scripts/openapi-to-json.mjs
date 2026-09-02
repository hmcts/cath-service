#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";

const [source, destination] = process.argv.slice(2);

if (!source || !destination) {
  console.error("Usage: node scripts/openapi-to-json.mjs <source.yaml> <destination.json>");
  process.exit(1);
}

const document = parse(readFileSync(source, "utf-8"));

if (!document?.openapi) {
  console.error(`${source} does not look like an OpenAPI document: no top-level "openapi" key.`);
  process.exit(1);
}

writeFileSync(destination, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${destination} (OpenAPI ${document.openapi}, ${Object.keys(document.paths ?? {}).length} paths)`);
