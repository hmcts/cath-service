import { CONTAINER, deleteBlob, getBlobProperties } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { getParam } from "@hmcts/web-core";
import type { Request, Response } from "express";

// The create-media-account journey stores the ID proof in blob storage and records its blob key as proofOfIdPath,
// so E2E specs check and clean up the file through these routes rather than the web pod's disk
export const GET = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params, "id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const proofOfIdPath = await findProofOfIdPath(id);
    if (proofOfIdPath === undefined) {
      return res.status(404).json({ error: "Media application not found" });
    }
    if (!proofOfIdPath) {
      return res.json({ exists: false });
    }

    const properties = await getBlobProperties(proofOfIdPath, CONTAINER.FILES);
    return res.json(properties ? { exists: true, blobName: proofOfIdPath, sizeBytes: properties.size } : { exists: false, blobName: proofOfIdPath });
  } catch (error) {
    console.error("Error checking proof of ID file:", error);
    return res.status(500).json({ error: "Failed to check proof of ID file" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params, "id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const proofOfIdPath = await findProofOfIdPath(id);
    if (proofOfIdPath === undefined) {
      return res.status(404).json({ error: "Media application not found" });
    }
    if (proofOfIdPath) {
      await deleteBlob(proofOfIdPath, CONTAINER.FILES);
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting proof of ID file:", error);
    return res.status(500).json({ error: "Failed to delete proof of ID file" });
  }
};

// undefined = no such application; null = application has no proof of ID
async function findProofOfIdPath(id: string): Promise<string | null | undefined> {
  const application = await prisma.mediaApplication.findUnique({ where: { id }, select: { proofOfIdPath: true } });
  return application ? application.proofOfIdPath : undefined;
}
