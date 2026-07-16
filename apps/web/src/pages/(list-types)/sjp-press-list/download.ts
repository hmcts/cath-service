import type { RequestHandler } from "express";
import { handleBlobDownload } from "../sjp-download-shared.js";
import { requireVerifiedWithProvenance } from "./require-verified-with-provenance.js";

const getHandler: RequestHandler = async (req, res) => {
  return handleBlobDownload(req, res);
};

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
