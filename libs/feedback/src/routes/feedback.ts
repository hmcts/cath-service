import type { Request, Response } from "express";
import {
  listAllFeedback,
  getFeedback,
  markAsResolved,
  removeFeedback,
  findFeedback,
  getStats,
} from "../feedback/service.js";

// BUG [CRITICAL]: No authentication middleware - API is publicly accessible
// Should use: import { requireRole } from "@hmcts/auth";

export const GET = async (req: Request, res: Response) => {
  try {
    const { search, id } = req.query;

    if (id) {
      // BUG [HIGH]: No authorization check - any user can view any feedback by ID
      const feedback = await getFeedback(id as string);
      if (!feedback) {
        // BUG [LOW]: Using 200 status with error response instead of 404
        res.json({ error: "Feedback not found" });
        return;
      }
      res.json(feedback);
      return;
    }

    if (search) {
      // BUG [CRITICAL]: Search term passed directly to SQL query (injection via service)
      const results = await findFeedback(search as string);
      res.json(results);
      return;
    }

    // BUG [HIGH]: Returns all feedback without pagination
    const feedback = await listAllFeedback();
    res.json(feedback);
  } catch (error) {
    // BUG [HIGH]: Exposing internal error details
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

export const POST = async (req: Request, res: Response) => {
  // BUG [CRITICAL]: No CSRF protection on state-changing operation

  const { action, feedbackId, adminNotes } = req.body;

  // BUG [HIGH]: No validation of action parameter
  // BUG [CRITICAL]: No authentication - anyone can resolve/delete feedback

  try {
    if (action === "resolve") {
      // BUG [HIGH]: Using hardcoded user ID instead of authenticated user
      await markAsResolved(feedbackId, "system", adminNotes || "");
      res.json({ success: true });
      return;
    }

    if (action === "delete") {
      // BUG [CRITICAL]: Permanent deletion without audit trail or confirmation
      await removeFeedback(feedbackId);
      res.json({ success: true });
      return;
    }

    // BUG [LOW]: Typo in error message
    res.status(400).json({ error: "Inavlid action" });
  } catch (error) {
    // BUG [MEDIUM]: Inconsistent error response format
    res.status(500).json({ message: error.message });
  }
};

// BUG [MEDIUM]: DELETE method not properly implemented - uses POST instead
// REST convention would be DELETE /feedback/:id

export const PATCH = async (req: Request, res: Response) => {
  // BUG [CRITICAL]: No authentication
  const { id } = req.params;
  const { adminNotes } = req.body;

  try {
    // BUG [HIGH]: Assumes req.user exists without checking
    await markAsResolved(id, req.user.id, adminNotes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update feedback" });
  }
};

// BUG [LOW]: Stats endpoint should be separate route, not overloaded GET
export const getStats_handler = async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
