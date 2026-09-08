import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

// The preview deploy cannot merge into this chart's keyVaults list: Helm replaces arrays
// rather than merging them, so helm/cath-service/values.preview.template.yaml restates the
// whole list to swap the SSO app registration. These tests fail if the two drift apart, or
// if a -dev secret ever reaches the file aat and Flux deploy from.
const ALLOWED_NAME_OVERRIDES: Record<string, { base: string; preview: string }> = {
  SSO_CLIENT_ID: { base: "sso-client-id", preview: "sso-client-id-dev" },
  SSO_CLIENT_SECRET: { base: "sso-client-secret", preview: "sso-client-secret-dev" }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

function readSecrets(relativePath: string, extract: (doc: any) => unknown): Map<string, string> {
  const doc = parse(readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
  const secrets = extract(doc) as Array<{ name: string; alias: string }>;
  return new Map(secrets.map(({ name, alias }) => [alias, name]));
}

const base = readSecrets("apps/web/helm/values.yaml", (d) => d.nodejs.keyVaults.cath.secrets);
const preview = readSecrets("helm/cath-service/values.preview.template.yaml", (d) => d["cath-web"].nodejs.keyVaults.cath.secrets);

describe("web keyVaults parity between values.yaml and values.preview.template.yaml", () => {
  it("should expose the same set of aliases in both files", () => {
    expect([...preview.keys()].sort()).toEqual([...base.keys()].sort());
  });

  it("should map every alias to the same secret name apart from the documented SSO overrides", () => {
    const differing = [...base.entries()].filter(([alias, name]) => preview.get(alias) !== name).map(([alias]) => alias);

    expect(differing.sort()).toEqual(Object.keys(ALLOWED_NAME_OVERRIDES).sort());
  });

  it.each(Object.entries(ALLOWED_NAME_OVERRIDES))(
    "should point %s at the dev app registration in preview only",
    (alias, { base: baseName, preview: previewName }) => {
      expect(base.get(alias)).toBe(baseName);
      expect(preview.get(alias)).toBe(previewName);
    }
  );
});

describe("aat and Flux must never deploy a -dev secret", () => {
  // values.yaml is the subchart default for the aat pipeline deploy and for the Flux-managed
  // cath-web release. A -dev secret here would point aat at the wrong app registration.
  it("should not reference any -dev secret in values.yaml", () => {
    const devNames = [...base.values()].filter((name) => name.endsWith("-dev"));

    expect(devNames).toEqual([]);
  });

  it("should reference only the SSO overrides as -dev secrets in the preview template", () => {
    const devAliases = [...preview.entries()].filter(([, name]) => name.endsWith("-dev")).map(([alias]) => alias);

    expect(devAliases.sort()).toEqual(Object.keys(ALLOWED_NAME_OVERRIDES).sort());
  });
});
