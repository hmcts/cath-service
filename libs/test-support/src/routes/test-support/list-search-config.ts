import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

// The search config is environment configuration, so tests never delete or overwrite it.
// POST only fills the gap on environments that have none (e.g. a fresh PR preview database).
export const GET = async (req: Request, res: Response) => {
  try {
    const { listTypeName } = req.query;

    if (typeof listTypeName !== "string" || listTypeName === "") {
      return res.status(400).json({ error: "listTypeName is required" });
    }

    const listType = await prisma.listType.findUnique({ where: { name: listTypeName }, select: { id: true, name: true } });
    if (!listType) {
      return res.status(404).json({ error: `List type ${listTypeName} not found` });
    }

    const config = await prisma.listSearchConfig.findUnique({ where: { listTypeId: listType.id } });
    if (!config) {
      return res.status(404).json({ error: `List type ${listTypeName} has no list search config` });
    }

    return res.json({
      listTypeName: listType.name,
      caseNumberFieldName: config.caseNumberFieldName,
      caseNameFieldName: config.caseNameFieldName
    });
  } catch (error) {
    console.error("Error fetching list search config:", error);
    return res.status(500).json({ error: "Failed to fetch list search config" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { listTypeName, caseNumberFieldName, caseNameFieldName } = req.body ?? {};

    if (![listTypeName, caseNumberFieldName, caseNameFieldName].every((value) => typeof value === "string" && value !== "")) {
      return res.status(400).json({ error: "listTypeName, caseNumberFieldName and caseNameFieldName are required" });
    }

    const listType = await prisma.listType.findUnique({ where: { name: listTypeName }, select: { id: true, name: true } });
    if (!listType) {
      return res.status(404).json({ error: `List type ${listTypeName} not found` });
    }

    // update: {} keeps an existing config exactly as the environment set it
    const config = await prisma.listSearchConfig.upsert({
      where: { listTypeId: listType.id },
      create: { listTypeId: listType.id, caseNumberFieldName, caseNameFieldName },
      update: {}
    });

    return res.json({
      listTypeName: listType.name,
      caseNumberFieldName: config.caseNumberFieldName,
      caseNameFieldName: config.caseNameFieldName
    });
  } catch (error) {
    console.error("Error ensuring list search config:", error);
    return res.status(500).json({ error: "Failed to ensure list search config" });
  }
};
