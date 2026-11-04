import { triggerScheduledListTypeSubscriptions } from "@hmcts/publication";
import { closeConnections } from "./close-connections.js";

export default async function scheduledListTypeSubscriptions() {
  try {
    const summary = await triggerScheduledListTypeSubscriptions();
    console.info("[SubscriptionSchedule] scheduled list type run complete:", summary);
  } finally {
    await closeConnections();
  }
}
