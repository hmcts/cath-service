// A ratio alone blocks routine removals on small tables, so a fixed allowance always applies too.
const MIN_DROP_ALLOWANCE = 50;

// Protects against an empty or truncated legacy read wiping a table on reload.
// Allows a table to shrink by up to max(MIN_DROP_ALLOWANCE, maxDropRatio of its existing rows).
export function findDropLimitViolation(
  entityType: string,
  existingCount: number,
  loadedCount: number,
  maxDropRatio: number,
  options: { canBeEmptied?: boolean } = {}
): string | null {
  const drop = existingCount - loadedCount;
  const limit = Math.max(MIN_DROP_ALLOWANCE, Math.floor(existingCount * maxDropRatio));

  // Emptying a populated table is not a legitimate nightly change, whatever its size, unless
  // the table genuinely can reach zero (e.g. no media applications pending).
  const isEmptied = existingCount > 0 && loadedCount === 0 && !options.canBeEmptied;

  if (drop > limit || isEmptied) {
    return `${entityType}: refusing to replace ${existingCount} rows with ${loadedCount} (drop ${drop}, limit ${limit}). Check the legacy read, then re-run with a higher limit if intended.`;
  }

  return null;
}
