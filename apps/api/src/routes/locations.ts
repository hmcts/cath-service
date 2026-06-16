import { getAllLocations } from "@hmcts/location/repository/queries";
import { searchLocations } from "@hmcts/location/repository/service";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const language = (req.query.language as "en" | "cy") || "en";
    const query = req.query.q as string | undefined;

    if (query) {
      // Search for locations
      const results = await searchLocations(query, language);
      return res.json(results);
    }

    // Get all locations
    const locations = await getAllLocations(language);
    return res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ error: "Failed to fetch locations" });
  }
};
