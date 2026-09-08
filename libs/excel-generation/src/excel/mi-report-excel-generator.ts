import ExcelJS from "exceljs";
import { CELL_BORDER, DATA_ALIGNMENT, DATA_FONT, HEADER_ALIGNMENT, HEADER_FILL, HEADER_FONT } from "./excel-styles.js";

const DEFAULT_COLUMN_WIDTH = 25;

export async function generateMiReportExcel(sheets: MiReportSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);

    worksheet.columns = sheet.headers.map((header) => ({
      header,
      key: header,
      width: DEFAULT_COLUMN_WIDTH
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = HEADER_ALIGNMENT;
      cell.border = CELL_BORDER;
    });

    for (const row of sheet.rows) {
      const addedRow = worksheet.addRow(row);
      addedRow.eachCell((cell) => {
        cell.font = DATA_FONT;
        cell.alignment = DATA_ALIGNMENT;
        cell.border = CELL_BORDER;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface MiReportSheet {
  name: string;
  headers: string[];
  rows: Array<Record<string, string | number>>;
}
