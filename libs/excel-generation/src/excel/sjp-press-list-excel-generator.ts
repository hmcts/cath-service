import { extractPressCases, type SjpJson } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { CELL_BORDER, DATA_ALIGNMENT, DATA_FONT, HEADER_ALIGNMENT, HEADER_FILL, HEADER_FONT } from "./excel-styles.js";

export async function generateSjpPressListExcel(json: SjpJson): Promise<Buffer> {
  const cases = extractPressCases(json);

  const maxOffences = cases.reduce((max, c) => Math.max(max, c.offences.length), 0);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("SJP Press List");

  const columns: Array<{ header: string; key: string; width: number }> = [
    { header: "Address", key: "address", width: 40 },
    { header: "Case URN", key: "caseUrn", width: 20 },
    { header: "Date of Birth", key: "dateOfBirth", width: 25 },
    { header: "Defendant Name", key: "defendantName", width: 30 }
  ];

  for (let i = 1; i <= maxOffences; i++) {
    columns.push(
      { header: `Offence ${i} Press Restriction Requested`, key: `offence${i}Restriction`, width: 35 },
      { header: `Offence ${i} Title`, key: `offence${i}Title`, width: 35 },
      { header: `Offence ${i} Wording`, key: `offence${i}Wording`, width: 45 }
    );
  }

  columns.push({ header: "Prosecutor Name", key: "prosecutorName", width: 30 });

  worksheet.columns = columns;

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = HEADER_ALIGNMENT;
    cell.border = CELL_BORDER;
  });

  for (const sjpCase of cases) {
    const rowData: Record<string, string> = {
      address: sjpCase.address ?? "",
      caseUrn: sjpCase.reference ?? "",
      dateOfBirth: formatDateOfBirth(sjpCase.dateOfBirth, sjpCase.age),
      defendantName: sjpCase.name,
      prosecutorName: sjpCase.prosecutor ?? ""
    };

    for (let i = 0; i < maxOffences; i++) {
      const offence = sjpCase.offences[i];
      const idx = i + 1;
      rowData[`offence${idx}Restriction`] = offence ? (offence.reportingRestriction ? "Active" : "None") : "";
      rowData[`offence${idx}Title`] = offence?.offenceTitle ?? "";
      rowData[`offence${idx}Wording`] = offence?.offenceWording ?? "";
    }

    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = DATA_FONT;
      cell.alignment = DATA_ALIGNMENT;
      cell.border = CELL_BORDER;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDateOfBirth(dob: Date | null, age: number | null): string {
  if (!dob) return "";

  const day = String(dob.getDate()).padStart(2, "0");
  const month = String(dob.getMonth() + 1).padStart(2, "0");
  const year = dob.getFullYear();
  const formatted = `${day}/${month}/${year}`;

  if (age !== null) {
    return `${formatted} (${age})`;
  }

  return formatted;
}
