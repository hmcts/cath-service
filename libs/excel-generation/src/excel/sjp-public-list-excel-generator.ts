import { extractPublicCases, type SjpJson } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { CELL_BORDER, DATA_ALIGNMENT, DATA_FONT, HEADER_ALIGNMENT, HEADER_FILL, HEADER_FONT } from "./excel-styles.js";

const COLUMNS = [
  { header: "Name", key: "name", width: 30 },
  { header: "Postcode", key: "postcode", width: 15 },
  { header: "Offence", key: "offence", width: 40 },
  { header: "Prosecutor", key: "prosecutor", width: 30 }
];

export async function generateSjpPublicListExcel(json: SjpJson): Promise<Buffer> {
  const cases = extractPublicCases(json);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("SJP Public List");

  worksheet.columns = COLUMNS;

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = HEADER_ALIGNMENT;
    cell.border = CELL_BORDER;
  });

  for (const sjpCase of cases) {
    const row = worksheet.addRow({
      name: sjpCase.name,
      postcode: sjpCase.postcode ?? "",
      offence: sjpCase.offence ?? "",
      prosecutor: sjpCase.prosecutor ?? ""
    });

    row.eachCell((cell) => {
      cell.font = DATA_FONT;
      cell.alignment = DATA_ALIGNMENT;
      cell.border = CELL_BORDER;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
