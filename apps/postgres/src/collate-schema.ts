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
  const baseSchemaPath = path.join(__dirname, "../prisma/schema.prisma");
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
    const modelDefinitions = schemaContent.match(/^model\s+\w+\s*{[\s\S]*?^}/gm);
    for (const model of modelDefinitions || []) {
      const modelNameMatch = model.match(/^model\s+(\w+)/);
      if (modelNameMatch && !definedModels.has(modelNameMatch[1])) {
        combinedSchema += `\n${model}`;
        definedModels.add(modelNameMatch[1]);
      }
    }

    // Extract enums
    const enumDefinitions = schemaContent.match(/^enum\s+\w+\s*{[\s\S]*?^}/gm);
    for (const enumDef of enumDefinitions || []) {
      const enumNameMatch = enumDef.match(/^enum\s+(\w+)/);
      if (enumNameMatch && !definedEnums.has(enumNameMatch[1])) {
        combinedSchema += `\n${enumDef}`;
        definedEnums.add(enumNameMatch[1]);
      }
    }
  }

  const distDir = path.join(__dirname, "../dist");
  await deps.mkdir(distDir, { recursive: true });
  await deps.writeFile(path.join(distDir, "schema.prisma"), combinedSchema);

  // Copy .env file to dist so Prisma can find DATABASE_URL
  const envPath = path.join(__dirname, "../.env");
  const distEnvPath = path.join(distDir, ".env");
  try {
    const envContent = await deps.readFile(envPath, "utf-8");
    await deps.writeFile(distEnvPath, envContent);
  } catch {
    // .env file might not exist in development, that's ok
    console.log(`ℹ️  No .env file found at ${envPath}`);
  }

  console.log(`✅ Prisma schema collated successfully!`);
  console.log(`📊 Total: ${definedModels.size} models, ${definedEnums.size} enums`);
}

// Only run when executed directly, not during tests
if (import.meta.url === `file://${process.argv[1]}`) {
  collateSchemas().catch((error) => {
    console.error("❌ Error collating schemas:", error);
    process.exit(1);
  });
}
