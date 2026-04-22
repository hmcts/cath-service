import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";

interface CreateMediaApplicationInput {
  name: string;
  email: string;
  employer: string;
  status?: string;
  proofOfIdPath?: string | null;
}

export const GET = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (email) {
      const application = await prisma.mediaApplication.findFirst({
        where: { email: email as string }
      });
      if (!application) {
        return res.status(404).json({ error: "Media application not found" });
      }
      return res.json(application);
    }

    const applications = await prisma.mediaApplication.findMany();
    return res.json(applications);
  } catch (error) {
    console.error("Error fetching media applications:", error);
    return res.status(500).json({ error: "Failed to fetch media applications" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateMediaApplicationInput;

    if (!input.name || !input.email || !input.employer) {
      return res.status(400).json({
        error: "name, email, and employer are required"
      });
    }

    const application = await prisma.mediaApplication.create({
      data: {
        name: input.name,
        email: input.email,
        employer: input.employer,
        status: input.status || "PENDING",
        proofOfIdPath: input.proofOfIdPath ?? null
      }
    });

    return res.status(201).json(application);
  } catch (error) {
    console.error("Error creating media application:", error);
    return res.status(500).json({ error: "Failed to create media application" });
  }
};
