import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

function readYaml(relativePath: string) {
  return parse(readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

describe("cath-crons chart values", () => {
  const values = readYaml("apps/crons/helm/values.yaml");
  const secrets: { name: string; alias: string }[] = values.job.keyVaults.cath.secrets;

  it.each([
    ["govuk-notify-api-key", "GOVUK_NOTIFY_API_KEY"],
    ["managed-redis-url", "REDIS_URL"],
    ["b2c-tenant-id", "AZURE_B2C_TENANT_ID"],
    ["b2c-<ENV>-graph-client-id", "B2C_GRAPH_CLIENT_ID"],
    ["b2c-<ENV>-graph-client-secret", "B2C_GRAPH_CLIENT_SECRET"]
  ])("should mount the %s secret as %s", (name, alias) => {
    expect(secrets).toContainEqual({ name, alias });
  });

  it("should set CATH_SERVICE_URL to the same value as the web chart", () => {
    const webValues = readYaml("apps/web/helm/values.yaml");

    expect(values.job.environment.CATH_SERVICE_URL).toBe("https://cath.{{ .Values.global.environment }}.platform.hmcts.net");
    expect(values.job.environment.CATH_SERVICE_URL).toBe(webValues.nodejs.environment.CATH_SERVICE_URL);
  });

  it("should keep the example script as the chart default", () => {
    expect(values.job.environment.SCRIPT_NAME).toBe("example");
  });
});
