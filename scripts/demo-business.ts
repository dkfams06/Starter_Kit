import "dotenv/config";
import { config } from "dotenv";
import { assertDemoDatabase } from "../src/modules/order-shipping/demo-policy";
import { seedDemoBusiness, resetDemoBusiness } from "./lib/demo-business";
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  const mode = process.argv[2] ?? "preview";
  if (!["preview", "seed", "reset"].includes(mode)) throw new Error("Invalid mode.");
  // Reject missing flags before opening a database connection.
  assertDemoDatabase(process.env, process.env.DEMO_DATABASE_NAME ?? "", mode === "reset");
  const { prisma } = await import("../src/lib/prisma");
  try {
    await prisma.$transaction(async tx => {
      const identity = await tx.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
      assertDemoDatabase(process.env, identity[0].name, mode === "reset");
      if (mode === "preview") {
        console.log({ mode: "preview-only", orders: await tx.customerOrder.count(), customers: await tx.customer.count(), products: await tx.product.count(), coreAccountsPreserved: true });
        return;
      }
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(73110402)`;
      if (mode === "seed") await seedDemoBusiness(tx);
      else await resetDemoBusiness(tx);
      console.log(`Demo ${mode} completed; Core accounts and Task data preserved.`);
    }, { timeout: 30000 });
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Demo operation refused or rolled back. Verify dedicated database identity, flags and database availability."); process.exitCode = 1; });
