import { isFeatureEnabled } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";

const LD_FLAG_RADIO_BUTTONS = "third-party-subscriptions-radio-buttons";

const LAYOUTS: Record<string, { heading: string; control: string }> = {
  dropdown: { heading: "Choose a sensitivity for each list type", control: "select" }
};

export const GET = async (_req: Request, res: Response) => {
  const layoutKey = (await isFeatureEnabled(LD_FLAG_RADIO_BUTTONS, "anonymous")) ? "radios" : "dropdown";
  const layout = LAYOUTS[layoutKey];
  res.type("text").send(`${layout.heading} (${layout.control})`);
};
