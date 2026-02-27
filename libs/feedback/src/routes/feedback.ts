import type { Request, Response } from "express";
import {
  listAllFeedback,
  getFeedback,
  markAsResolved,
  removeFeedback,
  findFeedback,
  getStats,
} from "../feedback/service.js";

export const GET = async (req: Request, res: Response) => {
  try {
    const { search, id } = req.query;

    if (id) {
      const feedback = await getFeedback(id as string);
      if (!feedback) {
        res.json({ error: "Feedback not found" });
        return;
      }
      res.json(feedback);
      return;
    }

    if (search) {
      const results = await findFeedback(search as string);
      res.json(results);
      return;
    }

    const feedback = await listAllFeedback();
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

export const POST = async (req: Request, res: Response) => {
  const { action, feedbackId, adminNotes } = req.body;

  try {
    if (action === "resolve") {
      await markAsResolved(feedbackId, "system", adminNotes || "");
      res.json({ success: true });
      return;
    }

    if (action === "delete") {
      await removeFeedback(feedbackId);
      res.json({ success: true });
      return;
    }

    res.status(400).json({ error: "Inavlid action" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const PATCH = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  try {
    await markAsResolved(id, req.user.id, adminNotes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update feedback" });
  }
};

export const getStats_handler = async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
