import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import type { CreateUserInput } from "../../types.js";

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateUserInput;

    if (!input.email || !input.firstName || !input.surname) {
      return res.status(400).json({
        error: "email, firstName, and surname are required"
      });
    }

    const user = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        surname: input.surname,
        userProvenance: input.userProvenance || "PI_AAD",
        userProvenanceId: input.userProvenanceId || `test-${Date.now()}`,
        role: input.role || "VERIFIED"
      }
    });

    return res.status(201).json({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      surname: user.surname
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return res.status(500).json({ error: "Failed to create test user" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }

    const result = await prisma.user.deleteMany({
      where: { userId: { in: userIds } }
    });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting test users:", error);
    return res.status(500).json({ error: "Failed to delete test users" });
  }
};
