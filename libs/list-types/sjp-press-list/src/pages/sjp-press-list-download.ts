import type { Request, Response } from "express";
import "@hmcts/auth";
import { getAllSjpPressCases, getSjpListById } from "@hmcts/list-types-common";

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
  const escapedValue = safeValue.replace(/"/g, '""');

  // Wrap in double quotes
  return `"${escapedValue}"`;
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
  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcode: req.query.postcode as string | undefined,
    prosecutor: req.query.prosecutor as string | undefined
  };

  const { cases } = await getAllSjpPressCases(artefactId, filters);

  // Generate CSV
  const csvRows = [];
  csvRows.push("Name,Date of Birth,Reference,Address,Prosecutor,Reporting Restriction,Offence");

  for (const caseItem of cases) {
    // Get the reporting restriction status (true if any offence has reporting restrictions)
    const hasReportingRestriction = caseItem.offences.some((offence) => offence.reportingRestriction);

    // Combine all offence titles
    const offenceTitles = caseItem.offences.map((offence) => offence.offenceTitle).join("; ");

    const row = [
      escapeCsvField(caseItem.name),
      caseItem.dateOfBirth ? escapeCsvField(new Date(caseItem.dateOfBirth).toLocaleDateString("en-GB")) : '""',
      escapeCsvField(caseItem.reference),
      escapeCsvField(caseItem.address),
      escapeCsvField(caseItem.prosecutor),
      hasReportingRestriction ? "True" : "False",
      escapeCsvField(offenceTitles)
    ];
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");
  const filename = `sjp-press-list-${list.contentDate.toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};
