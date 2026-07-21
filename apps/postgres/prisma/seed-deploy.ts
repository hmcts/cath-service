import { seedLocationData } from "@hmcts/location";

// Deploy-only seed entry point invoked by start.sh via tsx.
// Seeds reference data (regions, jurisdictions, sub-jurisdictions, locations, list types)
// from the TypeScript source of truth.
seedLocationData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deploy seed failed:", error);
    process.exit(1);
  });
