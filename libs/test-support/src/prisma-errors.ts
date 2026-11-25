const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";

// Only a clash on the id column is fixed by retrying with a new id; clashes on other unique columns are not
export function isUniqueConstraintClashOn(error: unknown, column: string): boolean {
  if (typeof error !== "object" || error === null || (error as PrismaKnownError).code !== PRISMA_UNIQUE_CONSTRAINT_CODE) {
    return false;
  }

  const { meta } = error as PrismaKnownError;
  // The pg driver adapter reports the columns under driverAdapterError; the native engine uses target
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target ?? [];
  return fields.includes(column);
}

interface PrismaKnownError {
  code?: unknown;
  meta?: {
    target?: string[];
    driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
  };
}
