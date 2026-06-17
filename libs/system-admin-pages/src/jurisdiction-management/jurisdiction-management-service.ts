import { prisma } from "@hmcts/postgres-prisma";
import {
  createJurisdictionRecord,
  deleteLocationJurisdictions,
  findJurisdictionDataById,
  hasDependencies,
  type JurisdictionDataRow,
  type JurisdictionDataType,
  listAllJurisdictionData,
  softDeleteJurisdictionRecord,
  updateJurisdictionRecord,
  updateLocationJurisdictions,
  writeAuditLog
} from "./jurisdiction-management-queries.js";

export interface CreateJurisdictionInput {
  name: string;
  welshName: string;
  type: JurisdictionDataType;
  jurisdictionId?: number;
}

export interface UpdateJurisdictionInput {
  name: string;
  welshName: string;
}

export interface ValidationError {
  text: string;
  href: string;
}

const HTML_TAG_REGEX = /<[^<>]*>/;

export async function listJurisdictionData(filter?: { jurisdiction?: string; subJurisdiction?: string }): Promise<JurisdictionDataRow[]> {
  return listAllJurisdictionData(filter);
}

export async function createJurisdictionData(data: CreateJurisdictionInput): Promise<ValidationError[]> {
  const errors = await validateJurisdictionFields(data.name, data.welshName, data.type);

  if (data.type === "Sub-Jurisdiction" && !data.jurisdictionId) {
    errors.push({ text: "Select a jurisdiction", href: "#jurisdictionId" });
  }

  if (errors.length > 0) return errors;

  const duplicateErrors = await checkUniqueness(data.name, data.welshName, data.type);
  if (duplicateErrors.length > 0) return duplicateErrors;

  await createJurisdictionRecord(data);
  return [];
}

export async function updateJurisdictionData(id: number, type: JurisdictionDataType, data: UpdateJurisdictionInput): Promise<ValidationError[]> {
  const errors = await validateJurisdictionFields(data.name, data.welshName, type);
  if (errors.length > 0) return errors;

  const duplicateErrors = await checkUniqueness(data.name, data.welshName, type, id);
  if (duplicateErrors.length > 0) return duplicateErrors;

  await updateJurisdictionRecord(id, type, data);
  return [];
}

export async function deleteJurisdictionData(id: number, type: JurisdictionDataType, performedBy: string): Promise<ValidationError[]> {
  const record = await findJurisdictionDataById(id, type);
  if (!record) {
    return [{ text: "Record not found", href: "#" }];
  }

  const hasLinked = await hasDependencies(id, type);
  if (hasLinked) {
    return [{ text: "This record cannot be deleted because it is linked to one or more locations", href: "#" }];
  }

  await softDeleteJurisdictionRecord(id, type);

  const entityName = "name" in record ? record.name : "";
  await writeAuditLog({
    action: `DELETE_${type.replace("-", "_").toUpperCase()}`,
    entityType: type,
    entityId: String(id),
    entityName,
    performedBy
  });

  return [];
}

export async function getLocationJurisdictionDetails(locationId: number) {
  const { getLocationJurisdictionData } = await import("./jurisdiction-management-queries.js");
  return getLocationJurisdictionData(locationId);
}

export async function updateLocationJurisdictionData(
  locationId: number,
  data: { subJurisdictionIds: number[]; regionIds: number[] },
  performedBy: string
): Promise<void> {
  await updateLocationJurisdictions(locationId, data.subJurisdictionIds, data.regionIds);

  await writeAuditLog({
    action: "UPDATE_LOCATION_JURISDICTION",
    entityType: "Location",
    entityId: String(locationId),
    entityName: String(locationId),
    performedBy,
    details: `Sub-jurisdictions: [${data.subJurisdictionIds.join(", ")}], Regions: [${data.regionIds.join(", ")}]`
  });
}

export async function deleteLocationJurisdictionData(locationId: number, performedBy: string): Promise<void> {
  await deleteLocationJurisdictions(locationId);

  await writeAuditLog({
    action: "DELETE_LOCATION_JURISDICTION",
    entityType: "Location",
    entityId: String(locationId),
    entityName: String(locationId),
    performedBy
  });
}

function validateJurisdictionFields(name: string, welshName: string, type: JurisdictionDataType): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({ text: "Enter the name in English", href: "#name" });
  }
  if (!welshName || welshName.trim().length === 0) {
    errors.push({ text: "Enter the name in Welsh", href: "#welshName" });
  }

  if (errors.length > 0) return errors;

  if (HTML_TAG_REGEX.test(name)) {
    errors.push({ text: "Name contains HTML tags which are not allowed", href: "#name" });
  }
  if (HTML_TAG_REGEX.test(welshName)) {
    errors.push({ text: "Welsh name contains HTML tags which are not allowed", href: "#welshName" });
  }

  if (!type) {
    errors.push({ text: "Select a type", href: "#type" });
  }

  return errors;
}

type FindFirstFn = (nameValue: string, welshNameValue: string) => Promise<[unknown, unknown]>;

async function checkNameUniqueness(nameFinder: FindFirstFn, trimmedName: string, trimmedWelshName: string): Promise<ValidationError[]> {
  const [nameMatch, welshMatch] = await nameFinder(trimmedName, trimmedWelshName);
  const errors: ValidationError[] = [];
  if (nameMatch) errors.push({ text: "A record with this name already exists", href: "#name" });
  if (welshMatch) errors.push({ text: "A record with this Welsh name already exists", href: "#welshName" });
  return errors;
}

async function checkUniqueness(name: string, welshName: string, type: JurisdictionDataType, excludeId?: number): Promise<ValidationError[]> {
  const trimmedName = name.trim();
  const trimmedWelshName = welshName.trim();

  switch (type) {
    case "Jurisdiction":
      return checkNameUniqueness(
        (n, w) =>
          Promise.all([
            prisma.jurisdiction.findFirst({
              where: { name: { equals: n, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { jurisdictionId: excludeId } } : {}) }
            }),
            prisma.jurisdiction.findFirst({
              where: { welshName: { equals: w, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { jurisdictionId: excludeId } } : {}) }
            })
          ]),
        trimmedName,
        trimmedWelshName
      );
    case "Sub-Jurisdiction":
      return checkNameUniqueness(
        (n, w) =>
          Promise.all([
            prisma.subJurisdiction.findFirst({
              where: { name: { equals: n, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { subJurisdictionId: excludeId } } : {}) }
            }),
            prisma.subJurisdiction.findFirst({
              where: { welshName: { equals: w, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { subJurisdictionId: excludeId } } : {}) }
            })
          ]),
        trimmedName,
        trimmedWelshName
      );
    case "Region":
      return checkNameUniqueness(
        (n, w) =>
          Promise.all([
            prisma.region.findFirst({
              where: { name: { equals: n, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { regionId: excludeId } } : {}) }
            }),
            prisma.region.findFirst({
              where: { welshName: { equals: w, mode: "insensitive" }, deletedAt: null, ...(excludeId ? { NOT: { regionId: excludeId } } : {}) }
            })
          ]),
        trimmedName,
        trimmedWelshName
      );
  }
}
