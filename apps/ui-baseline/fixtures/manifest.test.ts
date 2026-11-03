import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadManifest, loadUsers, type Manifest, type PublicationFixture, publicationMetadata, readPayload } from "./manifest.js";

const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));

describe("manifest", () => {
  describe("loadManifest", () => {
    it("should load the publications fixture", async () => {
      // Act
      const manifest = await loadManifest();

      // Assert
      expect(manifest.displayWindowDays).toEqual({ before: expect.any(Number), after: expect.any(Number) });
      expect(manifest.publications.length).toBeGreaterThan(0);
    });
  });

  describe("loadUsers", () => {
    it("should load the fixture users", async () => {
      // Act
      const users = await loadUsers();

      // Assert
      expect(users.map((user) => user.id)).toContain("verified-media");
    });
  });

  describe("readPayload", () => {
    it("should read a publication's payload from the fixtures directory", async () => {
      // Arrange
      const publication = (await loadManifest()).publications[0];

      // Act
      const payload = await readPayload(publication);

      // Assert
      expect(payload.equals(await readFile(path.join(FIXTURES_DIR, publication.payload)))).toBe(true);
    });
  });

  describe("publicationMetadata", () => {
    const manifest = { displayWindowDays: { before: 1, after: 30 }, publications: [] } as Manifest;
    const publication = {
      contentDate: "2022-02-14",
      type: "LIST",
      language: "ENGLISH",
      sensitivity: "PUBLIC",
      provenance: "MANUAL_UPLOAD"
    } as PublicationFixture;

    it("should give the display window as London wall-clock time in summer", () => {
      // Act
      const metadata = publicationMetadata(publication, manifest, new Date("2026-07-10T12:00:00Z"));

      // Assert
      expect(metadata).toEqual({
        contentDate: "2022-02-14T00:00:00",
        displayFrom: "2026-07-09T13:00:00",
        displayTo: "2026-08-09T13:00:00",
        type: "LIST",
        language: "ENGLISH",
        sensitivity: "PUBLIC",
        provenance: "MANUAL_UPLOAD"
      });
    });

    it("should give the display window as London wall-clock time in winter", () => {
      // Act
      const metadata = publicationMetadata(publication, manifest, new Date("2026-01-10T23:30:05Z"));

      // Assert
      expect(metadata.displayFrom).toBe("2026-01-09T23:30:05");
      expect(metadata.displayTo).toBe("2026-02-09T23:30:05");
    });
  });
});
