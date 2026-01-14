import { convertExcelToJson, type ExcelConverterConfig, registerConverter, validateNoHtmlTags } from "@hmcts/list-types-common";
import ExcelJSPkg from "exceljs";

const { Workbook } = ExcelJSPkg;
// Matches h:mma, h.mma (e.g., 9:30am, 10.15pm) or ha (e.g., 9am, 2pm)
const TIME_PATTERN = /^\d{1,2}([:.]\d{2})?[ap]m\s*$/i;

function validateTimeFormat(value: string, rowNumber: number): void {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid time format '${value}' in row ${rowNumber}. Expected format: h:mma (e.g., 9:30am) or ha (e.g., 2pm)`);
  }
}

// Standard 7 fields configuration for both tabs
export const STANDARD_CONFIG: ExcelConverterConfig = {
  fields: [
    {
      header: "Venue",
      fieldName: "venue",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Venue", rowNumber)]
    },
    {
      header: "Judge",
      fieldName: "judge",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Judge", rowNumber)]
    },
    {
      header: "Time",
      fieldName: "time",
      required: true,
      validators: [validateTimeFormat]
    },
    {
      header: "Case Number",
      fieldName: "caseNumber",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Case Number", rowNumber)]
    },
    {
      header: "Case Details",
      fieldName: "caseDetails",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Case Details", rowNumber)]
    },
    {
      header: "Hearing Type",
      fieldName: "hearingType",
      required: true,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Hearing Type", rowNumber)]
    },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(value: string, rowNumber: number) => validateNoHtmlTags(value, "Additional Information", rowNumber)]
    }
  ],
  minRows: 0
};

// Custom multi-sheet converter for London Administrative Court
async function convertLondonAdminExcel(buffer: Buffer) {
  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);

  // Extract data from each sheet
  const mainHearingsSheet = workbook.getWorksheet("Main hearings") || workbook.worksheets[0];
  const planningCourtSheet = workbook.getWorksheet("Planning Court") || workbook.worksheets[1];

  if (!mainHearingsSheet) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  // Convert each sheet to JSON
  const mainHearings = mainHearingsSheet ? await convertSheetToJson(mainHearingsSheet, STANDARD_CONFIG) : [];
  const planningCourt = planningCourtSheet ? await convertSheetToJson(planningCourtSheet, STANDARD_CONFIG) : [];

  return {
    mainHearings,
    planningCourt
  };
}

async function convertSheetToJson(worksheet: any, config: ExcelConverterConfig): Promise<any[]> {
  // Create a temporary buffer from the sheet
  const workbook = new Workbook();
  const tempSheet = workbook.addWorksheet("temp");

  // Copy all rows from source to temp worksheet
  worksheet.eachRow((row: any, rowNumber: number) => {
    const newRow = tempSheet.getRow(rowNumber);
    row.eachCell((cell: any, colNumber: number) => {
      newRow.getCell(colNumber).value = cell.value;
    });
    newRow.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return convertExcelToJson(Buffer.from(buffer), config);
}

// Register the converter with listTypeId 18
registerConverter(18, {
  config: STANDARD_CONFIG,
  convertExcelToJson: convertLondonAdminExcel as any
});
