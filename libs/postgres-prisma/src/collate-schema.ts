import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import { getPrismaSchemas } from "./schema-discovery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function collateSchemas(
  deps = {
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    mkdir: fs.mkdir,
    globSync
  }
) {
  const baseSchemaPath = path.join(__dirname, "../../../apps/postgres/prisma/schema.prisma");
  const baseSchema = await deps.readFile(baseSchemaPath, "utf-8");
  const libs = getPrismaSchemas();
  const schemaPaths = libs.flatMap((lib) =>
    deps.globSync("**/*.prisma", {
      cwd: lib,
      absolute: true
    })
  );

  let combinedSchema = baseSchema;
  const definedModels = new Set<string>();
  const definedEnums = new Set<string>();

  for (const schemaPath of schemaPaths) {
    const schemaContent = await deps.readFile(schemaPath, "utf-8");

    // Extract models
    const modelMatches = schemaContent.matchAll(/^model\s+(\w+)\s*{[\s\S]*?^}/gm);
    for (const match of modelMatches) {
      const modelName = match[1];
      if (!definedModels.has(modelName)) {
        combinedSchema += `\n${match[0]}`;
        definedModels.add(modelName);
      }
    }

    // Extract enums
    const enumMatches = schemaContent.matchAll(/^enum\s+(\w+)\s*{[\s\S]*?^}/gm);
    for (const match of enumMatches) {
      const enumName = match[1];
      if (!definedEnums.has(enumName)) {
        combinedSchema += `\n${match[0]}`;
        definedEnums.add(enumName);
      }
    }
  }

  const distDir = path.join(__dirname, "../dist");
  await deps.mkdir(distDir, { recursive: true });
  await deps.writeFile(path.join(distDir, "schema.prisma"), combinedSchema);

  console.log(`Prisma schema collated successfully!`);
  console.log(`Total: ${definedModels.size} models, ${definedEnums.size} enums`);
}

collateSchemas().catch((error) => {
  console.error("Error collating schemas:", error);
  process.exit(1);
});
