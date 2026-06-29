import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import type { RequestHandler } from "express";
import { createListDownloadFilesHandler } from "../sjp-download-shared.js";
import { requireVerifiedWithProvenance } from "./require-verified-with-provenance.js";

const getHandler = createListDownloadFilesHandler(en, cy, "downloadFiles");

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
