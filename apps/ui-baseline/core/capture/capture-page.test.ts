import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capturePage, expandAll } from "./capture-page.js";

vi.mock("@axe-core/playwright", () => ({ AxeBuilder: vi.fn() }));

interface Overflowing {
  scrollWidth: number;
  clientWidth: number;
  left: number;
  overflowX: string;
}

// Enough of a document for the functions capturePage runs in the browser
function fakeDocument(overflowing: Overflowing[] = []) {
  const element = (attributes: Record<string, string>, extra: Record<string, unknown> = {}) => ({
    getAttribute: (name: string) => attributes[name] ?? null,
    ...extra
  });
  const fields = [
    { name: "q", type: "text", tagName: "INPUT" },
    { name: "court", type: "", tagName: "SELECT" },
    { name: "token", type: "hidden", tagName: "INPUT" }
  ];
  const region = {
    querySelectorAll: (selector: string) => {
      if (selector === "h1") return [{ textContent: "  Find \n a court " }, { textContent: null }];
      if (selector === "form")
        return [element({ action: "/search", method: "POST" }, { querySelectorAll: () => fields }), element({}, { querySelectorAll: () => [] })];
      if (selector === "a[href]") return [element({ href: "/" }, { textContent: " Home " }), element({ href: "/a" }, { textContent: null })];
      return [];
    }
  };
  return {
    title: " Find a court ",
    documentElement: { lang: "en", scrollWidth: 1000 },
    body: region,
    querySelector: (selector: string) => {
      if (selector === ".govuk-back-link") return element({ href: "/" });
      return selector === "main" ? region : null;
    },
    querySelectorAll: (selector: string) =>
      selector === "body *"
        ? overflowing.map((o) => ({
            scrollWidth: o.scrollWidth,
            clientWidth: o.clientWidth,
            getBoundingClientRect: () => ({ left: o.left }),
            overflowX: o.overflowX
          }))
        : []
  };
}

function fakePage(viewport: { width: number; height: number } | null = { width: 1280, height: 800 }) {
  const region = {
    waitFor: vi.fn().mockResolvedValue(undefined),
    ariaSnapshot: vi.fn().mockResolvedValue('- heading "Find a court" [level=1]'),
    innerText: vi.fn().mockResolvedValue("  Find   a court \n\n  Search  \n"),
    innerHTML: vi.fn().mockResolvedValue("<h1>Find a court</h1>")
  };
  const body = {
    ariaSnapshot: vi.fn().mockResolvedValue('- banner\n- main:\n  - heading "Find a court" [level=1]'),
    innerHTML: vi.fn().mockResolvedValue("<header></header><main><h1>Find a court</h1></main>")
  };
  const styleElement = { remove: vi.fn() };
  const style = { evaluate: vi.fn(async (fn: (element: unknown) => unknown) => fn(styleElement)) };
  const page = {
    locator: vi.fn((selector: string) => (selector === "body" ? body : { first: () => region })),
    url: vi.fn(() => "http://localhost:8080/search"),
    evaluate: vi.fn(async (fn: (arg?: unknown) => unknown, arg?: unknown) => fn(arg)),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("")),
    viewportSize: vi.fn(() => viewport),
    addStyleTag: vi.fn().mockResolvedValue(style),
    setViewportSize: vi.fn().mockResolvedValue(undefined)
  };
  return { page, region, styleElement };
}

describe("capturePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("document", fakeDocument());
    vi.stubGlobal("getComputedStyle", (element: { overflowX: string }) => ({ overflowX: element.overflowX }));
    vi.mocked(AxeBuilder).mockImplementation(function (this: unknown) {
      return {
        withTags: vi.fn().mockReturnThis(),
        analyze: vi.fn().mockResolvedValue({
          violations: [
            { id: "color-contrast", impact: "serious", help: "Contrast", helpUrl: "https://axe/cc", nodes: [{ target: ["main", "p"] }] },
            { id: "region", impact: undefined, help: "Regions", helpUrl: "https://axe/r", nodes: [] }
          ],
          incomplete: [{ id: "color-contrast", impact: "serious", help: "Contrast", helpUrl: "https://axe/cc", nodes: [{ target: [".disabled"] }] }],
          passes: [{}, {}]
        })
      };
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should write the region's tree, text, page details, axe results and a screenshot when the page loads", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    const { page } = fakePage();

    // Act
    const meta = await capturePage(page as unknown as Page, outDir, { status: 200 });

    // Assert
    expect(meta).toEqual({
      url: "http://localhost:8080/search",
      status: 200,
      region: "main",
      title: "Find a court",
      lang: "en",
      h1: ["Find a court", ""],
      backLink: "/",
      forms: [
        {
          action: "/search",
          method: "post",
          fields: [
            { name: "q", type: "text" },
            { name: "court", type: "select" }
          ]
        },
        { action: null, method: "get", fields: [] }
      ],
      links: [
        { text: "Home", href: "/" },
        { text: "", href: "/a" }
      ],
      reflow: null
    });
    expect(page.locator).toHaveBeenCalledWith("main");
    expect(await readFile(path.join(outDir, "aria.yml"), "utf-8")).toBe('- heading "Find a court" [level=1]\n');
    expect(await readFile(path.join(outDir, "page.aria.yml"), "utf-8")).toContain("- banner");
    expect(await readFile(path.join(outDir, "text.txt"), "utf-8")).toBe("Find a court\nSearch\n");
    expect(await readFile(path.join(outDir, "raw.html"), "utf-8")).toBe("<h1>Find a court</h1>");
    expect(await readFile(path.join(outDir, "page.html"), "utf-8")).toBe("<header></header><main><h1>Find a court</h1></main>");
    expect(JSON.parse(await readFile(path.join(outDir, "meta.json"), "utf-8"))).toEqual(meta);
    expect(JSON.parse(await readFile(path.join(outDir, "axe.json"), "utf-8"))).toEqual({
      violations: [
        { id: "color-contrast", impact: "serious", help: "Contrast", helpUrl: "https://axe/cc", targets: ["main p"] },
        { id: "region", impact: null, help: "Regions", helpUrl: "https://axe/r", targets: [] }
      ],
      incompleteCount: 1,
      incomplete: [{ id: "color-contrast", impact: "serious", help: "Contrast", helpUrl: "https://axe/cc", targets: [".disabled"] }],
      passesCount: 2
    });
    expect(page.screenshot).toHaveBeenCalledTimes(1);
    expect(page.screenshot).toHaveBeenCalledWith({ path: path.join(outDir, "page.png"), fullPage: true, animations: "disabled" });
    expect(page.addStyleTag).not.toHaveBeenCalled();
    expect(page.setViewportSize).not.toHaveBeenCalled();
  });

  it("should measure reflow at 320px on a mobile capture and restore its width", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    const { page } = fakePage({ width: 375, height: 800 });

    // Act
    const meta = await capturePage(page as unknown as Page, outDir);

    // Assert
    expect(meta.reflow).toEqual({ width: 320, scrollWidth: 1000 });
    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 320, height: 800 });
    expect(page.setViewportSize).toHaveBeenLastCalledWith({ width: 375, height: 800 });
  });

  it("should restore a mobile capture's width when measuring reflow fails", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    const { page } = fakePage({ width: 375, height: 800 });
    const evaluate = page.evaluate.getMockImplementation() as (fn: () => unknown, arg?: unknown) => Promise<unknown>;
    page.evaluate.mockImplementation(async (fn: () => unknown, arg?: unknown) => {
      if (page.setViewportSize.mock.calls.at(-1)?.[0]?.width === 320) throw new Error("Execution context was destroyed");
      return evaluate(fn, arg);
    });

    // Act
    const capture = capturePage(page as unknown as Page, outDir);

    // Assert
    await expect(capture).rejects.toThrow("Execution context was destroyed");
    expect(page.setViewportSize).toHaveBeenLastCalledWith({ width: 375, height: 800 });
  });

  it("should read the given region, falling back to the body for details, when a region is given", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    const { page } = fakePage();

    // Act
    const meta = await capturePage(page as unknown as Page, outDir, { region: "#content" });

    // Assert
    expect(page.locator).toHaveBeenCalledWith("#content");
    expect(page.evaluate.mock.calls[0][1]).toBe("#content");
    expect(meta.status).toBeNull();
    expect(meta.h1).toEqual(["Find a court", ""]);
  });

  it("should take a widened page-full.png and restore the viewport when content overflows sideways", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    vi.stubGlobal(
      "document",
      fakeDocument([
        { scrollWidth: 1700, clientWidth: 900, left: 267.5, overflowX: "auto" },
        { scrollWidth: 5000, clientWidth: 100, left: 0, overflowX: "visible" },
        { scrollWidth: 400, clientWidth: 400, left: 0, overflowX: "auto" }
      ])
    );
    const { page, styleElement } = fakePage();

    // Act
    await capturePage(page as unknown as Page, outDir);

    // Assert
    expect(page.addStyleTag).toHaveBeenCalledTimes(1);
    expect(page.setViewportSize).toHaveBeenNthCalledWith(1, { width: 2000, height: 800 });
    expect(page.screenshot).toHaveBeenLastCalledWith({ path: path.join(outDir, "page-full.png"), fullPage: true, animations: "disabled" });
    expect(styleElement.remove).toHaveBeenCalledTimes(1);
    expect(page.setViewportSize).toHaveBeenLastCalledWith({ width: 1280, height: 800 });
  });

  it("should restore the viewport and styles when the widened screenshot fails", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    vi.stubGlobal("document", fakeDocument([{ scrollWidth: 1700, clientWidth: 900, left: 267.5, overflowX: "auto" }]));
    const { page, styleElement } = fakePage();
    page.screenshot.mockResolvedValueOnce(Buffer.from("")).mockRejectedValueOnce(new Error("Target closed"));

    // Act
    const capture = capturePage(page as unknown as Page, outDir);

    // Assert
    await expect(capture).rejects.toThrow("Target closed");
    expect(styleElement.remove).toHaveBeenCalledTimes(1);
    expect(page.setViewportSize).toHaveBeenLastCalledWith({ width: 1280, height: 800 });
  });

  it("should take only page.png when the page has no viewport", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-page-"));
    vi.stubGlobal("document", fakeDocument([{ scrollWidth: 3000, clientWidth: 100, left: 0, overflowX: "scroll" }]));
    const { page } = fakePage(null);

    // Act
    await capturePage(page as unknown as Page, outDir);

    // Assert
    expect(page.screenshot).toHaveBeenCalledTimes(1);
    expect(page.setViewportSize).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(path.join(outDir, "meta.json"), "utf-8")).reflow).toBeNull();
  });

  it("should fail without writing anything when the region never appears", async () => {
    // Arrange
    const outDir = path.join(await mkdtemp(path.join(tmpdir(), "capture-page-")), "state");
    const { page, region } = fakePage();
    region.waitFor.mockRejectedValue(new Error("Timeout 5000ms exceeded"));

    // Act
    const capture = capturePage(page as unknown as Page, outDir);

    // Assert
    await expect(capture).rejects.toThrow("Timeout 5000ms exceeded");
    await expect(readFile(path.join(outDir, "aria.yml"))).rejects.toThrow();
  });
});

describe("expandAll", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubCollapsed(counts: { details: number; showAll: number; sections: number }) {
    const details = Array.from({ length: counts.details }, () => ({ open: false }));
    const showAll = Array.from({ length: counts.showAll }, () => ({ click: vi.fn() }));
    const sections = Array.from({ length: counts.sections }, () => ({ click: vi.fn() }));
    vi.stubGlobal("document", {
      querySelectorAll: (selector: string) => {
        if (selector === "details") return [...details, { open: true }];
        if (selector.includes("show-all")) return showAll;
        return sections;
      }
    });
    const page = { evaluate: vi.fn(async (fn: () => unknown) => fn()) };
    return { page, details, showAll, sections };
  }

  it("should open details and click show-all rather than each section when the accordion has show-all", async () => {
    // Arrange
    const { page, details, showAll, sections } = stubCollapsed({ details: 2, showAll: 1, sections: 3 });

    // Act
    const expanded = await expandAll(page as unknown as Page);

    // Assert
    expect(expanded).toBe(true);
    expect(details.every((d) => d.open)).toBe(true);
    expect(showAll[0].click).toHaveBeenCalledTimes(1);
    expect(sections.some((s) => s.click.mock.calls.length > 0)).toBe(false);
  });

  it("should click each closed section when the accordion has no show-all button", async () => {
    // Arrange
    const { page, sections } = stubCollapsed({ details: 0, showAll: 0, sections: 2 });

    // Act
    const expanded = await expandAll(page as unknown as Page);

    // Assert
    expect(expanded).toBe(true);
    expect(sections.every((s) => s.click.mock.calls.length === 1)).toBe(true);
  });

  it("should return false when there is nothing to open", async () => {
    // Arrange
    const { page } = stubCollapsed({ details: 0, showAll: 0, sections: 0 });

    // Act
    const expanded = await expandAll(page as unknown as Page);

    // Assert
    expect(expanded).toBe(false);
  });
});
