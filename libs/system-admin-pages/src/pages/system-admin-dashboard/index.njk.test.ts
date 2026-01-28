import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("system-admin-dashboard template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have required properties", () => {
      expect(en).toHaveProperty("title");
      expect(en).toHaveProperty("tiles");
    });

    it("should have correct title", () => {
      expect(en.title).toBe("System Admin Dashboard");
    });

    it("should have 8 tiles", () => {
      expect(en.tiles).toHaveLength(8);
    });

    it("should have tiles with required properties", () => {
      en.tiles.forEach((tile) => {
        expect(tile).toHaveProperty("title");
        expect(tile).toHaveProperty("description");
        expect(tile).toHaveProperty("href");
        expect(tile.title).toBeTruthy();
        expect(tile.description).toBeTruthy();
        expect(tile.href).toMatch(/^\//);
      });
    });

    it("should have correct tile order and titles", () => {
      expect(en.tiles[0].title).toBe("Upload Reference Data");
      expect(en.tiles[1].title).toBe("Delete Court");
      expect(en.tiles[2].title).toBe("Manage Third-Party Users");
      expect(en.tiles[3].title).toBe("User Management");
      expect(en.tiles[4].title).toBe("Blob Explorer");
      expect(en.tiles[5].title).toBe("Bulk Create Media Accounts");
      expect(en.tiles[6].title).toBe("Audit Log Viewer");
      expect(en.tiles[7].title).toBe("Manage Location Metadata");
    });

    it("should have correct href for each tile", () => {
      expect(en.tiles[0].href).toBe("/upload-reference-data");
      expect(en.tiles[1].href).toBe("/delete-court");
      expect(en.tiles[2].href).toBe("/third-party-users");
      expect(en.tiles[3].href).toBe("/user-management");
      expect(en.tiles[4].href).toBe("/blob-explorer-locations");
      expect(en.tiles[5].href).toBe("/bulk-media-accounts");
      expect(en.tiles[6].href).toBe("/audit-log-list");
      expect(en.tiles[7].href).toBe("/location-metadata");
    });

    it("should have descriptions for all tiles", () => {
      expect(en.tiles[0].description).toBe("Upload CSV location reference data");
      expect(en.tiles[1].description).toBe("Delete court from reference data");
      expect(en.tiles[2].description).toBe("View, create, update and remove third-party users and subscriptions");
      expect(en.tiles[3].description).toBe("Search, update and delete users");
      expect(en.tiles[4].description).toBe("Discover content uploaded to all locations");
      expect(en.tiles[5].description).toBe("Upload a CSV file for bulk creation of media accounts");
      expect(en.tiles[6].description).toBe("View audit logs on system admin actions");
      expect(en.tiles[7].description).toBe("View, update and remove location metadata");
    });
  });
});
