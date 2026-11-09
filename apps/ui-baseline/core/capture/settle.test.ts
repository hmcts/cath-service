import { EventEmitter } from "node:events";
import type { BrowserContext, Page, Request } from "playwright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gotoSettled, settle, trackRequests } from "./settle.js";

function fakeContext() {
  const context = new EventEmitter();
  const page = {
    context: () => context,
    goto: vi.fn().mockResolvedValue({ status: () => 200 }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined)
  };
  return { context, page };
}

function fakeRequest(resourceType: string) {
  return { resourceType: () => resourceType } as unknown as Request;
}

// Settles settle() while time moves on, so its quiet window is counted on fake timers
async function settled(promise: Promise<void>, ms: number): Promise<boolean> {
  let done = false;
  void promise.then(() => {
    done = true;
  });
  await vi.advanceTimersByTimeAsync(ms);
  return done;
}

describe("settle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should wait for networkidle when the page's context is not tracked", async () => {
    // Arrange
    const { page } = fakeContext();

    // Act
    await settle(page as unknown as Page);

    // Assert
    expect(page.waitForLoadState).toHaveBeenCalledWith("networkidle");
  });

  it("should finish a short quiet window after load when the page makes no requests", async () => {
    // Arrange
    const { context, page } = fakeContext();
    trackRequests(context as unknown as BrowserContext);

    // Act
    const waiting = settle(page as unknown as Page);

    // Assert
    expect(await settled(waiting, 60)).toBe(false);
    expect(await settled(waiting, 60)).toBe(true);
    expect(page.waitForLoadState).toHaveBeenCalledWith("load");
  });

  it("should wait while a fetch is in flight, then for the quiet window after it finishes", async () => {
    // Arrange
    const { context, page } = fakeContext();
    trackRequests(context as unknown as BrowserContext);
    const locations = fakeRequest("fetch");
    context.emit("request", locations);

    // Act
    const waiting = settle(page as unknown as Page);

    // Assert
    expect(await settled(waiting, 1000)).toBe(false);
    context.emit("requestfinished", locations);
    expect(await settled(waiting, 60)).toBe(false);
    expect(await settled(waiting, 60)).toBe(true);
  });

  it("should not wait for a failed fetch once it has failed", async () => {
    // Arrange
    const { context, page } = fakeContext();
    trackRequests(context as unknown as BrowserContext);
    const broken = fakeRequest("xhr");
    context.emit("request", broken);
    context.emit("requestfailed", broken);

    // Act
    const waiting = settle(page as unknown as Page);

    // Assert
    expect(await settled(waiting, 120)).toBe(true);
  });

  it("should ignore requests that are not the page's own fetches", async () => {
    // Arrange
    const { context, page } = fakeContext();
    trackRequests(context as unknown as BrowserContext);
    context.emit("request", fakeRequest("image"));

    // Act
    const waiting = settle(page as unknown as Page);

    // Assert
    expect(await settled(waiting, 120)).toBe(true);
  });

  it("should give up after ten seconds when a fetch never finishes", async () => {
    // Arrange
    const { context, page } = fakeContext();
    trackRequests(context as unknown as BrowserContext);
    context.emit("request", fakeRequest("fetch"));

    // Act
    const waiting = settle(page as unknown as Page);

    // Assert
    expect(await settled(waiting, 9_900)).toBe(false);
    expect(await settled(waiting, 200)).toBe(true);
  });
});

describe("gotoSettled", () => {
  it("should navigate to load, settle the page and give back the navigation's response", async () => {
    // Arrange
    const { page } = fakeContext();

    // Act
    const response = await gotoSettled(page as unknown as Page, "http://localhost/search");

    // Assert
    expect(page.goto).toHaveBeenCalledWith("http://localhost/search", { waitUntil: "load" });
    expect(page.waitForLoadState).toHaveBeenCalledWith("networkidle");
    expect(response?.status()).toBe(200);
  });
});
