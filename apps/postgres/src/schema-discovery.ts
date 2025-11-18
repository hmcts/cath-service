// Schema discovery functionality for module integration
import { prismaSchemas as locationSchemas } from "@hmcts/location/config";

export function getPrismaSchemas(): string[] {
  return [locationSchemas];
}
