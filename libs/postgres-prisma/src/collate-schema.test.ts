import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./schema-discovery.js", () => ({
  getPrismaSchemas: vi.fn(() => ["/mock/lib1/prisma"])
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() }
}));

vi.mock("glob", () => ({
  globSync: vi.fn(() => [])
}));

import { collateSchemas } from "./collate-schema.js";

describe("collateSchemas", () => {
  const baseSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should combine base schema with lib schemas", async () => {
    // Arrange
    const libSchema = `model User {
  id String @id
  email String
}`;

    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(libSchema),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => ["/mock/lib1/prisma/schema.prisma"])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    const writtenSchema = deps.writeFile.mock.calls[0][1] as string;
    expect(writtenSchema).toContain(baseSchema);
    expect(writtenSchema).toContain("model User");
  });

  it("should deduplicate models with the same name", async () => {
    // Arrange
    const schema1 = `model User {
  id String @id
  email String
}`;
    const schema2 = `model User {
  id String @id
  name String
}`;

    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(schema1).mockResolvedValueOnce(schema2),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => ["/mock/schema1.prisma", "/mock/schema2.prisma"])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    const writtenSchema = deps.writeFile.mock.calls[0][1] as string;
    const modelCount = (writtenSchema.match(/model User/g) || []).length;
    expect(modelCount).toBe(1);
  });

  it("should deduplicate enums with the same name", async () => {
    // Arrange
    const schema1 = `enum Role {
  ADMIN
  USER
}`;
    const schema2 = `enum Role {
  ADMIN
  MODERATOR
}`;

    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(schema1).mockResolvedValueOnce(schema2),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => ["/mock/schema1.prisma", "/mock/schema2.prisma"])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    const writtenSchema = deps.writeFile.mock.calls[0][1] as string;
    const enumCount = (writtenSchema.match(/enum Role/g) || []).length;
    expect(enumCount).toBe(1);
  });

  it("should handle schemas with no models or enums", async () => {
    // Arrange
    const emptySchema = "// Just a comment, no models or enums";

    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(emptySchema),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => ["/mock/schema.prisma"])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    const writtenSchema = deps.writeFile.mock.calls[0][1] as string;
    expect(writtenSchema).toBe(baseSchema);
  });

  it("should combine multiple models and enums from different schemas", async () => {
    // Arrange
    const schema1 = `model User {
  id String @id
}

enum Role {
  ADMIN
  USER
}`;
    const schema2 = `model Post {
  id String @id
}

enum Status {
  ACTIVE
  INACTIVE
}`;

    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(schema1).mockResolvedValueOnce(schema2),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => ["/mock/schema1.prisma", "/mock/schema2.prisma"])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    const writtenSchema = deps.writeFile.mock.calls[0][1] as string;
    expect(writtenSchema).toContain("model User");
    expect(writtenSchema).toContain("model Post");
    expect(writtenSchema).toContain("enum Role");
    expect(writtenSchema).toContain("enum Status");
  });

  it("should create dist directory before writing", async () => {
    // Arrange
    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => [])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    expect(deps.mkdir).toHaveBeenCalledWith(expect.stringContaining("dist"), { recursive: true });
    expect(deps.writeFile).toHaveBeenCalledWith(expect.stringContaining("schema.prisma"), expect.any(String));
  });

  it("should use globSync to find prisma files in each lib path", async () => {
    // Arrange
    const deps = {
      readFile: vi.fn().mockResolvedValueOnce(baseSchema),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      globSync: vi.fn(() => [])
    };

    // Act
    await collateSchemas(deps);

    // Assert
    expect(deps.globSync).toHaveBeenCalledWith("**/*.prisma", expect.objectContaining({ absolute: true }));
  });
});
