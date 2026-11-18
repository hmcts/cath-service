import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

// Reads the real web and api config files, so a broken REDIS_MI mapping or a
// missing default fails here rather than in a deployed pod. Each case loads
// `config` in a fresh process because the package caches its values on first load.
function readManagedIdentity(app: string, redisMi: string | undefined): unknown {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_CONFIG_DIR: path.join(REPO_ROOT, "apps", app, "config"), NODE_ENV: "development" };
  delete env.REDIS_MI;
  if (redisMi !== undefined) env.REDIS_MI = redisMi;

  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", 'import config from "config"; console.log(JSON.stringify(config.get("redis.managedIdentity")));'],
    { cwd: __dirname, env, encoding: "utf8" }
  );
  return JSON.parse(output.trim());
}

describe.each(["web", "api"])("%s redis.managedIdentity config", (app) => {
  it.each([
    { redisMi: "true", expected: true },
    { redisMi: "false", expected: false },
    { redisMi: undefined, expected: false }
  ])("should be $expected when REDIS_MI is $redisMi", ({ redisMi, expected }) => {
    // Act
    const managedIdentity = readManagedIdentity(app, redisMi);

    // Assert
    expect(managedIdentity).toBe(expected);
  });
});
