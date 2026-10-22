const PUBLISHER_KEYS = ["info", "servers", "securitySchemes", "listTypeDescription", "schemaBaseUrl"] as const;
const LIST_TYPE_PARAMETER = "ListType";
const LIST_TYPE_PARAMETER_REF = `#/components/parameters/${LIST_TYPE_PARAMETER}`;
const LIST_TYPE_HEADER = "x-list-type";
const COMPONENT_REF_PATTERN = /^#\/components\/([^/]+)\/([^/]+)$/;

export function buildPublisherDocument({ source, apimOperations, listTypes }: PublisherInputs): OpenApiDocument {
  const publisher = readPublisherOverrides(source);
  const paths = selectOperations(source, apimOperations);
  const security = Object.keys(publisher.securitySchemes).map((name) => ({ [name]: [] }));

  assertUniqueOperationIds(paths);
  assertListTypeParameterUsed(paths);

  const sourceComponents = structuredClone(source.components ?? {});
  const components = {
    ...sourceComponents,
    securitySchemes: publisher.securitySchemes,
    parameters: {
      ...sourceComponents.parameters,
      [LIST_TYPE_PARAMETER]: buildListTypeParameter(source, publisher, listTypes)
    }
  };

  return {
    openapi: source.openapi,
    info: { ...source.info, ...publisher.info },
    servers: publisher.servers,
    tags: selectTags(source.tags ?? [], paths),
    security,
    paths,
    components: pruneComponents(components, paths, security)
  };
}

function readPublisherOverrides(source: OpenApiDocument): PublisherOverrides {
  const publisher = source["x-publisher"];

  if (!publisher) {
    throw new Error("docs/api/openapi.yaml has no x-publisher");
  }

  const missingKey = PUBLISHER_KEYS.find((key) => publisher[key] === undefined || publisher[key] === null);
  if (missingKey) {
    throw new Error(`docs/api/openapi.yaml has no x-publisher.${missingKey}`);
  }

  return structuredClone(publisher);
}

function selectOperations(source: OpenApiDocument, apimOperations: ApimOperations): OpenApiPaths {
  return Object.fromEntries(
    Object.entries(apimOperations).map(([path, methods]) => [
      path,
      Object.fromEntries(
        Object.entries(methods).map(([method, operationId]) => {
          const operation = source.paths?.[path]?.[method];
          if (!operation) {
            throw new Error(`apim-operations.json exposes ${method.toUpperCase()} ${path} but docs/api/openapi.yaml has no such operation`);
          }
          return [method, toPublisherOperation(operation, operationId)];
        })
      )
    ])
  );
}

// Operation-level security is always dropped so every operation inherits the document-level
// scheme. GET / is open on the service but APIM requires a token for it at the gateway.
function toPublisherOperation(operation: OpenApiOperation, operationId: string): OpenApiOperation {
  const { security: _security, ...rest } = structuredClone(operation);
  return "operationId" in rest ? { ...rest, operationId } : { operationId, ...rest };
}

function assertUniqueOperationIds(paths: OpenApiPaths) {
  const operationIds = Object.values(paths).flatMap((methods) => Object.values(methods).map((operation) => operation.operationId));
  const duplicate = operationIds.find((id, index) => operationIds.indexOf(id) !== index);

  if (duplicate) {
    throw new Error(`apim-operations.json assigns operationId ${duplicate} to more than one operation`);
  }
}

function assertListTypeParameterUsed(paths: OpenApiPaths) {
  const parameters = Object.values(paths).flatMap((methods) => Object.values(methods).flatMap((operation) => operation.parameters ?? []));

  if (parameters.some((parameter) => parameter.name === LIST_TYPE_HEADER)) {
    throw new Error(`${LIST_TYPE_HEADER} must be declared through ${LIST_TYPE_PARAMETER_REF}, not inline, so the list type enum can be applied`);
  }

  if (!parameters.some((parameter) => parameter.$ref === LIST_TYPE_PARAMETER_REF)) {
    throw new Error(`No exposed operation references ${LIST_TYPE_PARAMETER_REF}, so the list type enum has nowhere to go`);
  }
}

function buildListTypeParameter(source: OpenApiDocument, publisher: PublisherOverrides, listTypes: ListTypeSchemas[]): OpenApiParameter {
  const parameter = source.components?.parameters?.[LIST_TYPE_PARAMETER];

  if (!parameter) {
    throw new Error(`docs/api/openapi.yaml has no ${LIST_TYPE_PARAMETER_REF}`);
  }

  // Plain code-unit order rather than localeCompare, so the committed file is identical on every machine.
  const names = [...new Set(listTypes.map((listType) => listType.name))].sort();

  return {
    ...structuredClone(parameter),
    description: describeListTypes(publisher, listTypes),
    schema: { ...parameter.schema, enum: names }
  };
}

function describeListTypes(publisher: PublisherOverrides, listTypes: ListTypeSchemas[]): string {
  const preamble = publisher.listTypeDescription.trimEnd();
  const schemaLinks = [...new Map(listTypes.map((listType) => [listType.name, listType.schemaPaths])).entries()]
    .filter(([, schemaPaths]) => schemaPaths.length > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, schemaPaths]) => `- \`${name}\`: ${schemaPaths.map((schemaPath) => toMarkdownLink(publisher.schemaBaseUrl, schemaPath)).join(", ")}`);

  return schemaLinks.length > 0 ? `${preamble}\n\n${schemaLinks.join("\n")}\n` : `${preamble}\n`;
}

function toMarkdownLink(baseUrl: string, schemaPath: string): string {
  const fileName = schemaPath.slice(schemaPath.lastIndexOf("/") + 1);
  return `[${fileName}](${baseUrl}${schemaPath})`;
}

function selectTags(tags: OpenApiTag[], paths: OpenApiPaths): OpenApiTag[] {
  const usedTags = new Set(Object.values(paths).flatMap((methods) => Object.values(methods).flatMap((operation) => operation.tags ?? [])));
  return tags.filter((tag) => usedTags.has(tag.name));
}

function pruneComponents(components: OpenApiComponents, paths: OpenApiPaths, security: SecurityRequirement[]): OpenApiComponents {
  const reachable = new Set<string>();
  const pending = collectRefs(paths);

  while (pending.length > 0) {
    const ref = pending.pop()!;
    if (reachable.has(ref)) continue;

    const match = COMPONENT_REF_PATTERN.exec(ref);
    const component = match ? components[match[1]]?.[match[2]] : undefined;
    if (component === undefined) {
      throw new Error(`Unresolved $ref ${ref} in docs/api/openapi.yaml`);
    }

    reachable.add(ref);
    pending.push(...collectRefs(component));
  }

  for (const name of security.flatMap((requirement) => Object.keys(requirement))) {
    reachable.add(`#/components/securitySchemes/${name}`);
  }

  return Object.fromEntries(
    Object.entries(components)
      .map(([section, entries]): [string, Record<string, unknown>] => [
        section,
        Object.fromEntries(Object.entries(entries).filter(([name]) => reachable.has(`#/components/${section}/${name}`)))
      ])
      .filter(([, entries]) => Object.keys(entries).length > 0)
  );
}

function collectRefs(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectRefs);
  }

  if (node === null || typeof node !== "object") {
    return [];
  }

  return Object.entries(node).flatMap(([key, value]) => (key === "$ref" && typeof value === "string" ? [value] : collectRefs(value)));
}

export interface PublisherInputs {
  source: OpenApiDocument;
  apimOperations: ApimOperations;
  listTypes: ListTypeSchemas[];
}

export interface ListTypeSchemas {
  name: string;
  schemaPaths: string[];
}

export type ApimOperations = Record<string, Record<string, string>>;

export interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  servers?: unknown[];
  tags?: OpenApiTag[];
  security?: SecurityRequirement[];
  paths: OpenApiPaths;
  components?: OpenApiComponents;
  "x-publisher"?: PublisherOverrides;
}

interface PublisherOverrides {
  info: Record<string, unknown>;
  servers: unknown[];
  securitySchemes: Record<string, unknown>;
  listTypeDescription: string;
  schemaBaseUrl: string;
}

interface OpenApiTag {
  name: string;
  description?: string;
}

interface OpenApiOperation {
  operationId?: string;
  tags?: string[];
  security?: SecurityRequirement[];
  parameters?: OpenApiParameter[];
  [key: string]: unknown;
}

interface OpenApiParameter {
  $ref?: string;
  name?: string;
  schema?: Record<string, unknown>;
  [key: string]: unknown;
}

type OpenApiPaths = Record<string, Record<string, OpenApiOperation>>;

type OpenApiComponents = Record<string, Record<string, unknown>> & {
  parameters?: Record<string, OpenApiParameter>;
  securitySchemes?: Record<string, unknown>;
};

type SecurityRequirement = Record<string, string[]>;
