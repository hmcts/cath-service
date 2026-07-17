import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CSV_INJECTION_CHARS = ["=", "+", "-", "@"];

export function sanitiseCellValue(value: string): string {
  if (CSV_INJECTION_CHARS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

export async function saveExcelToStorage(artefactId: string, buffer: Buffer): Promise<{ excelPath: string }> {
  const blobKey = `${artefactId}.xlsx`;
  await uploadBlob(blobKey, buffer, XLSX_CONTENT_TYPE, CONTAINER.PUBLICATIONS);
  return { excelPath: blobKey };
}
