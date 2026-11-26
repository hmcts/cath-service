import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPublisherDocument } from "./publisher-document.js";
import { PUBLISHER_DOCUMENT_PATH, REPO_ROOT, readPublisherInputs } from "./publisher-inputs.js";

try {
  const document = buildPublisherDocument(readPublisherInputs(REPO_ROOT));
  const destination = path.join(REPO_ROOT, PUBLISHER_DOCUMENT_PATH);
  const listTypeCount = (document.components?.parameters?.ListType?.schema?.enum as unknown[] | undefined)?.length ?? 0;

  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Wrote ${PUBLISHER_DOCUMENT_PATH} (OpenAPI ${document.openapi}, ${Object.keys(document.paths).length} paths, ${listTypeCount} list types)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
