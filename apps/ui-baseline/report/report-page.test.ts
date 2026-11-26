import { describe, expect, it } from "vitest";
import { reportPageContext } from "./report-page.mjs";

const context = (has: Parameters<typeof reportPageContext>[0]["has"], active: string | null = null, depth = 0) => ({
  navigation: reportPageContext({ title: "Report", body: "", depth, active, has, footerMeta: "", filterScript: "" }).navigation as NavigationSection[]
});

const menu = (navigation: NavigationSection[], text: string) => navigation.find((section) => section.text === text);

describe("reportPageContext", () => {
  it("should put each kind of file the run compared under one Files menu", () => {
    // Act
    const { navigation } = context({ comparison: true, pdfs: true, excel: true });

    // Assert
    expect(menu(navigation, "Files")).toEqual({
      text: "Files",
      items: [
        { text: "PDF files", href: "./pdfs.html", active: false, ariaCurrent: "page" },
        { text: "Excel files", href: "./excel.html", active: false, ariaCurrent: "page" }
      ]
    });
  });

  it("should leave out the Files menu when the run compared no files", () => {
    // Act
    const { navigation } = context({ comparison: true });

    // Assert
    expect(menu(navigation, "Files")).toBeUndefined();
  });

  it("should keep a report written before files had pages of their own linking to its one Files page", () => {
    // Act
    const { navigation } = context({ comparison: true, files: true });

    // Assert
    expect(navigation.filter((section) => section.text === "Files")).toEqual([{ text: "Files", href: "./files.html", active: false, ariaCurrent: "page" }]);
  });

  it("should mark the kind of file a file's own page belongs to", () => {
    // Act
    const { navigation } = context({ comparison: true, pdfs: true }, "pdfs.html", 1);

    // Assert
    expect(menu(navigation, "Files")).toMatchObject({ items: [{ text: "PDF files", href: "../pdfs.html", active: true, ariaCurrent: "true" }] });
  });
});

interface NavigationSection {
  text: string;
  href?: string;
  items?: unknown[];
}
