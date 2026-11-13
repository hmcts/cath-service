import { mkdtemp, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "./browser.js";
import { type CaptureServer, startCaptureServer } from "./capture-server.js";
import { captureTarget } from "./capture-target.js";

vi.mock("./browser.js", () => ({ launchChromium: vi.fn() }));
vi.mock("./capture-target.js", () => ({ captureTarget: vi.fn() }));

// The server reports the port it was asked for, so it needs a real one rather than 0
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as { port: number };
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

const RESULT = { ok: true, id: "home", locale: "en", state: "default", outDir: "/out/home/en/default", status: 200 };

describe("startCaptureServer", () => {
  const browser = { close: vi.fn().mockResolvedValue(undefined) };
  let server: CaptureServer;
  let outDir: string;
  let base: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    outDir = path.join(await mkdtemp(path.join(tmpdir(), "capture-server-")), "out");
    server = await startCaptureServer({ outDir, port: await freePort(), region: "#main" });
    base = `http://127.0.0.1:${server.port}`;
  });

  afterEach(async () => {
    await server?.close().catch(() => undefined);
  });

  it("should create the output directory and answer health checks when started", async () => {
    // Act
    const response = await request(base).get("/health");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect((await stat(outDir)).isDirectory()).toBe(true);
  });

  it("should capture the posted target with the server's settings when POST /capture succeeds", async () => {
    // Arrange
    vi.mocked(captureTarget).mockResolvedValue([RESULT]);

    // Act
    const response = await request(base).post("/capture").send({ id: "home", url: "http://localhost/" });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ results: [RESULT] });
    expect(captureTarget).toHaveBeenCalledWith(browser, { id: "home", url: "http://localhost/" }, expect.objectContaining({ outDir, region: "#main" }));
  });

  it("should answer 500 with the results when any state fails", async () => {
    // Arrange
    vi.mocked(captureTarget).mockResolvedValue([RESULT, { ...RESULT, ok: false, state: "expanded", error: "timeout" }]);

    // Act
    const response = await request(base).post("/capture").send({ id: "home", url: "http://localhost/" });

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.results).toHaveLength(2);
  });

  it("should answer 500 with the error when the body is not JSON", async () => {
    // Act
    const response = await request(base).post("/capture").set("content-type", "text/plain").send("not json");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual(expect.any(String));
    expect(captureTarget).not.toHaveBeenCalled();
  });

  it("should answer 404 when the route is unknown", async () => {
    // Act
    const response = await request(base).get("/capture");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "not found" });
  });

  it("should close the browser when the server is closed", async () => {
    // Act
    await server.close();

    // Assert
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
