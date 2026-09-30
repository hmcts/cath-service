// TEMP: gives the watchdog kill switch a public page to trip on a preview. Revert before merge.
import { isFeatureEnabled } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";

const LD_FLAG_RADIO_BUTTONS = "third-party-subscriptions-radio-buttons";

export const GET = async (_req: Request, res: Response) => {
  if (await isFeatureEnabled(LD_FLAG_RADIO_BUTTONS, "watchdog-kill-switch-test")) {
    throw new Error("Watchdog kill-switch test");
  }
  res.type("text").send(`${LD_FLAG_RADIO_BUTTONS} is off`);
};
