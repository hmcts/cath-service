/**
 * Translates an Ajv schema error into the message the incumbent produces, so a publisher sees
 * the same text from cath-service as from pip-data-management.
 *
 * pip-data-management validates with com.networknt:json-schema-validator 3.0.4 and puts
 * `ValidationMessage.toString()` straight into the response. Those messages are prefixed with the
 * failing instance location as a JSON Pointer — the same form Ajv reports in `instancePath` — so
 * the two map onto each other directly:
 *
 *   networknt: /document: required property 'publicationDate' not found
 *   ajv:       instancePath "/document", params.missingProperty "publicationDate"
 *
 * Only `required` is matched word for word, because that is the failure publishers actually hit
 * and the one confirmed against real output. Every other keyword keeps Ajv's wording but gains
 * the same location prefix, which is still far more useful than a bare "must be string". If
 * another keyword's exact phrasing turns out to matter, add it to the switch.
 */
export function formatSchemaError(error: unknown): string {
  if (!isAjvError(error)) {
    return "Invalid publication payload";
  }

  // An empty instancePath means the root of the payload. networknt renders the root JSON Pointer
  // as an empty string, so the message legitimately starts with ": " in that case.
  const location = error.instancePath ?? "";

  if (error.keyword === "required") {
    const missingProperty = error.params?.missingProperty;
    if (missingProperty) {
      return `${location}: required property '${missingProperty}' not found`;
    }
  }

  return `${location}: ${error.message ?? "is invalid"}`;
}

function isAjvError(error: unknown): error is AjvError {
  return typeof error === "object" && error !== null && ("instancePath" in error || "message" in error);
}

interface AjvError {
  instancePath?: string;
  keyword?: string;
  message?: string;
  params?: { missingProperty?: string };
}
