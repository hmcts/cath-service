/**
 * A null display date means the window is unbounded at that end. The CaTH Inbound
 * Publication API treats x-display-from / x-display-to as optional, so a publication
 * that supplies neither is visible indefinitely.
 */
export function isWithinDisplayWindow(displayFrom: Date | null | undefined, displayTo: Date | null | undefined, now: Date = new Date()): boolean {
  if (displayFrom && now < displayFrom) {
    return false;
  }

  if (displayTo && now > displayTo) {
    return false;
  }

  return true;
}
