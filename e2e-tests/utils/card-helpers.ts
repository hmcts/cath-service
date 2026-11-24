import type { Locator } from "@playwright/test";

// Clicks a dashboard card near its bottom edge, over the description rather than the heading
// link, to prove the heading link's overlay keeps the whole card clickable.
export async function clickCardBelowHeading(card: Locator) {
  const box = await card.boundingBox();
  if (!box) {
    throw new Error("Card is not visible");
  }
  await card.click({ position: { x: box.width / 2, y: box.height - 10 } });
}
