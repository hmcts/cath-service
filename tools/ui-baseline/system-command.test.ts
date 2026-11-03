import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { systemCommand } from "./system-command.js";

describe("systemCommand", () => {
  it("should return the command from the first directory that has it", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "system-command-"));
    await mkdir(path.join(root, "first"));
    await mkdir(path.join(root, "second"));
    await writeFile(path.join(root, "second/tar"), "");
    await writeFile(path.join(root, "first/tar"), "");

    // Act
    const found = systemCommand("tar", [path.join(root, "first"), path.join(root, "second")]);

    // Assert
    expect(found).toBe(path.join(root, "first/tar"));
  });

  it("should throw when no directory has the command", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "system-command-"));

    // Act & Assert
    expect(() => systemCommand("tar", [root])).toThrow(`tar is not installed in ${root}`);
  });

  it("should find tar in the system directories", () => {
    expect(path.isAbsolute(systemCommand("tar"))).toBe(true);
  });
});
