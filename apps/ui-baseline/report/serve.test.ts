import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SERVE = path.join(path.dirname(fileURLToPath(import.meta.url)), "serve.mjs");

describe("serve.mjs", () => {
  let server: ChildProcess | null = null;

  afterEach(() => {
    server?.kill();
    server = null;
  });

  it("should serve files in the report but not in a sibling directory whose name starts with the report's", async () => {
    // Arrange
    const parent = await mkdtemp(path.join(tmpdir(), "serve-"));
    await mkdir(path.join(parent, "report"));
    await mkdir(path.join(parent, "report-old"));
    await writeFile(path.join(parent, "report", "index.html"), "<h1>Report</h1>");
    await writeFile(path.join(parent, "report-old", "secret.json"), '{"secret":true}');
    const port = await freePort();
    server = spawn(process.execPath, [SERVE, path.join(parent, "report"), String(port)], { stdio: ["ignore", "pipe", "inherit"] });
    await new Promise((resolve) => server?.stdout?.once("data", resolve));

    // Act
    const index = await fetch(`http://127.0.0.1:${port}/`);
    const sibling = await fetch(`http://127.0.0.1:${port}/..%2Freport-old/secret.json`);

    // Assert
    expect(index.status).toBe(200);
    expect(await index.text()).toBe("<h1>Report</h1>");
    expect(sibling.status).toBe(403);
  });
});

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as { port: number };
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
