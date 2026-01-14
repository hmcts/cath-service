import { readFile, writeFile } from "node:fs/promises";
import "@hmcts/rcj-standard-daily-cause-list";
import { convertExcelForListType, hasConverterForListType } from "@hmcts/list-types-common";

const artefactId = process.argv[2] || "a915a685-7b8f-4c8c-bf7e-87ef98743014";
const listTypeId = Number.parseInt(process.argv[3] || "10", 10);
const excelPath = `storage/temp/uploads/${artefactId}.xlsx`;
const jsonPath = `storage/temp/uploads/${artefactId}.json`;

async function main() {
  try {
    console.log(`Converting artefact ${artefactId} (list type ${listTypeId})`);
    console.log("Checking if converter exists for list type", listTypeId);

    if (!hasConverterForListType(listTypeId)) {
      console.error(`No converter found for list type ${listTypeId}`);
      process.exit(1);
    }

    console.log("Reading Excel file:", excelPath);
    const buffer = await readFile(excelPath);

    console.log("Converting Excel to JSON...");
    const hearingsData = await convertExcelForListType(listTypeId, buffer);

    console.log("Writing JSON file:", jsonPath);
    await writeFile(jsonPath, JSON.stringify(hearingsData, null, 2));

    console.log("✅ Conversion completed successfully!");
    console.log(`📊 Hearings data contains ${Array.isArray(hearingsData) ? hearingsData.length : "unknown"} items`);
  } catch (error) {
    console.error("❌ Error during conversion:", error);
    process.exit(1);
  }
}

main();
