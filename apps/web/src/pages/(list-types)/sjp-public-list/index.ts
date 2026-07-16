import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculatePagination, getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";
import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import type { Request, Response } from "express";
import type { ParsedQs } from "qs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const STORAGE_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

/**
 * Parses query parameter as string array, filtering out non-string values
 */
function parseQueryAsStringArray(param: string | ParsedQs | (string | ParsedQs)[] | undefined): string[] {
  if (!param) return [];
  const items = Array.isArray(param) ? param : [param];
  return items.filter((item): item is string => typeof item === "string");
}

/**
 * Appends array values to URLSearchParams
 */
function appendArrayToParams(params: URLSearchParams, key: string, values: string | string[] | undefined, shouldTrim = false): void {
  if (!values) return;
  const items = Array.isArray(values) ? values : [values];
  for (const item of items) {
    const value = shouldTrim ? item.trim() : item;
    if (value) {
      params.append(key, value);
    }
  }
}

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const artefactId = req.query.artefactId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;
  const sortBy = (req.query.sortBy as string) || "";
  const sortOrder = (req.query.sortOrder as string) || "asc";
  const showFilter = req.query.showFilter === "true";

  if (!artefactId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(artefactId);
  if (list?.listType !== "public") {
    return res.status(404).render("errors/404", {
      en,
      cy,
      locale
    });
  }

  // Handle multiple prosecutors and postcodes from query string
  const selectedProsecutors = parseQueryAsStringArray(req.query.prosecutor);
  const selectedPostcodes = parseQueryAsStringArray(req.query.postcode);

  const filters = {
    postcodes: selectedPostcodes.length > 0 ? selectedPostcodes : undefined,
    prosecutors: selectedProsecutors.length > 0 ? selectedProsecutors : undefined
  };

  const { cases, totalCases } = await getSjpPublicCases(artefactId, filters, page, sortBy, sortOrder);
  const prosecutors = await getUniqueProsecutors(artefactId);
  const postcodeData = await getUniquePostcodes(artefactId);
  const pagination = calculatePagination(page, totalCases, 1000);
  const t = locale === "cy" ? cy : en;

  // Format cases for GOV.UK table component
  const casesRows = cases.map((caseItem) => [
    { text: caseItem.name },
    { text: caseItem.postcode || "" },
    { text: caseItem.offence || "" },
    { text: caseItem.prosecutor || "" }
  ]);

  const isVerifiedUser = req.user?.role === "VERIFIED";
  const pdfExists = await fileExists(path.join(STORAGE_DIR, `${artefactId}.pdf`));
  const excelExists = await fileExists(path.join(STORAGE_DIR, `${artefactId}.xlsx`));
  const downloadDisclaimerUrl = isVerifiedUser && (pdfExists || excelExists) ? `${req.path}/list-download-disclaimer?artefactId=${artefactId}` : null;

  res.render("sjp-public-list", {
    en,
    cy,
    t,
    title: req.path.includes("delta") ? t.SJP_DELTA_PUBLIC_LIST.title : t.SJP_PUBLIC_LIST.title,
    ...t.common,
    locale,
    list,
    cases,
    casesRows,
    totalCases,
    prosecutors,
    postcodeAreas: postcodeData.postcodes,
    hasLondonPostcodes: postcodeData.hasLondonPostcodes,
    londonPostcodes: postcodeData.londonPostcodes,
    pagination,
    filters: {
      postcodes: selectedPostcodes,
      prosecutors: selectedProsecutors
    },
    sortBy,
    sortOrder,
    downloadDisclaimerUrl,
    showFilter
  });
};

export const POST = async (req: Request, res: Response) => {
  const artefactId = req.body.artefactId as string;
  const queryParams = new URLSearchParams({ artefactId });
  appendArrayToParams(queryParams, "postcode", req.body.postcode, true);
  appendArrayToParams(queryParams, "prosecutor", req.body.prosecutor);
  res.redirect(`${req.path}?${queryParams.toString()}`);
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
