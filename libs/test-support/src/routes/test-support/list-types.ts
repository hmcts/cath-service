import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { id, name, first } = req.query;

    if (id) {
      const listType = await prisma.listType.findUnique({
        where: { id: Number(id) }
      });
      if (!listType) {
        return res.status(404).json({ error: "List type not found" });
      }
      return res.json(listType);
    }

    if (name || first === "true") {
      const where = name ? { name: { contains: name as string } } : {};
      const listType = await (prisma as any).listType.findFirst({ where });
      if (!listType) {
        return res.status(404).json({ error: "List type not found" });
      }
      return res.json(listType);
    }

    const listTypes = await prisma.listType.findMany();
    return res.json(listTypes);
  } catch (error) {
    console.error("Error fetching list types:", error);
    return res.status(500).json({ error: "Failed to fetch list types" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { listTypes, linkAllSubJurisdictions } = req.body;

    if (!Array.isArray(listTypes) || listTypes.length === 0) {
      return res.status(400).json({ error: "listTypes array is required" });
    }

    let allSubJurisdictions: any[] = [];
    if (linkAllSubJurisdictions) {
      allSubJurisdictions = await (prisma as any).subJurisdiction.findMany();
      if (allSubJurisdictions.length === 0) {
        return res.status(400).json({ error: "No sub-jurisdictions found. Please seed sub-jurisdictions first." });
      }
    }

    const results = [];
    for (const listType of listTypes) {
      if (!listType.name) {
        return res.status(400).json({ error: "Each listType must have a name" });
      }

      const existing = await (prisma as any).listType.findUnique({
        where: { name: listType.name }
      });

      if (existing) {
        const updated = await (prisma as any).listType.update({
          where: { name: listType.name },
          data: {
            friendlyName: listType.friendlyName || listType.name,
            welshFriendlyName: listType.welshFriendlyName || listType.friendlyName || listType.name,
            shortenedFriendlyName: listType.shortenedFriendlyName || listType.friendlyName || listType.name,
            url: listType.url || "",
            defaultSensitivity: listType.defaultSensitivity || "Public",
            allowedProvenance: listType.provenance || "MANUAL_UPLOAD",
            isNonStrategic: listType.isNonStrategic ?? false
          }
        });
        results.push(updated);
      } else {
        const createData: any = {
          name: listType.name,
          friendlyName: listType.friendlyName || listType.name,
          welshFriendlyName: listType.welshFriendlyName || listType.friendlyName || listType.name,
          shortenedFriendlyName: listType.shortenedFriendlyName || listType.friendlyName || listType.name,
          url: listType.url || "",
          defaultSensitivity: listType.defaultSensitivity || "Public",
          allowedProvenance: listType.provenance || "MANUAL_UPLOAD",
          isNonStrategic: listType.isNonStrategic ?? false
        };

        if (linkAllSubJurisdictions && allSubJurisdictions.length > 0) {
          createData.subJurisdictions = {
            create: allSubJurisdictions.map((sj: any) => ({
              subJurisdictionId: sj.subJurisdictionId
            }))
          };
        }

        const created = await (prisma as any).listType.create({ data: createData });
        results.push(created);
      }
    }

    return res.status(201).json({ seeded: results.length, listTypes: results });
  } catch (error) {
    console.error("Error seeding list types:", error);
    return res.status(500).json({ error: "Failed to seed list types" });
  }
};
