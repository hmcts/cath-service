import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";

export async function saveExcelFile(artefactId: string, fileBuffer: Buffer): Promise<void> {
  await uploadBlob(`${artefactId}.xlsx`, fileBuffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", CONTAINER.PUBLICATIONS);
}
