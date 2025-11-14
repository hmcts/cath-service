import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import type { Request, Response } from "express";
import { cy } from "../../locales/cy.js";
import { en } from "../../locales/en.js";
import { renderCauseListData } from "../../rendering/renderer.js";
import { validateCivilFamilyCauseList } from "../../validation/json-validator.js";

const TEMP_UPLOAD_DIR = path.join(process.cwd(), "storage/temp/uploads");

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const artefactId = req.query.artefactId as string;

  if (!artefactId) {
    return res.status(400).render("civil-and-family-daily-cause-list/error", {
      en,
      cy,
      title: t.errorTitle,
      message: t.errorMessage
    });
  }

  try {
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).render("civil-and-family-daily-cause-list/error", {
        en,
        cy,
        title: t.errorTitle,
        message: t.errorMessage
      });
    }

    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("civil-and-family-daily-cause-list/error", {
        en,
        cy,
        title: t.errorTitle,
        message: t.errorMessage
      });
    }

    const jsonData = JSON.parse(jsonContent);

    const validationResult = validateCivilFamilyCauseList(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("civil-and-family-daily-cause-list/error", {
        en,
        cy,
        title: t.errorTitle,
        message: t.errorMessage
      });
    }

    const { header, openJustice, listData } = renderCauseListData(jsonData, {
      locationId: artefact.locationId,
      contentDate: artefact.contentDate,
      locale
    });

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("civil-and-family-daily-cause-list/index", {
      en,
      cy,
      header,
      openJustice,
      listData,
      dataSource,
      t
    });
  } catch (error) {
    console.error("Error rendering cause list:", error);
    return res.status(500).render("civil-and-family-daily-cause-list/error", {
      en,
      cy,
      title: t.errorTitle,
      message: t.errorMessage
    });
  }
};
