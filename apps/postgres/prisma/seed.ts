import { seedLocationData } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";

async function main() {
  console.log("Starting seed...");
  await seedLocationData();

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
