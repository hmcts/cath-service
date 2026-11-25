import { triggerDisplayFromSubscriptions } from "@hmcts/publication";
import { closeConnections } from "./close-connections.js";

export default async function displayFromSubscriptions() {
  try {
    const summary = await triggerDisplayFromSubscriptions();
    console.info("[SubscriptionSchedule] display-from run complete:", summary);
  } finally {
    await closeConnections();
  }
}
