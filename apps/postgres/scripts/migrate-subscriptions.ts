import { prisma } from "@hmcts/postgres";

async function migrateSubscriptions() {
  console.log("Starting subscription data migration...");

  const subscriptions = await prisma.subscription.findMany({
    where: {
      searchType: null
    }
  });

  console.log(`Found ${subscriptions.length} subscriptions to migrate`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const subscription of subscriptions) {
    try {
      if (subscription.locationId) {
        await prisma.subscription.update({
          where: {
            subscriptionId: subscription.subscriptionId
          },
          data: {
            searchType: "LOCATION_ID",
            searchValue: subscription.locationId.toString()
          }
        });
        migratedCount++;
      }
    } catch (error) {
      console.error(`Failed to migrate subscription ${subscription.subscriptionId}:`, error);
      errorCount++;
    }
  }

  console.log(`Migration completed:`);
  console.log(`  - Successfully migrated: ${migratedCount}`);
  console.log(`  - Errors: ${errorCount}`);

  const verifyCount = await prisma.subscription.count({
    where: {
      searchType: "LOCATION_ID"
    }
  });

  console.log(`Verification: ${verifyCount} subscriptions now have searchType='LOCATION_ID'`);
}

migrateSubscriptions()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
