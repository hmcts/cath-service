import ExcelJS from "exceljs";

// The content of a workbook: its sheets in order, each sheet's non-empty cells by address with
// their type and value, and its merged ranges. pip writes workbooks with Apache POI and CaTH with
// exceljs, so the files are never byte-identical (zip timestamps, document properties, shared
// strings, style indices); what should be identical is this.
export async function excelCells(data: Uint8Array): Promise<WorkbookContent> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as unknown as ArrayBuffer);
  return {
    sheets: workbook.worksheets.map((worksheet) => {
      const cells: Record<string, CellContent> = {};
      worksheet.eachRow({ includeEmpty: false }, (row) =>
        row.eachCell({ includeEmpty: false }, (cell) => {
          // exceljs gives every cell in a merged range the range's value; it belongs to the first
          if (cell.isMerged && cell.master.address !== cell.address) return;
          const content = cellContent(cell.value);
          if (content.text !== "") cells[cell.address] = content;
        })
      );
      return { name: worksheet.name, cells, merges: [...(worksheet.model.merges ?? [])].sort() };
    })
  };
}

function cellContent(value: ExcelJS.CellValue): CellContent {
  if (value === null || value === undefined) return { type: "empty", text: "" };
  if (value instanceof Date) return { type: "date", text: value.toISOString() };
  if (typeof value === "number") return { type: "number", text: String(value) };
  if (typeof value === "boolean") return { type: "boolean", text: String(value) };
  if (typeof value === "string") return { type: "text", text: value };
  if ("richText" in value) return { type: "text", text: value.richText.map((run) => run.text).join("") };
  if ("hyperlink" in value) return { type: "text", text: String(value.text) };
  if ("error" in value) return { type: "error", text: String(value.error) };
  // A formula is compared by the value it last calculated, as a reader of the file sees it
  if ("formula" in value || "sharedFormula" in value) return cellContent((value as { result?: ExcelJS.CellValue }).result ?? null);
  return { type: "text", text: JSON.stringify(value) };
}

export interface WorkbookContent {
  sheets: SheetContent[];
}

export interface SheetContent {
  name: string;
  cells: Record<string, CellContent>;
  merges: string[];
}

export interface CellContent {
  type: "empty" | "text" | "number" | "boolean" | "date" | "error";
  text: string;
}
