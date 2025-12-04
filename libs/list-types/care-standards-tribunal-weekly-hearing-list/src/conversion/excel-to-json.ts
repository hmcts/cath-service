import { convertExcelForListType } from "@hmcts/list-types-common";
import type { CareStandardsTribunalHearing } from "../models/types.js";

export async function convertExcelToJson(buffer: Buffer): Promise<CareStandardsTribunalHearing[]> {
  return convertExcelForListType(9, buffer) as Promise<CareStandardsTribunalHearing[]>;
}
