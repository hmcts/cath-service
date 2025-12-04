#!/usr/bin/env tsx
/**
 * Script to fix media applications that have files on disk but no proofOfIdPath in database
 * Run with: tsx scripts/fix-media-application-file-paths.ts
 */

import { prisma } from "@hmcts/postgres";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_PATH = path.join(process.cwd(), "storage", "temp", "files");

async function fixMediaApplicationFilePaths() {
  console.log("🔍 Finding media applications with missing file paths...\n");

  const applications = await prisma.mediaApplication.findMany({
    where: {
      proofOfIdPath: null
    }
  });

  console.log(`Found ${applications.length} applications with NULL proofOfIdPath\n`);

  let fixedCount = 0;

  for (const app of applications) {
    console.log(`Checking application ${app.id}...`);

    const extensions = [".jpg", ".jpeg", ".png", ".pdf"];
    let foundFile: string | null = null;

    for (const ext of extensions) {
      const filePath = path.join(STORAGE_PATH, `${app.id}${ext}`);
      try {
        await fs.access(filePath);
        foundFile = filePath;
        break;
      } catch {
        continue;
      }
    }

    if (foundFile) {
      console.log(`  ✅ Found file: ${foundFile}`);
      await prisma.mediaApplication.update({
        where: { id: app.id },
        data: { proofOfIdPath: foundFile }
      });
      console.log(`  ✅ Updated database\n`);
      fixedCount++;
    } else {
      console.log(`  ❌ No file found on disk\n`);
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} out of ${applications.length} applications`);
}

fixMediaApplicationFilePaths()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
