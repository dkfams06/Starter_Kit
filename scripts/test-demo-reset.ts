import "dotenv/config";
import { config } from "dotenv";
import assert from "node:assert/strict";
import { assertDemoDatabase } from "../src/modules/order-shipping/demo-policy";
import { resetDemoBusiness } from "./lib/demo-business";
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  assertDemoDatabase(process.env, process.env.DEMO_DATABASE_NAME ?? "");
  const { prisma } = await import("../src/lib/prisma");
  const sentinel = new Error("intentional rollback");
  try {
    const identity = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    assertDemoDatabase(process.env, identity[0].name);
    const before = await Promise.all([prisma.customerOrder.count(), prisma.customer.count(), prisma.product.count(), prisma.user.count(), prisma.task.count(), prisma.auditLog.count()]);
    try {
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(73110402)`;
        const userIds = (await tx.user.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map(x => x.id);
        const tasks = await tx.task.count();
        const counters = await tx.orderNumberCounter.findMany();
        await resetDemoBusiness(tx);
        assert.equal(await tx.customerOrder.count(), 3);
        assert.equal(await tx.shipment.count(), 1);
        assert.deepEqual((await tx.user.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map(x => x.id), userIds);
        assert.equal(await tx.task.count(), tasks);
        for (const counter of counters) assert.ok((await tx.orderNumberCounter.findUniqueOrThrow({ where: { date: counter.date } })).lastValue >= counter.lastValue);
        throw sentinel;
      }, { timeout: 30000 });
    } catch (error) { if (error !== sentinel) throw error; }
    const after = await Promise.all([prisma.customerOrder.count(), prisma.customer.count(), prisma.product.count(), prisma.user.count(), prisma.task.count(), prisma.auditLog.count()]);
    assert.deepEqual(after, before);
    console.log("PASS: demo reset seeded all states, preserved Core, and rolled back without persisted changes.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Demo reset rollback verification failed; no committed reset was requested."); process.exitCode = 1; });
