import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listTypeData } from "@hmcts/list-types-common/list-type-data";
import { resolveListTypePackageName } from "@hmcts/list-types-common/list-type-package";
import { parse } from "yaml";
import type { ApimOperations, ListTypeSchemas, OpenApiDocument, PublisherInputs } from "./publisher-document.js";

const SOURCE_DOCUMENT_PATH = "docs/api/openapi.yaml";
const APIM_OPERATIONS_PATH = "infrastructure/resources/apim-operations.json";
const LIST_TYPES_PATH = "libs/list-types";

export const PUBLISHER_DOCUMENT_PATH = "infrastructure/resources/swagger/api-swagger.json";
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function readPublisherInputs(repoRoot: string): PublisherInputs {
  return {
    source: parse(readFileSync(path.join(repoRoot, SOURCE_DOCUMENT_PATH), "utf-8")) as OpenApiDocument,
    apimOperations: JSON.parse(readFileSync(path.join(repoRoot, APIM_OPERATIONS_PATH), "utf-8")) as ApimOperations,
    listTypes: listTypeData.map(({ name }) => findListTypeSchemas(repoRoot, name))
  };
}

// Resolves through the same alias map validateListTypeJson uses, so a list type is documented as
// accepting JSON exactly when validation would find a schema for it.
function findListTypeSchemas(repoRoot: string, name: string): ListTypeSchemas {
  const schemaDirectory = `${LIST_TYPES_PATH}/${resolveListTypePackageName(name)}/src/schemas`;
  const absoluteSchemaDirectory = path.join(repoRoot, schemaDirectory);

  if (!existsSync(absoluteSchemaDirectory)) {
    return { name, schemaPaths: [] };
  }

  const schemaPaths = readdirSync(absoluteSchemaDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => `${schemaDirectory}/${fileName}`);

  return { name, schemaPaths };
}
