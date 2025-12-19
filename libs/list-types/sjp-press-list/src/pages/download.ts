import type { Request, Response } from "express";
import type { ParsedQs } from "qs";
import "@hmcts/auth";
import { getAllSjpPressCases, getSjpListById } from "@hmcts/list-types-common";

/**
 * Parses query parameter as string array, filtering out non-string values
 */
function parseQueryAsStringArray(param: string | ParsedQs | (string | ParsedQs)[] | undefined): string[] {
  if (!param) return [];
  const items = Array.isArray(param) ? param : [param];
  return items.filter((item): item is string => typeof item === "string");
}

/**
 * Escapes a CSV field to prevent CSV injection and handle embedded quotes
 * - Escapes embedded double quotes by replacing " with ""
 * - Prefixes formula characters (=, +, -, @) with a single quote to prevent CSV injection
 * - Wraps the result in double quotes
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const stringValue = String(value);

  // Prevent CSV injection by prefixing formula characters
  const safeValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;

  // Escape embedded double quotes
  const escapedValue = safeValue.replaceAll(/"/g, '""');

  // Wrap in double quotes
  return `"${escapedValue}"`;
}

/**
 * Generates CSV rows from cases
 */
function generateCsvRows(
  cases: Array<{
    name: string;
    dateOfBirth: Date | null;
    reference: string | null;
    address: string | null;
    prosecutor: string | null;
    offences: Array<{ offenceTitle: string; reportingRestriction: boolean }>;
  }>
): string[] {
  const csvRows = ["Name,Date of Birth,Reference,Address,Prosecutor,Reporting Restriction,Offence"];

  for (const caseItem of cases) {
    const hasReportingRestriction = caseItem.offences.some((offence) => offence.reportingRestriction);
    const offenceTitles = caseItem.offences.map((offence) => offence.offenceTitle).join("; ");
    const dateOfBirth = caseItem.dateOfBirth ? escapeCsvField(new Date(caseItem.dateOfBirth).toLocaleDateString("en-GB")) : '""';

    const row = [
      escapeCsvField(caseItem.name),
      dateOfBirth,
      escapeCsvField(caseItem.reference),
      escapeCsvField(caseItem.address),
      escapeCsvField(caseItem.prosecutor),
      hasReportingRestriction ? "True" : "False",
      escapeCsvField(offenceTitles)
    ];
    csvRows.push(row.join(","));
  }

  return csvRows;
}

export const GET = async (req: Request, res: Response) => {
  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (!isDevelopment && (!req.isAuthenticated() || req.user?.role !== "VERIFIED")) {
    return res.status(403).send("Forbidden");
  }

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).send("Bad Request");
  }

  const list = await getSjpListById(artefactId);
  if (!list || list.listType !== "press") {
    return res.status(404).send("Not Found");
  }

  // Get all cases without pagination
  const selectedProsecutors = parseQueryAsStringArray(req.query.prosecutor);
  const selectedPostcodes = parseQueryAsStringArray(req.query.postcode);

  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcodes: selectedPostcodes.length > 0 ? selectedPostcodes : undefined,
    prosecutors: selectedProsecutors.length > 0 ? selectedProsecutors : undefined
  };

  const { cases } = await getAllSjpPressCases(artefactId, filters);
  const csvRows = generateCsvRows(cases);
  const csv = csvRows.join("\n");
  const filename = `sjp-press-list-${list.contentDate.toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};
