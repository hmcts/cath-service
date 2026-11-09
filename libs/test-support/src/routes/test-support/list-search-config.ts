import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

// Read-only: the search config is an environment prerequisite set through "Configure list type", never by tests
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
