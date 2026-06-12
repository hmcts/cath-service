import type { DateInput } from "@hmcts/web-core";
import type { UploadFormData } from "./model.js";

export function hasValue(val: string | null | undefined): boolean {
  return val !== undefined && val !== null && val !== "" && val.toString().trim() !== "";
}

export function parseDateInput(body: Record<string, string>, prefix: string): DateInput | undefined {
  const day = body[`${prefix}-day`];
  const month = body[`${prefix}-month`];
  const year = body[`${prefix}-year`];

  return hasValue(day) || hasValue(month) || hasValue(year) ? { day: day || "", month: month || "", year: year || "" } : undefined;
}

export function transformDateFields(body: Record<string, string>): UploadFormData {
  return {
    locationId: body.locationId,
    locationName: body["court-display"],
    listType: body.listType,
    hearingStartDate: parseDateInput(body, "hearingStartDate"),
    sensitivity: body.sensitivity,
    language: body.language,
    displayFrom: parseDateInput(body, "displayFrom"),
    displayTo: parseDateInput(body, "displayTo")
  };
}

export function selectOption<T extends { value: string }>(options: T[], selectedValue: string | undefined): (T & { selected: boolean })[] {
  return options.map((item) => ({ ...item, selected: item.value === selectedValue }));
}
